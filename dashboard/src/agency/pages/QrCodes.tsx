import { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Plus, Download, Trash2 } from 'lucide-react';
import QRCode from 'qrcode';
import { supabase } from '../../lib/supabase';
import type { QrCode } from '../types';

interface OutletContext {
  subAccountId: string;
}

type QrType = 'URL' | 'WhatsApp' | 'Phone' | 'Text' | 'vCard';

interface NewQrFormData {
  name: string;
  type: QrType;
  url: string;
  phone: string;
  message: string;
  text: string;
  vCardName: string;
  vCardPhone: string;
  vCardEmail: string;
  vCardCompany: string;
  color: string;
}

export function QrCodes() {
  const { subAccountId } = useOutletContext<OutletContext>();
  const [qrCodes, setQrCodes] = useState<QrCode[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [formData, setFormData] = useState<NewQrFormData>({
    name: '',
    type: 'URL',
    url: '',
    phone: '',
    message: '',
    text: '',
    vCardName: '',
    vCardPhone: '',
    vCardEmail: '',
    vCardCompany: '',
    color: '#000000',
  });

  useEffect(() => {
    fetchQrCodes();
  }, [subAccountId]);

  const fetchQrCodes = async () => {
    try {
      const { data, error } = await supabase
        .from('qr_codes')
        .select('*')
        .eq('sub_account_id', subAccountId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setQrCodes(data || []);
    } catch (err) {
      console.error('Error fetching QR codes:', err);
    }
  };

  const generateQrContent = (): string => {
    switch (formData.type) {
      case 'URL':
        return formData.url;
      case 'WhatsApp':
        return `https://wa.me/${formData.phone.replace(/\D/g, '')}?text=${encodeURIComponent(formData.message)}`;
      case 'Phone':
        return `tel:${formData.phone}`;
      case 'Text':
        return formData.text;
      case 'vCard':
        return `BEGIN:VCARD\nVERSION:3.0\nFN:${formData.vCardName}\nTEL:${formData.vCardPhone}\nEMAIL:${formData.vCardEmail}\nORG:${formData.vCardCompany}\nEND:VCARD`;
      default:
        return '';
    }
  };

  useEffect(() => {
    const content = generateQrContent();
    if (content) {
      QRCode.toDataURL(content, {
        color: {
          dark: formData.color,
          light: '#ffffff',
        },
      })
        .then((url) => setQrDataUrl(url))
        .catch((err) => console.error('Error generating QR:', err));
    }
  }, [formData.type, formData.url, formData.phone, formData.message, formData.text, formData.vCardName, formData.vCardPhone, formData.vCardEmail, formData.vCardCompany, formData.color]);

  const handleOpenModal = () => {
    setFormData({
      name: '',
      type: 'URL',
      url: '',
      phone: '',
      message: '',
      text: '',
      vCardName: '',
      vCardPhone: '',
      vCardEmail: '',
      vCardCompany: '',
      color: '#000000',
    });
    setQrDataUrl(null);
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
  };

  const handleSaveQrCode = async () => {
    if (!formData.name) {
      alert('Please enter a QR code name');
      return;
    }

    if (!qrDataUrl) {
      alert('QR code content is invalid');
      return;
    }

    const content = generateQrContent();

    try {
      const { error } = await supabase.from('qr_codes').insert({
        sub_account_id: subAccountId,
        name: formData.name,
        type: formData.type,
        content,
        image_url: qrDataUrl,
        color: formData.color,
        scans: 0,
      });

      if (error) throw error;

      await fetchQrCodes();
      handleCloseModal();
    } catch (err) {
      console.error('Error saving QR code:', err);
    }
  };

  const handleDeleteQrCode = async (qrId: string) => {
    if (!window.confirm('Are you sure you want to delete this QR code?')) return;

    try {
      const { error } = await supabase
        .from('qr_codes')
        .delete()
        .eq('id', qrId);

      if (error) throw error;
      await fetchQrCodes();
    } catch (err) {
      console.error('Error deleting QR code:', err);
    }
  };

  const handleDownloadQrCode = (qrCode: QrCode) => {
    if (!qrCode.image_url) return;

    const link = document.createElement('a');
    link.href = qrCode.image_url;
    link.download = `${qrCode.name}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getTypeColor = (type: string) => {
    const colors: { [key: string]: string } = {
      URL: '#3b82f6',
      WhatsApp: '#10b981',
      Phone: '#f59e0b',
      Text: '#8b5cf6',
      vCard: '#ec4899',
    };
    return colors[type] || '#6b7280';
  };

  return (
    <div style={{ padding: '24px', backgroundColor: '#f5f5f5', minHeight: '100vh' }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '24px',
        }}
      >
        <h1 style={{ fontSize: '28px', fontWeight: 'bold', color: '#1a1a1a' }}>
          QR Codes
        </h1>
        <button
          onClick={handleOpenModal}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            backgroundColor: '#7c3aed',
            color: 'white',
            border: 'none',
            padding: '10px 16px',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: '500',
          }}
        >
          <Plus size={18} />
          New QR Code
        </button>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
          gap: '16px',
        }}
      >
        {qrCodes.map((qr) => (
          <div
            key={qr.id}
            style={{
              backgroundColor: 'white',
              border: '1px solid #e5e5e5',
              borderRadius: '12px',
              padding: '16px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
            }}
          >
            {qr.image_url && (
              <div
                style={{
                  marginBottom: '12px',
                  width: '100%',
                  height: '180px',
                  backgroundColor: '#f9f9f9',
                  border: '1px solid #e5e5e5',
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  overflow: 'hidden',
                }}
              >
                <img
                  src={qr.image_url}
                  alt={qr.name}
                  style={{ maxWidth: '100%', maxHeight: '100%' }}
                />
              </div>
            )}

            <h3 style={{ fontSize: '15px', fontWeight: '600', marginBottom: '8px', color: '#1a1a1a', wordBreak: 'break-word' }}>
              {qr.name}
            </h3>

            <div style={{ marginBottom: '12px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <span
                style={{
                  backgroundColor: getTypeColor(qr.type),
                  color: 'white',
                  padding: '4px 12px',
                  borderRadius: '20px',
                  fontSize: '12px',
                  fontWeight: '500',
                }}
              >
                {qr.type}
              </span>
            </div>

            <div style={{ fontSize: '13px', color: '#666', marginBottom: '12px' }}>
              <p style={{ margin: '4px 0' }}>
                <strong>Scans:</strong> {qr.scans}
              </p>
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={() => handleDownloadQrCode(qr)}
                style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  backgroundColor: '#f0f0f0',
                  border: '1px solid #e5e5e5',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '13px',
                  color: '#666',
                }}
              >
                <Download size={16} />
                Download
              </button>
              <button
                onClick={() => handleDeleteQrCode(qr.id)}
                style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  backgroundColor: '#f0f0f0',
                  border: '1px solid #e5e5e5',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '13px',
                  color: '#dc2626',
                }}
              >
                <Trash2 size={16} />
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>

      {showModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 50,
          }}
          onClick={handleCloseModal}
        >
          <div
            style={{
              backgroundColor: 'white',
              borderRadius: '12px',
              maxWidth: '700px',
              width: '90%',
              maxHeight: '90vh',
              overflowY: 'auto',
              padding: '24px',
              boxShadow: '0 20px 25px rgba(0,0,0,0.15)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '20px', color: '#1a1a1a' }}>
              Create New QR Code
            </h2>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 200px',
                gap: '24px',
                marginBottom: '20px',
              }}
            >
              {/* Form */}
              <div>
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', marginBottom: '6px', color: '#666' }}>
                    QR Code Name
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      border: '1px solid #e5e5e5',
                      borderRadius: '6px',
                      fontSize: '14px',
                      boxSizing: 'border-box',
                    }}
                    placeholder="e.g., Website Link"
                  />
                </div>

                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', marginBottom: '6px', color: '#666' }}>
                    Type
                  </label>
                  <select
                    value={formData.type}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        type: e.target.value as QrType,
                      })
                    }
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      border: '1px solid #e5e5e5',
                      borderRadius: '6px',
                      fontSize: '14px',
                      boxSizing: 'border-box',
                    }}
                  >
                    <option value="URL">URL</option>
                    <option value="WhatsApp">WhatsApp</option>
                    <option value="Phone">Phone</option>
                    <option value="Text">Text</option>
                    <option value="vCard">vCard</option>
                  </select>
                </div>

                {formData.type === 'URL' && (
                  <div style={{ marginBottom: '16px' }}>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', marginBottom: '6px', color: '#666' }}>
                      URL
                    </label>
                    <input
                      type="url"
                      value={formData.url}
                      onChange={(e) =>
                        setFormData({ ...formData, url: e.target.value })
                      }
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        border: '1px solid #e5e5e5',
                        borderRadius: '6px',
                        fontSize: '14px',
                        boxSizing: 'border-box',
                      }}
                      placeholder="https://example.com"
                    />
                  </div>
                )}

                {formData.type === 'WhatsApp' && (
                  <>
                    <div style={{ marginBottom: '16px' }}>
                      <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', marginBottom: '6px', color: '#666' }}>
                        Phone Number
                      </label>
                      <input
                        type="tel"
                        value={formData.phone}
                        onChange={(e) =>
                          setFormData({ ...formData, phone: e.target.value })
                        }
                        style={{
                          width: '100%',
                          padding: '10px 12px',
                          border: '1px solid #e5e5e5',
                          borderRadius: '6px',
                          fontSize: '14px',
                          boxSizing: 'border-box',
                        }}
                        placeholder="+1234567890"
                      />
                    </div>
                    <div style={{ marginBottom: '16px' }}>
                      <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', marginBottom: '6px', color: '#666' }}>
                        Pre-filled Message
                      </label>
                      <textarea
                        value={formData.message}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            message: e.target.value,
                          })
                        }
                        rows={3}
                        style={{
                          width: '100%',
                          padding: '10px 12px',
                          border: '1px solid #e5e5e5',
                          borderRadius: '6px',
                          fontSize: '14px',
                          boxSizing: 'border-box',
                          resize: 'vertical',
                        }}
                        placeholder="Hello, I am interested..."
                      />
                    </div>
                  </>
                )}

                {formData.type === 'Phone' && (
                  <div style={{ marginBottom: '16px' }}>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', marginBottom: '6px', color: '#666' }}>
                      Phone Number
                    </label>
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) =>
                        setFormData({ ...formData, phone: e.target.value })
                      }
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        border: '1px solid #e5e5e5',
                        borderRadius: '6px',
                        fontSize: '14px',
                        boxSizing: 'border-box',
                      }}
                      placeholder="+1234567890"
                    />
                  </div>
                )}

                {formData.type === 'Text' && (
                  <div style={{ marginBottom: '16px' }}>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', marginBottom: '6px', color: '#666' }}>
                      Text Content
                    </label>
                    <textarea
                      value={formData.text}
                      onChange={(e) =>
                        setFormData({ ...formData, text: e.target.value })
                      }
                      rows={4}
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        border: '1px solid #e5e5e5',
                        borderRadius: '6px',
                        fontSize: '14px',
                        boxSizing: 'border-box',
                        resize: 'vertical',
                      }}
                      placeholder="Any text content..."
                    />
                  </div>
                )}

                {formData.type === 'vCard' && (
                  <>
                    <div style={{ marginBottom: '16px' }}>
                      <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', marginBottom: '6px', color: '#666' }}>
                        Name
                      </label>
                      <input
                        type="text"
                        value={formData.vCardName}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            vCardName: e.target.value,
                          })
                        }
                        style={{
                          width: '100%',
                          padding: '10px 12px',
                          border: '1px solid #e5e5e5',
                          borderRadius: '6px',
                          fontSize: '14px',
                          boxSizing: 'border-box',
                        }}
                        placeholder="John Doe"
                      />
                    </div>
                    <div style={{ marginBottom: '16px' }}>
                      <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', marginBottom: '6px', color: '#666' }}>
                        Phone
                      </label>
                      <input
                        type="tel"
                        value={formData.vCardPhone}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            vCardPhone: e.target.value,
                          })
                        }
                        style={{
                          width: '100%',
                          padding: '10px 12px',
                          border: '1px solid #e5e5e5',
                          borderRadius: '6px',
                          fontSize: '14px',
                          boxSizing: 'border-box',
                        }}
                        placeholder="+1234567890"
                      />
                    </div>
                    <div style={{ marginBottom: '16px' }}>
                      <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', marginBottom: '6px', color: '#666' }}>
                        Email
                      </label>
                      <input
                        type="email"
                        value={formData.vCardEmail}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            vCardEmail: e.target.value,
                          })
                        }
                        style={{
                          width: '100%',
                          padding: '10px 12px',
                          border: '1px solid #e5e5e5',
                          borderRadius: '6px',
                          fontSize: '14px',
                          boxSizing: 'border-box',
                        }}
                        placeholder="john@example.com"
                      />
                    </div>
                    <div style={{ marginBottom: '16px' }}>
                      <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', marginBottom: '6px', color: '#666' }}>
                        Company
                      </label>
                      <input
                        type="text"
                        value={formData.vCardCompany}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            vCardCompany: e.target.value,
                          })
                        }
                        style={{
                          width: '100%',
                          padding: '10px 12px',
                          border: '1px solid #e5e5e5',
                          borderRadius: '6px',
                          fontSize: '14px',
                          boxSizing: 'border-box',
                        }}
                        placeholder="Acme Inc."
                      />
                    </div>
                  </>
                )}

                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', marginBottom: '6px', color: '#666' }}>
                    Color
                  </label>
                  <input
                    type="color"
                    value={formData.color}
                    onChange={(e) =>
                      setFormData({ ...formData, color: e.target.value })
                    }
                    style={{
                      width: '100%',
                      height: '40px',
                      border: '1px solid #e5e5e5',
                      borderRadius: '6px',
                      cursor: 'pointer',
                    }}
                  />
                </div>
              </div>

              {/* QR Preview */}
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '12px',
                }}
              >
                <p style={{ fontSize: '12px', fontWeight: '500', color: '#666' }}>
                  Preview
                </p>
                <div
                  style={{
                    width: '100%',
                    aspectRatio: '1',
                    backgroundColor: '#f9f9f9',
                    border: '1px solid #e5e5e5',
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    overflow: 'hidden',
                  }}
                >
                  {qrDataUrl ? (
                    <img
                      src={qrDataUrl}
                      alt="QR Preview"
                      style={{ maxWidth: '100%', maxHeight: '100%' }}
                    />
                  ) : (
                    <span style={{ fontSize: '12px', color: '#999' }}>
                      No content
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={handleCloseModal}
                style={{
                  flex: 1,
                  padding: '10px 16px',
                  border: '1px solid #e5e5e5',
                  backgroundColor: 'white',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '500',
                  color: '#666',
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleSaveQrCode}
                style={{
                  flex: 1,
                  padding: '10px 16px',
                  backgroundColor: '#7c3aed',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '500',
                }}
              >
                Create QR Code
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
