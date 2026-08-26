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

Les migrations, l'authentification Microsoft, les tests et le déploiement Vercel seront
documentés avec leurs phases d'implémentation respectives.
