# givo – Pošli radost dál.

Mobilní appka na darování věcí zdarma (Expo / React Native + Supabase).

- `App.js` – celá appka (obrazovky, animace)
- `src/api.js` – komunikace se Supabase
- `supabase/migrations/0001_init.sql` – databáze, pravidla přístupu, funkce
- `supabase/functions/push` – odesílání push notifikací
- `.github/workflows/ios.yml` – build v cloudu a odeslání do TestFlightu
- `demo/` – původní klikací demo pro Expo Snack

Přihlášení je přes **Apple** (zdarma, bez SMS). Prohlížet věci jde i bez přihlášení.

---

## 1. Supabase (zdarma)

1. Na [supabase.com](https://supabase.com) založ projekt (region Frankfurt).
2. **SQL Editor → New query** → vlož celý `supabase/migrations/0001_init.sql` → **Run**.
3. **Authentication → Sign In / Providers → Apple** → zapnout. Do **Client IDs** napiš `cz.takeit.app`. Pro přihlášení v appce na iPhonu nic dalšího vyplňovat nemusíš.
4. **Edge Functions → Deploy a new function → Via Editor** → název `push` → vlož obsah `supabase/functions/push/index.ts` → Deploy.
   - Volitelně: **Edge Functions → Secrets** přidej `PUSH_WEBHOOK_SECRET` (libovolné dlouhé heslo).
5. **Database → Webhooks → Create a new hook**
   - Tabulka `notifications`, událost **Insert**
   - Typ **Supabase Edge Functions** → funkce `push`
   - Pokud jsi nastavil secret: přidej HTTP hlavičku `x-webhook-secret` se stejnou hodnotou.
6. **Project Settings → API** – zkopíruj **Project URL** a **anon public** klíč (budou potřeba v kroku 3).

## 2. Apple

1. **App Store Connect → Apps → +** → New App: název `givo`, bundle ID `cz.takeit.app` (pokud ho nevidíš, vytvoř ho v developer.apple.com → Identifiers se zaškrtnutým **Sign in with Apple**).
2. V detailu appky (App Information) zkopíruj **Apple ID** appky (číslo) → to je `ASC_APP_ID`.
3. **Users and Access → Integrations → App Store Connect API → +** → role **App Manager** → stáhni `.p8` soubor (jde jen jednou!), zkopíruj **Key ID** a **Issuer ID**.
4. **Team ID** najdeš na developer.apple.com → Membership.

## 3. Expo (zdarma)

1. Účet na [expo.dev](https://expo.dev).
2. **Account settings → Access tokens → Create** → zkopíruj token.

## 4. GitHub Secrets

V repu **Settings → Secrets and variables → Actions → New repository secret**:

| Název | Hodnota |
|---|---|
| `EXPO_TOKEN` | token z Expo |
| `SUPABASE_URL` | Project URL ze Supabase |
| `SUPABASE_ANON_KEY` | anon public klíč ze Supabase |
| `ASC_API_KEY_P8` | celý obsah `.p8` souboru (včetně řádků BEGIN/END) |
| `ASC_KEY_ID` | Key ID |
| `ASC_ISSUER_ID` | Issuer ID |
| `ASC_APP_ID` | Apple ID appky z App Store Connect |
| `APPLE_TEAM_ID` | Team ID |
| `APPLE_TEAM_TYPE` | `INDIVIDUAL`, nebo `COMPANY_OR_ORGANIZATION` u firemního účtu |

## 5. Build a TestFlight

GitHub → **Actions → iOS build + TestFlight → Run workflow**. Build běží v cloudu Expo (~20–30 min), pak se sám nahraje do TestFlightu. V appce TestFlight si ho nainstaluješ.

Pokud první build spadne na vytváření certifikátů, je potřeba jednou spustit `eas credentials` z libovolného počítače (pak už CI pojede samo).

## 6. Před odesláním ke schválení

- `src/config.js` – e-mail podpory a odkazy na podmínky a zásady ochrany soukromí (musí existovat na webu).
- Vlastní ikona: nahraď `assets/icon.png` (1024×1024, bez průhlednosti) a `assets/splash.png`.
- V App Store Connect: popis, klíčová slova, screenshoty (iPhone 6,9″), kategorie Lifestyle, věkové hodnocení, App Privacy (sbíráme: jméno, telefon/Messenger pro kontakt, přibližnou polohu, fotky, identifikátor pro notifikace).

## Co appka splňuje kvůli pravidlům App Store

- Nahlášení inzerátu (po 3 nahlášeních se skryje automaticky) a zablokování uživatele
- Smazání účtu přímo v appce (Profil → Smazat účet)
- Kontakt na podporu v appce
- Přihlášení přes Apple
- Limity proti spamu (10 inzerátů / 20 žádostí denně)
- Přesná poloha se nikdy neukládá (zaokrouhlí se na ~500 m)

## Web (landing page, podmínky, GDPR) na Vercelu

Web je ve složce `web/` (čisté HTML/CSS, žádný build).

1. vercel.com → **Add New… → Project** → importuj repo `takeit2`.
2. **Root Directory** nastav na `web`, Framework Preset **Other**, nic dalšího → **Deploy**.
3. V Supabase SQL Editoru spusť `supabase/migrations/0004_waitlist.sql` (čekací listina z webu).
4. V `web/*.html` doplň žlutě zvýrazněné údaje (provozovatel, IČO, adresa, region Supabase) a v `src/config.js` nastav adresy `TERMS_URL`, `PRIVACY_URL` a `SUPPORT_EMAIL` na skutečné.

Stránky: `/`, `/podminky`, `/soukromi`, `/podpora`, `/smazani-uctu` (URL pro App Store: Support URL = `/podpora`, Privacy Policy URL = `/soukromi`).
E-maily z čekací listiny najdeš v Supabase → Table Editor → `waitlist`.
