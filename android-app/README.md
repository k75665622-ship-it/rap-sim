# RAP LIFE for Android

This turns the RAP LIFE website into an Android app: full screen, landscape, with the
microphone for the studio. The app opens your live game, so every website update
reaches the app by itself. The website stays as it is, for iPhones and laptops.

GitHub builds the app for you. There is nothing to install on your computer.

## Set it up (three steps, once)

**1. Where your game lives.** Already set to `https://rap-sim.onrender.com` in `game-url.txt`. If your address ever changes, edit that file (or set a `GAME_URL` repository variable under Settings → Secrets and variables → Actions → Variables, which wins over the file).

**2. Build the app.**
Open the **Actions** tab, choose **Android app (APK)**, press **Run workflow**. It takes
about ten minutes. When it turns green the app is ready.

**3. Put it on a phone.**
On the phone open
`https://github.com/k75665622-ship-it/rap-sim/releases/download/android-latest/RapLife.apk`
(the same file is under **Releases**). Open the downloaded file. Android asks to allow
installs from this source: allow it, then Install. In the studio, allow the microphone
when Android asks.

You can put that link on your website so players can get the app.

## Updates

- **Game changes** (anything you deploy to Render) show up in the app automatically.
- **App changes** (icon, name, orientation) need step 2 again.
- To update over an installed copy, Android needs both copies signed with the **same
  key**. Until you set up a permanent key (next section) every build uses a different
  temporary key, so players would have to uninstall first. Uninstalling loses saves that
  only live on that phone. Saves in an online account are safe.

## Permanent signing key (do this before sharing the app widely)

On any computer with Java installed:

```
keytool -genkeypair -v -keystore raplife.keystore -alias raplife -keyalg RSA -keysize 2048 -validity 10000
base64 -w0 raplife.keystore        # on a Mac: base64 -i raplife.keystore
```

Then add four **secrets** (same page as the variable, **Secrets** tab):
`ANDROID_KEYSTORE_BASE64` (the long text from the second command),
`ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS` (`raplife`), `ANDROID_KEY_PASSWORD`.

Keep a backup of `raplife.keystore` somewhere safe and never put it in the repo. If you
lose it you can never update installed apps. Once the secrets exist, builds use them
automatically.

## Good to know

- **Landscape is locked.** To let the phone turn freely, change `ORIENTATION` in
  `scripts/setup.mjs` to `'fullSensor'`.
- **Full screen.** Swipe from the screen edge to show the phone's bars for a moment.
- **It needs internet.** On Render's free plan the server sleeps after about 15 minutes
  without visitors, so the first launch after a pause can take about a minute. A free
  uptime monitor that opens `/api/health` every 5 minutes keeps it awake.
- **Not on Google Play, by choice.** From 2027 Google is rolling out developer
  verification for apps installed from outside the Play Store. Check the Android Developer
  Console for the current steps for apps you share yourself.
- **The app ID `com.raplife.game` is permanent.** Never change it after players install.
- **The icon** is a placeholder drawn from `assets-src/icon-foreground.svg`. Replace that
  file to change it.

## What is in this folder

| File | What it does |
| --- | --- |
| `scripts/setup.mjs` | Creates the Android project and applies the game settings |
| `game-url.txt` | The game address, if you prefer a file to the `GAME_URL` variable |
| `www/` | The tiny local pages: a start screen and a "can't reach the game" page |
| `assets-src/` | The icon artwork |
| `../.github/workflows/android-apk.yml` | The cloud build |
