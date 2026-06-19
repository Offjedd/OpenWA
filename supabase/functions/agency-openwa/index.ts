import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const url = new URL(req.url);
  const action = url.searchParams.get("action") ?? "";

  try {
    if (req.method === "POST" && action === "create-session") {
      const { subAccountId } = await req.json();

      const { data: sa } = await supabase
        .from("sub_accounts")
        .select("*, agencies(*)")
        .eq("id", subAccountId)
        .single();

      if (!sa) return new Response(JSON.stringify({ error: "Sub-account not found" }), { status: 404, headers: corsHeaders });

      const agency = (sa as any).agencies;
      if (!agency?.openwa_url) return new Response(JSON.stringify({ error: "OpenWA URL not configured" }), { status: 400, headers: corsHeaders });

      const sessionName = `sub-${subAccountId.slice(0, 8)}`;
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (agency.openwa_api_key) headers["X-API-Key"] = agency.openwa_api_key;

      // Create session
      const createRes = await fetch(`${agency.openwa_url}/api/sessions`, {
        method: "POST",
        headers,
        body: JSON.stringify({ name: sessionName }),
      });
      const sessionData = await createRes.json();
      const sessionId = sessionData.id ?? sessionData.name ?? sessionName;

      // Start session
      await fetch(`${agency.openwa_url}/api/sessions/${sessionId}/start`, { method: "POST", headers });

      // Save session ID
      await supabase.from("sub_accounts").update({
        openwa_session_id: sessionId,
        openwa_session_status: "connecting",
      }).eq("id", subAccountId);

      return new Response(JSON.stringify({ sessionId }), { status: 200, headers: corsHeaders });
    }

    if (req.method === "GET" && action === "qr") {
      const subAccountId = url.searchParams.get("subAccountId");
      const { data: sa } = await supabase
        .from("sub_accounts")
        .select("*, agencies(*)")
        .eq("id", subAccountId)
        .single();

      if (!sa) return new Response(JSON.stringify({ error: "Not found" }), { status: 404, headers: corsHeaders });

      const agency = (sa as any).agencies;
      const sessionId = (sa as any).openwa_session_id;
      if (!sessionId || !agency?.openwa_url) return new Response(JSON.stringify({ error: "No active session" }), { status: 400, headers: corsHeaders });

      const qrHeaders: Record<string, string> = {};
      if (agency.openwa_api_key) qrHeaders["X-API-Key"] = agency.openwa_api_key;

      const qrRes = await fetch(`${agency.openwa_url}/api/sessions/${sessionId}/qr`, { headers: qrHeaders });
      const qrData = await qrRes.json();

      return new Response(JSON.stringify(qrData), { status: 200, headers: corsHeaders });
    }

    if (req.method === "GET" && action === "status") {
      const subAccountId = url.searchParams.get("subAccountId");
      const { data: sa } = await supabase
        .from("sub_accounts")
        .select("*, agencies(*)")
        .eq("id", subAccountId)
        .single();

      if (!sa) return new Response(JSON.stringify({ error: "Not found" }), { status: 404, headers: corsHeaders });

      const agency = (sa as any).agencies;
      const sessionId = (sa as any).openwa_session_id;
      if (!sessionId || !agency?.openwa_url) return new Response(JSON.stringify({ status: "disconnected" }), { headers: corsHeaders });

      const hdrs: Record<string, string> = {};
      if (agency.openwa_api_key) hdrs["X-API-Key"] = agency.openwa_api_key;

      const statusRes = await fetch(`${agency.openwa_url}/api/sessions/${sessionId}`, { headers: hdrs });
      const statusData = await statusRes.json();

      // Sync status back to DB
      const newStatus = statusData.status === "ready" ? "connected" : statusData.status ?? "disconnected";
      await supabase.from("sub_accounts").update({ openwa_session_status: newStatus }).eq("id", subAccountId);

      return new Response(JSON.stringify({ status: newStatus, raw: statusData }), { headers: corsHeaders });
    }

    if (req.method === "POST" && action === "send") {
      const { subAccountId, chatId, text } = await req.json();

      const { data: sa } = await supabase
        .from("sub_accounts")
        .select("*, agencies(*)")
        .eq("id", subAccountId)
        .single();

      if (!sa) return new Response(JSON.stringify({ error: "Not found" }), { status: 404, headers: corsHeaders });

      const agency = (sa as any).agencies;
      const sessionId = (sa as any).openwa_session_id;
      if (!sessionId || !agency?.openwa_url) return new Response(JSON.stringify({ error: "No active session" }), { status: 400, headers: corsHeaders });

      const hdrs: Record<string, string> = { "Content-Type": "application/json" };
      if (agency.openwa_api_key) hdrs["X-API-Key"] = agency.openwa_api_key;

      const sendRes = await fetch(`${agency.openwa_url}/api/sessions/${sessionId}/messages/send-text`, {
        method: "POST",
        headers: hdrs,
        body: JSON.stringify({ chatId, text }),
      });
      const sendData = await sendRes.json();

      return new Response(JSON.stringify(sendData), { headers: corsHeaders });
    }

    if (req.method === "DELETE" && action === "disconnect") {
      const subAccountId = url.searchParams.get("subAccountId");
      const { data: sa } = await supabase
        .from("sub_accounts")
        .select("*, agencies(*)")
        .eq("id", subAccountId)
        .single();

      if (!sa) return new Response(JSON.stringify({ error: "Not found" }), { status: 404, headers: corsHeaders });

      const agency = (sa as any).agencies;
      const sessionId = (sa as any).openwa_session_id;
      if (sessionId && agency?.openwa_url) {
        const hdrs: Record<string, string> = {};
        if (agency.openwa_api_key) hdrs["X-API-Key"] = agency.openwa_api_key;
        await fetch(`${agency.openwa_url}/api/sessions/${sessionId}`, { method: "DELETE", headers: hdrs });
      }

      await supabase.from("sub_accounts").update({
        openwa_session_id: null,
        openwa_session_status: "disconnected",
      }).eq("id", subAccountId);

      return new Response(JSON.stringify({ ok: true }), { headers: corsHeaders });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), { status: 400, headers: corsHeaders });
  } catch (err) {
    console.error("agency-openwa error:", err);
    return new Response(JSON.stringify({ error: String(err) }), { status: 500, headers: corsHeaders });
  }
});
