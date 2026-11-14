# CoolWips self-hosted website API

This Node 24 API replaces the managed Supabase backend for the existing player hub calls. It provides staff sign-in, private report tickets, staff ticket review, and staff email. It stores data in local SQLite and does not touch Minecraft server files.

## First start

Run from a normal Windows account, not as Administrator:

```powershell
Set-Location .\backend
$env:BACKEND_HOST = '127.0.0.1'
$env:BACKEND_PORT = '8787'
node .\server.mjs
```

On that PC, open `http://127.0.0.1:8787/setup` once to create the owner login `admin@coolwip.xyz`. Choose a unique password of at least 16 characters. The setup page works only from localhost and closes after the first staff account is created.

## Email secret

Run `secrets.ps1 store` in the same Windows user's PowerShell. It prompts for the Amelu API key with hidden input and stores it in that user's Windows Credential Manager. The API retrieves the key privately when needed. Set only the non-secret `AMELU_MAILBOX_ID` environment variable. Do not place the key in website JavaScript, Git, or chat.

Website sending is plain text, single-recipient, and limited locally to 10 attempts per staff user per hour and 50 per rolling 24 hours. Amelu applies its own sending limits and acceptable-use rules.

## Production routing

The website files remain on GitHub Pages. Point `api.coolwip.xyz` to the Oracle public IP only after the Oracle Nginx reverse proxy reaches this API through WireGuard. In production bind the API to the Windows WireGuard address (expected `10.66.66.2`) and allow port 8787 only from the Oracle peer `10.66.66.1`. Do not expose port 8787 directly to the internet.

## Data and email receiving

The SQLite database lives under `data`; back it up securely. It contains staff password hashes, reports, sessions, and send limits.

This API does not host mailboxes. Stalwart or another local mail server must be installed separately. On Oracle Free Tier, outbound SMTP port 25 is blocked, so a local mail server cannot send directly to other mail servers. Test receiving on `mailcheck.coolwip.xyz` first and keep production Amelu MX records until the local server works and mail is migrated. Local inbox count and incoming storage depend on PC resources. The Windows 10 host is out of Microsoft support.
