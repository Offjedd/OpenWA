export interface Agency {
  id: string;
  name: string;
  logo_url: string | null;
  owner_id: string;
  plan: string;
  agency_ai_provider: string;
  agency_ai_api_key: string | null;
  openwa_url: string | null;
  openwa_api_key: string | null;
  n8n_url: string | null;
  n8n_api_key: string | null;
  created_at: string;
}

export interface SubAccount {
  id: string;
  agency_id: string;
  name: string;
  logo_url: string | null;
  domain: string | null;
  openwa_session_id: string | null;
  openwa_session_status: string;
  created_at: string;
}

export interface AgencyContact {
  id: string;
  sub_account_id: string;
  name: string;
  email: string | null;
  phone: string | null;
  whatsapp_id: string | null;
  tags: string[];
  source: string | null;
  avatar_url: string | null;
  notes: string | null;
  created_at: string;
}

export interface Pipeline {
  id: string;
  sub_account_id: string;
  name: string;
  stages: string[];
  created_at: string;
}

export interface Opportunity {
  id: string;
  sub_account_id: string;
  pipeline_id: string;
  contact_id: string | null;
  title: string;
  value: number;
  stage: string;
  assigned_to: string | null;
  close_date: string | null;
  notes: string | null;
  created_at: string;
  contact?: AgencyContact;
}

export interface AgencyConversation {
  id: string;
  sub_account_id: string;
  contact_id: string | null;
  channel: 'whatsapp' | 'webchat';
  status: 'open' | 'closed' | 'pending';
  last_message: string | null;
  last_message_at: string;
  unread_count: number;
  openwa_chat_id: string | null;
  created_at: string;
  contact?: AgencyContact;
}

export interface AgencyMessage {
  id: string;
  conversation_id: string;
  content: string | null;
  type: 'text' | 'image' | 'file' | 'audio';
  sender_type: 'contact' | 'agent' | 'bot';
  sender_id: string | null;
  openwa_message_id: string | null;
  status: string;
  media_url: string | null;
  created_at: string;
}

export interface CalendarEvent {
  id: string;
  sub_account_id: string;
  title: string;
  description: string | null;
  start_time: string;
  end_time: string;
  contact_id: string | null;
  assigned_to: string | null;
  type: string;
  status: string;
  created_at: string;
}

export interface Automation {
  id: string;
  sub_account_id: string;
  name: string;
  trigger_type: string;
  trigger_config: Record<string, unknown>;
  actions: AutomationAction[];
  is_active: boolean;
  n8n_workflow_id: string | null;
  created_at: string;
}

export interface AutomationAction {
  type: string;
  config: Record<string, unknown>;
}

export interface AgencyMedia {
  id: string;
  sub_account_id: string;
  name: string;
  url: string;
  type: string | null;
  size: number | null;
  folder: string;
  created_at: string;
}

export interface AiAgent {
  id: string;
  sub_account_id: string;
  name: string;
  system_prompt: string;
  ai_provider: string;
  ai_model: string;
  temperature: number;
  use_agency_key: boolean;
  custom_api_key: string | null;
  channel: string;
  is_active: boolean;
  created_at: string;
}

export interface QrCode {
  id: string;
  sub_account_id: string;
  name: string;
  type: string;
  content: string;
  image_url: string | null;
  color: string;
  scans: number;
  created_at: string;
}

export interface ApiKeyStore {
  id: string;
  sub_account_id: string;
  provider: string;
  api_key: string;
  is_active: boolean;
  created_at: string;
}
