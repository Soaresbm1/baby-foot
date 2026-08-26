# Baby-foot — analyse fonctionnelle et architecture proposée

> Ce document couvre volontairement les étapes 1 à 3. Aucun code applicatif n'est
> initialisé avant validation de ces fondations. Les décisions ci-dessous privilégient
> le parcours 1 contre 1, la cohérence transactionnelle et une utilisation mobile rapide.

## 1. Analyse fonctionnelle

### Parcours prioritaire

Le premier incrément livrable est un match 1 contre 1 complet : authentification,
création, invitation par lien/QR, arrivée du second joueur, préparation, comptage des
buts, proposition automatique du résultat, confirmation ou refus, historique,
classement et revanche. Le 2 contre 2 réutilisera ensuite exactement les mêmes équipes,
événements et commandes serveur.

### Principes UX

- Mobile-first, zone utile centrée et limitée à environ 640 px sur grand écran.
- Une action dominante par écran et des cibles tactiles d'au moins 48 px.
- Pendant le jeu : noms, score, marqueurs et deux boutons de but seulement ; les actions
  secondaires restent discrètes.
- Le client peut afficher un état d'envoi, mais ne prédit pas définitivement le score :
  la réponse RPC puis la resynchronisation Realtime font foi.
- Les erreurs sont traduites en messages métier stables (partie complète, déjà commencée,
  action trop tardive), jamais en erreurs PostgreSQL brutes.

### Risques et décisions structurantes

1. **Concurrence sur le score.** Toutes les commandes sensibles seront des fonctions
   PostgreSQL `security definer` à `search_path` fixé. Elles verrouillent la ligne du
   match avec `SELECT … FOR UPDATE`, contrôlent l'appelant avec `auth.uid()`, écrivent
   l'événement puis le nouvel état dans la même transaction.
2. **Annulation ambiguë.** Un but n'est jamais supprimé. `cancel_goal` cible l'identifiant
   d'un événement `goal`, n'est autorisé qu'à son auteur pendant 3 secondes, et crée un
   événement compensatoire unique. Si ce but a déclenché la confirmation, l'annulation
   rouvre le match seulement si aucune confirmation/refus n'existe encore.
3. **Token d'invitation.** Un token aléatoire de 256 bits est remis une seule fois par la
   RPC de création. Seul son condensat SHA-256 est stocké ; rejoindre nécessite le token
   brut. Il cesse d'être valable dès que les places sont remplies ou que le match quitte
   les états d'attente.
4. **Realtime n'est pas une autorité.** Il sert d'invalidation. À chaque événement reçu,
   reconnexion, retour au premier plan ou divergence, le client relit une projection
   complète autorisée du match.
5. **Statistiques.** Elles sont calculées depuis les matchs `completed`, via vues SQL.
   Cela évite les compteurs désynchronisés. Une vue matérialisée pourra être ajoutée si
   le volume le justifie, sans changer l'API fonctionnelle.
6. **Refus.** Le statut final est `cancelled`, avec `cancel_reason = result_rejected`,
   `rejected_by` et `rejected_at`. Le score et l'audit sont conservés, mais les vues de
   classement filtrent strictement sur `completed`.
7. **OAuth d'entreprise.** Microsoft passe par le fournisseur Azure de Supabase. Une
   politique applicative centrale vérifiera plus tard le fournisseur et le domaine/tenant
   autorisé, sans modifier le modèle des profils.

## 2. Architecture

### Frontend

- **Next.js App Router + TypeScript strict** : Server Components pour les lectures
  initiales, Client Components isolés pour authentification, caméra et Realtime.
- **Tailwind CSS** et composants locaux peu nombreux (`PrimaryAction`, `ScoreBoard`,
  `ScoreMarkers`, `ConnectionBadge`, `ParticipantList`, `ConfirmResult`).
- Groupes de routes : `(auth)/login`, `(app)/`, `/match/new`, `/match/[id]`,
  `/join/[token]`, `/history`, `/history/[id]`, `/leaderboard`, `/profile/[id]`.
- Middleware Supabase SSR : rafraîchissement de session et conservation d'un `next`
  relatif validé pour revenir au lien d'invitation après connexion.
- Zod uniquement aux frontières utilisateur (score cible, formulaire profil et paramètres
  de route), les règles d'autorité restant en base.
- PWA volontairement connectée : manifest, icônes et cache du shell statique ; aucune
  mise en file hors ligne des buts, car la rejouer pourrait fausser un résultat.

### Backend

Le navigateur utilise la clé publique Supabase avec la session de l'utilisateur. Il ne
reçoit jamais la service-role key. Les lectures passent par RLS et les mutations métier
par des RPC PostgreSQL dédiées :

