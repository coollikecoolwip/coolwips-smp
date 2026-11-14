# CoolWips SMP Player Hub setup

The public website stays static on GitHub Pages. Its private backend runs on the Windows server PC and is reached through Oracle over the WireGuard tunnel.

## Website and backend

- Public site: `https://coolwip.xyz/hub.html`
- Backend API: `https://api.coolwip.xyz`
- The API provides staff login, private report tickets, staff ticket review, and the website's staff email sender.
- The browser contains no server credentials. The API accepts requests only from `https://coolwip.xyz` and `https://www.coolwip.xyz`.
- The client still calls the API through Supabase-compatible path names for compatibility; no Supabase service is required by this backend.

Run the API on Windows with Node 24 from the `backend` folder. During first setup, keep it bound to `127.0.0.1:48787` and visit `http://127.0.0.1:48787/setup` on the server PC. This one-time local page creates the owner login `admin@coolwip.xyz`. Choose a unique password of at least 16 characters. There is no public sign-up.

The database is `backend/data/coolwips.sqlite`. Back it up securely. It holds staff password hashes, report tickets, sessions, and send limits; it does not store the Minecraft world or plugin files.

## Amelu outbound email

Website staff messages are one plain-text recipient at a time, sent from the configured Amelu mailbox through its HTTPS API. The website allows 10 attempts per staff account per hour and 50 per rolling day across the site; Amelu applies its own sending limits and abuse rules.

Store the Amelu API key in the same Windows user's Credential Manager by running `secrets.ps1 store` in that user's PowerShell. It prompts with hidden input; never paste the key into this repository, website config, or chat. The backend reads the key from Credential Manager at send time. Set only the non-secret mailbox ID in the backend process environment as `AMELU_MAILBOX_ID`. Run the backend as the same Windows account that stored the credential.

## Public routing

The Oracle VM is the public entry point at `129.80.8.78`. `api.coolwip.xyz` resolves to that address. Oracle Nginx terminates Let's Encrypt HTTPS and proxies to `10.66.66.2:48787` through WireGuard; the backend port itself is not exposed publicly. HTTP on port 80 redirects to HTTPS and supports certificate renewal. The public HTTPS `/healthz` endpoint has returned 200.

## Incoming mailboxes

This backend does not host mailboxes. A separate mail server such as Stalwart must be installed on Windows and routed through the Oracle VM. Oracle Free Tier blocks outbound SMTP port 25, so this arrangement cannot send directly to other mail servers. Incoming mail can be tested first on `mailcheck.coolwip.xyz`; keep the existing `coolwip.xyz` Amelu MX and mail records unchanged until the local mail server is verified and messages are migrated.

Mailbox count and incoming storage on a local mail server are limited by the PC's available disk and reliability, rather than an Amelu mailbox-plan cap. The existing Windows 10 installation is out of Microsoft support; use a supported Windows release before exposing a mail service publicly.

## Player data

- Java status uses the configured Java host and port.
- Modern Bedrock NetherNet status may be unavailable to legacy UDP probes; verify with a real Bedrock join.
- Player statistics and market prices are static JSON feeds under `assets/data`; publish only consented public data.
- Reports contain private details. Staff access is restricted by server-side login and the local database.
