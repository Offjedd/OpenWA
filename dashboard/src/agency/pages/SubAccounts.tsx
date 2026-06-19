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

export function SubAccounts() {
  const { agencyId: outletAgencyId } = useAgencyOutlet();
  const navigate = useNavigate();
  const [agencyId, setAgencyId] = useState<string | undefined>(outletAgencyId);
  const [subAccounts, setSubAccounts] = useState<SubAccount[]>([]);
  const [contactCounts, setContactCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    if (outletAgencyId) {
      setAgencyId(outletAgencyId);
    } else {
      // Fallback: resolve agency from current user session
      supabase.auth.getUser().then(({ data: { user } }) => {
        if (!user) return;
        supabase
          .from('agencies')
          .select('id')
          .eq('owner_id', user.id)
          .single()
          .then(({ data }) => {
            if (data?.id) setAgencyId(data.id);
          });
      });
    }
  }, [outletAgencyId]);

  useEffect(() => {
    if (!agencyId) return;
    loadSubAccounts();
  }, [agencyId]);

  const loadSubAccounts = async () => {
    try {
      setLoading(true);

      const { data: subAcctsData, error: subAcctsError } = await supabase
        .from('sub_accounts')
        .select('*')
        .eq('agency_id', agencyId);

      if (!subAcctsError && subAcctsData) {
        setSubAccounts(subAcctsData as SubAccount[]);

        // Load contact counts for each sub-account
        const counts: Record<string, number> = {};
        for (const subAcct of subAcctsData) {
          const { count } = await supabase
            .from('agency_contacts')
            .select('*', { count: 'exact', head: true })
            .eq('sub_account_id', subAcct.id);
          counts[subAcct.id] = count || 0;
        }
        setContactCounts(counts);
      }
    } catch (err) {
      console.error('Error loading sub-accounts:', err);
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
        loadSubAccounts();
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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: '700', color: '#000', marginBottom: '8px' }}>
            Sub-Accounts
          </h1>
          <p style={{ fontSize: '14px', color: '#666' }}>Manage all your sub-accounts</p>
        </div>
        <button
          onClick={() => setModalOpen(true)}
          style={{
            padding: '10px 20px',
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

      {/* Sub-Account Cards Grid */}
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
              transition: 'box-shadow 0.2s ease',
            }}
            onMouseOver={(e) => {
              (e.currentTarget as HTMLDivElement).style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.1)';
            }}
            onMouseOut={(e) => {
              (e.currentTarget as HTMLDivElement).style.boxShadow = 'none';
            }}
          >
            {/* Logo Placeholder */}
            <div
              style={{
                width: '48px',
                height: '48px',
                backgroundColor: '#f0f0f0',
                borderRadius: '8px',
                marginBottom: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '24px',
                color: '#d0d0d0',
              }}
            >
              {subAccount.logo_url ? (
                <img
                  src={subAccount.logo_url}
                  alt={subAccount.name}
                  style={{ width: '100%', height: '100%', borderRadius: '8px', objectFit: 'cover' }}
                />
              ) : (
                <span>📦</span>
              )}
            </div>

            {/* Name */}
            <div style={{ fontSize: '16px', fontWeight: '700', color: '#000', marginBottom: '8px' }}>
              {subAccount.name}
            </div>

            {/* WhatsApp Status */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
              {getWhatsAppStatus(subAccount.openwa_session_status)}
              <span style={{ fontSize: '12px', color: '#666' }}>
                {subAccount.openwa_session_status === 'connected' ? 'Connected' : 'Disconnected'}
              </span>
            </div>

            {/* Contact Count */}
            <div style={{ fontSize: '12px', color: '#999', marginBottom: '16px' }}>
              {contactCounts[subAccount.id] || 0} contacts
            </div>

            {/* Manage Button */}
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
            padding: '64px 32px',
            textAlign: 'center',
            color: '#999',
          }}
        >
          <p style={{ fontSize: '16px', marginBottom: '16px' }}>No sub-accounts yet</p>
          <p style={{ fontSize: '14px', color: '#bbb' }}>Create your first sub-account to get started</p>
        </div>
      )}

      <CreateSubAccountModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={handleCreateSubAccount}
        isLoading={isCreating}
      />
    </div>
  );
}
