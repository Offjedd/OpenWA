import { useState, useEffect } from 'react';
import { useOutletContext, useSearchParams } from 'react-router-dom';
import { Copy, Trash2, Plus, Check } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { agencyOpenWA, webhookUrl } from '../lib/agencyApi';
import type { ApiKeyStore } from '../types';

interface OutletContext {
  subAccountId: string;
  agency: any;
}

export function SubAccountSettings() {
  const { subAccountId, agency } = useOutletContext<OutletContext>();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'general';

  const [settingsName, setSettingsName] = useState('');
  const [timezone, setTimezone] = useState('UTC');
  const [apiKeys, setApiKeys] = useState<ApiKeyStore[]>([]);
  const [newKeyProvider, setNewKeyProvider] = useState<'OpenAI' | 'Gemini' | 'DeepSeek'>('OpenAI');
  const [newKeyValue, setNewKeyValue] = useState('');
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [sessionStatus, setSessionStatus] = useState<string>('');
  const [copyFeedback, setCopyFeedback] = useState('');
  const [pollInterval, setPollInterval] = useState<NodeJS.Timeout | null>(null);

  useEffect(() => {
    fetchSubAccount();
    fetchApiKeys();
  }, [subAccountId]);

  const fetchSubAccount = async () => {
    try {
      const { data, error } = await supabase
        .from('sub_accounts')
        .select('*')
        .eq('id', subAccountId)
        .single();

      if (error) throw error;
      setSettingsName(data.name);
      setSessionStatus(data.openwa_session_status || '');
    } catch (err) {
      console.error('Error fetching sub-account:', err);
    }
  };

  const fetchApiKeys = async () => {
    try {
      const { data, error } = await supabase
        .from('api_keys_store')
        .select('*')
        .eq('sub_account_id', subAccountId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setApiKeys(data || []);
    } catch (err) {
      console.error('Error fetching API keys:', err);
    }
  };

  const handleTabChange = (tab: string) => {
    setSearchParams({ tab });
  };

  // General tab handlers
  const handleSaveGeneral = async () => {
    try {
      const { error } = await supabase
        .from('sub_accounts')
        .update({
          name: settingsName,
        })
        .eq('id', subAccountId);

      if (error) throw error;
      alert('Settings saved successfully');
    } catch (err) {
      console.error('Error saving settings:', err);
    }
  };

  // WhatsApp tab handlers
  const handleConnectWhatsApp = async () => {
    try {
      const data = await agencyOpenWA.createSession(subAccountId);
      if (data.error) throw new Error(data.error);
      setSessionStatus('qr_loading');
      startQrPolling();
    } catch (err) {
      console.error('Error connecting WhatsApp:', err);
      alert('Failed to connect WhatsApp');
    }
  };

  const startQrPolling = () => {
    if (pollInterval) clearInterval(pollInterval);

    const interval = setInterval(async () => {
      try {
        const data = await agencyOpenWA.getStatus(subAccountId);
        if (data.status === 'connected') {
          setSessionStatus('connected');
          setQrCode(null);
          clearInterval(interval);
          setPollInterval(null);
          await fetchSubAccount();
          return;
        }

        const qrData = await agencyOpenWA.getQr(subAccountId);
        if (qrData.qr || qrData.data) {
          setQrCode(qrData.qr ?? qrData.data);
          setSessionStatus('qr_ready');
        }
      } catch (err) {
        console.error('Error polling QR:', err);
      }
    }, 2000);

    setPollInterval(interval);
  };

  const handleDisconnectWhatsApp = async () => {
    if (!window.confirm('Are you sure you want to disconnect WhatsApp?')) return;

    try {
      await agencyOpenWA.disconnect(subAccountId);
      setSessionStatus('');
      setQrCode(null);
      if (pollInterval) clearInterval(pollInterval);
      await fetchSubAccount();
    } catch (err) {
      console.error('Error disconnecting WhatsApp:', err);
      alert('Failed to disconnect WhatsApp');
    }
  };

  // API Keys tab handlers
  const handleAddApiKey = async () => {
    if (!newKeyValue) {
      alert('Please enter an API key');
      return;
    }

    try {
      const { error } = await supabase.from('api_keys_store').insert({
        sub_account_id: subAccountId,
        provider: newKeyProvider,
        api_key: newKeyValue,
        is_active: true,
      });

      if (error) throw error;

      setNewKeyValue('');
      setNewKeyProvider('OpenAI');
      await fetchApiKeys();
    } catch (err) {
      console.error('Error adding API key:', err);
    }
  };

  const handleDeleteApiKey = async (keyId: string) => {
    if (!window.confirm('Are you sure you want to delete this API key?')) return;

    try {
      const { error } = await supabase
        .from('api_keys_store')
        .delete()
        .eq('id', keyId);

      if (error) throw error;
      await fetchApiKeys();
    } catch (err) {
      console.error('Error deleting API key:', err);
    }
  };

  // Copy to clipboard handler
  const handleCopyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopyFeedback(text);
    setTimeout(() => setCopyFeedback(''), 2000);
  };

  const maskApiKey = (key: string) => {
    return key.substring(0, 4) + '*'.repeat(Math.max(0, key.length - 8)) + key.substring(key.length - 4);
  };

  const whUrl = webhookUrl(subAccountId);

  return (
    <div style={{ padding: '24px', backgroundColor: '#f5f5f5', minHeight: '100vh' }}>
      <h1 style={{ fontSize: '28px', fontWeight: 'bold', marginBottom: '24px', color: '#1a1a1a' }}>
        Sub-Account Settings
      </h1>

      {/* Tab Navigation */}
      <div
        style={{
          display: 'flex',
          gap: '8px',
          marginBottom: '24px',
          borderBottom: '1px solid #e5e5e5',
          backgroundColor: 'white',
          borderRadius: '8px 8px 0 0',
          overflow: 'hidden',
        }}
      >
        {['general', 'whatsapp', 'api-keys', 'widget', 'n8n'].map((tab) => (
          <button
            key={tab}
            onClick={() => handleTabChange(tab)}
            style={{
              padding: '12px 20px',
              border: 'none',
              backgroundColor: activeTab === tab ? '#7c3aed' : 'transparent',
              color: activeTab === tab ? 'white' : '#666',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: activeTab === tab ? '600' : '500',
              borderBottom: activeTab === tab ? 'none' : '2px solid transparent',
            }}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1).replace('-', ' ')}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div
        style={{
          backgroundColor: 'white',
          border: '1px solid #e5e5e5',
          borderRadius: '0 0 12px 12px',
          padding: '24px',
        }}
      >
        {/* General Tab */}
        {activeTab === 'general' && (
          <div>
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', marginBottom: '8px', color: '#666' }}>
                Sub-Account Name
              </label>
              <input
                type="text"
                value={settingsName}
                onChange={(e) => setSettingsName(e.target.value)}
                style={{
                  width: '100%',
                  maxWidth: '400px',
                  padding: '10px 12px',
                  border: '1px solid #e5e5e5',
                  borderRadius: '6px',
                  fontSize: '14px',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', marginBottom: '8px', color: '#666' }}>
                Timezone
              </label>
              <select
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                style={{
                  width: '100%',
                  maxWidth: '400px',
                  padding: '10px 12px',
                  border: '1px solid #e5e5e5',
                  borderRadius: '6px',
                  fontSize: '14px',
                  boxSizing: 'border-box',
                }}
              >
                <option value="UTC">UTC</option>
                <option value="EST">EST</option>
                <option value="CST">CST</option>
                <option value="MST">MST</option>
                <option value="PST">PST</option>
                <option value="GMT">GMT</option>
                <option value="CET">CET</option>
                <option value="IST">IST</option>
                <option value="JST">JST</option>
                <option value="AEST">AEST</option>
              </select>
            </div>

            <button
              onClick={handleSaveGeneral}
              style={{
                padding: '10px 24px',
                backgroundColor: '#7c3aed',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '500',
              }}
            >
              Save Settings
            </button>
          </div>
        )}

        {/* WhatsApp Tab */}
        {activeTab === 'whatsapp' && (
          <div>
            <div style={{ marginBottom: '24px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px', color: '#1a1a1a' }}>
                Connection Status
              </h3>
              <div
                style={{
                  padding: '12px 16px',
                  backgroundColor: sessionStatus === 'connected' ? '#d1fae5' : '#fef3c7',
                  border: `1px solid ${sessionStatus === 'connected' ? '#6ee7b7' : '#fde68a'}`,
                  borderRadius: '6px',
                  fontSize: '14px',
                  color: sessionStatus === 'connected' ? '#065f46' : '#92400e',
                  marginBottom: '16px',
                }}
              >
                {sessionStatus === 'connected'
                  ? 'WhatsApp is connected'
                  : sessionStatus === 'qr_ready'
                    ? 'Scan the QR code with WhatsApp to connect'
                    : sessionStatus === 'qr_loading'
                      ? 'Loading QR code...'
                      : 'WhatsApp is not connected'}
              </div>

              {qrCode && (
                <div
                  style={{
                    marginBottom: '16px',
                    padding: '16px',
                    backgroundColor: '#f9f9f9',
                    border: '1px solid #e5e5e5',
                    borderRadius: '8px',
                    display: 'flex',
                    justifyContent: 'center',
                  }}
                >
                  <img
                    src={qrCode}
                    alt="WhatsApp QR"
                    style={{ maxWidth: '300px', width: '100%' }}
                  />
                </div>
              )}

              <div style={{ display: 'flex', gap: '8px' }}>
                {sessionStatus !== 'connected' ? (
                  <button
                    onClick={handleConnectWhatsApp}
                    disabled={sessionStatus === 'qr_loading'}
                    style={{
                      padding: '10px 24px',
                      backgroundColor: '#7c3aed',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '14px',
                      fontWeight: '500',
                      opacity: sessionStatus === 'qr_loading' ? 0.6 : 1,
                    }}
                  >
                    {sessionStatus === 'qr_loading' ? 'Connecting...' : 'Connect WhatsApp'}
                  </button>
                ) : (
                  <button
                    onClick={handleDisconnectWhatsApp}
                    style={{
                      padding: '10px 24px',
                      backgroundColor: '#dc2626',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '14px',
                      fontWeight: '500',
                    }}
                  >
                    Disconnect
                  </button>
                )}
              </div>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px', color: '#1a1a1a' }}>
                Webhook URL
              </h3>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <input
                  type="text"
                  value={whUrl}
                  readOnly
                  style={{
                    flex: 1,
                    padding: '10px 12px',
                    border: '1px solid #e5e5e5',
                    borderRadius: '6px',
                    fontSize: '13px',
                    backgroundColor: '#f9f9f9',
                    boxSizing: 'border-box',
                  }}
                />
                <button
                  onClick={() => handleCopyToClipboard(whUrl)}
                  style={{
                    padding: '10px 16px',
                    backgroundColor: '#f0f0f0',
                    border: '1px solid #e5e5e5',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  {copyFeedback === whUrl ? (
                    <>
                      <Check size={16} />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy size={16} />
                      Copy
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* API Keys Tab */}
        {activeTab === 'api-keys' && (
          <div>
            <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '16px', color: '#1a1a1a' }}>
              Stored API Keys
            </h3>

            {apiKeys.length > 0 && (
              <div style={{ marginBottom: '24px' }}>
                {apiKeys.map((key) => (
                  <div
                    key={key.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      padding: '12px 16px',
                      backgroundColor: '#f9f9f9',
                      border: '1px solid #e5e5e5',
                      borderRadius: '6px',
                      marginBottom: '8px',
                    }}
                  >
                    <div
                      style={{
                        flex: 1,
                        fontSize: '13px',
                      }}
                    >
                      <p style={{ fontWeight: '500', color: '#1a1a1a', margin: '0 0 4px 0' }}>
                        {key.provider}
                      </p>
                      <p
                        style={{
                          color: '#666',
                          margin: 0,
                          fontFamily: 'monospace',
                          fontSize: '12px',
                        }}
                      >
                        {maskApiKey(key.api_key)}
                      </p>
                    </div>
                    <button
                      onClick={() => handleDeleteApiKey(key.id)}
                      style={{
                        padding: '8px 12px',
                        backgroundColor: '#f0f0f0',
                        border: '1px solid #e5e5e5',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        fontSize: '13px',
                        color: '#dc2626',
                      }}
                    >
                      <Trash2 size={16} />
                      Delete
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div
              style={{
                padding: '16px',
                backgroundColor: '#f9f9f9',
                border: '1px solid #e5e5e5',
                borderRadius: '8px',
              }}
            >
              <h4 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '12px', color: '#1a1a1a' }}>
                Add New API Key
              </h4>
              <div style={{ display: 'flex', gap: '8px' }}>
                <select
                  value={newKeyProvider}
                  onChange={(e) =>
                    setNewKeyProvider(e.target.value as 'OpenAI' | 'Gemini' | 'DeepSeek')
                  }
                  style={{
                    padding: '10px 12px',
                    border: '1px solid #e5e5e5',
                    borderRadius: '6px',
                    fontSize: '14px',
                  }}
                >
                  <option value="OpenAI">OpenAI</option>
                  <option value="Gemini">Gemini</option>
                  <option value="DeepSeek">DeepSeek</option>
                </select>
                <input
                  type="password"
                  value={newKeyValue}
                  onChange={(e) => setNewKeyValue(e.target.value)}
                  style={{
                    flex: 1,
                    padding: '10px 12px',
                    border: '1px solid #e5e5e5',
                    borderRadius: '6px',
                    fontSize: '14px',
                    boxSizing: 'border-box',
                  }}
                  placeholder="sk-..."
                />
                <button
                  onClick={handleAddApiKey}
                  style={{
                    padding: '10px 24px',
                    backgroundColor: '#7c3aed',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: '500',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <Plus size={16} />
                  Add
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Widget Tab */}
        {activeTab === 'widget' && (
          <div>
            <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '16px', color: '#1a1a1a' }}>
              Embed Widget
            </h3>
            <p style={{ fontSize: '13px', color: '#666', marginBottom: '16px' }}>
              Copy this code snippet to embed the chat widget on your website.
            </p>
            <div style={{ display: 'flex', gap: '8px' }}>
              <textarea
                value={`<script src="${window.location.origin}/widget.js" data-account="${subAccountId}"><\/script>`}
                readOnly
                rows={4}
                style={{
                  flex: 1,
                  padding: '12px',
                  border: '1px solid #e5e5e5',
                  borderRadius: '6px',
                  fontSize: '13px',
                  fontFamily: 'monospace',
                  backgroundColor: '#f9f9f9',
                  boxSizing: 'border-box',
                }}
              />
              <button
                onClick={() =>
                  handleCopyToClipboard(
                    `<script src="${window.location.origin}/widget.js" data-account="${subAccountId}"><\/script>`
                  )
                }
                style={{
                  padding: '12px 16px',
                  backgroundColor: '#f0f0f0',
                  border: '1px solid #e5e5e5',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  whiteSpace: 'nowrap',
                  height: 'fit-content',
                }}
              >
                {copyFeedback.includes('widget.js') ? (
                  <>
                    <Check size={16} />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy size={16} />
                    Copy
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* n8n Tab */}
        {activeTab === 'n8n' && (
          <div>
            <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '16px', color: '#1a1a1a' }}>
              n8n Integration
            </h3>
            <div
              style={{
                padding: '16px',
                backgroundColor: '#f0f9ff',
                border: '1px solid #bfdbfe',
                borderRadius: '6px',
                marginBottom: '16px',
              }}
            >
              <p style={{ fontSize: '13px', color: '#1e40af', margin: 0 }}>
                <strong>n8n URL:</strong> {agency?.n8n_url || 'Not configured'}
              </p>
              <p style={{ fontSize: '12px', color: '#1e40af', margin: '8px 0 0 0' }}>
                Inherited from agency settings
              </p>
            </div>

            <button
              style={{
                padding: '10px 24px',
                backgroundColor: '#7c3aed',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '500',
              }}
            >
              Test Connection
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
