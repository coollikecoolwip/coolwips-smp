import { createClient } from "npm:@supabase/supabase-js@2";

const allowedOrigins = new Set([
  "https://coolwip.xyz",
  "https://www.coolwip.xyz",
]);

function json(body: unknown, status: number, origin: string): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      "Access-Control-Allow-Origin": origin,
      "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Max-Age": "600",
      "Vary": "Origin",
    },
  });
}

Deno.serve(async (request) => {
  const origin = request.headers.get("Origin") ?? "";
  if (!allowedOrigins.has(origin)) {
    return new Response("Forbidden origin", { status: 403, headers: { "Cache-Control": "no-store" } });
  }
  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": origin,
        "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Max-Age": "600",
        "Vary": "Origin",
      },
    });
  }
  if (request.method !== "POST") return json({ error: "Method not allowed." }, 405, origin);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? Deno.env.get("SUPABASE_PUBLISHABLE_KEY");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const ameluApiKey = Deno.env.get("AMELU_API_KEY");
  const mailboxId = Deno.env.get("AMELU_MAILBOX_ID");
  if (!supabaseUrl || !anonKey || !serviceRoleKey || !ameluApiKey || !mailboxId) {
    return json({ error: "Staff email is not configured on the backend." }, 503, origin);
  }

  const authorization = request.headers.get("Authorization") ?? "";
  const bearer = authorization.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!bearer) return json({ error: "Sign in with an approved staff account." }, 401, origin);

  const authClient = createClient(supabaseUrl, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  const { data: authData, error: authError } = await authClient.auth.getUser(bearer);
  if (authError || !authData.user) return json({ error: "Your session expired. Sign in again." }, 401, origin);

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  const { data: member, error: memberError } = await admin
    .from("staff_members")
    .select("user_id")
    .eq("user_id", authData.user.id)
    .maybeSingle();
  if (memberError) return json({ error: "Staff access could not be checked." }, 503, origin);
  if (!member) return json({ error: "This account is not approved for staff access." }, 403, origin);

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return json({ error: "Enter a valid email message." }, 400, origin);
  }
  if (!payload || typeof payload !== "object") return json({ error: "Enter a valid email message." }, 400, origin);

  const data = payload as Record<string, unknown>;
  const to = typeof data.to === "string" ? data.to.trim() : "";
  const subject = typeof data.subject === "string" ? data.subject.trim() : "";
  const textBody = typeof data.textBody === "string" ? data.textBody.trim() : "";
  const emailPattern = /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/;
  if (!emailPattern.test(to) || to.length > 254) return json({ error: "Enter one valid recipient email address." }, 400, origin);
  if (!subject || subject.length > 180 || /[\r\n\u0000-\u001f\u007f]/.test(subject)) {
    return json({ error: "Subject must be 1–180 characters on one line." }, 400, origin);
  }
  if (!textBody || textBody.length > 10000 || textBody.includes("\u0000")) {
    return json({ error: "Message must be 1–10,000 characters." }, 400, origin);
  }

  const { data: allowed, error: quotaError } = await admin.rpc("consume_staff_email_send_slot", {
    p_user_id: authData.user.id,
  });
  if (quotaError) return json({ error: "The send limit could not be checked." }, 503, origin);
  if (allowed !== true) return json({ error: "Staff email limit reached, or staff access is no longer active." }, 429, origin);

  let providerResponse: Response;
  try {
    providerResponse = await fetch(
      `https://api.amelu.org/api/mailboxes/${encodeURIComponent(mailboxId)}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${ameluApiKey}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({ to: [to], cc: [], subject, textBody }),
        signal: AbortSignal.timeout(20000),
      },
    );
  } catch {
    return json({ error: "Amelu did not confirm the send. Check the mailbox’s Sent folder before retrying." }, 502, origin);
  }
  if (!providerResponse.ok) {
    return json({ error: "Amelu did not accept the message. Check the mailbox’s Sent folder before retrying." }, 502, origin);
  }

  return json({ sent: true }, 200, origin);
});
