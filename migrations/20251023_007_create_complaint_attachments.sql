-- Migration: Create complaint_attachments table for file management
-- Assumes existing table: complaints(id BIGINT)

CREATE TYPE attachment_type AS ENUM ('image', 'document', 'audio', 'video', 'other');
CREATE TYPE attachment_status AS ENUM ('uploading', 'uploaded', 'processing', 'ready', 'failed', 'deleted');

CREATE TABLE IF NOT EXISTS complaint_attachments (
    id BIGSERIAL PRIMARY KEY,
    complaint_id BIGINT NOT NULL REFERENCES complaints(id) ON DELETE CASCADE,
    
    -- File Information
    original_filename TEXT NOT NULL,
    stored_filename TEXT NOT NULL, -- Filename on disk/storage
    file_path TEXT NOT NULL, -- Full path to the file
    file_size BIGINT NOT NULL, -- Size in bytes
    mime_type TEXT NOT NULL,
    file_extension TEXT,
    attachment_type attachment_type NOT NULL DEFAULT 'document',
    
    -- File Metadata
    file_hash TEXT, -- SHA-256 hash for integrity checking
    checksum TEXT, -- Additional checksum if needed
    upload_status attachment_status NOT NULL DEFAULT 'uploading',
    
    -- Content Information
    title TEXT, -- User-provided title/description
    description TEXT, -- Additional description
    is_public BOOLEAN NOT NULL DEFAULT FALSE, -- Whether complainant can see this attachment
    is_evidence BOOLEAN NOT NULL DEFAULT FALSE, -- Whether this is evidence for the complaint
    
    -- Processing Information
    thumbnail_path TEXT, -- Path to thumbnail for images/videos
    processing_metadata JSONB, -- Additional processing information (OCR text, image dimensions, etc.)
    
    -- Access Control
    access_level TEXT NOT NULL DEFAULT 'staff', -- 'public', 'staff', 'admin'
    download_count INTEGER NOT NULL DEFAULT 0,
    last_accessed_at TIMESTAMPTZ,
    
    -- Audit Fields
    uploaded_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ, -- Soft delete timestamp
    
    -- Constraints
    CONSTRAINT chk_file_size CHECK (file_size > 0),
    CONSTRAINT chk_download_count CHECK (download_count >= 0),
    CONSTRAINT chk_file_path CHECK (file_path != ''),
    CONSTRAINT chk_stored_filename CHECK (stored_filename != '')
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_attachments_complaint ON complaint_attachments(complaint_id);
CREATE INDEX IF NOT EXISTS idx_attachments_type ON complaint_attachments(attachment_type);
CREATE INDEX IF NOT EXISTS idx_attachments_status ON complaint_attachments(upload_status);
CREATE INDEX IF NOT EXISTS idx_attachments_public ON complaint_attachments(is_public);
CREATE INDEX IF NOT EXISTS idx_attachments_evidence ON complaint_attachments(is_evidence);
CREATE INDEX IF NOT EXISTS idx_attachments_uploaded_by ON complaint_attachments(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_attachments_created_at ON complaint_attachments(created_at);
CREATE INDEX IF NOT EXISTS idx_attachments_file_hash ON complaint_attachments(file_hash);
CREATE INDEX IF NOT EXISTS idx_attachments_deleted_at ON complaint_attachments(deleted_at) WHERE deleted_at IS NULL;

-- Function to generate unique stored filename
CREATE OR REPLACE FUNCTION generate_stored_filename(complaint_id BIGINT, original_filename TEXT)
RETURNS TEXT AS $$
DECLARE
    file_extension TEXT;
    timestamp_part TEXT;
    random_part TEXT;
    stored_name TEXT;
BEGIN
    -- Extract file extension
    file_extension := LOWER(SUBSTRING(original_filename FROM '\.([^.]*)$'));
    IF file_extension IS NULL THEN
        file_extension := '';
    ELSE
        file_extension := '.' || file_extension;
    END IF;
    
    -- Generate timestamp and random parts
    timestamp_part := TO_CHAR(NOW(), 'YYYYMMDD_HH24MISS');
    random_part := SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 8);
    
    -- Create stored filename: complaint_id_timestamp_random.ext
    stored_name := complaint_id || '_' || timestamp_part || '_' || random_part || file_extension;
    
    RETURN stored_name;
END;
$$ LANGUAGE plpgsql;

-- Function to determine attachment type from MIME type
CREATE OR REPLACE FUNCTION determine_attachment_type(mime_type TEXT)
RETURNS attachment_type AS $$
BEGIN
    CASE
        WHEN mime_type LIKE 'image/%' THEN RETURN 'image';
        WHEN mime_type LIKE 'video/%' THEN RETURN 'video';
        WHEN mime_type LIKE 'audio/%' THEN RETURN 'audio';
        WHEN mime_type IN (
            'application/pdf',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'application/vnd.ms-excel',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'text/plain',
            'text/csv'
        ) THEN RETURN 'document';
        ELSE RETURN 'other';
    END CASE;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-generate stored filename and set attachment type
CREATE OR REPLACE FUNCTION set_attachment_metadata()
RETURNS TRIGGER AS $$
BEGIN
    -- Generate stored filename if not provided
    IF NEW.stored_filename IS NULL OR NEW.stored_filename = '' THEN
        NEW.stored_filename := generate_stored_filename(NEW.complaint_id, NEW.original_filename);
    END IF;
    
    -- Set attachment type from MIME type if not provided
    IF NEW.attachment_type IS NULL THEN
        NEW.attachment_type := determine_attachment_type(NEW.mime_type);
    END IF;
    
    -- Set file extension from original filename if not provided
    IF NEW.file_extension IS NULL THEN
        NEW.file_extension := LOWER(SUBSTRING(NEW.original_filename FROM '\.([^.]*)$'));
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_set_attachment_metadata
    BEFORE INSERT ON complaint_attachments
    FOR EACH ROW
    EXECUTE FUNCTION set_attachment_metadata();

-- Function to update download count
CREATE OR REPLACE FUNCTION increment_download_count(attachment_id BIGINT)
RETURNS VOID AS $$
BEGIN
    UPDATE complaint_attachments 
    SET 
        download_count = download_count + 1,
        last_accessed_at = NOW(),
        updated_at = NOW()
    WHERE id = attachment_id AND deleted_at IS NULL;
END;
$$ LANGUAGE plpgsql;

-- View for active attachments (excluding soft-deleted)
CREATE VIEW active_complaint_attachments AS
SELECT 
    ca.*,
    c.complaint_number,
    c.subject as complaint_subject,
    c.status as complaint_status
FROM complaint_attachments ca
JOIN complaints c ON ca.complaint_id = c.id
WHERE ca.deleted_at IS NULL;

-- Function to get attachment statistics for a complaint
CREATE OR REPLACE FUNCTION get_complaint_attachment_stats(complaint_id_param BIGINT)
RETURNS TABLE (
    total_attachments BIGINT,
    total_size BIGINT,
    attachment_types JSONB,
    public_attachments BIGINT,
    evidence_attachments BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*) as total_attachments,
        COALESCE(SUM(file_size), 0) as total_size,
        jsonb_object_agg(attachment_type, type_count) as attachment_types,
        COUNT(*) FILTER (WHERE is_public = TRUE) as public_attachments,
        COUNT(*) FILTER (WHERE is_evidence = TRUE) as evidence_attachments
    FROM (
        SELECT 
            attachment_type,
            COUNT(*) as type_count
        FROM complaint_attachments 
        WHERE complaint_id = complaint_id_param AND deleted_at IS NULL
        GROUP BY attachment_type
    ) type_stats
    CROSS JOIN complaint_attachments
    WHERE complaint_attachments.complaint_id = complaint_id_param AND complaint_attachments.deleted_at IS NULL;
END;
$$ LANGUAGE plpgsql;
