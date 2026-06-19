import { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { CreditCard as Edit, Trash2, X, Plus } from 'lucide-react';
import type { AgencyContact } from '../types';

interface NewContactModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (contact: Partial<AgencyContact>) => void;
  isLoading: boolean;
}

function NewContactModal({ isOpen, onClose, onSubmit, isLoading }: NewContactModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    whatsapp_id: '',
    tags: '',
    source: '',
    notes: '',
  });

  const handleSubmit = () => {
    if (!formData.name.trim()) return;
    onSubmit({
      name: formData.name,
      email: formData.email || null,
      phone: formData.phone || null,
      whatsapp_id: formData.whatsapp_id || null,
      tags: formData.tags
        .split(',')
        .map((t) => t.trim())
        .filter((t) => t),
      source: formData.source || null,
      notes: formData.notes || null,
    });
    setFormData({
      name: '',
      email: '',
      phone: '',
      whatsapp_id: '',
      tags: '',
      source: '',
      notes: '',
    });
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
          maxWidth: '500px',
          width: '90%',
          maxHeight: '90vh',
          overflowY: 'auto',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: '700', color: '#000' }}>New Contact</h2>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: '#999',
              padding: '4px',
            }}
          >
            <X size={20} />
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div>
            <label style={{ fontSize: '12px', fontWeight: '600', color: '#666', display: 'block', marginBottom: '4px' }}>
              Name *
            </label>
            <input
              type="text"
              placeholder="Contact name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              disabled={isLoading}
              style={{
                width: '100%',
                padding: '10px 12px',
                border: '1px solid #e5e5e5',
                borderRadius: '8px',
                fontSize: '14px',
                boxSizing: 'border-box',
                fontFamily: 'inherit',
              }}
            />
          </div>

          <div>
            <label style={{ fontSize: '12px', fontWeight: '600', color: '#666', display: 'block', marginBottom: '4px' }}>
              Email
            </label>
            <input
              type="email"
              placeholder="email@example.com"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              disabled={isLoading}
              style={{
                width: '100%',
                padding: '10px 12px',
                border: '1px solid #e5e5e5',
                borderRadius: '8px',
                fontSize: '14px',
                boxSizing: 'border-box',
                fontFamily: 'inherit',
              }}
            />
          </div>

          <div>
            <label style={{ fontSize: '12px', fontWeight: '600', color: '#666', display: 'block', marginBottom: '4px' }}>
              Phone
            </label>
            <input
              type="tel"
              placeholder="+1234567890"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              disabled={isLoading}
              style={{
                width: '100%',
                padding: '10px 12px',
                border: '1px solid #e5e5e5',
                borderRadius: '8px',
                fontSize: '14px',
                boxSizing: 'border-box',
                fontFamily: 'inherit',
              }}
            />
          </div>

          <div>
            <label style={{ fontSize: '12px', fontWeight: '600', color: '#666', display: 'block', marginBottom: '4px' }}>
              WhatsApp Number
            </label>
            <input
              type="text"
              placeholder="WhatsApp ID"
              value={formData.whatsapp_id}
              onChange={(e) => setFormData({ ...formData, whatsapp_id: e.target.value })}
              disabled={isLoading}
              style={{
                width: '100%',
                padding: '10px 12px',
                border: '1px solid #e5e5e5',
                borderRadius: '8px',
                fontSize: '14px',
                boxSizing: 'border-box',
                fontFamily: 'inherit',
              }}
            />
          </div>

          <div>
            <label style={{ fontSize: '12px', fontWeight: '600', color: '#666', display: 'block', marginBottom: '4px' }}>
              Tags (comma-separated)
            </label>
            <input
              type="text"
              placeholder="vip, customer, lead"
              value={formData.tags}
              onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
              disabled={isLoading}
              style={{
                width: '100%',
                padding: '10px 12px',
                border: '1px solid #e5e5e5',
                borderRadius: '8px',
                fontSize: '14px',
                boxSizing: 'border-box',
                fontFamily: 'inherit',
              }}
            />
          </div>

          <div>
            <label style={{ fontSize: '12px', fontWeight: '600', color: '#666', display: 'block', marginBottom: '4px' }}>
              Source
            </label>
            <input
              type="text"
              placeholder="Website, Referral, etc."
              value={formData.source}
              onChange={(e) => setFormData({ ...formData, source: e.target.value })}
              disabled={isLoading}
              style={{
                width: '100%',
                padding: '10px 12px',
                border: '1px solid #e5e5e5',
                borderRadius: '8px',
                fontSize: '14px',
                boxSizing: 'border-box',
                fontFamily: 'inherit',
              }}
            />
          </div>

          <div>
            <label style={{ fontSize: '12px', fontWeight: '600', color: '#666', display: 'block', marginBottom: '4px' }}>
              Notes
            </label>
            <textarea
              placeholder="Additional notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              disabled={isLoading}
              rows={3}
              style={{
                width: '100%',
                padding: '10px 12px',
                border: '1px solid #e5e5e5',
                borderRadius: '8px',
                fontSize: '14px',
                boxSizing: 'border-box',
                fontFamily: 'inherit',
                resize: 'vertical',
              }}
            />
          </div>
        </div>

        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '24px' }}>
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
            disabled={isLoading || !formData.name.trim()}
            style={{
              padding: '8px 16px',
              backgroundColor: isLoading || !formData.name.trim() ? '#ccc' : '#7c3aed',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: isLoading || !formData.name.trim() ? 'not-allowed' : 'pointer',
              fontSize: '14px',
              fontWeight: '600',
              transition: 'background-color 0.2s ease',
            }}
            onMouseOver={(e) => {
              if (!isLoading && formData.name.trim()) {
                (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#6d28d9';
              }
            }}
            onMouseOut={(e) => {
              if (!isLoading && formData.name.trim()) {
                (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#7c3aed';
              }
            }}
          >
            Create Contact
          </button>
        </div>
      </div>
    </div>
  );
}

