BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

ALTER TABLE assignments
ADD COLUMN IF NOT EXISTS due_at TIMESTAMP WITH TIME ZONE;

UPDATE assignments
SET due_at = (due_date::timestamp + TIME '23:59:00') AT TIME ZONE 'UTC'
WHERE due_at IS NULL
  AND due_date IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_assignments_due_at
ON assignments (due_at);

CREATE INDEX IF NOT EXISTS idx_assignments_class_due_at
ON assignments (class_id, due_at);

CREATE TABLE IF NOT EXISTS academic_terms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institute_id UUID NOT NULL REFERENCES institutes(id) ON DELETE CASCADE,
    label VARCHAR(160) NOT NULL,
    starts_on DATE NOT NULL,
    ends_on DATE NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT false,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    CONSTRAINT academic_terms_valid_dates CHECK (starts_on <= ends_on)
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_academic_terms_institute_label_window
ON academic_terms (institute_id, label, starts_on, ends_on);

CREATE INDEX IF NOT EXISTS idx_academic_terms_institute_active_dates
ON academic_terms (institute_id, is_active, starts_on, ends_on);

CREATE TABLE IF NOT EXISTS academic_calendar_exceptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institute_id UUID NOT NULL REFERENCES institutes(id) ON DELETE CASCADE,
    class_id UUID REFERENCES classes(id) ON DELETE CASCADE,
    term_id UUID REFERENCES academic_terms(id) ON DELETE SET NULL,
    title VARCHAR(180) NOT NULL,
    description TEXT,
    category VARCHAR(24) NOT NULL DEFAULT 'holiday' CHECK (category IN ('holiday', 'closure', 'event', 'exam', 'other')),
    starts_on DATE NOT NULL,
    ends_on DATE NOT NULL,
    blocks_instruction BOOLEAN NOT NULL DEFAULT true,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    CONSTRAINT academic_calendar_exceptions_valid_dates CHECK (starts_on <= ends_on)
);

CREATE INDEX IF NOT EXISTS idx_academic_calendar_exceptions_institute_dates
ON academic_calendar_exceptions (institute_id, starts_on, ends_on);

CREATE INDEX IF NOT EXISTS idx_academic_calendar_exceptions_class_dates
ON academic_calendar_exceptions (class_id, starts_on, ends_on);

CREATE INDEX IF NOT EXISTS idx_academic_calendar_exceptions_term
ON academic_calendar_exceptions (term_id);

CREATE INDEX IF NOT EXISTS idx_academic_calendar_exceptions_instructional
ON academic_calendar_exceptions (institute_id, blocks_instruction, starts_on, ends_on);

CREATE TABLE IF NOT EXISTS calendar_feed_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    institute_id UUID NOT NULL REFERENCES institutes(id) ON DELETE CASCADE,
    token_hash TEXT NOT NULL UNIQUE,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    revoked_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_calendar_feed_tokens_user_active
ON calendar_feed_tokens (user_id, revoked_at, expires_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS uq_calendar_feed_tokens_user_active
ON calendar_feed_tokens (user_id)
WHERE revoked_at IS NULL;

COMMIT;
