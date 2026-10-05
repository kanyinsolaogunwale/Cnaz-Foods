# Cnaz Foods — Monorepo

**Cnaz Foods** sells packaged snacks — crunchy plantain chips, peanuts and
groundnut. _“Quick bite, endless delight.”_

One repository, two products, **one shared backend** (the same Supabase
project, accounts, carts and order pipeline):

| Folder | Product | Stack |
| --- | --- | --- |
| [`website/`](website/) | Cnaz Foods online shop | Next.js 14 + TypeScript + Tailwind |
| [`mobile/`](mobile/) | Cnaz Foods mobile app | React Native (Expo) + TypeScript |

Both read the same catalogue through `GET /api/products` (website API route),
sign in to the same Supabase Auth accounts, and place orders into the same
`orders` / `order_items` tables. Product data lives in Supabase only — never
hardcoded in either app.

- Website docs, setup and environment variables: [`website/README.md`](website/README.md)
- Mobile app docs, setup and the physical-phone test guide: [`mobile/README.md`](mobile/README.md)
- Agent playbooks: [`website/AGENTS.md`](website/AGENTS.md), [`mobile/AGENTS.md`](mobile/AGENTS.md)

## Commit conventions

Prefix every commit with the product it touches so history stays readable at
a glance:

- `web:` — website only
- `mobile:` — mobile app only
- `docs:` — documentation only
- `repo:` — repository structure, CI, tooling affecting both
- No prefix (or `shared:`) — changes crossing both products

## Deployment

- **Website:** Vercel. Import once; set the project's **Root Directory to
  `website/`** and add the environment variables from
  [`website/README.md`](website/README.md). Do not deploy without the owner's
  explicit approval.
- **Mobile app:** Expo / EAS (`mobile/eas.json`); see the mobile README.
