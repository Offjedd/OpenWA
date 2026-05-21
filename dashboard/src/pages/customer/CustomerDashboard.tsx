import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Smartphone, MessageSquare, Wifi, WifiOff, Plus, ArrowRight, Loader as Loader2 } from 'lucide-react';
import { customerSessionApi, conversationApi, type CustomerSession } from '../../services/customerApi';
import { useCustomerAuth } from '../../hooks/useCustomerAuth';
import './CustomerDashboard.css';

export function CustomerDashboard() {
  const { customer } = useCustomerAuth();
  const [sessions, setSessions] = useState<CustomerSession[]>([]);
  const [convCounts, setConvCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    customerSessionApi.list()
      .then(async data => {
        setSessions(data);
        // Load conversation counts for each session
        const counts: Record<string, number> = {};
        await Promise.all(data.filter(s => s.status === 'ready').map(async s => {
          try {
            const { total } = await conversationApi.list(s.id, 1, 0);
            counts[s.id] = total;
          } catch { counts[s.id] = 0; }
        }));
        setConvCounts(counts);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const readySessions = sessions.filter(s => s.status === 'ready');
  const totalConversations = Object.values(convCounts).reduce((a, b) => a + b, 0);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  const firstName = customer?.fullName?.split(' ')[0] || 'there';

  return (
    <div className="cdash">
      <div className="cdash__greeting">
        <div>
          <h1>{greeting}, {firstName} 👋</h1>
          <p>Here's what's happening with your WhatsApp connections today.</p>
        </div>
        {sessions.length === 0 && !loading && (
          <Link to="/customer/connect" className="cdash__cta">
            <Plus size={18} /> Connect WhatsApp
          </Link>
        )}
      </div>

      {/* Stats */}
      <div className="cdash__stats">
        <div className="cdash__stat">
          <div className="cdash__stat-icon cdash__stat-icon--green">
            <Wifi size={22} />
          </div>
          <div>
            <div className="cdash__stat-value">{loading ? '—' : readySessions.length}</div>
            <div className="cdash__stat-label">Connected Numbers</div>
          </div>
        </div>
        <div className="cdash__stat">
          <div className="cdash__stat-icon cdash__stat-icon--blue">
            <MessageSquare size={22} />
          </div>
          <div>
            <div className="cdash__stat-value">{loading ? '—' : totalConversations}</div>
            <div className="cdash__stat-label">Total Conversations</div>
          </div>
        </div>
        <div className="cdash__stat">
          <div className="cdash__stat-icon cdash__stat-icon--slate">
            <Smartphone size={22} />
          </div>
          <div>
            <div className="cdash__stat-value">{loading ? '—' : sessions.length}</div>
            <div className="cdash__stat-label">Total Connections</div>
          </div>
        </div>
      </div>

      {/* Quick actions */}
      <div className="cdash__section">
        <h2>Quick Actions</h2>
        <div className="cdash__quick">
          <Link to="/customer/conversations" className="cdash__quick-card">
            <div className="cdash__quick-icon"><MessageSquare size={24} /></div>
            <div>
              <h3>Open Inbox</h3>
              <p>View and reply to customer messages</p>
            </div>
            <ArrowRight size={20} className="cdash__quick-arrow" />
          </Link>
          <Link to="/customer/connect" className="cdash__quick-card">
            <div className="cdash__quick-icon"><Smartphone size={24} /></div>
            <div>
              <h3>Manage Connections</h3>
              <p>Add or manage WhatsApp numbers</p>
            </div>
            <ArrowRight size={20} className="cdash__quick-arrow" />
          </Link>
        </div>
      </div>

      {/* Sessions overview */}
      {sessions.length > 0 && (
        <div className="cdash__section">
          <h2>Your WhatsApp Numbers</h2>
          <div className="cdash__sessions">
            {loading ? (
              <div className="cdash__loading"><Loader2 size={24} className="spin" /></div>
            ) : (
              sessions.map(s => (
                <div key={s.id} className="cdash__session">
                  <div className={`cdash__session-dot ${s.status === 'ready' ? 'cdash__session-dot--green' : ''}`} />
                  <div className="cdash__session-info">
                    <span className="cdash__session-name">{s.displayName}</span>
                    <span className="cdash__session-phone">{s.phoneNumber || 'Not connected'}</span>
                  </div>
                  {s.status === 'ready' ? (
                    <span className="cdash__badge cdash__badge--green"><Wifi size={12} /> Connected</span>
                  ) : (
                    <span className="cdash__badge cdash__badge--gray"><WifiOff size={12} /> {s.status}</span>
                  )}
                  {convCounts[s.id] !== undefined && (
                    <span className="cdash__conv-count">
                      {convCounts[s.id]} conversation{convCounts[s.id] !== 1 ? 's' : ''}
                    </span>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
