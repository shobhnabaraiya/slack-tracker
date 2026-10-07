# Plan: port the 3 missing pieces from `slack-logs-pro` into `slack-tracker`

Source of comparison: `~/dexlyn/slack-log-code/slack-logs-pro` (v3.0.1, Apr 16) vs this repo (v4.0.5).
Everything else in `slack-logs-pro` is older than this repo and must NOT be copied over
(that was tried in commit `30e66b7` and reverted in `a8576e6`).

Scope:

1. Environment-variable fallback config (library: `index.js`, `browser.js`)
2. README: restore the `slack.raw()` button example + preview image
3. Demo: scoped per-request webhook override + demo package name

Out of scope: any API removal, changing `slackLogConfig()` signature, publishing to npm.

---

## Decisions baked into this plan (flag before implementing if you disagree)

- **D1 – Precedence:** explicit `slackLogConfig()` value → env var / `globalThis` → built-in default.
  `slackLogConfig()` stays the primary, documented API; env vars are a fallback only.
- **D2 – Remove the hard "not configured" error.** With env/default fallbacks, "no `slackLogConfig()` call"
  is no longer an error by itself. Delete `MISSING_CONFIG_MESSAGE` + `hasSlackConfig()` from both files.
  The server still errors via `MISSING_WEBHOOK_MESSAGE` when no webhook URL is found anywhere.
  The browser works zero-config again (posts to `/api/slack-tracker`), same as v3.
- **D3 – Legacy webhook env names kept, server-side only.** `NEXT_PUBLIC_SLACK_WEBHOOK_URL` and
  `PUBLIC_SLACK_SLACK_WEBHOOK_URL` are still read by `index.js` so v3 users don't break on upgrade, but the
  README documents only `SLACK_WEBHOOK_URL` and warns against public-prefixed webhook vars.
  `browser.js` never reads any webhook URL.
- **D4 – Version bump to `4.1.0`** (new backward-compatible behavior).
- **D5 – Add a `repository` field to `package.json`** so the README's relative image path renders on npmjs.com.

---

## Step 1 — `index.js` (server/main build)

### 1a. Replace the config block (current lines 46–91)

```js
const WEBHOOK_ENV_NAMES = [
  "SLACK_WEBHOOK_URL",
  "NEXT_PUBLIC_SLACK_WEBHOOK_URL",
  "PUBLIC_SLACK_SLACK_WEBHOOK_URL",
];

const PROXY_URL_ENV_NAMES = [
  "NEXT_PUBLIC_SLACK_LOGS_PROXY_URL",
  "PUBLIC_SLACK_LOGS_PROXY_URL",
  "SLACK_LOGS_PROXY_URL",
];

const MISSING_WEBHOOK_MESSAGE =
  "🚨 Slack webhook URL is missing. Call slackLogConfig({ webhookUrl }) or set the SLACK_WEBHOOK_URL env var. 🚨";

let slackConfig = null;

function isBrowserEnvironment() {
  return typeof window !== "undefined";
}

function getEnvValue(name) {
  if (typeof process === "undefined" || !process.env) {
    return undefined;
  }

  return process.env[name];
}

function getFirstEnvValue(names) {
  for (const name of names) {
    const value = getEnvValue(name);

    if (value) {
      return value;
    }
  }

  return undefined;
}

function slackLogConfig(config = {}) {
  slackConfig = {
    webhookUrl: config.webhookUrl || config.weebhookUrl,
    enable: config.enable,
    proxy_url: config.proxy_url,
  };

  return slackConfig;
}

function getProxyUrl() {
  return (
    slackConfig?.proxy_url ||
    globalThis.SLACK_LOGS_PROXY_URL ||
    getFirstEnvValue(PROXY_URL_ENV_NAMES) ||
    DEFAULT_PROXY_URL
  );
}

function getWebhookUrl() {
  return slackConfig?.webhookUrl || getFirstEnvValue(WEBHOOK_ENV_NAMES);
}

function isValidSlackWebhookUrl() {
  const webhookUrl = getWebhookUrl();
  return Boolean(webhookUrl && webhookUrl.startsWith("https://"));
}

function isSlackLogsEnabled() {
  if (typeof slackConfig?.enable === "boolean") {
    return slackConfig.enable;
  }

  return (getEnvValue("ENABLE_SLACK_LOGS") ?? "true").toString() !== "false";
}
```

Notes:
- `enable` is now stored as given (not coerced with `!== false`) so an omitted `enable` falls through to
  `ENABLE_SLACK_LOGS`. `slackLogConfig({ enable: false })` still disables; `slackLogConfig({})` with no env
  is still enabled — same results as today when the env var is unset.
