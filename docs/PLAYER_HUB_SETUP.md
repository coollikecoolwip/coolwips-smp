# CoolWips SMP Player Hub - setup notes

Live page: `https://coolwip.xyz/hub.html`. Site is static and remains on GitHub Pages.

## Ready immediately
- Status: Java `play.coolwip.xyz`, Bedrock `bedrock.coolwip.xyz:19132` (custom Playit hostname provided by the owner). If the public Bedrock UDP port changes, edit `assets/hub-config.js` and homepage joining details. Java checks use mcstatus.io; Bedrock checks use the NetherNet-aware iceFetch `/api/info` endpoint. Bedrock checks may show “Status unavailable” if the external signaling endpoint is not reachable or the service cannot be read from a browser. Treat that as unknown, not offline.
- Join guide/copy, search/filter UI, profile avatar search, published news/events.
- Report submission falls back to a mail draft (not a saved ticket) while the secure backend isn't configured. The configured recipient is `admin@coolwip.xyz`; verify that mailbox exists in Amelu before relying on it.
- The staff portal remains locked until database authentication is configured. Staff Email opens Amelu Webmail; no mailbox passwords touch GitHub Pages.
- The staff email composer in this feature branch sends one plain-text message at a time through the authenticated `send-staff-email` Edge Function. The configured Amelu mailbox is the sender; no sender address can be supplied by the browser. Attachments and bulk recipients are not supported.

## Publish real player statistics
Edit `assets/data/players.json`:
```json
{"updatedAt":"2026-11-11T12:00:00Z","players":[
 {"name":"EXAMPLE_USERNAME","balance":1234,"kills":3,"playtimeHours":12}
]}
```
Replace the example username and values with real, consented public data; never publish server tokens or private data. The live page reads this JSON at page load. For automatic updates, schedule a **server-side** public JSON export from your Paper plugin/economy source, then use a tightly scoped GitHub token on your Windows server to commit only the public JSON file. Store that token in the server's secrets store, never here. Do not expose UnbelievaBoat bank credentials or Minecraft server internals.

## Publish market prices
Edit `assets/data/market.json`:
```json
{"updatedAt":"2026-11-11T12:00:00Z","items":[
 {"name":"EXAMPLE_ITEM","category":"Resources","buy":100,"sell":75,"changePct":-5.0}
]}
```
Use actual prices from the CoolWips economy export. Empty feeds intentionally display "not connected" instead of fictitious stats.

## Publish news and events
Edit `assets/data/updates.json`. Each `updates` entry has `date`, `category`, `title`, `description`. Add `events` entries with the same fields and real scheduled dates. No made-up future event is shown.

## Enable real report tickets and staff dashboard (optional, free-tier possible)
1. Create a Supabase project at https://supabase.com . Review current usage limits and anti-spam measures.
2. Run `docs/SUPABASE_SETUP.sql` in the SQL editor. **Inspect RLS/policies before enabling the public form.**
3. Use Supabase Authentication to invite/create your staff users, then add approved user UUIDs to `public.staff_members` in the SQL editor. This is **not** their Amelu email password. Never grant access based on a guessed username or email.
4. Copy the project URL and **publishable key** (not service_role, secret, or database password) into `assets/hub-config.js`.
5. In Auth settings, configure permitted app origins and limit unsolicited account creation; test staff sign-in and both a public report and ticket lookup before sharing widely.
6. The public report form uses `submit_report` (returns a private code). Visitors only see status via `report_status`; the full report is stored in a private table with Row Level Security. Only manually approved staff accounts can read and update it.
7. For high-volume deployment add CAPTCHA/Cloudflare Turnstile validation in an Edge Function, request throttling, and audit logs; the basic SQL throttle alone is not abuse-proof.
8. Staff passwords/tokens are never saved in this repository; dashboard sessions stay in browser memory and end on reload.
9. Apply `docs/SUPABASE_EMAIL_SETUP.sql` after `docs/SUPABASE_SETUP.sql`. Keep the `verify_jwt = false` setting in `supabase/config.toml`: the handler validates the bearer token with Supabase Auth's `getUser` call and separately checks the staff allowlist.
10. In Supabase Edge Function Secrets, add `AMELU_API_KEY` and `AMELU_MAILBOX_ID`. Create the Amelu API key under My Account → API Keys and use the ID of the one mailbox that should send. Amelu API keys act with the creator's organization role and are server-only; do not put the key in `assets/hub-config.js`, GitHub, browser code, or chat. The Edge Function keeps the key in server secrets.
11. Configure only `https://coolwip.xyz` and `https://www.coolwip.xyz` as allowed web origins (already enforced by the function), then test sign-in and a one-recipient message. The site limits each staff user to 10 sends per hour and the whole site to 50 per 24 hours; Amelu has its own daily limits too. Check Amelu Sent before retrying if a network error says the send could not be confirmed.

## Testing
1. Verify `coolwip.xyz` DNS/HTTPS in GitHub Pages Settings. Do not alter MX/SPF/DKIM/DMARC for this site.
2. Test `hub.html#status`, `#join`, `#leaderboards`, `#market`, `#players`, `#reports`, `#staff`, `#updates` on desktop and mobile.
3. If Bedrock says “Status unavailable”, test a real Bedrock join before assuming the server is down. Modern NetherNet tunnels do not respond to legacy RakNet UDP pings, and third-party probes can fail.
4. Keep player coordinates, homes, claim locations, IPs, passwords and auth tokens private.
