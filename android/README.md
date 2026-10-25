# Wallet — Android app (native, Kotlin + Jetpack Compose)

A native Android client for the same FastAPI backend in `../backend`. It
talks to the backend's `/api` exactly as the web frontend does (cookie
session included), so the backend needs no changes to serve it.

## Building

GitHub Actions builds it on every push that touches `android/`
(`.github/workflows/android.yml`). The APK is attached to the run as the
`wallet-debug-apk` artifact: download it from the run's page, unzip, install.

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

## Layout

- `app/src/main/java/app/wallet/data` — API client (Retrofit + kotlinx.serialization), cookie persistence, server address
- `app/src/main/java/app/wallet/sms` — SMS receiver, upload worker, its settings
- `app/src/main/java/app/wallet/ui` — Compose screens and the theme (colours from `frontend/src/styles.css`)

## Roadmap

1. ✅ Project skeleton, CI build, login
2. ✅ Home (net, in/out, daily spend, categories, recent), transaction list with search and filter, transaction detail and delete, adding a transaction
3. ✅ SMS inbox (confirm, ignore, resolve by hand, paste), and reading bank SMS on the phone directly
4. Reports, people and splits, settings, themes