- `create_match(mode, target_score)` ;
- `join_match(token)` ;
- `set_ready(match_id, ready)` ;
- `move_participant(match_id, participant_id, team_id)` (créateur, avant départ) ;
- `add_goal(match_id, team_id, request_id)` ;
- `cancel_goal(match_id, goal_event_id, request_id)` ;
- `confirm_result(match_id)` et `reject_result(match_id)` ;
- `create_rematch(match_id)`.

`request_id` est un UUID généré par le client et contraint unique par match : une reprise
réseau ne peut donc pas compter deux fois la même commande.

### Modèle de données

Toutes les clés métier sont des UUID, les dates sont `timestamptz`, et les suppressions
en cascade sont réservées aux données d'un match non finalisé dans les outils de
développement. Les matchs audités ne sont pas supprimables par le client.

#### Types

- `match_mode`: `one_v_one`, `two_v_two`.
- `match_status`: `waiting_for_players`, `waiting_for_ready`, `in_progress`,
  `awaiting_confirmation`, `completed`, `cancelled`.
- `event_type`: `match_created`, `player_joined`, `player_ready`, `player_moved`,
  `match_started`, `goal`, `goal_cancelled`, `result_proposed`, `result_confirmed`,
  `result_rejected`, `match_cancelled`, `match_finished`, `rematch_created`.
- `cancel_reason`: `result_rejected`, `creator_cancelled`, `administrative`.

#### `profiles`

| Colonne | Règle |
|---|---|
| `id uuid` | PK et FK `auth.users(id)` |
| `display_name text` | 2 à 50 caractères |
| `email text` | copie d'affichage normalisée, non utilisée pour autoriser |
| `avatar_url text null` | URL HTTPS validée côté application |
| `created_at`, `updated_at` | dates gérées par la base |

Un trigger à l'inscription crée le profil depuis les métadonnées Auth. L'utilisateur ne
peut modifier que son nom et son avatar ; l'email est synchronisé depuis Auth.

#### `matches`

| Colonne | Règle |
|---|---|
| `id uuid` | PK |
| `mode match_mode` | immuable après création |
| `status match_status` | modifiable uniquement par RPC |
| `target_score smallint` | `CHECK (target_score BETWEEN 1 AND 30)` |
| `created_by uuid` | FK profil |
| `join_token_hash bytea` | unique, non lisible par le client |
| `team_a_score`, `team_b_score smallint` | entre 0 et la cible |
| `winner_team_id uuid null` | défini seulement si terminé |
| `cancel_reason`, `rejected_by`, `rejected_at` | cohérents avec `cancelled` |
| `rematch_of uuid null` | FK vers l'ancien match, jamais l'inverse |
| `created_at`, `started_at`, `ended_at`, `updated_at` | chronologie contrôlée |

Des contraintes différées/triggers vérifient le vainqueur, les scores et la cohérence des
champs terminaux. Index sur `(status, updated_at)`, `created_by`, `rematch_of` et
`join_token_hash`.

#### `match_teams`

| Colonne | Règle |
|---|---|
| `id uuid` | PK |
| `match_id uuid` | FK match |
| `side smallint` | 1 ou 2, unique par match |
| `label text null` | libellé calculable/personnalisable plus tard |

Deux équipes sont créées avec chaque match. Le score reste dans `matches` pour verrouiller
et retourner un instantané atomique en une seule ligne ; `winner_team_id` référence ici.

#### `match_participants`

| Colonne | Règle |
|---|---|
| `id uuid` | PK |
| `match_id`, `team_id`, `user_id` | FKs |
| `seat smallint` | 1 ou 2 |
| `is_ready boolean` | faux par défaut |
| `joined_at`, `ready_at` | audit |

Contraintes uniques `(match_id, user_id)`, `(team_id, seat)` et cohérence équipe/match.
Capacité vérifiée transactionnellement : 1 siège par équipe en 1v1, 2 en 2v2.

#### `match_events`

| Colonne | Règle |
|---|---|
| `id uuid` | PK, également retournée pour l'annulation |
| `match_id`, `actor_id`, `team_id null` | FKs |
| `type event_type` | type immuable |
| `request_id uuid null` | idempotence, unique avec `match_id` |
| `cancels_event_id uuid null` | référence un but, unique |
| `metadata jsonb` | objet borné contenant uniquement le contexte non relationnel |
| `created_at` | heure serveur |

Index `(match_id, created_at, id)`, `actor_id`, `cancels_event_id`. Aucun `INSERT`,
`UPDATE` ou `DELETE` direct n'est accordé aux clients.

#### `match_confirmations`

