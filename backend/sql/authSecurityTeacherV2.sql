CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS teacher_profiles (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    institute_id UUID NOT NULL REFERENCES institutes(id) ON DELETE CASCADE,
    subjects TEXT[] NOT NULL,
    preferred_class_id UUID REFERENCES classes(id) ON DELETE SET NULL,
    preferred_grade_label VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    CONSTRAINT teacher_profiles_subjects_not_empty CHECK (cardinality(subjects) > 0)
);

CREATE TABLE IF NOT EXISTS auth_refresh_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash TEXT NOT NULL UNIQUE,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    revoked_at TIMESTAMP WITH TIME ZONE,
    revoked_reason VARCHAR(50),
    replaced_by UUID REFERENCES auth_refresh_tokens(id) ON DELETE SET NULL,
    rotated_from UUID REFERENCES auth_refresh_tokens(id) ON DELETE SET NULL,
    ip_address VARCHAR(100),
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    last_used_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_teacher_profiles_institute ON teacher_profiles(institute_id);
CREATE INDEX IF NOT EXISTS idx_teacher_profiles_class ON teacher_profiles(preferred_class_id);
CREATE INDEX IF NOT EXISTS idx_auth_refresh_tokens_user ON auth_refresh_tokens(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_auth_refresh_tokens_expires ON auth_refresh_tokens(expires_at);
CREATE INDEX IF NOT EXISTS idx_auth_refresh_tokens_active ON auth_refresh_tokens(user_id, expires_at) WHERE revoked_at IS NULL;

CREATE TABLE IF NOT EXISTS password_resets (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) NOT NULL,
    code VARCHAR(6),
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE password_resets ADD COLUMN IF NOT EXISTS code_hash TEXT;
ALTER TABLE password_resets ADD COLUMN IF NOT EXISTS attempts_remaining SMALLINT NOT NULL DEFAULT 3;
ALTER TABLE password_resets ADD COLUMN IF NOT EXISTS consumed_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE password_resets ADD COLUMN IF NOT EXISTS last_attempt_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE password_resets ADD COLUMN IF NOT EXISTS request_ip VARCHAR(100);

UPDATE password_resets
SET code_hash = encode(digest(code, 'sha256'), 'hex')
WHERE code IS NOT NULL
  AND code_hash IS NULL;

DELETE FROM password_resets
WHERE code_hash IS NULL;

ALTER TABLE password_resets ALTER COLUMN code_hash SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_password_resets_email_created ON password_resets(email, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_password_resets_active ON password_resets(email, expires_at) WHERE consumed_at IS NULL;

ALTER TABLE password_resets DROP COLUMN IF EXISTS code;
