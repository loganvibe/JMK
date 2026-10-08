-- Add unique constraint to match frontend upsert
ALTER TABLE public.project_sections
ADD CONSTRAINT project_sections_project_id_chapter_section_type_key
UNIQUE (project_id, chapter, section_type);
