// Builds the Android project for RAP LIFE. Run it from android-app/:  npm run setup
// GitHub Actions runs this for you (see ../.github/workflows/android-apk.yml).
//
// It: reads the game's web address, makes the app icon, generates the Android
// project with Capacitor, then applies the few changes that make it a good game
// app: landscape, full screen (no status/navigation bars), microphone permission,
// screen kept awake. Every change is checked, so a build can never quietly come
// out in portrait or without the microphone.

import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

process.chdir(path.resolve(import.meta.dirname, '..'));

const APP_ID = 'com.raplife.game'; // permanent once players install the app: never change it
const APP_NAME = 'RAP LIFE';
const BG = '#0A0B10';
// 'sensorLandscape' = either way round, locked sideways. Use 'fullSensor' to let the
// phone turn freely (menus read better upright; the city plays best sideways).
const ORIENTATION = 'sensorLandscape';

const log = (m) => console.log(`\n▶ ${m}`);
const run = (cmd) => execSync(cmd, { stdio: 'inherit' });
const read = (f) => fs.readFileSync(f, 'utf8');
const must = (cond, msg) => { if (!cond) throw new Error(`setup failed: ${msg}`); };

// ── 1. where the game lives ────────────────────────────────────────────────
function gameAddress() {
  const fromEnv = (process.env.GAME_URL || '').trim();
  const fromFile = fs.existsSync('game-url.txt') ? read('game-url.txt').split('\n')[0].trim() : '';
  const url = (fromEnv || fromFile).replace(/\/+$/, '');
  const ok = /^https:\/\/[^\s/]+(\/\S*)?$/.test(url) && !/REPLACE/i.test(url);
  return { url: ok ? url : 'https://game-address-not-set.invalid', ok };
}

// ── 2. icon and splash, drawn from assets-src/ (no fonts needed) ───────────
async function makeArt() {
  fs.mkdirSync('assets', { recursive: true });
  const fg = await sharp('assets-src/icon-foreground.svg', { density: 288 }).resize(1024, 1024).png().toBuffer();
  const bg = await sharp({ create: { width: 1024, height: 1024, channels: 4, background: BG } }).png().toBuffer();
  fs.writeFileSync('assets/icon-foreground.png', fg);
  fs.writeFileSync('assets/icon-background.png', bg);
  fs.writeFileSync('assets/icon-only.png', await sharp(bg).composite([{ input: fg }]).png().toBuffer());
  const logo = await sharp(fg).resize(1100, 1100).png().toBuffer();
  const splash = await sharp({ create: { width: 2732, height: 2732, channels: 4, background: BG } })
    .composite([{ input: logo, gravity: 'center' }]).png().toBuffer();
  fs.writeFileSync('assets/splash.png', splash);
  fs.writeFileSync('assets/splash-dark.png', splash);
}

// ── 3. the changes that make it a game app ─────────────────────────────────
function patchManifest() {
  const f = 'android/app/src/main/AndroidManifest.xml';
  let x = read(f);
  x = x.replace(/<activity\b([^>]*)>/, (_m, attrs) => {
    let a = attrs;
    a = /android:screenOrientation=/.test(a)
      ? a.replace(/android:screenOrientation="[^"]*"/, `android:screenOrientation="${ORIENTATION}"`)
      : `${a}\n            android:screenOrientation="${ORIENTATION}"`;
    if (!/android:windowSoftInputMode=/.test(a)) a += '\n            android:windowSoftInputMode="adjustResize"';
    return `<activity${a}>`;
  });
  // The studio records your voice: the game asks the browser for the microphone,
  // and Android only allows that if the app declares it.
  for (const p of ['android.permission.RECORD_AUDIO', 'android.permission.MODIFY_AUDIO_SETTINGS']) {
    if (!x.includes(p)) x = x.replace('</manifest>', `    <uses-permission android:name="${p}" />\n</manifest>`);
  }
  if (!x.includes('android.hardware.microphone')) {
    x = x.replace('</manifest>', '    <uses-feature android:name="android.hardware.microphone" android:required="false" />\n</manifest>');
  }
  fs.writeFileSync(f, x);
  const check = read(f);
  must(check.includes(`android:screenOrientation="${ORIENTATION}"`), 'orientation was not applied to the manifest');
  must(check.includes('android.permission.RECORD_AUDIO'), 'microphone permission was not added');
}

function patchMainActivity() {
  const f = `android/app/src/main/java/${APP_ID.replace(/\./g, '/')}/MainActivity.java`;
  must(fs.existsSync(f), `MainActivity.java not found at ${f}`);
  fs.writeFileSync(f, `package ${APP_ID};

import android.os.Bundle;
import android.view.WindowManager;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.core.view.WindowInsetsControllerCompat;
import com.getcapacitor.BridgeActivity;

/** Full-screen game: no status bar, no navigation bar (a swipe from the edge shows them briefly). */
public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        hideSystemBars();
    }

    @Override
    public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);
        if (hasFocus) hideSystemBars();
    }

    private void hideSystemBars() {
        WindowInsetsControllerCompat controller =
            WindowCompat.getInsetsController(getWindow(), getWindow().getDecorView());
        controller.setSystemBarsBehavior(WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE);
        controller.hide(WindowInsetsCompat.Type.systemBars());
    }
}
`);
}

function patchVersion() {
  // Android only installs an update over an older copy if versionCode goes up.
  const f = 'android/app/build.gradle';
  const code = Number(process.env.GITHUB_RUN_NUMBER || 1);
  let t = read(f);
  t = t.replace(/versionCode\s+\d+/, `versionCode ${code}`).replace(/versionName\s+"[^"]*"/, `versionName "1.0.${code}"`);
  fs.writeFileSync(f, t);
  must(new RegExp(`versionCode ${code}\\b`).test(read(f)), 'versionCode was not set in build.gradle');
  return code;
}

// ── go ─────────────────────────────────────────────────────────────────────
const { url, ok } = gameAddress();
log(ok ? `Game address: ${url}` : 'Game address is NOT set yet. Building with a placeholder (see README.md, step 1).');

log('Writing capacitor.config.json');
fs.writeFileSync('capacitor.config.json', JSON.stringify({
  appId: APP_ID,
  appName: APP_NAME,
  webDir: 'www',
  backgroundColor: BG,
  server: { url, cleartext: false, errorPath: 'offline.html' },
  android: { backgroundColor: BG, allowMixedContent: false, webContentsDebuggingEnabled: false },
}, null, 2));

log('Giving the offline page the game address (it retries until the server wakes)');
fs.writeFileSync('www/offline.html', read('www/offline.html').replace(/var GAME = '[^']*'/, `var GAME = '${ok ? url : ''}'`));

log('Drawing the app icon and splash screen');
await makeArt();

if (!fs.existsSync('android')) {
  log('Creating the Android project');
  run('npx cap add android');
}

log('Making icon sizes for Android');
run(`npx capacitor-assets generate --android --iconBackgroundColor "${BG}" --iconBackgroundColorDark "${BG}" --splashBackgroundColor "${BG}" --splashBackgroundColorDark "${BG}"`);

log(`Applying game settings (${ORIENTATION}, full screen, microphone)`);
patchManifest();
patchMainActivity();
const versionCode = patchVersion();

log('Syncing');
run('npx cap sync android');

if (process.env.GITHUB_ENV) {
  fs.appendFileSync(process.env.GITHUB_ENV, `GAME_URL_OK=${ok}\nAPP_VERSION_CODE=${versionCode}\n`);
}
console.log(`\n✔ Android project ready (version code ${versionCode}).`);
