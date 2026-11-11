/* Public website settings. NEVER put server tokens, passwords, service-role keys, or other secrets here. */
window.COOLWIPS_HUB = {
  javaAddress: "play.coolwip.xyz",
  // Replace with your confirmed new Playit Bedrock custom hostname and public UDP port.
  // The older address below remains the fallback until that hostname is supplied.
  bedrockAddress: "domination-ashlee.tun.ply.gg",
  bedrockPort: 19132,
  bedrockConfirmed: false,
  reportsEmail: "admin@coolwip.xyz", // Existing Amelu default mailbox; switch to reports@ after creating it.
  statsUrl: "assets/data/players.json",
  marketUrl: "assets/data/market.json",
  updatesUrl: "assets/data/updates.json",
  // Set both ONLY after deploying docs/SUPABASE_SETUP.sql with Row Level Security.
  // This is a PUBLIC key, not a service_role or secret key.
  supabaseUrl: "",
  supabasePublishableKey: ""
};
