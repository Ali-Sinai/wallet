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

## Layout

- `app/src/main/java/app/wallet/data` — API client (Retrofit + kotlinx.serialization), cookie persistence, server address
- `app/src/main/java/app/wallet/ui` — Compose screens and the theme (colours from `frontend/src/styles.css`)

## Roadmap

1. ✅ Project skeleton, CI build, login
2. Dashboard, transaction list, adding a transaction
3. SMS inbox, and reading bank SMS on the phone directly
4. Reports, people and splits, settings, themes
