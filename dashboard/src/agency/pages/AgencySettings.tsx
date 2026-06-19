import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAgencyOutlet } from '../components/AgencyLayout';
import type { Agency } from '../types';

type AIProvider = 'openai' | 'gemini' | 'deepseek';

export function AgencySettings() {
  const { agencyId } = useAgencyOutlet();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [formData, setFormData] = useState({
    agencyName: '',
    logoUrl: '',
    openwaUrl: '',
    openwaApiKey: '',
    n8nUrl: '',
    n8nApiKey: '',
    aiProvider: 'openai' as AIProvider,
    aiApiKey: '',
  });

  useEffect(() => {
    if (!agencyId) return;
    loadAgency();
  }, [agencyId]);

  const loadAgency = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('agencies')
        .select('*')
        .eq('id', agencyId)
        .single();

      if (error) {
        console.error('Error loading agency:', error);
      } else if (data) {
        const agencyData = data as Agency;
        setFormData({
          agencyName: agencyData.name || '',
          logoUrl: agencyData.logo_url || '',
          openwaUrl: agencyData.openwa_url || '',
          openwaApiKey: agencyData.openwa_api_key || '',
          n8nUrl: agencyData.n8n_url || '',
          n8nApiKey: agencyData.n8n_api_key || '',
          aiProvider: (agencyData.agency_ai_provider || 'openai') as AIProvider,
          aiApiKey: agencyData.agency_ai_api_key || '',
        });
      }
    } catch (err) {
      console.error('Error loading agency:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSave = async () => {
    if (!agencyId) return;

    try {
      setSaving(true);
      setMessage(null);

      const { error } = await supabase
        .from('agencies')
        .update({
          name: formData.agencyName,
          logo_url: formData.logoUrl || null,
          openwa_url: formData.openwaUrl || null,
          openwa_api_key: formData.openwaApiKey || null,
          n8n_url: formData.n8nUrl || null,
          n8n_api_key: formData.n8nApiKey || null,
          agency_ai_provider: formData.aiProvider,
          agency_ai_api_key: formData.aiApiKey || null,
        })
        .eq('id', agencyId);

      if (error) {
        console.error('Error saving agency:', error);
        setMessage({ type: 'error', text: 'Failed to save settings' });
      } else {
        setMessage({ type: 'success', text: 'Settings saved successfully' });
        loadAgency();
        setTimeout(() => setMessage(null), 3000);
      }
    } catch (err) {
      console.error('Error saving agency:', err);
      setMessage({ type: 'error', text: 'Failed to save settings' });
    } finally {
      setSaving(false);
    }
  };

  const SettingsSection = ({
    title,
    fields,
  }: {
    title: string;
    fields: Array<{
      label: string;
      name: string;
      type?: string;
      placeholder?: string;
      options?: { label: string; value: string }[];
    }>;
  }) => (
    <div
      style={{
        backgroundColor: 'white',
        border: '1px solid #e5e5e5',
        borderRadius: '12px',
        padding: '24px',
        marginBottom: '24px',
      }}
    >
      <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#000', marginBottom: '16px' }}>
        {title}
      </h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {fields.map((field) => (
          <div key={field.name}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#666', marginBottom: '6px' }}>
              {field.label}
            </label>
            {field.options ? (
              <select
                name={field.name}
                value={formData[field.name as keyof typeof formData]}
                onChange={handleInputChange}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: '1px solid #e5e5e5',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontFamily: 'inherit',
                  boxSizing: 'border-box',
                }}
              >
                {field.options.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            ) : (
              <input
                type={field.type || 'text'}
                name={field.name}
                placeholder={field.placeholder}
                value={formData[field.name as keyof typeof formData]}
                onChange={handleInputChange}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: '1px solid #e5e5e5',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontFamily: 'inherit',
                  boxSizing: 'border-box',
                }}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );

  if (loading) {
    return (
      <div style={{ padding: '32px', textAlign: 'center', color: '#999' }}>
        Loading settings...
      </div>
    );
  }

  return (
    <div style={{ padding: '32px', maxWidth: '800px' }}>
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: '700', color: '#000', marginBottom: '8px' }}>
          Agency Settings
        </h1>
        <p style={{ fontSize: '14px', color: '#666' }}>Configure your agency and integrations</p>
      </div>

      {message && (
        <div
          style={{
            backgroundColor: message.type === 'success' ? '#d1fae5' : '#fee2e2',
            border: `1px solid ${message.type === 'success' ? '#a7f3d0' : '#fecaca'}`,
            borderRadius: '8px',
            padding: '12px 16px',
            marginBottom: '24px',
            color: message.type === 'success' ? '#065f46' : '#991b1b',
            fontSize: '14px',
          }}
        >
          {message.text}
        </div>
      )}

      <SettingsSection
        title="Agency Information"
        fields={[
          { label: 'Agency Name', name: 'agencyName', placeholder: 'Your agency name' },
          { label: 'Logo URL', name: 'logoUrl', placeholder: 'https://example.com/logo.png' },
        ]}
      />

      <SettingsSection
        title="OpenWA Configuration"
        fields={[
          { label: 'OpenWA URL', name: 'openwaUrl', placeholder: 'https://openwa.example.com' },
          { label: 'OpenWA API Key', name: 'openwaApiKey', type: 'password', placeholder: 'Your API key' },
        ]}
      />

      <SettingsSection
        title="n8n Configuration"
        fields={[
          { label: 'n8n URL', name: 'n8nUrl', placeholder: 'https://n8n.example.com' },
          { label: 'n8n API Key', name: 'n8nApiKey', type: 'password', placeholder: 'Your API key' },
        ]}
      />

      <SettingsSection
        title="AI Configuration"
        fields={[
          {
            label: 'AI Provider',
            name: 'aiProvider',
            options: [
              { label: 'OpenAI', value: 'openai' },
              { label: 'Gemini', value: 'gemini' },
              { label: 'DeepSeek', value: 'deepseek' },
            ],
          },
          { label: 'API Key', name: 'aiApiKey', type: 'password', placeholder: 'Your AI provider API key' },
        ]}
      />

      <div style={{ display: 'flex', gap: '12px' }}>
        <button
          onClick={handleSave}
          disabled={saving}
          style={{
            padding: '10px 24px',
            backgroundColor: saving ? '#ccc' : '#7c3aed',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: saving ? 'not-allowed' : 'pointer',
            fontSize: '14px',
            fontWeight: '600',
            transition: 'background-color 0.2s ease',
          }}
          onMouseOver={(e) => {
            if (!saving) {
              (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#6d28d9';
            }
          }}
          onMouseOut={(e) => {
            if (!saving) {
              (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#7c3aed';
            }
          }}
        >
          {saving ? 'Saving...' : 'Save Settings'}
        </button>
      </div>
    </div>
  );
}