interface DeleteConfirmModalProps {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  isLoading: boolean;
  contactName: string;
}

function DeleteConfirmModal({ isOpen, onConfirm, onCancel, isLoading, contactName }: DeleteConfirmModalProps) {
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
      onClick={onCancel}
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
        <h2 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '12px', color: '#000' }}>Delete Contact</h2>
        <p style={{ fontSize: '14px', color: '#666', marginBottom: '24px' }}>
          Are you sure you want to delete <strong>{contactName}</strong>? This action cannot be undone.
        </p>
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
          <button
            onClick={onCancel}
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
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isLoading}
            style={{
              padding: '8px 16px',
              backgroundColor: '#dc2626',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: isLoading ? 'not-allowed' : 'pointer',
              fontSize: '14px',
              fontWeight: '600',
            }}
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

export function Contacts() {
  const { subAccountId } = useOutletContext<{ subAccountId: string }>();
  const [contacts, setContacts] = useState<AgencyContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [newContactOpen, setNewContactOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [contactToDelete, setContactToDelete] = useState<AgencyContact | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTag, setFilterTag] = useState('');
  const [allTags, setAllTags] = useState<string[]>([]);

  useEffect(() => {
    if (subAccountId) {
      loadContacts();
    }
  }, [subAccountId]);

  const loadContacts = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('agency_contacts')
        .select('*')
        .eq('sub_account_id', subAccountId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setContacts(data || []);

      // Extract all unique tags
      const tags = new Set<string>();
      (data || []).forEach((contact) => {
        contact.tags?.forEach((tag: string) => tags.add(tag));
      });
      setAllTags(Array.from(tags).sort());
    } catch (error) {
      console.error('Error loading contacts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateContact = async (contactData: Partial<AgencyContact>) => {
    try {
      setIsCreating(true);
      const { error } = await supabase.from('agency_contacts').insert({
        sub_account_id: subAccountId,
        ...contactData,
      });

      if (error) throw error;

      setNewContactOpen(false);
      await loadContacts();
    } catch (error) {
      console.error('Error creating contact:', error);
      alert('Failed to create contact');
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteContact = async () => {
    if (!contactToDelete) return;

    try {
      setIsCreating(true);
      const { error } = await supabase.from('agency_contacts').delete().eq('id', contactToDelete.id);

      if (error) throw error;

      setDeleteConfirmOpen(false);
      setContactToDelete(null);
      await loadContacts();
    } catch (error) {
      console.error('Error deleting contact:', error);
      alert('Failed to delete contact');
    } finally {
      setIsCreating(false);
    }
  };

  const handleImportCSV = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setIsCreating(true);
      const text = await file.text();
      const lines = text.split('\n');
      const headers = lines[0].toLowerCase().split(',').map((h) => h.trim());

      const contacts: Partial<AgencyContact>[] = [];

      for (let i = 1; i < lines.length; i++) {
        if (!lines[i].trim()) continue;

        const values = lines[i].split(',').map((v) => v.trim());
        const contact: Partial<AgencyContact> = {
          name: '',
        };

        headers.forEach((header, index) => {
          const value = values[index] || '';
          if (header === 'name') contact.name = value;
          if (header === 'email') contact.email = value || null;
          if (header === 'phone') contact.phone = value || null;
          if (header === 'whatsapp_id') contact.whatsapp_id = value || null;
          if (header === 'source') contact.source = value || null;
          if (header === 'tags') {
            contact.tags = value
              .split(';')
              .map((t) => t.trim())
              .filter((t) => t);
          }
        });

        if (contact.name) {
          contacts.push(contact);
        }
      }

      if (contacts.length === 0) {
        alert('No valid contacts found in CSV');
        return;
      }

      const dataToInsert = contacts.map((c) => ({
        sub_account_id: subAccountId,
        ...c,
      }));

      const { error } = await supabase.from('agency_contacts').insert(dataToInsert);

      if (error) throw error;

      alert(`Successfully imported ${contacts.length} contacts`);
      await loadContacts();
    } catch (error) {
      console.error('Error importing CSV:', error);
      alert('Failed to import CSV');
    } finally {
      setIsCreating(false);
      event.target.value = '';
    }
  };

  const filteredContacts = contacts.filter((contact) => {
    const matchesSearch =
      contact.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      contact.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      contact.phone?.includes(searchQuery);

    const matchesTag = !filterTag || contact.tags?.includes(filterTag);

    return matchesSearch && matchesTag;
  });

  return (
    <div style={{ padding: '24px', backgroundColor: '#f5f5f5', minHeight: '100vh' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h1 style={{ fontSize: '28px', fontWeight: '700', color: '#000' }}>Contacts</h1>
          <div style={{ display: 'flex', gap: '12px' }}>
            <label
              style={{
                padding: '10px 16px',
                backgroundColor: 'white',
                border: '1px solid #e5e5e5',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '600',
                color: '#7c3aed',
                transition: 'all 0.2s ease',
              }}
              onMouseOver={(e) => {
                (e.currentTarget as HTMLLabelElement).style.backgroundColor = '#fafafa';
              }}
              onMouseOut={(e) => {
                (e.currentTarget as HTMLLabelElement).style.backgroundColor = 'white';
              }}
            >
              Import CSV
              <input type="file" accept=".csv" onChange={handleImportCSV} disabled={isCreating} style={{ display: 'none' }} />
            </label>
            <button
              onClick={() => setNewContactOpen(true)}
              disabled={isCreating}
              style={{
                padding: '10px 16px',
                backgroundColor: '#7c3aed',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '600',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
              onMouseOver={(e) => {
                (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#6d28d9';
              }}
              onMouseOut={(e) => {
                (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#7c3aed';
              }}
            >
              <Plus size={18} />
              New Contact
            </button>
          </div>
        </div>

        {/* Search and Filter */}
        <div style={{ display: 'flex', gap: '12px', marginBottom: '24px' }}>
          <input
            type="text"
            placeholder="Search by name, email, or phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              flex: 1,
              padding: '10px 12px',
              border: '1px solid #e5e5e5',
              borderRadius: '8px',
              fontSize: '14px',
              boxSizing: 'border-box',
              fontFamily: 'inherit',
            }}
          />
          <select
            value={filterTag}
            onChange={(e) => setFilterTag(e.target.value)}
            style={{
              padding: '10px 12px',
              border: '1px solid #e5e5e5',
              borderRadius: '8px',
              fontSize: '14px',
              backgroundColor: 'white',
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            <option value="">All Tags</option>
            {allTags.map((tag) => (
              <option key={tag} value={tag}>
                {tag}
              </option>
            ))}
          </select>
        </div>

        {/* Table or Empty State */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '48px 24px', backgroundColor: 'white', borderRadius: '12px' }}>
            <p style={{ color: '#999' }}>Loading contacts...</p>
          </div>
        ) : filteredContacts.length === 0 ? (
          <div
            style={{
              textAlign: 'center',
              padding: '48px 24px',
              backgroundColor: 'white',
              borderRadius: '12px',
              border: '1px solid #e5e5e5',
            }}
          >
            <p style={{ color: '#999', marginBottom: '16px' }}>No contacts found</p>
            <button
              onClick={() => setNewContactOpen(true)}
              style={{
                padding: '8px 16px',
                backgroundColor: '#7c3aed',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '600',
              }}
            >
              Create your first contact
            </button>
          </div>
        ) : (
          <div style={{ backgroundColor: 'white', borderRadius: '12px', border: '1px solid #e5e5e5', overflow: 'hidden' }}>
            <table
              style={{
                width: '100%',
                borderCollapse: 'collapse',
                fontSize: '14px',
              }}
            >
              <thead>
                <tr style={{ backgroundColor: '#f9f9f9', borderBottom: '1px solid #e5e5e5' }}>
                  <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', color: '#666' }}>Name & Email</th>
                  <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', color: '#666' }}>Phone</th>
                  <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', color: '#666' }}>Tags</th>
                  <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', color: '#666' }}>WhatsApp ID</th>
                  <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', color: '#666' }}>Source</th>
                  <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', color: '#666' }}>Created</th>
                  <th style={{ padding: '12px', textAlign: 'center', fontWeight: '600', color: '#666' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredContacts.map((contact) => (
                  <tr key={contact.id} style={{ borderBottom: '1px solid #e5e5e5', transition: 'background-color 0.2s ease' }}>
                    <td style={{ padding: '12px' }}>
                      <div>
                        <div style={{ fontWeight: '600', color: '#000' }}>{contact.name}</div>
                        <div style={{ fontSize: '12px', color: '#999' }}>{contact.email || '-'}</div>
                      </div>
                    </td>
                    <td style={{ padding: '12px', color: '#666' }}>{contact.phone || '-'}</td>
                    <td style={{ padding: '12px' }}>
                      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                        {contact.tags && contact.tags.length > 0 ? (
                          contact.tags.map((tag) => (
                            <span
                              key={tag}
                              style={{
                                backgroundColor: '#f0f0f0',
                                color: '#7c3aed',
                                padding: '4px 8px',
                                borderRadius: '4px',
                                fontSize: '12px',
                                fontWeight: '500',
                              }}
                            >
                              {tag}
                            </span>
                          ))
                        ) : (
                          <span style={{ color: '#999' }}>-</span>
                        )}
                      </div>
                    </td>
                    <td style={{ padding: '12px', color: '#666' }}>{contact.whatsapp_id || '-'}</td>
                    <td style={{ padding: '12px', color: '#666' }}>{contact.source || '-'}</td>
                    <td style={{ padding: '12px', color: '#666' }}>
                      {contact.created_at ? new Date(contact.created_at).toLocaleDateString() : '-'}
                    </td>
                    <td style={{ padding: '12px', textAlign: 'center' }}>
                      <div style={{ display: 'flex', justifyContent: 'center', gap: '8px' }}>
                        <button
                          style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            color: '#7c3aed',
                            padding: '4px',
                            transition: 'color 0.2s ease',
                          }}
                          onMouseOver={(e) => {
                            (e.currentTarget as HTMLButtonElement).style.color = '#6d28d9';
                          }}
                          onMouseOut={(e) => {
                            (e.currentTarget as HTMLButtonElement).style.color = '#7c3aed';
                          }}
                        >
                          <Edit size={18} />
                        </button>
                        <button
                          onClick={() => {
                            setContactToDelete(contact);
                            setDeleteConfirmOpen(true);
                          }}
                          style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            color: '#dc2626',
                            padding: '4px',
                            transition: 'color 0.2s ease',
                          }}
                          onMouseOver={(e) => {
                            (e.currentTarget as HTMLButtonElement).style.color = '#b91c1c';
                          }}
                          onMouseOut={(e) => {
                            (e.currentTarget as HTMLButtonElement).style.color = '#dc2626';
                          }}
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <NewContactModal
        isOpen={newContactOpen}
        onClose={() => setNewContactOpen(false)}
        onSubmit={handleCreateContact}
        isLoading={isCreating}
      />

      <DeleteConfirmModal
        isOpen={deleteConfirmOpen}
        onConfirm={handleDeleteContact}
        onCancel={() => {
          setDeleteConfirmOpen(false);
          setContactToDelete(null);
        }}
        isLoading={isCreating}
        contactName={contactToDelete?.name || ''}
      />
    </div>
  );
}