- `MISSING_CONFIG_MESSAGE` and `hasSlackConfig()` are deleted (D2).

### 1b. Remove every `hasSlackConfig()` gate

Delete these blocks (and nothing else around them):
- `sendSlackMessage` — the `if (!hasSlackConfig()) { return false; }` block.
- `sendProxyRequest` — the `if (!hasSlackConfig()) { return null; }` block.
- `handleSlackLogsRequest` — the `if (!hasSlackConfig()) { return { …500, MISSING_CONFIG_MESSAGE } }` block.
- `slack.log`, `slack.logBlockMessage`, `slack.raw` — the `if (!hasSlackConfig()) { return null; }` block in each.

### 1c. Bug fix while in `sendProxyRequest`

Today the browser path of `index.js` ignores `enable: false` (only `browser.js` checks it). Add at the top of
`sendProxyRequest`:

```js
  if (!isSlackLogsEnabled()) {
    return false;
  }
```

## Step 2 — `browser.js`

Replace the config block (current lines 21–56: `MISSING_CONFIG_MESSAGE` through the `enable === false` check
inside `sendProxyRequest`) so it reads:

```js
let slackConfig = null;

function slackLogConfig(config = {}) {
  slackConfig = {
    webhookUrl: config.webhookUrl || config.weebhookUrl,
    enable: config.enable,
    proxy_url: config.proxy_url,
  };

  return slackConfig;
}

// Static `process.env.X` references (not `process.env[name]`) so bundlers like
// Next.js/webpack can inline them; throws in plain browsers, hence the try.
function readEnv(read) {
  try {
    return read();
  } catch {
    return undefined;
  }
}

function getProxyUrl() {
  return (
    slackConfig?.proxy_url ||
    globalThis.SLACK_LOGS_PROXY_URL ||
    readEnv(() => process.env.NEXT_PUBLIC_SLACK_LOGS_PROXY_URL) ||
    readEnv(() => process.env.PUBLIC_SLACK_LOGS_PROXY_URL) ||
    readEnv(() => process.env.SLACK_LOGS_PROXY_URL) ||
    DEFAULT_PROXY_URL
  );
}

async function sendProxyRequest(body) {
  if (slackConfig?.enable === false) {
    return false;
  }

  return fetch(getProxyUrl(), {
    // …unchanged…
```

Why static references: `slack-logs-pro` used `process.env[name]`, which Next.js never inlines into client
bundles, so `NEXT_PUBLIC_SLACK_LOGS_PROXY_URL` silently didn't work in the browser there.

## Step 3 — `index.d.ts`

No signature changes. Add a global declaration so TS users can set the proxy override without casting:

```ts
declare global {
  // eslint-disable-next-line no-var
  var SLACK_LOGS_PROXY_URL: string | undefined;
}
```

(File already uses `export`, so it is a module and `declare global` is valid.)

## Step 4 — `README.md`

1. **Features list:** add `- Zero-config fallback via environment variables`.
2. **Configuration section:**
   - Replace the sentence "If `slackLogConfig()` is not called before logging, the package prints a console
     error and skips the log." with a new subsection:

     ````md
     ### Environment variables (optional fallback)

     If a value is not passed to `slackLogConfig()`, the package falls back to environment variables.
     `slackLogConfig()` values always win.

     ```env
     SLACK_WEBHOOK_URL="https://hooks.slack.com/services/XXX/YYY/ZZZ"
     ENABLE_SLACK_LOGS=true
     NEXT_PUBLIC_SLACK_LOGS_PROXY_URL="/api/slack-tracker"
     ```

     - `SLACK_WEBHOOK_URL` — server only. Never expose the webhook through a `NEXT_PUBLIC_` / `PUBLIC_` variable.
     - `ENABLE_SLACK_LOGS` — set `false` to disable logs (server).
     - `NEXT_PUBLIC_SLACK_LOGS_PROXY_URL` / `PUBLIC_SLACK_LOGS_PROXY_URL` / `SLACK_LOGS_PROXY_URL` — browser proxy route.
       In plain browser apps you can also set `globalThis.SLACK_LOGS_PROXY_URL = "/api/logs/slack"`.

     If no webhook URL is found in either place, server-side logs print a console error and are skipped.
     ````
   - Fix the "Type:" block: `webhookUrl?: string`, `enable?: boolean`, `proxy_url?: string`.
