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

## Premier administrateur

Après avoir appliqué la migration `20260901150000_admin_dashboard.sql`, désigner le
premier administrateur depuis l’éditeur SQL de Supabase :

```sql
update public.profiles
set is_admin = true
where lower(email) = lower('votre.adresse@example.com');
```

Le lien **Admin** apparaît ensuite sur l’accueil de ce compte.

## Commandes de qualité

```bash
npm run lint
npm run typecheck
npm run build
```

Les migrations, l'authentification Microsoft, les tests et le déploiement Vercel seront
documentés avec leurs phases d'implémentation respectives.

