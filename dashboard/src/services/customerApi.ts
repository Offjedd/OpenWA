const API_BASE = '/api';
const EDGE_BASE = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`;

function getToken(): string | null {
  return localStorage.getItem('customer_token');
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });

  if (!res.ok) {
    let message = `HTTP ${res.status}`;
    try {
      const err = await res.json();
      message = err.message || err.error || message;
    } catch {}
    throw new Error(message);
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

async function edgeAuth<T>(action: string, body: Record<string, string>): Promise<T> {
  const res = await fetch(`${EDGE_BASE}/customer-auth?action=${action}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', apikey: import.meta.env.VITE_SUPABASE_ANON_KEY },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || `HTTP ${res.status}`);
  return data as T;
}

async function authRequest<T>(path: string, body: Record<string, string>, action: string): Promise<T> {
  try {
    return await request<T>(path, { method: 'POST', body: JSON.stringify(body) });
  } catch (err) {
    // Backend unreachable (published/static site) — fall through to edge function
    if (err instanceof Error && (err.message.includes('404') || err.message.includes('Failed to fetch') || err.message.includes('NetworkError'))) {
      return edgeAuth<T>(action, body);
    }
    throw err;
  }
}

async function uploadFile(path: string, file: File): Promise<UploadResult> {
  const token = getToken();
  const form = new FormData();
  form.append('file', file);

  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: form,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { message?: string }).message || `Upload failed: ${res.status}`);
  }
  return res.json() as Promise<UploadResult>;
}

// ── Types ──────────────────────────────────────────────────────────────────

export interface CustomerProfile {
  id: string;
  email: string;
  fullName: string;
  plan: 'free' | 'premium';
  isActive: boolean;
  createdAt: string;
}

export interface CustomerSession {
  id: string;
  customerId: string;
  openwaSessionId: string;
  displayName: string;
  status: 'created' | 'connecting' | 'qr_ready' | 'ready' | 'disconnected' | 'failed';
  phoneNumber: string | null;
  connectedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Conversation {
  id: string;
  customer_session_id: string;
  chat_id: string;
  contact_name: string | null;
  contact_phone: string | null;
  last_message_body: string | null;
  last_message_at: string | null;
  last_message_type: string;
  unread_count: number;
  updated_at: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  customer_session_id: string;
  wa_message_id: string | null;
  direction: 'incoming' | 'outgoing';
  body: string | null;
  type: string;
  media_url: string | null;
  media_filename: string | null;
  media_mimetype: string | null;
  timestamp: number | null;
  status: string;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface UploadResult {
  url: string;
  filename: string;
  mimetype: string;
  size: number;
  type: string;
}

// ── Auth ───────────────────────────────────────────────────────────────────

export const customerAuthApi = {
  register: (fullName: string, email: string, password: string) =>
    authRequest<{ token: string; customer: CustomerProfile }>(
      '/customers/register',
      { fullName, email, password },
      'register',
    ),

  login: (email: string, password: string) =>
    authRequest<{ token: string; customer: CustomerProfile }>(
      '/customers/login',
      { email, password },
      'login',
    ),

  getProfile: () => request<CustomerProfile>('/customers/me'),

  updateProfile: (data: { fullName?: string; email?: string; password?: string }) =>
    request<CustomerProfile>('/customers/me', {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
};

// ── Sessions ───────────────────────────────────────────────────────────────

export const customerSessionApi = {
  list: () => request<CustomerSession[]>('/customers/me/sessions'),

  get: (sessionId: string) => request<CustomerSession>(`/customers/me/sessions/${sessionId}`),

  create: (displayName: string) =>
    request<CustomerSession>('/customers/me/sessions', {
      method: 'POST',
      body: JSON.stringify({ displayName }),
    }),

  start: (sessionId: string) =>
    request<CustomerSession>(`/customers/me/sessions/${sessionId}/start`, { method: 'POST' }),

  getQR: (sessionId: string) =>
    request<{ qrCode: string; status: string }>(`/customers/me/sessions/${sessionId}/qr`),

  disconnect: (sessionId: string) =>
    request<CustomerSession>(`/customers/me/sessions/${sessionId}/disconnect`, { method: 'POST' }),

  delete: (sessionId: string) =>
    request<void>(`/customers/me/sessions/${sessionId}`, { method: 'DELETE' }),
};

// ── Conversations ──────────────────────────────────────────────────────────

export const conversationApi = {
  list: (sessionId: string, limit = 50, offset = 0) =>
    request<{ conversations: Conversation[]; total: number }>(
      `/customers/me/sessions/${sessionId}/conversations?limit=${limit}&offset=${offset}`,
    ),

  messages: (sessionId: string, chatId: string, limit = 50, offset = 0) =>
    request<{ messages: Message[]; total: number }>(
      `/customers/me/sessions/${sessionId}/conversations/${encodeURIComponent(chatId)}/messages?limit=${limit}&offset=${offset}`,
    ),

  sendText: (sessionId: string, chatId: string, text: string) =>
    request<{ messageId: string; timestamp: number }>(
      `/customers/me/sessions/${sessionId}/conversations/${encodeURIComponent(chatId)}/send/text`,
      { method: 'POST', body: JSON.stringify({ text }) },
    ),

  sendMedia: (
    sessionId: string,
    chatId: string,
    type: 'image' | 'video' | 'audio' | 'document',
    payload: { url?: string; base64?: string; mimetype?: string; filename?: string; caption?: string },
  ) =>
    request<{ messageId: string; timestamp: number }>(
      `/customers/me/sessions/${sessionId}/conversations/${encodeURIComponent(chatId)}/send/${type}`,
      { method: 'POST', body: JSON.stringify(payload) },
    ),

  upload: (file: File) => uploadFile('/customers/me/upload', file),
};
