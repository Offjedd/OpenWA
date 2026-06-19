const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

function fnUrl(name: string) {
  return `${SUPABASE_URL}/functions/v1/${name}`;
}

function headers() {
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
  };
}

export const agencyOpenWA = {
  createSession: (subAccountId: string) =>
    fetch(`${fnUrl('agency-openwa')}?action=create-session`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify({ subAccountId }),
    }).then(r => r.json()),

  getQr: (subAccountId: string) =>
    fetch(`${fnUrl('agency-openwa')}?action=qr&subAccountId=${subAccountId}`, {
      headers: headers(),
    }).then(r => r.json()),

  getStatus: (subAccountId: string) =>
    fetch(`${fnUrl('agency-openwa')}?action=status&subAccountId=${subAccountId}`, {
      headers: headers(),
    }).then(r => r.json()),

  sendMessage: (subAccountId: string, chatId: string, text: string) =>
    fetch(`${fnUrl('agency-openwa')}?action=send`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify({ subAccountId, chatId, text }),
    }).then(r => r.json()),

  disconnect: (subAccountId: string) =>
    fetch(`${fnUrl('agency-openwa')}?action=disconnect&subAccountId=${subAccountId}`, {
      method: 'DELETE',
      headers: headers(),
    }).then(r => r.json()),
};

export const agencyAiChat = {
  chat: (payload: { messages: {role: string; content: string}[]; provider: string; model: string; apiKey: string; systemPrompt: string }) =>
    fetch(fnUrl('agency-ai-chat'), {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify(payload),
    }).then(r => r.json()),
};

export function webhookUrl(subAccountId: string) {
  return `${SUPABASE_URL}/functions/v1/agency-webhook/${subAccountId}`;
}
