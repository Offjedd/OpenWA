import React, { useState, useEffect, useRef } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Upload, Download, Copy, Trash2, Image as ImageIcon, File } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { AgencyMedia } from '../types';

interface OutletContextType {
  subAccountId: string;
}

const BUCKET_NAME = 'agency-media';

const getFileIcon = (mimeType: string) => {
  if (mimeType.startsWith('image/')) return <ImageIcon size={24} />;
  return <File size={24} />;
};

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
};

export const MediaPage: React.FC = () => {
  const { subAccountId } = useOutletContext<OutletContextType>();
  const [mediaFiles, setMediaFiles] = useState<AgencyMedia[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadMediaFiles();
  }, [subAccountId]);

  const loadMediaFiles = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('agency_media')
        .select('*')
        .eq('sub_account_id', subAccountId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setMediaFiles(data || []);
    } catch (error) {
      console.error('Error loading media files:', error);
    } finally {
      setLoading(false);
    }
  };

  const uploadFiles = async (files: File[]) => {
    if (files.length === 0) return;

    setUploading(true);
    const uploadedFiles: AgencyMedia[] = [];

    try {
      for (const file of files) {
        const fileExtension = file.name.split('.').pop();
        const filename = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExtension}`;
        const path = `${subAccountId}/${filename}`;

        const { error } = await supabase.storage
          .from(BUCKET_NAME)
          .upload(path, file);

        if (error) throw error;

        const { data: { publicUrl } } = supabase.storage
          .from(BUCKET_NAME)
          .getPublicUrl(path);

        const { data: inserted, error: dbError } = await supabase
          .from('agency_media')
          .insert({
            sub_account_id: subAccountId,
            file_name: file.name,
            file_size: file.size,
            mime_type: file.type,
            storage_path: path,
            public_url: publicUrl,
          })
          .select()
          .single();

        if (dbError) throw dbError;
        uploadedFiles.push(inserted);
      }

      setMediaFiles([...uploadedFiles, ...mediaFiles]);
      alert(`Successfully uploaded ${uploadedFiles.length} file(s)`);
    } catch (error) {
      console.error('Error uploading files:', error);
      alert('Failed to upload some files');
    } finally {
      setUploading(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    uploadFiles(files);
  };

  const handleDrag = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const files = Array.from(e.dataTransfer.files || []);
    uploadFiles(files);
  };

  const handleCopyUrl = (url: string) => {
    navigator.clipboard.writeText(url);
    alert('URL copied to clipboard');
  };

  const handleDownload = (url: string, fileName: string) => {
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleDeleteFile = async (mediaId: string, storagePath: string) => {
    if (!confirm('Are you sure you want to delete this file?')) return;

    try {
      await supabase.storage
        .from(BUCKET_NAME)
        .remove([storagePath]);

      const { error } = await supabase
        .from('agency_media')
        .delete()
        .eq('id', mediaId);

      if (error) throw error;

      setMediaFiles(mediaFiles.filter((f) => f.id !== mediaId));
    } catch (error) {
      console.error('Error deleting file:', error);
      alert('Failed to delete file');
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        Loading media library...
      </div>
    );
  }

  return (
    <div style={{ padding: '20px', backgroundColor: '#f5f5f5', minHeight: '100vh' }}>
      <h1 style={{ margin: '0 0 24px 0', fontSize: '24px', fontWeight: '700', color: '#1a1a1a' }}>
        Media Library
      </h1>

      <div
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        style={{
          border: '2px dashed',
          borderColor: dragActive ? '#7c3aed' : '#e5e5e5',
          borderRadius: '12px',
          padding: '40px 20px',
          textAlign: 'center',
          cursor: 'pointer',
          backgroundColor: dragActive ? '#faf5ff' : '#f5f5f5',
          transition: 'all 0.2s',
          marginBottom: '24px',
        }}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          onChange={handleFileSelect}
          style={{ display: 'none' }}
        />
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '12px' }}>
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: '8px',
            backgroundColor: dragActive ? '#7c3aed' : '#e5e5e5',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: dragActive ? 'white' : '#999',
          }}>
            <Upload size={24} />
          </div>
        </div>
        <h2 style={{ margin: '0 0 8px 0', fontSize: '16px', fontWeight: '600', color: '#1a1a1a' }}>
          Drag and drop files here
        </h2>
        <p style={{ margin: '0', fontSize: '14px', color: '#666' }}>
          or click to browse files
        </p>
        {uploading && (
          <p style={{ margin: '12px 0 0 0', fontSize: '13px', color: '#7c3aed', fontWeight: '500' }}>
            Uploading...
          </p>
        )}
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <p style={{ margin: '0 0 4px 0', fontSize: '12px', color: '#666', fontWeight: '500' }}>
            Storage Usage
          </p>
          <div style={{
            width: '200px',
            height: '8px',
            backgroundColor: '#e5e5e5',
            borderRadius: '4px',
            overflow: 'hidden',
          }}>
            <div style={{
              height: '100%',
              backgroundColor: '#7c3aed',
              width: `${Math.min((mediaFiles.length / 100) * 100, 100)}%`,
            }} />
          </div>
          <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#999' }}>
            {mediaFiles.length} file(s) uploaded
          </p>
        </div>
      </div>

      {mediaFiles.length === 0 ? (
        <div style={{
          backgroundColor: 'white',
          borderRadius: '12px',
          border: '1px solid #e5e5e5',
          padding: '40px 20px',
          textAlign: 'center',
        }}>
          <p style={{ margin: '0', fontSize: '16px', color: '#666', marginBottom: '8px' }}>
            No media files yet
          </p>
          <p style={{ margin: '0', fontSize: '14px', color: '#999' }}>
            Upload images or files to get started
          </p>
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
          gap: '16px',
        }}>
          {mediaFiles.map((file) => (
            <div
              key={file.id}
              style={{
                backgroundColor: 'white',
                borderRadius: '12px',
                border: '1px solid #e5e5e5',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              <div style={{
                width: '100%',
                height: '120px',
                backgroundColor: '#f5f5f5',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderBottom: '1px solid #e5e5e5',
                color: '#999',
              }}>
                {(file.type ?? '').startsWith('image/') ? (
                  <img
                    src={file.url}
                    alt={file.name}
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                    }}
                  />
                ) : (
                  getFileIcon(file.type ?? '')
                )}
              </div>

              <div style={{ padding: '12px', flex: 1, display: 'flex', flexDirection: 'column' }}>
                <p style={{
                  margin: '0 0 8px 0',
                  fontSize: '12px',
                  fontWeight: '500',
                  color: '#1a1a1a',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}>
                  {file.name}
                </p>

                <p style={{
                  margin: '0 0 12px 0',
                  fontSize: '11px',
                  color: '#999',
                }}>
                  {formatFileSize(file.size ?? 0)}
                </p>

                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px',
                }}>
                  <button
                    onClick={() => handleCopyUrl(file.url)}
                    style={{
                      padding: '6px 10px',
                      border: '1px solid #e5e5e5',
                      borderRadius: '4px',
                      backgroundColor: '#f5f5f5',
                      color: '#1a1a1a',
                      fontSize: '11px',
                      fontWeight: '500',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '4px',
                    }}
                  >
                    <Copy size={12} />
                    Copy URL
                  </button>

                  <button
                    onClick={() => handleDownload(file.url, file.name)}
                    style={{
                      padding: '6px 10px',
                      border: '1px solid #e5e5e5',
                      borderRadius: '4px',
                      backgroundColor: '#f5f5f5',
                      color: '#1a1a1a',
                      fontSize: '11px',
                      fontWeight: '500',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '4px',
                    }}
                  >
                    <Download size={12} />
                    Download
                  </button>

                  <button
                    onClick={() => handleDeleteFile(file.id, file.url)}
                    style={{
                      padding: '6px 10px',
                      border: '1px solid #fecaca',
                      borderRadius: '4px',
                      backgroundColor: '#fff5f5',
                      color: '#dc2626',
                      fontSize: '11px',
                      fontWeight: '500',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '4px',
                    }}
                  >
                    <Trash2 size={12} />
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MediaPage;
