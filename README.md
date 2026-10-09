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
| Builds | EAS Build (APK / Play Store) |

## Getting started

### Prerequisites

- Node.js 20+
- npm
- Expo Go (device) or a simulator / web browser
- A [Supabase](https://supabase.com) project

### Install

```bash
git clone https://github.com/shibam17/DukaanApp.git
cd DukaanApp
npm install
cp .env.example .env
```

Edit `.env` with your Supabase values:

```bash
EXPO_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
```

`.env` is gitignored — do not commit real keys.

### Supabase SQL

Run these in the Supabase **SQL Editor** (in order):

1. `supabase/setup.sql` — businesses / members grants + RLS  
2. `supabase/products-setup.sql` — products, categories, stock_movements  
3. `supabase/sales-purchases-policies.sql` — sales / purchases read access  
4. `supabase/profiles-policies.sql` — profiles for “recorded by” names  

Also ensure:

- Tables matching `src/types/index.ts`
- RPCs: `record_sale` and `record_purchase`

### Run

```bash
npx expo start
```

After changing `.env`, restart with a clear cache once:

```bash
npx expo start --clear
```

- Press `w` for web  
- Scan the QR code with Expo Go  
- Press `i` / `a` for iOS / Android simulators  

## Build an APK (share with Lucky)

This is how you get a file you can send for install on Android (not through Expo Go):

1. Install EAS CLI and log in: `npm i -g eas-cli` then `eas login`
2. Configure once: `eas build:configure` (project already has `eas.json`)
3. Add the same `EXPO_PUBLIC_*` vars in [Expo dashboard](https://expo.dev) → project → Environment variables, **or** keep a local `.env` for the build upload
4. Build a shareable APK:

```bash
eas build --platform android --profile preview
```

When it finishes, Expo gives you a download link — send that APK (or the link) to install on a phone.

Play Store later uses:

```bash
eas build --platform android --profile production
```

Docs: [EAS Build setup](https://docs.expo.dev/build/setup/)

**Note:** Env/CI changes do **not** make the app feel faster day-to-day. A real APK/production build can feel a bit snappier than Expo Go because it’s a standalone install — but the big win is **sharing and shipping**, not speed.

## CI

GitHub Actions runs `npm ci` + `npx tsc --noEmit` on pushes/PRs to `main` (see `.github/workflows/ci.yml`).

## App structure

```
src/
  app/           # Expo Router screens
  components/    # Shared UI
  hooks/         # useAuth, useBusiness, useProductSearch
  lib/           # Supabase client
  screens/       # Login, setup shop
  types/         # Domain TypeScript types
  utils/         # formatINR, date ranges, errors
supabase/        # SQL for grants, RLS, and table setup
```

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
