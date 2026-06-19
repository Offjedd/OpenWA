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
  const pathParts = url.pathname.split("/");
  const subAccountId = pathParts[pathParts.length - 1];

  if (!subAccountId) {
    return new Response(JSON.stringify({ error: "Missing subAccountId" }), { status: 400, headers: corsHeaders });
  }

  try {
    const body = await req.json();

    // OpenWA sends: { event, sessionId, data: { from, body, type, id: {id} } }
    if (body.event !== "message.received" && body.type !== "message") {
      return new Response(JSON.stringify({ ok: true, skipped: true }), { headers: corsHeaders });
    }

    const messageData = body.data ?? body;
    const from: string = messageData.from ?? "";
    const text: string = messageData.body ?? messageData.text ?? "";
    const waMessageId: string = messageData.id?.id ?? messageData.id ?? "";
    const phone = from.replace("@c.us", "").replace("@g.us", "");

    // Find or create contact
    let contactId: string | null = null;
    const { data: existingContact } = await supabase
      .from("agency_contacts")
      .select("id")
      .eq("sub_account_id", subAccountId)
      .eq("whatsapp_id", from)
      .maybeSingle();

    if (existingContact) {
      contactId = existingContact.id;
    } else {
      const { data: newContact } = await supabase
        .from("agency_contacts")
        .insert({ sub_account_id: subAccountId, name: phone, phone, whatsapp_id: from })
        .select("id")
        .single();
      contactId = newContact?.id ?? null;
    }

    // Find or create conversation
    let conversationId: string | null = null;
    const { data: existingConv } = await supabase
      .from("agency_conversations")
      .select("id, unread_count")
      .eq("sub_account_id", subAccountId)
      .eq("openwa_chat_id", from)
      .maybeSingle();

    if (existingConv) {
      conversationId = existingConv.id;
      await supabase
        .from("agency_conversations")
        .update({
          last_message: text,
          last_message_at: new Date().toISOString(),
          unread_count: (existingConv.unread_count ?? 0) + 1,
          status: "open",
        })
        .eq("id", conversationId);
    } else {
      const { data: newConv } = await supabase
        .from("agency_conversations")
        .insert({
          sub_account_id: subAccountId,
          contact_id: contactId,
          channel: "whatsapp",
          status: "open",
          last_message: text,
          last_message_at: new Date().toISOString(),
          unread_count: 1,
          openwa_chat_id: from,
        })
        .select("id")
        .single();
      conversationId = newConv?.id ?? null;
    }

    // Insert message
    if (conversationId) {
      await supabase.from("agency_messages").insert({
        conversation_id: conversationId,
        content: text,
        type: "text",
        sender_type: "contact",
        openwa_message_id: waMessageId,
        status: "received",
      });

      // Check for active AI agent
      const { data: aiAgent } = await supabase
        .from("ai_agents")
        .select("*")
        .eq("sub_account_id", subAccountId)
        .eq("channel", "whatsapp")
        .eq("is_active", true)
        .maybeSingle();

      if (aiAgent) {
        // Load last 10 messages for context
        const { data: recentMessages } = await supabase
          .from("agency_messages")
          .select("content, sender_type")
          .eq("conversation_id", conversationId)
          .order("created_at", { ascending: false })
          .limit(10);

        const chatMessages = (recentMessages ?? [])
          .reverse()
          .map((m: any) => ({
            role: m.sender_type === "contact" ? "user" : "assistant",
            content: m.content ?? "",
          }));

        // Get agency for API key
        const { data: subAccount } = await supabase
          .from("sub_accounts")
          .select("*, agencies(*)")
          .eq("id", subAccountId)
          .single();

        const agency = (subAccount as any)?.agencies;
        const apiKey = aiAgent.use_agency_key ? agency?.agency_ai_api_key : aiAgent.custom_api_key;

        if (apiKey) {
          // Call AI
          const aiRes = await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/agency-ai-chat`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
            },
            body: JSON.stringify({
              messages: chatMessages,
              provider: aiAgent.ai_provider,
              model: aiAgent.ai_model,
              apiKey,
              systemPrompt: aiAgent.system_prompt,
            }),
          });

          const aiData = await aiRes.json();
          const aiReply: string = aiData.reply ?? "";

          if (aiReply) {
            // Store AI reply
            await supabase.from("agency_messages").insert({
              conversation_id: conversationId,
              content: aiReply,
              type: "text",
              sender_type: "bot",
              status: "sent",
            });

            // Send via OpenWA
            if (agency?.openwa_url && subAccount?.openwa_session_id) {
              const hdrs: Record<string, string> = { "Content-Type": "application/json" };
              if (agency.openwa_api_key) hdrs["X-API-Key"] = agency.openwa_api_key;
              await fetch(`${agency.openwa_url}/api/sessions/${subAccount.openwa_session_id}/messages/send-text`, {
                method: "POST",
                headers: hdrs,
                body: JSON.stringify({ chatId: from, text: aiReply }),
              });
            }

            // Update conversation last message
            await supabase.from("agency_conversations").update({
              last_message: aiReply,
              last_message_at: new Date().toISOString(),
            }).eq("id", conversationId);
          }
        }
      }
    }

    return new Response(JSON.stringify({ ok: true }), { headers: corsHeaders });
  } catch (err) {
    console.error("agency-webhook error:", err);
    return new Response(JSON.stringify({ error: String(err) }), { status: 500, headers: corsHeaders });
  }
});
