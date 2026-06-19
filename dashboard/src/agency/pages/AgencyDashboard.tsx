import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAgencyOutlet } from '../components/AgencyLayout';
import type { SubAccount } from '../types';

interface CreateSubAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (name: string) => void;
  isLoading: boolean;
}

function CreateSubAccountModal({ isOpen, onClose, onSubmit, isLoading }: CreateSubAccountModalProps) {
  const [name, setName] = useState('');

  const handleSubmit = () => {
    if (name.trim()) {
      onSubmit(name);
      setName('');
    }
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 50,
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: 'white',
          borderRadius: '12px',
          border: '1px solid #e5e5e5',
          padding: '24px',
          maxWidth: '400px',
          width: '90%',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '16px', color: '#000' }}>
          Create New Sub-Account
        </h2>
        <input
          type="text"
          placeholder="Sub-Account Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleSubmit()}
          disabled={isLoading}
          style={{
            width: '100%',
            padding: '10px 12px',
            border: '1px solid #e5e5e5',
            borderRadius: '8px',
            fontSize: '14px',
            marginBottom: '16px',
            boxSizing: 'border-box',
            fontFamily: 'inherit',
          }}
        />
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
          <button
            onClick={onClose}
            disabled={isLoading}
            style={{
              padding: '8px 16px',
              border: '1px solid #e5e5e5',
              borderRadius: '8px',
              backgroundColor: '#f5f5f5',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '600',
              transition: 'background-color 0.2s ease',
            }}
            onMouseOver={(e) => {
              (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#efefef';
            }}
            onMouseOut={(e) => {
              (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#f5f5f5';
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={isLoading || !name.trim()}
            style={{
              padding: '8px 16px',
              backgroundColor: isLoading || !name.trim() ? '#ccc' : '#7c3aed',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: isLoading || !name.trim() ? 'not-allowed' : 'pointer',
              fontSize: '14px',
              fontWeight: '600',
              transition: 'background-color 0.2s ease',
            }}
            onMouseOver={(e) => {
              if (!isLoading && name.trim()) {
                (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#6d28d9';
              }
            }}
            onMouseOut={(e) => {
              if (!isLoading && name.trim()) {
                (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#7c3aed';
              }
            }}
          >
            Create
          </button>
        </div>
      </div>
    </div>
  );
}

export function AgencyDashboard() {
  const { agencyId } = useAgencyOutlet();
  const navigate = useNavigate();
  const [stats, setStats] = useState<Record<string, number>>({
    subAccounts: 0,
    contacts: 0,
    conversations: 0,
  });
  const [subAccounts, setSubAccounts] = useState<SubAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    if (!agencyId) return;
    loadData();
  }, [agencyId]);

  const loadData = async () => {
    try {
      setLoading(true);

      // Load sub-accounts
      const { data: subAcctsData, error: subAcctsError } = await supabase
        .from('sub_accounts')
        .select('*')
        .eq('agency_id', agencyId);

      if (!subAcctsError && subAcctsData) {
        setSubAccounts(subAcctsData as SubAccount[]);
      }

      // Load stats
      const subAccountIds = (subAcctsData || []).map((sa) => sa.id);

      // Count contacts
      const { count: contactsCount } = await supabase
        .from('agency_contacts')
        .select('*', { count: 'exact', head: true })
        .in('sub_account_id', subAccountIds.length > 0 ? subAccountIds : ['']);

      // Count conversations
      const { count: conversationsCount } = await supabase
        .from('agency_conversations')
        .select('*', { count: 'exact', head: true })
        .in('sub_account_id', subAccountIds.length > 0 ? subAccountIds : [''])
        .eq('status', 'open');

      setStats({
        subAccounts: subAcctsData?.length || 0,
        contacts: contactsCount || 0,
        conversations: conversationsCount || 0,
      });
    } catch (err) {
      console.error('Error loading data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSubAccount = async (name: string) => {
    if (!agencyId) return;
    try {
      setIsCreating(true);
      const { error } = await supabase.from('sub_accounts').insert({
        agency_id: agencyId,
        name,
        openwa_session_status: 'disconnected',
      });

      if (error) {
        console.error('Error creating sub-account:', error);
        alert('Failed to create sub-account');
      } else {
        setModalOpen(false);
        loadData();
      }
    } catch (err) {
      console.error('Error creating sub-account:', err);
      alert('Failed to create sub-account');
    } finally {
      setIsCreating(false);
    }
  };

  const getWhatsAppStatus = (status: string) => {
    const isConnected = status === 'connected';
    return (
      <span
        style={{
          display: 'inline-block',
          width: '8px',
          height: '8px',
          borderRadius: '50%',
          backgroundColor: isConnected ? '#10b981' : '#9ca3af',
          marginRight: '6px',
        }}
      />
    );
  };

  return (
    <div style={{ padding: '32px' }}>
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: '700', color: '#000', marginBottom: '8px' }}>
          Dashboard
        </h1>
        <p style={{ fontSize: '14px', color: '#666' }}>Welcome to your agency admin panel</p>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '32px' }}>
        {[
          { label: 'Total Sub-Accounts', value: stats.subAccounts },
          { label: 'Total Contacts', value: stats.contacts },
          { label: 'Open Conversations', value: stats.conversations },
        ].map((stat) => (
          <div
            key={stat.label}
            style={{
              backgroundColor: 'white',
              border: '1px solid #e5e5e5',
              borderRadius: '12px',
              padding: '20px',
              minHeight: '100px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
            }}
          >
            <div style={{ fontSize: '12px', color: '#666', marginBottom: '8px', fontWeight: '600' }}>
              {stat.label}
            </div>
            <div style={{ fontSize: '32px', fontWeight: '700', color: '#7c3aed' }}>
              {loading ? '...' : stat.value}
            </div>
          </div>
        ))}
      </div>

      {/* Sub-Accounts Section */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: '700', color: '#000' }}>Sub-Accounts</h2>
          <button
            onClick={() => setModalOpen(true)}
            style={{
              padding: '8px 16px',
              backgroundColor: '#7c3aed',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '600',
              transition: 'background-color 0.2s ease',
            }}
            onMouseOver={(e) => {
              (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#6d28d9';
            }}
            onMouseOut={(e) => {
              (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#7c3aed';
            }}
          >
            New Sub-Account
          </button>
        </div>

        {/* Sub-Account Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
          {subAccounts.map((subAccount) => (
            <div
              key={subAccount.id}
              style={{
                backgroundColor: 'white',
                border: '1px solid #e5e5e5',
                borderRadius: '12px',
                padding: '16px',
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              <div style={{ marginBottom: '12px' }}>
                <div style={{ fontSize: '16px', fontWeight: '700', color: '#000', marginBottom: '8px' }}>
                  {subAccount.name}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {getWhatsAppStatus(subAccount.openwa_session_status)}
                  <span style={{ fontSize: '12px', color: '#666' }}>
                    {subAccount.openwa_session_status === 'connected' ? 'Connected' : 'Disconnected'}
                  </span>
                </div>
              </div>

              <button
                onClick={() => navigate(`/app/${subAccount.id}/dashboard`)}
                style={{
                  padding: '8px 12px',
                  backgroundColor: '#7c3aed',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '12px',
                  fontWeight: '600',
                  marginTop: 'auto',
                  transition: 'background-color 0.2s ease',
                }}
                onMouseOver={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#6d28d9';
                }}
                onMouseOut={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#7c3aed';
                }}
              >
                Manage
              </button>
            </div>
          ))}
        </div>

        {!loading && subAccounts.length === 0 && (
          <div
            style={{
              backgroundColor: 'white',
              border: '1px solid #e5e5e5',
              borderRadius: '12px',
              padding: '32px',
              textAlign: 'center',
              color: '#999',
            }}
          >
            No sub-accounts yet. Create one to get started.
          </div>
        )}
      </div>

      <CreateSubAccountModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={handleCreateSubAccount}
        isLoading={isCreating}
      />
    </div>
  );
}
