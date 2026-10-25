# Wallet — Android app (native, Kotlin + Jetpack Compose)

A native Android client for the same FastAPI backend in `../backend`. It
talks to the backend's `/api` exactly as the web frontend does (cookie
session included), so the backend needs no changes to serve it.

## Building

GitHub Actions builds it on every push that touches `android/`
(`.github/workflows/android.yml`). The APK is attached to the run as the
`wallet-debug-apk` artifact: download it from the run's page, unzip, install.

### Signed release APK (optional)

Make a keystore once and keep it safe — every update must be signed with the
same one, or Android refuses to install it over the old app:

```bash
keytool -genkeypair -v -keystore wallet.jks -alias wallet -keyalg RSA -keysize 2048 -validity 10000
base64 -w0 wallet.jks   # macOS: base64 -i wallet.jks
```

Then add these repository secrets (Settings → Secrets and variables → Actions):

| Secret | Value |
| --- | --- |
| `WALLET_KEYSTORE_BASE64` | the base64 output above |
| `WALLET_KEYSTORE_PASSWORD` | the keystore password |
| `WALLET_KEY_ALIAS` | `wallet` (or the alias you chose) |
| `WALLET_KEY_PASSWORD` | the key password |

Every run then also produces `wallet-release-apk`, and publishing a GitHub
release attaches the signed APK to it. Without the secrets only the debug
APK is built.

### Push notifications (optional)

Server push needs Firebase on both ends. The server side is the same as for
the web app (see the root README). For the phone, add an **Android app** with
package name `app.wallet` to the same Firebase project, and copy from its
`google-services.json` into repository secrets:

| Secret | From `google-services.json` |
| --- | --- |
| `WALLET_FIREBASE_APP_ID` | `client[0].client_info.mobilesdk_app_id` |
| `WALLET_FIREBASE_API_KEY` | `client[0].api_key[0].current_key` |
| `WALLET_FIREBASE_PROJECT_ID` | `project_info.project_id` |
| `WALLET_FIREBASE_SENDER_ID` | `project_info.project_number` |

Without them the app builds with server push off (Settings says so); the
local notification for a new bank SMS works either way.

Locally (needs JDK 17 and the Android SDK, e.g. via Android Studio):

```bash
cd android
./gradlew assembleDebug
```

## Using it

On first launch, enter the server address — the same one you open in the
browser (e.g. `wallet.example.com`, or `192.168.1.10:8000` for a server on
your home network) — and your username and password. An address without
`http://`/`https://` gets `https://`, except a bare IP or `localhost`, which
gets `http://`.

## Reading bank SMS on the phone

SMS tab → settings (gear): turn on automatic reading, and give it the
webhook API token — paste the one from the web app's settings, or make a new
one there (the old token then stops working, so any forwarder app using it
needs the new one too). Each bank SMS is posted to `/api/ingest/sms`, exactly
as a forwarder app would, and lands in the inbox to confirm.

Only messages whose sender contains the `sender_match` of an enabled SMS
pattern on the server leave the phone — the same rule the server parses with.
Anything else stays on the device, since a message no pattern reads is kept on
the server with its text. Uploads wait for a network and retry, so a message
received offline still arrives.

Google Play only allows SMS permissions for default SMS apps, so this app is
meant to be installed from the APK, not published there.

## Themes and design families

The seven themes come from the web app and, like there, each belongs to a
design family with its own layout, not just its own colours: classic (the
original look), Wallet Dark (pure black, no cards, thin oversized numbers,
mono amounts, text tabs, an icon-only tab bar) and Wallet Soft (grey canvas,
white shadowed cards, round buttons, a swipeable stack of bank cards, a
floating tab bar). `ui/design` holds the blocks every screen draws from in the
active family; screens with a layout of their own per family (home,
transactions, people, a person, reports) pick it with `family`.

## Language

Persian by default, English from Settings → Language — strings in
`res/values` (Persian) and `res/values-en` (English); every key needs both.
Dates are Jalali in either language.

## Layout

- `app/src/main/java/app/wallet/data` — API client (Retrofit + kotlinx.serialization), cookie persistence, server address
- `app/src/main/java/app/wallet/sms` — SMS receiver, upload worker, its settings
- `app/src/main/java/app/wallet/notify` — notification channels, Firebase push
- `app/src/main/java/app/wallet/offline` — the queue for transactions saved offline
- `app/src/main/java/app/wallet/util` — formatting (`Fmt`), the Jalali calendar, the app language
- `app/src/main/java/app/wallet/ui` — Compose screens and the theme (colours from `frontend/src/styles.css`)

## Roadmap

1. ✅ Project skeleton, CI build, login
2. ✅ Home (net, in/out, daily spend, categories, recent), transaction list with search and filter, transaction detail and delete, adding a transaction
3. ✅ SMS inbox (confirm, ignore, resolve by hand, paste), and reading bank SMS on the phone directly
4. ✅ Themes (all seven from the web app) and settings: accounts, categories, budgets (with this month's progress on home), logout
5. ✅ People (balances, debts with partial or full settlement, shared transactions), splitting a transaction (equal, by amount, by percent), reports (income vs expense, spend over time, categories, month over month, by account)
6. ✅ Jalali date and time picker, editing transactions, offline queue for new ones, SMS pattern editor with a live test, notifications (new bank SMS; server push with Firebase), English, signed release builds
