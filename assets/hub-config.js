/* Public website settings. NEVER put server tokens, passwords, service-role keys, or other secrets here. */
window.COOLWIPS_HUB = {
  javaAddress: "play.coolwip.xyz",
  javaVersion: "26.2",
  // Public Bedrock custom hostname. Keep the port in sync with your Playit tunnel.
  bedrockAddress: "bedrock.coolwip.xyz",
  bedrockPort: 19132,
  bedrockConfirmed: true,
  reportsEmail: "admin@coolwip.xyz", // Existing Amelu default mailbox; switch to reports@ after creating it.
  statsUrl: "assets/data/players.json",
  marketUrl: "assets/data/market.json",
  updatesUrl: "assets/data/updates.json",
  // Set both ONLY after deploying docs/SUPABASE_SETUP.sql with Row Level Security.
  // This is a PUBLIC key, not a service_role or secret key.
  supabaseUrl: "",
  supabasePublishableKey: ""
};
