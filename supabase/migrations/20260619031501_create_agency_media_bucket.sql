-- Create agency-media storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'agency-media',
  'agency-media',
  true,
  52428800, -- 50MB limit
  ARRAY['image/jpeg','image/png','image/gif','image/webp','video/mp4','video/webm','audio/mpeg','audio/wav','application/pdf','text/plain']
)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS policies for agency-media bucket
CREATE POLICY "agency_media_select"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'agency-media');

CREATE POLICY "agency_media_insert"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'agency-media');

CREATE POLICY "agency_media_delete"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'agency-media' AND auth.uid() IS NOT NULL);
