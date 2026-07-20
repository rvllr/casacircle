# CasaCircle

Application web de gestion de maison partagée et de patrimoine familial en indivision.

CasaCircle permet à plusieurs co-propriétaires (famille, indivision, groupe d'amis) de gérer
ensemble un ou plusieurs biens immobiliers : qui occupe la maison et quand, qui a payé quoi,
et comment les décisions collectives sont prises et tracées.

## Fonctionnalités

Périmètre constaté dans le code (routes `src/App.tsx`, schéma `supabase/migrations/`) :

- **Biens et espaces** — maisons (`/houses`), sous-unités (`house_units`), espaces de
  patrimoine regroupant plusieurs biens (`/spaces`), page publique de présentation (`/p/:id`).
- **Réservations** — demandes de séjour avec workflow d'approbation, périodes bloquées,
  invités, checklists d'arrivée/départ (`/bookings`).
- **Dépenses** — saisie des dépenses et répartition entre membres (`expense_shares`),
  export CSV, relances de paiements en retard (`/expenses`).
- **Votes et décisions** — votes des co-indivisaires et registre des décisions
  (`decision_register`) (`/votes`).
- **Journal** — actualités, souvenirs et photos, historique du bien (`/journal`).
- **Documents** — stockage de documents par bien et par espace (`/documents`).
- **Maintenance** — tickets de maintenance avec statuts (`/maintenance`).
- **Quotes-parts** — répartition de la propriété (`ownership_shares`) et son historique
  (`ownership_history`), pactes de famille et signatures (`family_pacts`, `pact_signatures`).
- **Abonnements** — plans, options et abonnements par espace (`/subscription`, `/pricing`).
- **Serveur MCP** — expose certaines données au format Model Context Protocol pour les
  clients IA, avec consentement OAuth (voir « Serveur MCP » plus bas).

## Stack technique

| Domaine | Technologie |
| --- | --- |
| Front | React 18, Vite 5, TypeScript |
| UI | shadcn/ui (Radix UI), Tailwind CSS, framer-motion, lucide-react |
| Données | @tanstack/react-query, react-hook-form, zod |
| Routing | react-router-dom 6 |
| Backend | Supabase — auth, Postgres (RLS), storage, edge functions (Deno) |
| Tests | Vitest, Testing Library, jsdom |

La sécurité repose sur les Row Level Security de Postgres : 37 tables ont la RLS activée et
environ 180 policies distinctes sont définies dans `supabase/migrations/`. Le front
n'utilise que la clé `anon` — aucune clé de service ne doit être exposée côté client.

## Prérequis

- Node.js 20 (version utilisée par la CI) et npm
- Un projet Supabase, et la [Supabase CLI](https://supabase.com/docs/guides/cli) pour les
  migrations et les edge functions

## Installation

```sh
git clone <URL_DU_DEPOT>
cd casacircle
npm ci
cp .env.example .env   # puis renseigner les valeurs
npm run dev            # http://localhost:8080
```

> Utiliser `npm`. Le dépôt ne contient volontairement qu'un `package-lock.json` :
> les lockfiles Bun ont été supprimés pour garantir des installations déterministes.

## Variables d'environnement

À définir dans `.env`, en partant du modèle versionné `.env.example`. Le fichier `.env`
lui-même n'est pas versionné (il est listé dans `.gitignore`) :

| Variable | Usage |
| --- | --- |
| `VITE_SUPABASE_PROJECT_ID` | Référence du projet Supabase, utilisée pour l'issuer OAuth du MCP |
| `VITE_SUPABASE_URL` | URL du projet Supabase (client) |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Clé `anon` (client) |
| `SUPABASE_URL` | URL du projet, consommée par les edge functions |
| `SUPABASE_PUBLISHABLE_KEY` | Clé `anon`, consommée par les edge functions |

Les variables préfixées `VITE_` sont injectées dans le bundle client : elles sont donc
**publiques**. La clé `anon` est publique par design ; la protection réelle vient des RLS.

## Commandes

| Commande | Description |
| --- | --- |
| `npm run dev` | Serveur de développement (port 8080) |
| `npm run build` | Build de production dans `dist/` |
| `npm run build:dev` | Build en mode development |
| `npm run preview` | Sert le build de production |
| `npm test` | Tests Vitest (une passe) |
| `npm run test:watch` | Tests en watch |
| `npm run typecheck` | Vérification TypeScript |
| `npm run lint` | ESLint |

### À propos de `typecheck`

Le `tsconfig.json` racine a `"files": []` et ne fait que référencer les sous-projets :
lancer `tsc --noEmit` sans argument **ne vérifie aucun fichier** et sort en succès.
Le script `typecheck` cible donc explicitement `tsconfig.app.json` (le code de `src/`)
et `tsconfig.node.json` (`vite.config.ts`).

### À propos de `lint`

ESLint remonte actuellement 0 erreur et 209 warnings (dette technique connue, en majorité
`@typescript-eslint/no-explicit-any` et `react-hooks/exhaustive-deps`). La CI fige ce
nombre via `--max-warnings 209` : tout nouveau warning fait échouer le build. Ce seuil est
un cliquet destiné à être abaissé, pas une cible.

Le code généré (`supabase/functions/mcp/`) est exclu du lint.

## Intégration continue

`.github/workflows/ci.yml` s'exécute sur chaque pull request et sur les push vers `main` :
`npm ci`, puis typecheck, lint, test et build sous Node 20. Une dernière étape vérifie que
l'edge function MCP générée est bien à jour par rapport à ses sources.

## Supabase

### Migrations

Les migrations SQL sont dans `supabase/migrations/` (47 fichiers).

```sh
supabase link --project-ref <project-id>
supabase db push          # applique les migrations au projet distant
supabase db reset         # réinitialise la base locale
```

### Storage

Buckets utilisés : `avatars`, `documents`, `house-photos`, `memories`.

### Edge functions

Deux fonctions dans `supabase/functions/` :

- `check-late-payments` — relance des dépenses en retard. Déclarée avec
  `verify_jwt = false` dans `supabase/config.toml`.
- `mcp` — serveur MCP. **Ce fichier est généré**, voir ci-dessous.

```sh
supabase functions deploy check-late-payments
supabase functions deploy mcp
```

### Serveur MCP

Le serveur MCP est une fonctionnalité produit : il expose à un client IA, pour le compte de
l'utilisateur connecté et dans la limite de ses droits, les outils `list_houses`,
`list_bookings`, `create_booking`, `list_expenses` et `list_maintenance_tickets`.
L'authentification se fait en OAuth contre Supabase Auth, avec une page de consentement
servie sur `/.lovable/oauth/consent`.

Les sources sont dans `src/lib/mcp/` (serveur et outils) ; le manifeste est
`.lovable/mcp/manifest.json`.

Point important : `mcpPlugin()` dans `vite.config.ts` **n'injecte rien dans le bundle
client**. C'est un générateur de code : à chaque `vite build` (et à chaque modification en
dev), il compile `src/lib/mcp/` vers l'edge function Deno `supabase/functions/mcp/index.ts`,
qui est commitée. Ce fichier ne doit pas être édité à la main — modifier les sources dans
`src/lib/mcp/`, relancer un build, et committer le résultat. Le plugin n'est
volontairement pas conditionné au mode : le gater sur `mode === "development"` ferait
diverger silencieusement la fonction déployée de ses sources.

## Structure du projet

```
src/
├── pages/           # Une page par route (voir src/App.tsx)
├── components/      # Composants métier
│   └── ui/          # Primitives shadcn/ui
├── contexts/        # Contextes React (espace actif, ...)
├── hooks/           # Hooks (useBookings, useExpenses, useUserProfiles, ...)
├── lib/             # Logique métier pure (expenseSplit, pricing, subscriptions,
│   │                #   csvExport, documentStorage, ...)
│   └── mcp/         # Serveur MCP et ses outils (sources)
├── integrations/
│   └── supabase/    # Client Supabase et types générés
└── test/            # Tests Vitest

supabase/
├── migrations/      # Migrations SQL
└── functions/       # Edge functions Deno
```

La logique de calcul isolée dans `src/lib/` est la partie couverte par les tests
(`src/test/expenseSplit.test.ts` couvre la répartition des dépenses).

## Origine du projet

Ce projet a été initialisé avec [Lovable](https://lovable.dev). Les modifications faites
via Lovable sont commitées automatiquement sur le dépôt.
