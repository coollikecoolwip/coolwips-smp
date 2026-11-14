/* Public website settings. NEVER put server tokens, passwords, or API secrets here. */
window.COOLWIPS_HUB = {
  javaAddress: "play.coolwip.xyz",
  javaVersion: "26.2",
  // Public Bedrock custom hostname. Keep the port in sync with the Playit tunnel.
  bedrockAddress: "bedrock.coolwip.xyz",
  bedrockPort: 19132,
  bedrockConfirmed: true,
  reportsEmail: "admin@coolwip.xyz",
  statsUrl: "assets/data/players.json",
  marketUrl: "assets/data/market.json",
  updatesUrl: "assets/data/updates.json",
  // The existing client uses these compatibility property names; this URL is the self-hosted API.
  supabaseUrl: "https://api.coolwip.xyz",
  supabasePublishableKey: "coolwips-public-v1"
};
