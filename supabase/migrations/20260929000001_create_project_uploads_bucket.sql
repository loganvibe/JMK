-- Create project-uploads storage bucket if it doesn't exist
-- This bucket is used for user project file uploads (PDF, DOCX, TXT)
-- It must be private (public = false) with RLS policies controlling access

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'project-uploads',
  'project-uploads',
  false,
  15728640, -- 15MB limit
  ARRAY['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain', 'text/markdown']
)
ON CONFLICT (id) DO UPDATE SET
  public = false,
  file_size_limit = 15728640,
  allowed_mime_types = ARRAY['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain', 'text/markdown'];