| Colonne | Règle |
|---|---|
| `match_id`, `user_id` | PK composite et FKs |
| `confirmed_at` | heure serveur |

La confirmation n'est insérable que par RPC lorsque l'état vaut
`awaiting_confirmation`. Le nombre attendu vient des participants du match, pas du client.

### Machine à états

```text
waiting_for_players --places remplies--> waiting_for_ready
waiting_for_ready --place libérée------> waiting_for_players
waiting_for_ready --tous prêts---------> in_progress
in_progress --score cible--------------> awaiting_confirmation
awaiting_confirmation --tous confirment> completed
awaiting_confirmation --un refus-------> cancelled
waiting_* --annulation créateur--------> cancelled
```

Un match `completed` ou `cancelled` est terminal. Le départ est automatique dans la même
transaction que le dernier `set_ready`. Le passage à confirmation et l'événement
`result_proposed` sont atomiques avec le but gagnant.

### Realtime et reconnexion

Les tables `matches`, `match_participants`, `match_confirmations` et `match_events` sont
publiées dans Supabase Realtime. Le client s'abonne avec un filtre `match_id=eq.<id>` là
où il est disponible. Les politiques RLS limitent les lignes diffusées aux participants.
Un événement déclenche un `router.refresh`/refetch dédupliqué. Les états de canal
`SUBSCRIBED`, `TIMED_OUT`, `CHANNEL_ERROR` et `CLOSED` alimentent un badge réseau ; une
reconnexion force systématiquement une lecture complète.

### Sécurité RLS

- `profiles`: lecture par utilisateurs authentifiés ; mise à jour de sa propre ligne sur
  une liste de colonnes autorisées.
- `matches`, équipes, participants, confirmations et événements : lecture uniquement par
  participant. Une RPC de jointure peut retourner l'aperçu minimal nécessaire après
  validation du token, sans rendre la partie publiquement énumérable.
- Aucune mutation directe des tables de match. `EXECUTE` est accordé fonction par fonction
  à `authenticated`; chaque fonction vérifie `auth.uid()`, l'état et l'appartenance.
- Les fonctions `security definer` appartiennent à un rôle non connecté, fixent
  `search_path = pg_catalog, public`, qualifient les objets et révoquent `PUBLIC`.
- Le token brut, la service-role key et les secrets OAuth ne sont jamais journalisés ni
  exposés. Les logs applicatifs utilisent les identifiants de match et de requête.

### Classement et confrontations

Une vue `player_statistics` agrège chaque participant des matchs `completed`: une victoire
si son équipe est gagnante, les buts de son équipe comme marqués et ceux de l'autre comme
encaissés. `leaderboard` ajoute `rank()` selon victoires décroissantes, taux de victoire,
différence de buts puis nom. Une fonction paramétrée calcule les confrontations en ne
gardant que les matchs terminés auxquels les deux utilisateurs ont participé. Ces vues
isolent la stratégie afin de permettre un Elo ultérieur.

## 3. Plan d'implémentation

1. **Initialisation** — Next.js, TypeScript strict, Tailwind, conventions, variables
   d'environnement validées et clients Supabase SSR/browser.
2. **Socle SQL** — migrations des types/tables/contraintes, triggers, RPC, RLS, vues et
   tests pgTAP ; seed local séparé.
3. **Authentification** — email/mot de passe, callback Azure, profil, redirection `next`
   et garde de routes.
4. **Verticale 1v1** — création, QR, jointure, préparation, score, annulation,
   confirmation/refus et revanche avec états d'erreur complets.
5. **Validation multi-client** — Realtime, reconnexion, idempotence et tests concurrents
   avec deux sessions distinctes. Ce jalon doit être vert avant le 2v2.
6. **2v2** — trois jointures, placement par boutons (plus accessible que le drag-and-drop),
   quatre préparations et confirmations.
7. **Historique et statistiques** — liste/détail, classement, profils et confrontations.
8. **PWA et finition** — manifest, icônes, service worker limité au shell, vibration,
   caméra avec saisie/lien de repli et états réseau.
9. **Qualité** — tests unitaires de présentation, pgTAP/RPC/RLS, Playwright du scénario
   prioritaire, lint, typecheck et audit d'accessibilité.
10. **Documentation/déploiement** — README, `.env.example`, Supabase local, Azure/Entra,
    Vercel, migrations et procédures de diagnostic.

### Critères de passage entre phases

Chaque phase exige `lint`, `typecheck` et ses tests ciblés. La verticale 1v1 exige en plus
deux navigateurs isolés constatant le même score, les deux ordres de confirmation, un
refus sans effet statistique et une tentative concurrente/idempotente. Aucun travail 2v2
ne doit masquer un défaut de ce parcours prioritaire.
