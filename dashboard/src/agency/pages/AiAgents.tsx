import { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Plus, CreditCard as Edit2, Trash2, Send, MessageCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { agencyAiChat } from '../lib/agencyApi';
import type { AiAgent } from '../types';

interface OutletContext {
  subAccountId: string;
  agency: any;
}

const PROVIDERS = {
  OpenAI: ['gpt-4o', 'gpt-4o-mini', 'gpt-3.5-turbo'],
  Gemini: ['gemini-2.0-flash', 'gemini-1.5-pro'],
  DeepSeek: ['deepseek-chat', 'deepseek-reasoner'],
};

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface NewAgentFormData {
  name: string;
  channel: 'WhatsApp' | 'WebChat';
  provider: 'OpenAI' | 'Gemini' | 'DeepSeek';
  model: string;
  temperature: number;
  useAgencyKey: boolean;
  customApiKey: string;
  systemPrompt: string;
  isActive: boolean;
}

export function AiAgents() {
  const { subAccountId, agency } = useOutletContext<OutletContext>();
  const [agents, setAgents] = useState<AiAgent[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingAgent, setEditingAgent] = useState<AiAgent | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [loadingChat, setLoadingChat] = useState(false);
  const [formData, setFormData] = useState<NewAgentFormData>({
    name: '',
    channel: 'WhatsApp',
    provider: 'OpenAI',
    model: 'gpt-4o',
    temperature: 0.7,
    useAgencyKey: true,
    customApiKey: '',
    systemPrompt: '',
    isActive: true,
  });

  useEffect(() => {
    fetchAgents();
  }, [subAccountId]);

  const fetchAgents = async () => {
    try {
      const { data, error } = await supabase
        .from('ai_agents')
        .select('*')
        .eq('sub_account_id', subAccountId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAgents(data || []);
    } catch (err) {
      console.error('Error fetching agents:', err);
    }
  };

  const handleOpenModal = (agent?: AiAgent) => {
    if (agent) {
      setEditingAgent(agent);
      setFormData({
        name: agent.name,
        channel: agent.channel as 'WhatsApp' | 'WebChat',
        provider: agent.ai_provider as 'OpenAI' | 'Gemini' | 'DeepSeek',
        model: agent.ai_model,
        temperature: agent.temperature,
        useAgencyKey: agent.use_agency_key,
        customApiKey: agent.custom_api_key || '',
        systemPrompt: agent.system_prompt,
        isActive: agent.is_active,
      });
    } else {
      setEditingAgent(null);
      setFormData({
        name: '',
        channel: 'WhatsApp',
        provider: 'OpenAI',
        model: 'gpt-4o',
        temperature: 0.7,
        useAgencyKey: true,
        customApiKey: '',
        systemPrompt: '',
        isActive: true,
      });
    }
    setChatMessages([]);
    setChatInput('');
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingAgent(null);
  };

  const handleSaveAgent = async () => {
    try {
      const payload = {
        name: formData.name,
        channel: formData.channel.toLowerCase(),
        ai_provider: formData.provider,
        ai_model: formData.model,
        temperature: formData.temperature,
        use_agency_key: formData.useAgencyKey,
        custom_api_key: formData.useAgencyKey ? null : formData.customApiKey,
        system_prompt: formData.systemPrompt,
        is_active: formData.isActive,
      };

      if (editingAgent) {
        const { error } = await supabase
          .from('ai_agents')
          .update(payload)
          .eq('id', editingAgent.id);

        if (error) throw error;
      } else {
        const { error } = await supabase.from('ai_agents').insert({
          ...payload,
          sub_account_id: subAccountId,
        });

        if (error) throw error;
      }

      await fetchAgents();
      handleCloseModal();
    } catch (err) {
      console.error('Error saving agent:', err);
    }
  };

  const handleToggleActive = async (agent: AiAgent) => {
    try {
      const { error } = await supabase
        .from('ai_agents')
        .update({ is_active: !agent.is_active })
        .eq('id', agent.id);

      if (error) throw error;
      await fetchAgents();
    } catch (err) {
      console.error('Error toggling agent:', err);
    }
  };

  const handleDeleteAgent = async (agentId: string) => {
    if (!window.confirm('Are you sure you want to delete this agent?')) return;

    try {
      const { error } = await supabase
        .from('ai_agents')
        .delete()
        .eq('id', agentId);

      if (error) throw error;
      await fetchAgents();
    } catch (err) {
      console.error('Error deleting agent:', err);
    }
  };

  const handleSendChatMessage = async () => {
    if (!chatInput.trim()) return;

    const userMessage: ChatMessage = { role: 'user', content: chatInput };
    setChatMessages([...chatMessages, userMessage]);
    setChatInput('');
    setLoadingChat(true);

    try {
      const data = await agencyAiChat.chat({
        messages: [...chatMessages, userMessage],
        provider: formData.provider.toLowerCase(),
        model: formData.model,
        apiKey: formData.useAgencyKey ? (agency?.agency_ai_api_key ?? '') : formData.customApiKey,
        systemPrompt: formData.systemPrompt,
      });

      if (data.reply) {
        setChatMessages((prev) => [
          ...prev,
          { role: 'assistant', content: data.reply },
        ]);
      }
    } catch (err) {
      console.error('Error sending message:', err);
    } finally {
      setLoadingChat(false);
    }
  };

  const models = PROVIDERS[formData.provider] || [];

  const getChannelColor = (channel: string) => {
    return channel.toLowerCase() === 'whatsapp' ? '#10b981' : '#3b82f6';
  };

  return (
    <div style={{ padding: '24px', backgroundColor: '#f5f5f5', minHeight: '100vh' }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '24px',
        }}
      >
        <h1 style={{ fontSize: '28px', fontWeight: 'bold', color: '#1a1a1a' }}>
          AI Agents
        </h1>
        <button
          onClick={() => handleOpenModal()}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            backgroundColor: '#7c3aed',
            color: 'white',
            border: 'none',
            padding: '10px 16px',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: '500',
          }}
        >
          <Plus size={18} />
          New Agent
        </button>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
          gap: '16px',
        }}
      >
        {agents.map((agent) => (
          <div
            key={agent.id}
            style={{
              backgroundColor: 'white',
              border: '1px solid #e5e5e5',
              borderRadius: '12px',
              padding: '16px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
            }}
          >
            <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px', color: '#1a1a1a' }}>
              {agent.name}
            </h3>

            <div style={{ marginBottom: '12px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <span
                style={{
                  backgroundColor: getChannelColor(agent.channel),
                  color: 'white',
                  padding: '4px 12px',
                  borderRadius: '20px',
                  fontSize: '12px',
                  fontWeight: '500',
                }}
              >
                {agent.channel}
              </span>
            </div>

            <div style={{ fontSize: '13px', color: '#666', marginBottom: '16px' }}>
              <p style={{ margin: '4px 0' }}>
                <strong>Model:</strong> {agent.ai_model}
              </p>
              <p style={{ margin: '4px 0' }}>
                <strong>Provider:</strong> {agent.ai_provider}
              </p>
              <p style={{ margin: '4px 0' }}>
                <strong>Temp:</strong> {agent.temperature}
              </p>
            </div>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                marginBottom: '12px',
              }}
            >
              <label style={{ fontSize: '13px', color: '#666', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input
                  type="checkbox"
                  checked={agent.is_active}
                  onChange={() => handleToggleActive(agent)}
                  style={{ cursor: 'pointer' }}
                />
                Active
              </label>
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={() => handleOpenModal(agent)}
                style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  backgroundColor: '#f0f0f0',
                  border: '1px solid #e5e5e5',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '13px',
                  color: '#666',
                }}
              >
                <Edit2 size={16} />
                Edit
              </button>
              <button
                onClick={() => handleDeleteAgent(agent.id)}
                style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  backgroundColor: '#f0f0f0',
                  border: '1px solid #e5e5e5',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '13px',
                  color: '#dc2626',
                }}
              >
                <Trash2 size={16} />
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>

      {showModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 50,
          }}
          onClick={handleCloseModal}
        >
          <div
            style={{
              backgroundColor: 'white',
              borderRadius: '12px',
              maxWidth: '800px',
              width: '90%',
              maxHeight: '90vh',
              display: 'flex',
              flexDirection: 'row',
              overflow: 'hidden',
              boxShadow: '0 20px 25px rgba(0,0,0,0.15)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* LEFT: Form */}
            <div
              style={{
                flex: '0 0 60%',
                padding: '24px',
                overflowY: 'auto',
                borderRight: '1px solid #e5e5e5',
              }}
            >
              <h2 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '20px', color: '#1a1a1a' }}>
                {editingAgent ? 'Edit Agent' : 'Create New Agent'}
              </h2>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', marginBottom: '6px', color: '#666' }}>
                  Agent Name
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid #e5e5e5',
                    borderRadius: '6px',
                    fontSize: '14px',
                    boxSizing: 'border-box',
                  }}
                  placeholder="e.g., Customer Support Bot"
                />
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', marginBottom: '8px', color: '#666' }}>
                  Channel
                </label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {['WhatsApp', 'WebChat'].map((ch) => (
                    <button
                      key={ch}
                      onClick={() =>
                        setFormData({
                          ...formData,
                          channel: ch as 'WhatsApp' | 'WebChat',
                        })
                      }
                      style={{
                        flex: 1,
                        padding: '8px 12px',
                        border: `2px solid ${formData.channel === ch ? '#7c3aed' : '#e5e5e5'}`,
                        backgroundColor: formData.channel === ch ? '#f3e8ff' : 'white',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '13px',
                        fontWeight: '500',
                        color: formData.channel === ch ? '#7c3aed' : '#666',
                      }}
                    >
                      {ch}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', marginBottom: '8px', color: '#666' }}>
                  AI Provider
                </label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {['OpenAI', 'Gemini', 'DeepSeek'].map((prov) => (
                    <button
                      key={prov}
                      onClick={() => {
                        const provider = prov as 'OpenAI' | 'Gemini' | 'DeepSeek';
                        setFormData({
                          ...formData,
                          provider,
                          model: PROVIDERS[provider][0],
                        });
                      }}
                      style={{
                        flex: 1,
                        padding: '8px 12px',
                        border: `2px solid ${formData.provider === prov ? '#7c3aed' : '#e5e5e5'}`,
                        backgroundColor: formData.provider === prov ? '#f3e8ff' : 'white',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '13px',
                        fontWeight: '500',
                        color: formData.provider === prov ? '#7c3aed' : '#666',
                      }}
                    >
                      {prov}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', marginBottom: '6px', color: '#666' }}>
                  Model
                </label>
                <select
                  value={formData.model}
                  onChange={(e) =>
                    setFormData({ ...formData, model: e.target.value })
                  }
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid #e5e5e5',
                    borderRadius: '6px',
                    fontSize: '14px',
                    boxSizing: 'border-box',
                  }}
                >
                  {models.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', marginBottom: '6px', color: '#666' }}>
                  Temperature: {formData.temperature.toFixed(2)}
                </label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={formData.temperature}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      temperature: parseFloat(e.target.value),
                    })
                  }
                  style={{ width: '100%', cursor: 'pointer' }}
                />
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: '500', color: '#666', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={formData.useAgencyKey}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        useAgencyKey: e.target.checked,
                      })
                    }
                    style={{ cursor: 'pointer' }}
                  />
                  Use Agency API Key
                </label>
              </div>

              {!formData.useAgencyKey && (
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', marginBottom: '6px', color: '#666' }}>
                    Custom API Key
                  </label>
                  <input
                    type="password"
                    value={formData.customApiKey}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        customApiKey: e.target.value,
                      })
                    }
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      border: '1px solid #e5e5e5',
                      borderRadius: '6px',
                      fontSize: '14px',
                      boxSizing: 'border-box',
                    }}
                    placeholder="sk-..."
                  />
                </div>
              )}

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', marginBottom: '6px', color: '#666' }}>
                  System Prompt
                </label>
                <textarea
                  value={formData.systemPrompt}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      systemPrompt: e.target.value,
                    })
                  }
                  rows={12}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid #e5e5e5',
                    borderRadius: '6px',
                    fontSize: '13px',
                    fontFamily: 'monospace',
                    boxSizing: 'border-box',
                  }}
                  placeholder="You are a helpful customer support agent..."
                />
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: '500', color: '#666', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={formData.isActive}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        isActive: e.target.checked,
                      })
                    }
                    style={{ cursor: 'pointer' }}
                  />
                  Active
                </label>
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={handleCloseModal}
                  style={{
                    flex: 1,
                    padding: '10px 16px',
                    border: '1px solid #e5e5e5',
                    backgroundColor: 'white',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: '500',
                    color: '#666',
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveAgent}
                  style={{
                    flex: 1,
                    padding: '10px 16px',
                    backgroundColor: '#7c3aed',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: '500',
                  }}
                >
                  Save Agent
                </button>
              </div>
            </div>

            {/* RIGHT: Live Test Chat */}
            <div
              style={{
                flex: '0 0 40%',
                padding: '24px',
                display: 'flex',
                flexDirection: 'column',
                backgroundColor: '#fafafa',
              }}
            >
              <h3 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '12px', color: '#1a1a1a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <MessageCircle size={18} />
                Test Chat
              </h3>

              <div
                style={{
                  flex: 1,
                  overflowY: 'auto',
                  marginBottom: '12px',
                  backgroundColor: 'white',
                  borderRadius: '8px',
                  padding: '12px',
                  border: '1px solid #e5e5e5',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                }}
              >
                {chatMessages.length === 0 ? (
                  <p style={{ fontSize: '13px', color: '#999', textAlign: 'center', margin: 'auto' }}>
                    Send a message to test the agent...
                  </p>
                ) : (
                  chatMessages.map((msg, idx) => (
                    <div
                      key={idx}
                      style={{
                        display: 'flex',
                        justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
                      }}
                    >
                      <div
                        style={{
                          maxWidth: '85%',
                          padding: '8px 12px',
                          borderRadius: '8px',
                          backgroundColor:
                            msg.role === 'user' ? '#7c3aed' : '#e5e7eb',
                          color: msg.role === 'user' ? 'white' : '#1a1a1a',
                          fontSize: '13px',
                          lineHeight: '1.4',
                          wordWrap: 'break-word',
                        }}
                      >
                        {msg.content}
                      </div>
                    </div>
                  ))
                )}
                {loadingChat && (
                  <div style={{ fontSize: '13px', color: '#999' }}>
                    AI is thinking...
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && !loadingChat) {
                      handleSendChatMessage();
                    }
                  }}
                  disabled={loadingChat}
                  style={{
                    flex: 1,
                    padding: '10px 12px',
                    border: '1px solid #e5e5e5',
                    borderRadius: '6px',
                    fontSize: '13px',
                    boxSizing: 'border-box',
                  }}
                  placeholder="Type a message..."
                />
                <button
                  onClick={handleSendChatMessage}
                  disabled={loadingChat || !chatInput.trim()}
                  style={{
                    padding: '10px 16px',
                    backgroundColor: '#7c3aed',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontSize: '13px',
                    fontWeight: '500',
                    opacity: loadingChat || !chatInput.trim() ? 0.5 : 1,
                  }}
                >
                  <Send size={16} />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