3. **Raw Slack Payload section:** after its existing example, add a `### Button example` subsection with
   `![slack.raw button preview](./assets/slack-raw-button-preview.svg)`, the full button `slack.raw({...})`
   example copied verbatim from `slack-logs-pro/README.md` lines 93–147 (use `await slack.raw(`), and the
   closing line: "If you want button clicks to do something, enable Slack app interactivity and handle the
   `block_actions` payload for each `action_id`."
4. **Browser Usage section:** note that `slackLogConfig()` is optional in the browser (default proxy
   `/api/slack-tracker`, enabled).
5. **API → `slackLogConfig(config)`:** replace "Call this before `slack.log`, …" with "Optional when the
   environment variables above are set; call it once at startup to override them."

## Step 5 — `package.json`

- `"version": "4.1.0"` (D4).
- Add (D5):
  ```json
  "repository": {
    "type": "git",
    "url": "git+https://github.com/shobhnabaraiya/slack-tracker.git"
  },
  ```
  No change to `files` — `scripts/build-dist.js` already copies `assets/` into `dist/`.

## Step 6 — Demo (`demo/index.js`, `demo/package.json`)

### 6a. Scoped per-request override (ports `withWebhookUrlOverride` from `slack-logs-pro`, without mutating `process.env`)

Add next to `configureSlackLogs`:

```js
async function withWebhookUrl(webhookUrl, action) {
  configureSlackLogs(getActiveWebhookUrl(webhookUrl));

  try {
    return await action();
  } finally {
    configureSlackLogs(demoConfig.webhookUrl);
  }
}
```

In `handleDemoRequest` and `handleProxyRequest`, replace the `configureSlackLogs(webhookUrl);` + direct call
with `await withWebhookUrl(body.webhookUrl, () => runServerDemo(body.kind))` /
`await withWebhookUrl(body.webhookUrl, () => handleSlackLogsRequest(body))`. Keep the
`const webhookUrl = getActiveWebhookUrl(body.webhookUrl);` line — it's still used for the JSON response.

### 6b. `demo/package.json`

Restore `"name": "slack-tracker-demo"` and remove the `"version": "4.0.4"` line (the demo currently shares
the library's name, which is confusing; `slack-logs-pro` used `slack-tracker-demo`).
Bump the dependency to `"slack-tracker": "^4.1.0"`.

## Step 7 — Verification

1. **Unit-style smoke script** (in the session scratchpad, not the repo) that requires `../index.js`,
   monkey-patches `require("axios").post` to record calls, and asserts:
   - no config + `SLACK_WEBHOOK_URL=https://a` → posts to `https://a`
   - `slackLogConfig({ webhookUrl: "https://b" })` + env `https://a` → posts to `https://b`
   - no config + `ENABLE_SLACK_LOGS=false` → returns `false`, no post
   - `slackLogConfig({ enable: true })` + `ENABLE_SLACK_LOGS=false` → posts (explicit wins)
   - no config, no env → `console.error(MISSING_WEBHOOK_MESSAGE)`, returns `null`, no post
   - `handleSlackLogsRequest({ type: "log", … })` with no webhook → `{ success: false, status: 500 }`
   - browser path of `index.js` (`globalThis.window = {}`, stub `fetch`) with `enable: false` → no fetch (Step 1c)
   - `browser.js`: no config → fetch to `/api/slack-tracker`; `globalThis.SLACK_LOGS_PROXY_URL` → used;
     `enable: false` → no fetch.
2. `npm run build` → `dist/` has `index.js`, `browser.js`, `index.d.ts`, `assets/slack-raw-button-preview.svg`.
3. `npm pack --dry-run` → tarball lists only `dist/**`, `README.md`, `package.json`, `LICENSE` (if any).
4. `node --check` on `index.js`, `browser.js`, `demo/index.js`.
5. Demo: its installed `demo/node_modules/slack-tracker` is currently **3.0.0** (no `slackLogConfig` export,
   demo crashes on start). Run the demo against the local build via a preload that maps `slack-tracker` →
   `../dist/index.js` (scratchpad script), start it, and `curl` `/api/demo` and `/api/slack-tracker`
   with axios stubbed — confirm per-request override is used and reverted afterwards.

## Step 8 — Cleanup before any publish

`scripts/release-git.js` runs `git add -A` on `postpublish`, so **delete this `implement.md`** (or add it to
`.gitignore`) before `npm publish`, otherwise it gets committed and pushed with the release.

## Risks

- Behavior change: apps that relied on the "not configured" console error to detect a missing
  `slackLogConfig()` call will now silently use env/defaults. Low impact; documented in README.
- Legacy `NEXT_PUBLIC_SLACK_WEBHOOK_URL` support keeps a footgun alive for v3 users; mitigated by README warning
  and by never reading it in `browser.js`.
