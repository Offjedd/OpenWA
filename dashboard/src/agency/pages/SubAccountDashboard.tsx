import { useEffect, useState } from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import type { SubAccount, AgencyContact } from '../types';
import { CircleAlert as AlertCircle } from 'lucide-react';

interface OutletContext {
  subAccountId: string;
  agency: any;
}

interface StatData {
  totalContacts: number;
  openConversations: number;
  pipelineValue: number;
  todayAppointments: number;
}

interface RecentConversation {
  id: string;
  contact_id: string | null;
  channel: string;
  last_message: string | null;
  last_message_at: string;
  contact?: AgencyContact;
}

interface UpcomingAppointment {
  id: string;
  title: string;
  start_time: string;
  contact_id: string | null;
}

export default function SubAccountDashboard() {
  const { subAccountId } = useOutletContext<OutletContext>();
  const navigate = useNavigate();
  const [subAccount, setSubAccount] = useState<SubAccount | null>(null);
  const [stats, setStats] = useState<StatData>({
    totalContacts: 0,
    openConversations: 0,
    pipelineValue: 0,
    todayAppointments: 0,
  });
  const [recentConversations, setRecentConversations] = useState<RecentConversation[]>([]);
  const [upcomingAppointments, setUpcomingAppointments] = useState<UpcomingAppointment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, [subAccountId]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);

      // Load sub_account
      const { data: subAccountData } = await supabase
        .from('sub_accounts')
        .select('*')
        .eq('id', subAccountId)
        .single();

      if (subAccountData) {
        setSubAccount(subAccountData);
      }

      // Load stats
      const { count: contactsCount } = await supabase
        .from('agency_contacts')
        .select('*', { count: 'exact', head: true })
        .eq('sub_account_id', subAccountId);

      const { count: openConvCount } = await supabase
        .from('agency_conversations')
        .select('*', { count: 'exact', head: true })
        .eq('sub_account_id', subAccountId)
        .eq('status', 'open');

      const { data: opportunities } = await supabase
        .from('opportunities')
        .select('value')
        .eq('sub_account_id', subAccountId);

      const pipelineValue = opportunities?.reduce((sum, opp) => sum + (opp.value || 0), 0) || 0;

      const today = new Date().toISOString().split('T')[0];
      const { count: appointmentsCount } = await supabase
        .from('calendar_events')
        .select('*', { count: 'exact', head: true })
        .eq('sub_account_id', subAccountId)
        .gte('start_time', `${today}T00:00:00`)
        .lt('start_time', `${today}T23:59:59`);

      setStats({
        totalContacts: contactsCount || 0,
        openConversations: openConvCount || 0,
        pipelineValue,
        todayAppointments: appointmentsCount || 0,
      });

      // Load recent conversations
      const { data: conversations } = await supabase
        .from('agency_conversations')
        .select(
          `
          id,
          contact_id,
          channel,
          last_message,
          last_message_at,
          agency_contacts!inner(*)
        `
        )
        .eq('sub_account_id', subAccountId)
        .order('last_message_at', { ascending: false })
        .limit(5);

      setRecentConversations(
        (conversations || []).map((conv: any) => ({
          ...conv,
          contact: conv.agency_contacts,
        }))
      );

      // Load upcoming appointments
      const { data: appointments } = await supabase
        .from('calendar_events')
        .select('id, title, start_time, contact_id')
        .eq('sub_account_id', subAccountId)
        .gte('start_time', new Date().toISOString())
        .order('start_time', { ascending: true })
        .limit(5);

      setUpcomingAppointments(appointments || []);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleConnectWhatsApp = () => {
    navigate('./settings?tab=whatsapp');
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('ar-SA', {
      style: 'currency',
      currency: 'SAR',
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  if (loading) {
    return (
      <div
        style={{
          padding: '24px',
          textAlign: 'center',
          color: '#666',
        }}
      >
        Loading...
      </div>
    );
  }

  return (
    <div style={{ padding: '24px' }}>
      {/* WhatsApp Status Banner */}
      {subAccount && subAccount.openwa_session_status !== 'connected' && (
        <div
          style={{
            backgroundColor: '#fef3c7',
            border: '1px solid #fcd34d',
            borderRadius: '12px',
            padding: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '24px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <AlertCircle size={20} style={{ color: '#d97706' }} />
            <span style={{ color: '#92400e', fontWeight: '500' }}>
              WhatsApp is not connected. Connect it to enable messaging.
            </span>
          </div>
          <button
            onClick={handleConnectWhatsApp}
            style={{
              backgroundColor: '#7c3aed',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              padding: '8px 16px',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'background-color 0.2s ease',
            }}
            onMouseOver={(e) => {
              (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#6d28d9';
            }}
            onMouseOut={(e) => {
              (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#7c3aed';
            }}
          >
            Connect WhatsApp
          </button>
        </div>
      )}

      {/* Stats Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: '16px',
          marginBottom: '32px',
        }}
      >
        <div
          style={{
            backgroundColor: 'white',
            border: '1px solid #e5e5e5',
            borderRadius: '12px',
            padding: '20px',
          }}
        >
          <div style={{ fontSize: '12px', color: '#666', marginBottom: '8px', fontWeight: '500' }}>
            Total Contacts
          </div>
          <div style={{ fontSize: '28px', fontWeight: '700', color: '#7c3aed' }}>
            {stats.totalContacts}
          </div>
        </div>

        <div
          style={{
            backgroundColor: 'white',
            border: '1px solid #e5e5e5',
            borderRadius: '12px',
            padding: '20px',
          }}
        >
          <div style={{ fontSize: '12px', color: '#666', marginBottom: '8px', fontWeight: '500' }}>
            Open Conversations
          </div>
          <div style={{ fontSize: '28px', fontWeight: '700', color: '#7c3aed' }}>
            {stats.openConversations}
          </div>
        </div>

        <div
          style={{
            backgroundColor: 'white',
            border: '1px solid #e5e5e5',
            borderRadius: '12px',
            padding: '20px',
          }}
        >
          <div style={{ fontSize: '12px', color: '#666', marginBottom: '8px', fontWeight: '500' }}>
            Pipeline Value
          </div>
          <div style={{ fontSize: '24px', fontWeight: '700', color: '#7c3aed' }}>
            {formatCurrency(stats.pipelineValue)}
          </div>
        </div>

        <div
          style={{
            backgroundColor: 'white',
            border: '1px solid #e5e5e5',
            borderRadius: '12px',
            padding: '20px',
          }}
        >
          <div style={{ fontSize: '12px', color: '#666', marginBottom: '8px', fontWeight: '500' }}>
            Today's Appointments
          </div>
          <div style={{ fontSize: '28px', fontWeight: '700', color: '#7c3aed' }}>
            {stats.todayAppointments}
          </div>
        </div>
      </div>

      {/* Recent Conversations & Upcoming Appointments */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '24px',
        }}
      >
        {/* Recent Conversations */}
        <div
          style={{
            backgroundColor: 'white',
            border: '1px solid #e5e5e5',
            borderRadius: '12px',
            padding: '20px',
          }}
        >
          <h3 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '16px', color: '#000' }}>
            Recent Conversations
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {recentConversations.length === 0 ? (
              <div style={{ color: '#999', fontSize: '14px', padding: '16px 0' }}>
                No conversations yet
              </div>
            ) : (
              recentConversations.map((conv) => (
                <div
                  key={conv.id}
                  style={{
                    padding: '12px',
                    backgroundColor: '#f5f5f5',
                    borderRadius: '8px',
                    borderLeft: '3px solid #7c3aed',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      marginBottom: '6px',
                    }}
                  >
                    <span style={{ fontWeight: '600', fontSize: '14px', color: '#000' }}>
                      {conv.contact?.name || 'Unknown'}
                    </span>
                    <span
                      style={{
                        fontSize: '12px',
                        backgroundColor: conv.channel === 'whatsapp' ? '#dcfce7' : '#dbeafe',
                        color: conv.channel === 'whatsapp' ? '#166534' : '#0c4a6e',
                        padding: '2px 8px',
                        borderRadius: '4px',
                        fontWeight: '500',
                      }}
                    >
                      {conv.channel === 'whatsapp' ? 'WhatsApp' : 'WebChat'}
                    </span>
                  </div>
                  <div
                    style={{
                      fontSize: '13px',
                      color: '#666',
                      marginBottom: '6px',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {conv.last_message || 'No messages'}
                  </div>
                  <div style={{ fontSize: '12px', color: '#999' }}>
                    {formatTime(conv.last_message_at)}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Upcoming Appointments */}
        <div
          style={{
            backgroundColor: 'white',
            border: '1px solid #e5e5e5',
            borderRadius: '12px',
            padding: '20px',
          }}
        >
          <h3 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '16px', color: '#000' }}>
            Upcoming Appointments
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {upcomingAppointments.length === 0 ? (
              <div style={{ color: '#999', fontSize: '14px', padding: '16px 0' }}>
                No upcoming appointments
              </div>
            ) : (
              upcomingAppointments.map((apt) => (
                <div
                  key={apt.id}
                  style={{
                    padding: '12px',
                    backgroundColor: '#f5f5f5',
                    borderRadius: '8px',
                    borderLeft: '3px solid #7c3aed',
                  }}
                >
                  <div style={{ fontWeight: '600', fontSize: '14px', color: '#000', marginBottom: '6px' }}>
                    {apt.title}
                  </div>
                  <div style={{ fontSize: '13px', color: '#666', marginBottom: '4px' }}>
                    {formatDate(apt.start_time)} at {formatTime(apt.start_time)}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
