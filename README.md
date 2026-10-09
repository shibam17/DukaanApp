# DukaanManager

Mobile inventory management for small shops — products, stock, purchases, and sales.

Built with **Expo (SDK 57)**, **Expo Router**, **React Native**, and **Supabase**.

Repo: [github.com/shibam17/DukaanApp](https://github.com/shibam17/DukaanApp)

## Features

- Email/password auth and shop (business) setup
- Product catalog with categories, search, and filters
- Record sales and purchases via atomic Supabase RPCs (`record_sale`, `record_purchase`)
- Dashboard: today’s revenue/profit, inventory overview, recent activity
- Low stock alerts and stock movement history
- Sales / purchase history

## Stack

| Layer | Tech |
| --- | --- |
| App | Expo Router, React Native, TypeScript |
| Backend | Supabase (Auth, Postgres, RLS) |
| Storage | AsyncStorage (session persistence) |

## Getting started

### Prerequisites

- Node.js 20+
- npm (or pnpm)
- Expo Go (device) or a simulator / web browser
- A [Supabase](https://supabase.com) project

### Install

```bash
git clone https://github.com/shibam17/DukaanApp.git
cd DukaanApp
npm install
```

### Configure Supabase

Set your project URL and anon key in `src/lib/supabase.ts`:

```ts
const SUPABASE_URL = 'https://YOUR_PROJECT.supabase.co';
const SUPABASE_ANON_KEY = 'YOUR_ANON_KEY';
```

Run these SQL files in the Supabase **SQL Editor** (in order):

1. `supabase/setup.sql` — businesses / members grants + RLS  
2. `supabase/products-setup.sql` — products, categories, stock_movements  
3. `supabase/sales-purchases-policies.sql` — sales / purchases read access  
4. `supabase/profiles-policies.sql` — profiles for “recorded by” names  

Also ensure your database has:

- Tables matching `src/types/index.ts` (businesses, business_members, products, categories, sales, purchases, stock_movements, profiles)
- RPCs: `record_sale` and `record_purchase` (stock updates)

### Run

```bash
npx expo start
```

- Press `w` for web  
- Scan the QR code with Expo Go  
- Press `i` / `a` for iOS / Android simulators  

Web (if TLS issues on your network):

```bash
NODE_TLS_REJECT_UNAUTHORIZED=0 npx expo start --web
```

## App structure

```
src/
  app/           # Expo Router screens (tabs, product, sale, purchase, history)
  components/    # Shared UI (e.g. CategoryPicker)
  hooks/         # useAuth, useBusiness, useProductSearch
  lib/           # Supabase client
  screens/       # Login, setup shop
  types/         # Domain TypeScript types
  utils/         # formatINR, date ranges, errors
supabase/        # SQL for grants, RLS, and table setup
```

## Main flows

1. **Sign up / sign in** → create shop if needed  
2. **Products** → add items, categories, edit details  
3. **Record Sale** → search product → qty + price → save  
4. **Add Purchase** → restock inventory  
5. **Dashboard / Sales / More** → overview and history  

## Scripts

```bash
npm start          # expo start
npm run web        # expo start --web
npm run ios        # expo start --ios
npm run android    # expo start --android
npx tsc --noEmit   # typecheck
```

## Version

**v1.0.0**

## License

MIT — see [LICENSE](./LICENSE).
