import { useEffect, useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import type { AgencyConversation, AgencyMessage, AgencyContact } from '../types';
import { Search, Send, Bot } from 'lucide-react';

interface ConversationWithContact extends AgencyConversation {
  contact?: AgencyContact;
}

interface MessageWithSender extends AgencyMessage {
  senderName?: string;
}

type ChannelFilter = 'all' | 'whatsapp' | 'webchat' | 'unread';

export default function Conversations() {
  const { subAccountId } = useParams<{ subAccountId: string }>();
  const [conversations, setConversations] = useState<ConversationWithContact[]>([]);
  const [filteredConversations, setFilteredConversations] = useState<ConversationWithContact[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<ConversationWithContact | null>(null);
  const [messages, setMessages] = useState<MessageWithSender[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [channelFilter, setChannelFilter] = useState<ChannelFilter>('all');
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sendingMessage, setSendingMessage] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load initial conversations
  useEffect(() => {
    if (subAccountId) {
      loadConversations();
    }
  }, [subAccountId]);

  // Subscribe to real-time messages when conversation is selected
  useEffect(() => {
    if (!selectedConversation) return;

    loadMessages(selectedConversation.id);

    const subscription = supabase
      .channel(`messages:${selectedConversation.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'agency_messages',
          filter: `conversation_id=eq.${selectedConversation.id}`,
        },
        (payload) => {
          const newMsg = payload.new as AgencyMessage;
          setMessages((prev) => [...prev, newMsg]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, [selectedConversation?.id]);

  // Filter conversations
  useEffect(() => {
    let filtered = conversations;

    // Apply channel filter
    if (channelFilter === 'whatsapp') {
      filtered = filtered.filter((c) => c.channel === 'whatsapp');
    } else if (channelFilter === 'webchat') {
      filtered = filtered.filter((c) => c.channel === 'webchat');
    } else if (channelFilter === 'unread') {
      filtered = filtered.filter((c) => c.unread_count > 0);
    }

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter((c) =>
        c.contact?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.contact?.phone?.includes(searchTerm)
      );
    }

    setFilteredConversations(filtered);
  }, [conversations, searchTerm, channelFilter]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadConversations = async () => {
    try {
      setLoading(true);
      const { data } = await supabase
        .from('agency_conversations')
        .select(
          `
          id,
          sub_account_id,
          contact_id,
          channel,
          status,
          last_message,
          last_message_at,
          unread_count,
          created_at,
          agency_contacts(*)
        `
        )
        .eq('sub_account_id', subAccountId)
        .order('last_message_at', { ascending: false });

      const convs = (data || []).map((conv: any) => ({
        ...conv,
        contact: conv.agency_contacts?.[0] || undefined,
      }));

      setConversations(convs);
    } catch (error) {
      console.error('Error loading conversations:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadMessages = async (conversationId: string) => {
    try {
      const { data } = await supabase
        .from('agency_messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      setMessages((data || []) as MessageWithSender[]);

      // Mark conversation as read
      await supabase
        .from('agency_conversations')
        .update({ unread_count: 0 })
        .eq('id', conversationId);

      // Update local state
      setConversations((prev) =>
        prev.map((conv) =>
          conv.id === conversationId ? { ...conv, unread_count: 0 } : conv
        )
      );
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation) return;

    try {
      setSendingMessage(true);
      const content = newMessage.trim();

      // Insert message
      const { error: msgError } = await supabase.from('agency_messages').insert({
        conversation_id: selectedConversation.id,
        content,
        type: 'text',
        sender_type: 'agent',
        sender_id: null,
        status: 'sent',
      });

      if (msgError) throw msgError;

      // Update conversation last_message
      const { error: convError } = await supabase
        .from('agency_conversations')
        .update({
          last_message: content,
          last_message_at: new Date().toISOString(),
        })
        .eq('id', selectedConversation.id);

      if (convError) throw convError;

      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setSendingMessage(false);
    }
  };

  const handleCloseConversation = async () => {
    if (!selectedConversation) return;

    try {
      const { error } = await supabase
        .from('agency_conversations')
        .update({ status: 'closed' })
        .eq('id', selectedConversation.id);

      if (error) throw error;

      setConversations((prev) =>
        prev.map((conv) =>
          conv.id === selectedConversation.id ? { ...conv, status: 'closed' } : conv
        )
      );

      setSelectedConversation((prev) =>
        prev ? { ...prev, status: 'closed' } : null
      );
    } catch (error) {
      console.error('Error closing conversation:', error);
    }
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const getChannelColor = (channel: string) => {
    return channel === 'whatsapp'
      ? { bg: '#dcfce7', text: '#166534', label: 'WhatsApp' }
      : { bg: '#dbeafe', text: '#0c4a6e', label: 'WebChat' };
  };

  const getContactInitial = (name?: string) => {
    return name?.charAt(0).toUpperCase() || '?';
  };

  return (
    <div style={{ display: 'flex', height: '100vh', backgroundColor: '#f5f5f5' }}>
      {/* LEFT PANEL - Conversations List */}
      <div
        style={{
          width: '280px',
          backgroundColor: 'white',
          borderRight: '1px solid #e5e5e5',
          display: 'flex',
          flexDirection: 'column',
          overflowY: 'auto',
        }}
      >
        {/* Search Bar */}
        <div style={{ padding: '16px', borderBottom: '1px solid #e5e5e5' }}>
          <div
            style={{
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <Search size={16} style={{ position: 'absolute', left: '10px', color: '#999' }} />
            <input
              type="text"
              placeholder="Search conversations..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: '100%',
                paddingLeft: '32px',
                paddingRight: '8px',
                padding: '8px 8px 8px 32px',
                border: '1px solid #e5e5e5',
                borderRadius: '8px',
                fontSize: '13px',
                fontFamily: 'inherit',
              }}
            />
          </div>
        </div>

        {/* Tabs */}
        <div
          style={{
            display: 'flex',
            borderBottom: '1px solid #e5e5e5',
            padding: '8px 8px 0 8px',
            gap: '4px',
          }}
        >
          {(['all', 'whatsapp', 'webchat', 'unread'] as ChannelFilter[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setChannelFilter(tab)}
              style={{
                padding: '8px 12px',
                border: 'none',
                backgroundColor: 'transparent',
                color: channelFilter === tab ? '#7c3aed' : '#999',
                fontSize: '12px',
                fontWeight: '600',
                cursor: 'pointer',
                borderBottom: channelFilter === tab ? '2px solid #7c3aed' : 'none',
                textTransform: 'capitalize',
              }}
            >
              {tab === 'all' ? 'All' : tab === 'whatsapp' ? 'WhatsApp' : tab === 'webchat' ? 'WebChat' : 'Unread'}
            </button>
          ))}
        </div>

        {/* Conversation List */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {loading ? (
            <div style={{ padding: '16px', color: '#999', fontSize: '14px', textAlign: 'center' }}>
              Loading...
            </div>
          ) : filteredConversations.length === 0 ? (
            <div style={{ padding: '16px', color: '#999', fontSize: '14px', textAlign: 'center' }}>
              No conversations
            </div>
          ) : (
            filteredConversations.map((conv) => {
              const channelColor = getChannelColor(conv.channel);
              const isSelected = selectedConversation?.id === conv.id;

              return (
                <div
                  key={conv.id}
                  onClick={() => setSelectedConversation(conv)}
                  style={{
                    padding: '12px',
                    borderBottom: '1px solid #f0f0f0',
                    cursor: 'pointer',
                    backgroundColor: isSelected ? '#f5f5f5' : 'white',
                    borderLeft: isSelected ? '3px solid #7c3aed' : 'none',
                    paddingLeft: isSelected ? '9px' : '12px',
                    transition: 'background-color 0.2s ease',
                  }}
                  onMouseOver={(e) => {
                    if (!isSelected) {
                      (e.currentTarget as HTMLDivElement).style.backgroundColor = '#fafafa';
                    }
                  }}
                  onMouseOut={(e) => {
                    if (!isSelected) {
                      (e.currentTarget as HTMLDivElement).style.backgroundColor = 'white';
                    }
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                    {/* Avatar */}
                    <div
                      style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '50%',
                        backgroundColor: '#7c3aed',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'white',
                        fontWeight: '600',
                        fontSize: '16px',
                        flexShrink: 0,
                      }}
                    >
                      {getContactInitial(conv.contact?.name)}
                    </div>

                    {/* Content */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          marginBottom: '4px',
                        }}
                      >
                        <span
                          style={{
                            fontWeight: '600',
                            fontSize: '13px',
                            color: '#000',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {conv.contact?.name || 'Unknown'}
                        </span>
                        {conv.unread_count > 0 && (
                          <span
                            style={{
                              backgroundColor: '#7c3aed',
                              color: 'white',
                              borderRadius: '50%',
                              width: '20px',
                              height: '20px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '11px',
                              fontWeight: '700',
                              flexShrink: 0,
                            }}
                          >
                            {conv.unread_count}
                          </span>
                        )}
                      </div>

                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          marginBottom: '4px',
                        }}
                      >
                        <span
                          style={{
                            fontSize: '12px',
                            backgroundColor: channelColor.bg,
                            color: channelColor.text,
                            padding: '2px 6px',
                            borderRadius: '3px',
                            fontWeight: '500',
                          }}
                        >
                          {channelColor.label}
                        </span>
                        <span style={{ fontSize: '11px', color: '#999' }}>
                          {formatTime(conv.last_message_at)}
                        </span>
                      </div>

                      <div
                        style={{
                          fontSize: '12px',
                          color: '#666',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {conv.last_message || 'No messages'}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* MIDDLE PANEL - Messages */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: '#f5f5f5',
        }}
      >
        {selectedConversation ? (
          <>
            {/* Header */}
            <div
              style={{
                backgroundColor: 'white',
                borderBottom: '1px solid #e5e5e5',
                padding: '16px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div
                  style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '50%',
                    backgroundColor: '#7c3aed',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    fontWeight: '600',
                    fontSize: '16px',
                  }}
                >
                  {getContactInitial(selectedConversation.contact?.name)}
                </div>
                <div>
                  <div style={{ fontWeight: '600', fontSize: '14px', color: '#000' }}>
                    {selectedConversation.contact?.name || 'Unknown'}
                  </div>
                  <div style={{ fontSize: '12px', color: '#999' }}>
                    {getChannelColor(selectedConversation.channel).label}
                  </div>
                </div>
              </div>

              <button
                onClick={handleCloseConversation}
                disabled={selectedConversation.status === 'closed'}
                style={{
                  padding: '8px 16px',
                  backgroundColor: selectedConversation.status === 'closed' ? '#e5e5e5' : '#7c3aed',
                  color: selectedConversation.status === 'closed' ? '#999' : 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '13px',
                  fontWeight: '600',
                  cursor: selectedConversation.status === 'closed' ? 'not-allowed' : 'pointer',
                  transition: 'background-color 0.2s ease',
                }}
                onMouseOver={(e) => {
                  if (selectedConversation.status !== 'closed') {
                    (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#6d28d9';
                  }
                }}
                onMouseOut={(e) => {
                  if (selectedConversation.status !== 'closed') {
                    (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#7c3aed';
                  }
                }}
              >
                {selectedConversation.status === 'closed' ? 'Closed' : 'Close'}
              </button>
            </div>

            {/* Messages */}
            <div
              style={{
                flex: 1,
                overflowY: 'auto',
                padding: '16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
              }}
            >
              {messages.map((msg) => {
                const isAgent = msg.sender_type === 'agent';
                const isBot = msg.sender_type === 'bot';

                return (
                  <div
                    key={msg.id}
                    style={{
                      display: 'flex',
                      justifyContent: isAgent ? 'flex-end' : 'flex-start',
                      marginBottom: '4px',
                    }}
                  >
                    <div
                      style={{
                        maxWidth: '60%',
                      }}
                    >
                      {isBot && (
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            marginBottom: '4px',
                            fontSize: '11px',
                            color: '#0d9488',
                            fontWeight: '500',
                          }}
                        >
                          <Bot size={14} />
                          Bot
                        </div>
                      )}
                      <div
                        style={{
                          padding: '10px 14px',
                          borderRadius: '10px',
                          backgroundColor: isAgent ? '#7c3aed' : isBot ? '#d1fae5' : '#f1f5f9',
                          color: isAgent ? 'white' : '#000',
                          fontSize: '14px',
                          lineHeight: '1.4',
                          wordBreak: 'break-word',
                        }}
                      >
                        {msg.content}
                      </div>
                      <div
                        style={{
                          fontSize: '11px',
                          color: '#999',
                          marginTop: '4px',
                          textAlign: isAgent ? 'right' : 'left',
                        }}
                      >
                        {new Date(msg.created_at).toLocaleTimeString('en-US', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Message Input */}
            <div
              style={{
                backgroundColor: 'white',
                borderTop: '1px solid #e5e5e5',
                padding: '16px',
                display: 'flex',
                gap: '8px',
              }}
            >
              <textarea
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                placeholder="Type a message..."
                disabled={sendingMessage}
                style={{
                  flex: 1,
                  padding: '10px 12px',
                  border: '1px solid #e5e5e5',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontFamily: 'inherit',
                  resize: 'none',
                  minHeight: '44px',
                  maxHeight: '120px',
                }}
              />
              <button
                onClick={handleSendMessage}
                disabled={!newMessage.trim() || sendingMessage}
                style={{
                  padding: '10px 14px',
                  backgroundColor: newMessage.trim() && !sendingMessage ? '#7c3aed' : '#e5e5e5',
                  color: newMessage.trim() && !sendingMessage ? 'white' : '#999',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: newMessage.trim() && !sendingMessage ? 'pointer' : 'not-allowed',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontWeight: '600',
                  fontSize: '14px',
                  transition: 'background-color 0.2s ease',
                }}
                onMouseOver={(e) => {
                  if (newMessage.trim() && !sendingMessage) {
                    (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#6d28d9';
                  }
                }}
                onMouseOut={(e) => {
                  if (newMessage.trim() && !sendingMessage) {
                    (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#7c3aed';
                  }
                }}
              >
                <Send size={16} />
              </button>
            </div>
          </>
        ) : (
          <div
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#999',
              fontSize: '16px',
            }}
          >
            Select a conversation to start messaging
          </div>
        )}
      </div>

      {/* RIGHT PANEL - Contact Info */}
      <div
        style={{
          width: '280px',
          backgroundColor: 'white',
          borderLeft: '1px solid #e5e5e5',
          padding: '16px',
          overflowY: 'auto',
        }}
      >
        {selectedConversation && selectedConversation.contact ? (
          <>
            {/* Contact Avatar & Name */}
            <div style={{ textAlign: 'center', marginBottom: '24px' }}>
              <div
                style={{
                  width: '60px',
                  height: '60px',
                  borderRadius: '50%',
                  backgroundColor: '#7c3aed',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontWeight: '600',
                  fontSize: '24px',
                  margin: '0 auto 12px',
                }}
              >
                {getContactInitial(selectedConversation.contact.name)}
              </div>
              <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#000', margin: '0 0 4px 0' }}>
                {selectedConversation.contact.name}
              </h3>
              <p style={{ fontSize: '12px', color: '#999', margin: 0 }}>
                {getChannelColor(selectedConversation.channel).label}
              </p>
            </div>

            {/* Contact Details */}
            <div style={{ borderTop: '1px solid #e5e5e5', paddingTop: '16px', marginBottom: '16px' }}>
              {selectedConversation.contact.phone && (
                <div style={{ marginBottom: '16px' }}>
                  <div style={{ fontSize: '11px', color: '#999', fontWeight: '600', marginBottom: '4px' }}>
                    PHONE
                  </div>
                  <div style={{ fontSize: '14px', color: '#000', fontFamily: 'monospace' }}>
                    {selectedConversation.contact.phone}
                  </div>
                </div>
              )}

              {selectedConversation.contact.email && (
                <div style={{ marginBottom: '16px' }}>
                  <div style={{ fontSize: '11px', color: '#999', fontWeight: '600', marginBottom: '4px' }}>
                    EMAIL
                  </div>
                  <div style={{ fontSize: '14px', color: '#000', wordBreak: 'break-all' }}>
                    {selectedConversation.contact.email}
                  </div>
                </div>
              )}

              {selectedConversation.contact.whatsapp_id && (
                <div style={{ marginBottom: '16px' }}>
                  <div style={{ fontSize: '11px', color: '#999', fontWeight: '600', marginBottom: '4px' }}>
                    WHATSAPP ID
                  </div>
                  <div style={{ fontSize: '14px', color: '#000', fontFamily: 'monospace', wordBreak: 'break-all' }}>
                    {selectedConversation.contact.whatsapp_id}
                  </div>
                </div>
              )}

              {selectedConversation.contact.tags && selectedConversation.contact.tags.length > 0 && (
                <div>
                  <div style={{ fontSize: '11px', color: '#999', fontWeight: '600', marginBottom: '8px' }}>
                    TAGS
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {selectedConversation.contact.tags.map((tag) => (
                      <span
                        key={tag}
                        style={{
                          backgroundColor: '#e5e7eb',
                          color: '#374151',
                          padding: '4px 10px',
                          borderRadius: '4px',
                          fontSize: '12px',
                          fontWeight: '500',
                        }}
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </>
        ) : (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              color: '#999',
              fontSize: '14px',
              textAlign: 'center',
            }}
          >
            Select a conversation to view contact details
          </div>
        )}
      </div>
    </div>
  );
}
