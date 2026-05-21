import React, { useState, useEffect, useRef } from 'react';
import { Smartphone, Plus, QrCode, CircleCheck as CheckCircle, WifiOff, Loader as Loader2, RefreshCw, Trash2, CircleAlert as AlertCircle, Wifi } from 'lucide-react';
import { customerSessionApi, type CustomerSession } from '../../services/customerApi';
import './ConnectWhatsApp.css';

type ViewMode = 'list' | 'connecting' | 'qr' | 'success';

interface NewSessionState {
  displayName: string;
  session: CustomerSession | null;
  qrCode: string | null;
  mode: ViewMode;
  error: string;
  countdown: number;
}

const QR_TIMEOUT = 60;

export function ConnectWhatsApp() {
  const [sessions, setSessions] = useState<CustomerSession[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);

  const [state, setState] = useState<NewSessionState>({
    displayName: '',
    session: null,
    qrCode: null,
    mode: 'list',
    error: '',
    countdown: QR_TIMEOUT,
  });

  const pollRef = useRef<number | null>(null);
  const countdownRef = useRef<number | null>(null);

  const loadSessions = async () => {
    setLoadingSessions(true);
    try {
      const data = await customerSessionApi.list();
      setSessions(data);
    } catch {
      // silent
    } finally {
      setLoadingSessions(false);
    }
  };

  useEffect(() => {
    void loadSessions();
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, []);

  const startPollingQR = (sessionId: string) => {
    let cd = QR_TIMEOUT;
    setState(s => ({ ...s, countdown: QR_TIMEOUT }));

    countdownRef.current = setInterval(() => {
      cd--;
      setState(s => ({ ...s, countdown: cd }));
      if (cd <= 0) {
        if (countdownRef.current) clearInterval(countdownRef.current);
        if (pollRef.current) clearInterval(pollRef.current);
        setState(s => ({
          ...s,
          mode: 'list',
          qrCode: null,
          error: 'QR code expired. Click "Reconnect" to try again.',
        }));
      }
    }, 1000) as unknown as number;

    pollRef.current = setInterval(async () => {
      try {
        const result = await customerSessionApi.getQR(sessionId);
        if (result.qrCode) {
          setState(s => ({ ...s, qrCode: result.qrCode, mode: 'qr' }));
        }
        if (result.status === 'ready') {
          if (pollRef.current) clearInterval(pollRef.current);
          if (countdownRef.current) clearInterval(countdownRef.current);
          setState(s => ({ ...s, mode: 'success', qrCode: null }));
          void loadSessions();
        }
      } catch {
        // keep polling
      }
    }, 2000) as unknown as number;
  };

  const handleCreate = async () => {
    if (!newName.trim()) return;
    setCreating(true);
    try {
      const session = await customerSessionApi.create(newName.trim());
      const started = await customerSessionApi.start(session.id);
      setState({
        displayName: newName.trim(),
        session: started,
        qrCode: null,
        mode: 'connecting',
        error: '',
        countdown: QR_TIMEOUT,
      });
      setShowForm(false);
      setNewName('');
      startPollingQR(session.id);
    } catch (err) {
      setState(s => ({
        ...s,
        error: err instanceof Error ? err.message : 'Failed to create session',
      }));
    } finally {
      setCreating(false);
    }
  };

  const handleReconnect = async (session: CustomerSession) => {
    if (pollRef.current) clearInterval(pollRef.current);
    if (countdownRef.current) clearInterval(countdownRef.current);
    setState({
      displayName: session.displayName,
      session,
      qrCode: null,
      mode: 'connecting',
      error: '',
      countdown: QR_TIMEOUT,
    });
    try {
      const started = await customerSessionApi.start(session.id);
      setState(s => ({ ...s, session: started }));
      startPollingQR(session.id);
    } catch (err) {
      setState(s => ({
        ...s,
        mode: 'list',
        error: err instanceof Error ? err.message : 'Failed to reconnect',
      }));
    }
  };

  const handleDelete = async (sessionId: string) => {
    if (!confirm('Delete this WhatsApp connection?')) return;
    try {
      await customerSessionApi.delete(sessionId);
      setSessions(prev => prev.filter(s => s.id !== sessionId));
    } catch {}
  };

  const handleDisconnect = async (sessionId: string) => {
    try {
      const updated = await customerSessionApi.disconnect(sessionId);
      setSessions(prev => prev.map(s => (s.id === sessionId ? updated : s)));
    } catch {}
  };

  const statusConfig: Record<string, { label: string; className: string; icon: React.ReactNode }> = {
    ready: { label: 'Connected', className: 'status--ready', icon: <Wifi size={14} /> },
    qr_ready: { label: 'Scan QR', className: 'status--qr', icon: <QrCode size={14} /> },
    connecting: { label: 'Connecting', className: 'status--connecting', icon: <Loader2 size={14} className="spin" /> },
    created: { label: 'Not started', className: 'status--idle', icon: <Smartphone size={14} /> },
    disconnected: { label: 'Disconnected', className: 'status--disconnected', icon: <WifiOff size={14} /> },
    failed: { label: 'Failed', className: 'status--failed', icon: <AlertCircle size={14} /> },
  };

  const renderQRPanel = () => (
    <div className="cwa__qr-panel">
      {state.mode === 'connecting' && (
        <div className="cwa__qr-waiting">
          <Loader2 size={48} className="spin" />
          <h3>Preparing QR Code…</h3>
          <p>Starting WhatsApp connection for <strong>{state.displayName}</strong></p>
        </div>
      )}

      {state.mode === 'qr' && state.qrCode && (
        <div className="cwa__qr-scan">
          <div className="cwa__qr-header">
            <QrCode size={24} />
            <div>
              <h3>Scan with WhatsApp</h3>
              <p>Open WhatsApp on your phone → Settings → Linked Devices → Link a device</p>
            </div>
          </div>
          <div className="cwa__qr-image-wrap">
            <img src={state.qrCode} alt="WhatsApp QR Code" className="cwa__qr-image" />
            <div className="cwa__qr-countdown">
              <div
                className="cwa__qr-countdown-bar"
                style={{ width: `${(state.countdown / QR_TIMEOUT) * 100}%` }}
              />
            </div>
            <p className="cwa__qr-expires">Code expires in <strong>{state.countdown}s</strong></p>
          </div>
        </div>
      )}

      {state.mode === 'success' && (
        <div className="cwa__qr-success">
          <CheckCircle size={56} className="cwa__success-icon" />
          <h3>WhatsApp Connected!</h3>
          <p>Your number <strong>{state.displayName}</strong> is now connected and ready to use.</p>
          <button
            className="cwa__btn cwa__btn--primary"
            onClick={() => setState(s => ({ ...s, mode: 'list' }))}
          >
            View Connections
          </button>
        </div>
      )}

      <button
        className="cwa__btn cwa__btn--ghost"
        onClick={() => {
          if (pollRef.current) clearInterval(pollRef.current);
          if (countdownRef.current) clearInterval(countdownRef.current);
          setState(s => ({ ...s, mode: 'list', qrCode: null }));
        }}
      >
        ← Back to connections
      </button>
    </div>
  );

  if (state.mode !== 'list') {
    return (
      <div className="cwa">
        <div className="cwa__header">
          <h1>Connect WhatsApp</h1>
        </div>
        {renderQRPanel()}
      </div>
    );
  }

  return (
    <div className="cwa">
      <div className="cwa__header">
        <div>
          <h1>WhatsApp Connections</h1>
          <p>Connect your WhatsApp number to start chatting with customers</p>
        </div>
        <button className="cwa__btn cwa__btn--primary" onClick={() => setShowForm(true)}>
          <Plus size={18} /> Add Connection
        </button>
      </div>

      {state.error && (
        <div className="cwa__banner cwa__banner--error">
          <AlertCircle size={16} />
          {state.error}
          <button onClick={() => setState(s => ({ ...s, error: '' }))}>×</button>
        </div>
      )}

      {/* New session form */}
      {showForm && (
        <div className="cwa__form-card">
          <h3>New WhatsApp Connection</h3>
          <p>Give this connection a name so you can identify it later.</p>
          <div className="cwa__form-row">
            <input
              type="text"
              value={newName}
              onChange={e => setNewName(e.target.value)}
              placeholder="e.g. Business Support"
              onKeyDown={e => e.key === 'Enter' && handleCreate()}
              autoFocus
            />
            <button
              className="cwa__btn cwa__btn--primary"
              onClick={handleCreate}
              disabled={creating || !newName.trim()}
            >
              {creating ? <Loader2 size={16} className="spin" /> : null}
              {creating ? 'Creating…' : 'Connect'}
            </button>
            <button className="cwa__btn cwa__btn--ghost" onClick={() => { setShowForm(false); setNewName(''); }}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Sessions list */}
      {loadingSessions ? (
        <div className="cwa__loading">
          <Loader2 size={32} className="spin" />
          <span>Loading connections…</span>
        </div>
      ) : sessions.length === 0 ? (
        <div className="cwa__empty">
          <div className="cwa__empty-icon"><Smartphone size={40} /></div>
          <h3>No WhatsApp connections yet</h3>
          <p>Connect your first WhatsApp number to get started</p>
          <button className="cwa__btn cwa__btn--primary" onClick={() => setShowForm(true)}>
            <Plus size={18} /> Add Connection
          </button>
        </div>
      ) : (
        <div className="cwa__sessions">
          {sessions.map(session => {
            const cfg = statusConfig[session.status] || statusConfig.created;
            return (
              <div key={session.id} className="cwa__session-card">
                <div className="cwa__session-icon">
                  <Smartphone size={24} />
                </div>
                <div className="cwa__session-info">
                  <h3>{session.displayName}</h3>
                  <p>{session.phoneNumber || 'Phone not yet connected'}</p>
                  {session.connectedAt && (
                    <span className="cwa__session-date">
                      Connected {new Date(session.connectedAt).toLocaleDateString()}
                    </span>
                  )}
                </div>
                <div className={`cwa__status ${cfg.className}`}>
                  {cfg.icon}
                  {cfg.label}
                </div>
                <div className="cwa__session-actions">
                  {session.status === 'disconnected' || session.status === 'failed' ? (
                    <button
                      className="cwa__btn cwa__btn--sm cwa__btn--primary"
                      onClick={() => handleReconnect(session)}
                    >
                      <RefreshCw size={14} /> Reconnect
                    </button>
                  ) : session.status === 'ready' ? (
                    <button
                      className="cwa__btn cwa__btn--sm cwa__btn--ghost"
                      onClick={() => handleDisconnect(session.id)}
                    >
                      Disconnect
                    </button>
                  ) : session.status === 'created' ? (
                    <button
                      className="cwa__btn cwa__btn--sm cwa__btn--primary"
                      onClick={() => handleReconnect(session)}
                    >
                      <QrCode size={14} /> Start
                    </button>
                  ) : null}
                  <button
                    className="cwa__btn cwa__btn--sm cwa__btn--danger"
                    onClick={() => handleDelete(session.id)}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
