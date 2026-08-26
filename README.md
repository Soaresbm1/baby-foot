# Baby-foot

Application mobile-first de gestion des matchs de baby-foot d'entreprise. Le projet
utilise Next.js, TypeScript, Tailwind CSS et Supabase.

L'architecture fonctionnelle et les décisions de sécurité sont détaillées dans
[`docs/architecture.md`](docs/architecture.md).

## Démarrage local

### Prérequis

- Node.js 20.9 ou plus récent ;
- npm ;
- Docker et la CLI Supabase pour le développement local.

### Installation

```bash
npm install
cp .env.example .env.local
supabase start
npm run dev
```

Renseigner dans `.env.local` l'URL et la clé publique affichées par `supabase status`.
L'application est ensuite disponible sur <http://localhost:3000>.

`supabase start` applique la migration initiale et charge quatre comptes locaux. Ils
partagent uniquement en développement le mot de passe `babyfoot-local` :

- `bernardo@example.test` ;
- `lucas@example.test` ;
- `thomas@example.test` ;
- `hugo@example.test`.

Pour reconstruire entièrement la base locale et exécuter le seed :

```bash
supabase db reset
```

## Commandes de qualité

```bash
npm run lint
npm run typecheck
npm run build
supabase test db
```

Les tests end-to-end et le déploiement Vercel seront complétés avec leurs phases
d'implémentation respectives.

## Authentification Microsoft

La partie logicielle utilise le fournisseur Supabase `azure`. La configuration des
secrets reste volontairement manuelle :

1. Dans **Microsoft Entra ID > App registrations**, créer une application et choisir le
   tenant de l'entreprise (recommandé) plutôt que le mode multi-tenant.
2. Ajouter comme URI de redirection Web l'URL indiquée par Supabase, sous la forme
   `https://<project-ref>.supabase.co/auth/v1/callback`.
3. Créer un secret client dans Entra et copier immédiatement sa valeur dans
   **Supabase > Authentication > Providers > Azure**, avec le Client ID et l'URL du
   tenant. Ne placer aucune de ces valeurs dans `.env.local`.
4. Dans **Supabase > Authentication > URL Configuration**, définir l'URL du site
   (`http://localhost:3000` localement, puis le domaine Vercel) et autoriser
   `http://localhost:3000/auth/callback` ainsi que l'équivalent de production.
5. Dans Entra, autoriser au minimum les informations de profil et d'email. L'application
   demande uniquement le scope OAuth `email` en complément des scopes standards.

Pour imposer ultérieurement les comptes Microsoft de l'entreprise, désactiver les
inscriptions email dans Supabase, conserver l'application Entra mono-tenant et vérifier
le tenant de l'identité dans une règle d'accès dédiée. Le client secret Microsoft et la
clé Supabase `service_role` ne doivent jamais être préfixés par `NEXT_PUBLIC_`.
