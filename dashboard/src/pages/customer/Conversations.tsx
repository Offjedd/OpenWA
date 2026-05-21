import { useState, useEffect, useRef, useCallback } from 'react';
import { Search, Send, Paperclip, Mic, FileText, X, Check, CheckCheck, Loader as Loader2, Phone, MessageSquare, CircleStop as StopCircle, Play, Pause, Download } from 'lucide-react';
import { customerSessionApi, conversationApi, type CustomerSession, type Conversation, type Message } from '../../services/customerApi';
import { supabase } from '../../lib/supabase';
import './Conversations.css';

type MediaType = 'image' | 'video' | 'audio' | 'document';

interface AttachmentState {
  file: File | null;
  type: MediaType | null;
  uploading: boolean;
  url: string | null;
  mimetype: string | null;
  filename: string | null;
}

const EMPTY_ATTACHMENT: AttachmentState = {
  file: null, type: null, uploading: false, url: null, mimetype: null, filename: null,
};

export function Conversations() {
  const [sessions, setSessions] = useState<CustomerSession[]>([]);
  const [selectedSession, setSelectedSession] = useState<CustomerSession | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [filteredConvs, setFilteredConvs] = useState<Conversation[]>([]);
  const [selectedConv, setSelectedConv] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [attachment, setAttachment] = useState<AttachmentState>(EMPTY_ATTACHMENT);
  const [loadingConvs, setLoadingConvs] = useState(false);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [mobileView, setMobileView] = useState<'list' | 'thread'>('list');

  // Audio recording
  const [recording, setRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const threadRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load sessions on mount
  useEffect(() => {
    customerSessionApi.list().then(data => {
      setSessions(data);
      const ready = data.find(s => s.status === 'ready');
      if (ready) setSelectedSession(ready);
    }).catch(() => {});
  }, []);

  // Load conversations when session changes
  useEffect(() => {
    if (!selectedSession) return;
    setLoadingConvs(true);
    conversationApi.list(selectedSession.id)
      .then(({ conversations: data }) => {
        setConversations(data);
        setFilteredConvs(data);
      })
      .catch(() => {})
      .finally(() => setLoadingConvs(false));
  }, [selectedSession]);

  // Filter conversations by search
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredConvs(conversations);
      return;
    }
    const q = searchQuery.toLowerCase();
    setFilteredConvs(conversations.filter(c =>
      (c.contact_name || '').toLowerCase().includes(q) ||
      (c.contact_phone || '').includes(q) ||
      (c.last_message_body || '').toLowerCase().includes(q),
    ));
  }, [searchQuery, conversations]);

  // Load messages when conversation changes
  const loadMessages = useCallback(async (conv: Conversation, sessId: string) => {
    setLoadingMsgs(true);
    try {
      const { messages: data } = await conversationApi.messages(sessId, conv.chat_id);
      setMessages(data.slice().reverse());
    } catch {} finally {
      setLoadingMsgs(false);
    }
  }, []);

  useEffect(() => {
    if (selectedConv && selectedSession) {
      void loadMessages(selectedConv, selectedSession.id);
    }
  }, [selectedConv, selectedSession, loadMessages]);

  // Scroll to bottom on new messages
  useEffect(() => {
    if (threadRef.current) {
      threadRef.current.scrollTop = threadRef.current.scrollHeight;
    }
  }, [messages]);

  // Supabase Realtime subscription
  useEffect(() => {
    if (!selectedSession) return;

    const channel = supabase
      .channel(`messages:session:${selectedSession.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        payload => {
          const newMsg = payload.new as Message;
          if (newMsg.customer_session_id !== selectedSession.id) return;

          setMessages(prev => {
            if (prev.find(m => m.id === newMsg.id)) return prev;
            return [...prev, newMsg];
          });

          // Update conversation list
          setConversations(prev => prev.map(c => {
            if (c.id === newMsg.conversation_id) {
              return {
                ...c,
                last_message_body: newMsg.body || '',
                last_message_at: newMsg.created_at,
                last_message_type: newMsg.type,
                unread_count: selectedConv?.id === c.id ? 0 : c.unread_count + 1,
              };
            }
            return c;
          }).sort((a, b) => {
            const ta = a.last_message_at ? new Date(a.last_message_at).getTime() : 0;
            const tb = b.last_message_at ? new Date(b.last_message_at).getTime() : 0;
            return tb - ta;
          }));
        },
      )
      .subscribe();

    return () => { void supabase.removeChannel(channel); };
  }, [selectedSession, selectedConv]);

  const handleSelectConv = (conv: Conversation) => {
    setSelectedConv(conv);
    setConversations(prev => prev.map(c => c.id === conv.id ? { ...c, unread_count: 0 } : c));
    setMobileView('thread');
  };

  const handleSend = async () => {
    if (!selectedConv || !selectedSession) return;
    const trimmed = text.trim();
    if (!trimmed && !attachment.url && !audioBlob) return;

    setSending(true);
    try {
      if (audioBlob) {
        const file = new File([audioBlob], 'voice-message.ogg', { type: 'audio/ogg' });
        const uploaded = await conversationApi.upload(file);
        await conversationApi.sendMedia(selectedSession.id, selectedConv.chat_id, 'audio', {
          url: uploaded.url, mimetype: uploaded.mimetype,
        });
        setAudioBlob(null);
      } else if (attachment.url) {
        await conversationApi.sendMedia(
          selectedSession.id,
          selectedConv.chat_id,
          attachment.type as MediaType,
          {
            url: attachment.url,
            mimetype: attachment.mimetype || 'application/octet-stream',
            filename: attachment.filename || undefined,
            caption: trimmed || undefined,
          },
        );
        setAttachment(EMPTY_ATTACHMENT);
        setText('');
      } else {
        await conversationApi.sendText(selectedSession.id, selectedConv.chat_id, trimmed);
        setText('');
      }
      // Optimistically reload messages
      void loadMessages(selectedConv, selectedSession.id);
    } catch {}
    finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void handleSend();
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';

    const mime = file.type;
    let type: MediaType = 'document';
    if (mime.startsWith('image/')) type = 'image';
    else if (mime.startsWith('video/')) type = 'video';
    else if (mime.startsWith('audio/')) type = 'audio';

    setAttachment({ file, type, uploading: true, url: null, mimetype: mime, filename: file.name });

    try {
      const result = await conversationApi.upload(file);
      setAttachment(s => ({ ...s, uploading: false, url: result.url }));
    } catch {
      setAttachment(EMPTY_ATTACHMENT);
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      mediaRecorderRef.current = mr;
      audioChunksRef.current = [];
      mr.ondataavailable = e => audioChunksRef.current.push(e.data);
      mr.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/ogg' });
        setAudioBlob(blob);
        stream.getTracks().forEach(t => t.stop());
      };
      mr.start();
      setRecording(true);
    } catch {}
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setRecording(false);
  };

  return (
    <div className="inbox">
      {/* Sidebar: conversation list */}
      <div className={`inbox__sidebar ${mobileView === 'thread' ? 'inbox__sidebar--hidden' : ''}`}>
        {/* Session selector */}
        {sessions.length > 1 && (
          <div className="inbox__session-bar">
            <select
              value={selectedSession?.id || ''}
              onChange={e => {
                const s = sessions.find(x => x.id === e.target.value);
                setSelectedSession(s || null);
                setSelectedConv(null);
                setMessages([]);
              }}
            >
              {sessions.map(s => (
                <option key={s.id} value={s.id}>
                  {s.displayName} {s.status !== 'ready' ? `(${s.status})` : ''}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="inbox__search-wrap">
          <Search size={16} className="inbox__search-icon" />
          <input
            className="inbox__search"
            type="text"
            placeholder="Search conversations…"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="inbox__conv-list">
          {loadingConvs ? (
            <div className="inbox__empty">
              <Loader2 size={24} className="spin" />
              <span>Loading…</span>
            </div>
          ) : !selectedSession ? (
            <div className="inbox__empty">
              <Phone size={28} />
              <span>No WhatsApp connected</span>
            </div>
          ) : filteredConvs.length === 0 ? (
            <div className="inbox__empty">
              <MessageSquare size={28} />
              <span>{searchQuery ? 'No results' : 'No conversations yet'}</span>
            </div>
          ) : (
            filteredConvs.map(conv => (
              <button
                key={conv.id}
                className={`inbox__conv-item ${selectedConv?.id === conv.id ? 'inbox__conv-item--active' : ''}`}
                onClick={() => handleSelectConv(conv)}
              >
                <div className="inbox__conv-avatar">
                  {(conv.contact_name || conv.contact_phone || '?')[0].toUpperCase()}
                </div>
                <div className="inbox__conv-meta">
                  <div className="inbox__conv-row">
                    <span className="inbox__conv-name">
                      {conv.contact_name || conv.contact_phone || conv.chat_id}
                    </span>
                    {conv.last_message_at && (
                      <span className="inbox__conv-time">
                        {formatTime(conv.last_message_at)}
                      </span>
                    )}
                  </div>
                  <div className="inbox__conv-row">
                    <span className="inbox__conv-preview">
                      {getPreview(conv.last_message_type, conv.last_message_body)}
                    </span>
                    {conv.unread_count > 0 && (
                      <span className="inbox__conv-badge">{conv.unread_count}</span>
                    )}
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Thread panel */}
      <div className={`inbox__thread ${mobileView === 'list' ? 'inbox__thread--hidden' : ''}`}>
        {!selectedConv ? (
          <div className="inbox__no-chat">
            <MessageSquare size={48} />
            <h3>Select a conversation</h3>
            <p>Choose a conversation from the list to start messaging</p>
          </div>
        ) : (
          <>
            {/* Thread header */}
            <div className="inbox__thread-header">
              <button className="inbox__back" onClick={() => setMobileView('list')}>←</button>
              <div className="inbox__thread-avatar">
                {(selectedConv.contact_name || selectedConv.contact_phone || '?')[0].toUpperCase()}
              </div>
              <div className="inbox__thread-info">
                <h3>{selectedConv.contact_name || selectedConv.contact_phone || selectedConv.chat_id}</h3>
                <p>{selectedConv.contact_phone || selectedConv.chat_id}</p>
              </div>
            </div>

            {/* Messages */}
            <div className="inbox__messages" ref={threadRef}>
              {loadingMsgs ? (
                <div className="inbox__msgs-loading"><Loader2 size={28} className="spin" /></div>
              ) : messages.length === 0 ? (
                <div className="inbox__msgs-empty">No messages yet. Say hello!</div>
              ) : (
                messages.map(msg => (
                  <MessageBubble key={msg.id} message={msg} />
                ))
              )}
            </div>

            {/* Attachment preview */}
            {(attachment.file || audioBlob) && (
              <div className="inbox__attachment-preview">
                {audioBlob ? (
                  <span>🎵 Voice message ready</span>
                ) : attachment.uploading ? (
                  <span><Loader2 size={14} className="spin" /> Uploading {attachment.filename}…</span>
                ) : (
                  <span>📎 {attachment.filename} ready</span>
                )}
                <button onClick={() => { setAttachment(EMPTY_ATTACHMENT); setAudioBlob(null); }}>
                  <X size={14} />
                </button>
              </div>
            )}

            {/* Composer */}
            <div className="inbox__composer">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.zip"
                style={{ display: 'none' }}
                onChange={handleFileChange}
              />

              <button
                className="inbox__composer-btn"
                onClick={() => fileInputRef.current?.click()}
                title="Attach file"
              >
                <Paperclip size={20} />
              </button>

              <textarea
                className="inbox__composer-input"
                placeholder={attachment.url ? 'Add a caption…' : 'Type a message…'}
                value={text}
                onChange={e => setText(e.target.value)}
                onKeyDown={handleKeyDown}
                rows={1}
              />

              {recording ? (
                <button className="inbox__composer-btn inbox__composer-btn--danger" onClick={stopRecording}>
                  <StopCircle size={20} />
                </button>
              ) : text.trim() || attachment.url || audioBlob ? (
                <button
                  className="inbox__composer-send"
                  onClick={handleSend}
                  disabled={sending || attachment.uploading}
                >
                  {sending ? <Loader2 size={20} className="spin" /> : <Send size={20} />}
                </button>
              ) : (
                <button className="inbox__composer-btn" onClick={startRecording} title="Record voice">
                  <Mic size={20} />
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ── Message Bubble ────────────────────────────────────────────────────────

function MessageBubble({ message }: { message: Message }) {
  const isOut = message.direction === 'outgoing';
  const [playing, setPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);

  const toggleAudio = () => {
    if (!audioRef.current) return;
    if (playing) {
      audioRef.current.pause();
      setPlaying(false);
    } else {
      void audioRef.current.play();
      setPlaying(true);
    }
  };

  const ts = message.timestamp
    ? new Date(message.timestamp * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : message.created_at
    ? new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : '';

  return (
    <div className={`msg ${isOut ? 'msg--out' : 'msg--in'}`}>
      <div className="msg__bubble">
        {/* Media rendering */}
        {message.type === 'image' && message.media_url && (
          <a href={message.media_url} target="_blank" rel="noreferrer">
            <img src={message.media_url} alt="Image" className="msg__img" />
          </a>
        )}
        {message.type === 'video' && message.media_url && (
          <video controls className="msg__video" src={message.media_url} />
        )}
        {message.type === 'audio' && message.media_url && (
          <div className="msg__audio">
            <button className="msg__audio-btn" onClick={toggleAudio}>
              {playing ? <Pause size={18} /> : <Play size={18} />}
            </button>
            <div className="msg__audio-wave" />
            <audio
              ref={audioRef}
              src={message.media_url}
              onEnded={() => setPlaying(false)}
            />
          </div>
        )}
        {message.type === 'document' && message.media_url && (
          <a href={message.media_url} target="_blank" rel="noreferrer" className="msg__doc">
            <FileText size={20} />
            <span>{message.media_filename || 'Document'}</span>
            <Download size={16} />
          </a>
        )}
        {(message.type === 'sticker') && (
          <span className="msg__sticker">😊</span>
        )}
        {/* Body text */}
        {message.body && <p className="msg__body">{message.body}</p>}

        <div className="msg__meta">
          <span className="msg__time">{ts}</span>
          {isOut && <StatusIcon status={message.status} />}
        </div>
      </div>
    </div>
  );
}

function StatusIcon({ status }: { status: string }) {
  if (status === 'read') return <CheckCheck size={14} className="msg__status msg__status--read" />;
  if (status === 'delivered') return <CheckCheck size={14} className="msg__status" />;
  if (status === 'sent') return <Check size={14} className="msg__status" />;
  if (status === 'failed') return <X size={14} className="msg__status msg__status--failed" />;
  return <Loader2 size={12} className="msg__status spin" />;
}

function getPreview(type: string, body: string | null): string {
  if (body) return body.length > 50 ? body.substring(0, 50) + '…' : body;
  const icons: Record<string, string> = {
    image: '📷 Photo', video: '🎥 Video', audio: '🎵 Audio',
    document: '📄 Document', sticker: '😀 Sticker', location: '📍 Location',
  };
  return icons[type] || '';
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return d.toLocaleDateString([], { weekday: 'short' });
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
}
