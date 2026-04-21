BEGIN;

ALTER TABLE class_resources
  ADD COLUMN IF NOT EXISTS content_mode VARCHAR(20) NOT NULL DEFAULT 'view';

ALTER TABLE class_resources
  ADD COLUMN IF NOT EXISTS material_category VARCHAR(30) NOT NULL DEFAULT 'lecture';

ALTER TABLE class_resources
  ADD COLUMN IF NOT EXISTS youtube_video_id VARCHAR(32);

ALTER TABLE class_resources
  ADD COLUMN IF NOT EXISTS meta JSONB NOT NULL DEFAULT '{}'::jsonb;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'class_resources'::regclass
      AND conname = 'class_resources_type_check_v2'
  ) THEN
    ALTER TABLE class_resources
      ADD CONSTRAINT class_resources_type_check_v2
      CHECK (type IN ('file', 'link', 'youtube')) NOT VALID;
  END IF;
END$$;

ALTER TABLE class_resources
  VALIDATE CONSTRAINT class_resources_type_check_v2;

DO $$
DECLARE cname text;
BEGIN
  FOR cname IN
    SELECT conname
    FROM pg_constraint
    WHERE conrelid = 'class_resources'::regclass
      AND contype = 'c'
      AND conname <> 'class_resources_type_check_v2'
      AND pg_get_constraintdef(oid) ILIKE '%type%'
  LOOP
    EXECUTE format('ALTER TABLE class_resources DROP CONSTRAINT %I', cname);
  END LOOP;
END$$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'class_resources'::regclass
      AND conname = 'class_resources_type_check_v2'
  )
  AND NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'class_resources'::regclass
      AND conname = 'class_resources_type_check'
  ) THEN
    ALTER TABLE class_resources
      RENAME CONSTRAINT class_resources_type_check_v2 TO class_resources_type_check;
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'class_resources'::regclass
      AND conname = 'class_resources_content_mode_check'
  ) THEN
    ALTER TABLE class_resources
      ADD CONSTRAINT class_resources_content_mode_check
      CHECK (content_mode IN ('view', 'read')) NOT VALID;
  END IF;
END$$;

ALTER TABLE class_resources
  VALIDATE CONSTRAINT class_resources_content_mode_check;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'class_resources'::regclass
      AND conname = 'class_resources_material_category_check'
  ) THEN
    ALTER TABLE class_resources
      ADD CONSTRAINT class_resources_material_category_check
      CHECK (material_category IN ('lecture', 'reading', 'glossary', 'notice', 'info', 'download', 'assessment')) NOT VALID;
  END IF;
END$$;

ALTER TABLE class_resources
  VALIDATE CONSTRAINT class_resources_material_category_check;

CREATE TABLE IF NOT EXISTS resource_view_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resource_id UUID NOT NULL REFERENCES class_resources(id) ON DELETE CASCADE,
  class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  watch_seconds NUMERIC(12, 2) NOT NULL DEFAULT 0,
  duration_seconds NUMERIC(12, 2) NOT NULL DEFAULT 0,
  last_position_seconds NUMERIC(12, 2) NOT NULL DEFAULT 0,
  progress_percent NUMERIC(5, 2) NOT NULL DEFAULT 0,
  threshold_25_reached BOOLEAN NOT NULL DEFAULT false,
  threshold_25_reached_at TIMESTAMP WITH TIME ZONE,
  last_event_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  CONSTRAINT resource_view_progress_percent_check CHECK (progress_percent >= 0 AND progress_percent <= 100),
  UNIQUE (resource_id, student_id)
);

ALTER TABLE resource_view_progress
  ADD COLUMN IF NOT EXISTS duration_seconds NUMERIC(12, 2) NOT NULL DEFAULT 0;

ALTER TABLE resource_view_progress
  ADD COLUMN IF NOT EXISTS last_position_seconds NUMERIC(12, 2) NOT NULL DEFAULT 0;

ALTER TABLE resource_view_progress
  ADD COLUMN IF NOT EXISTS progress_percent NUMERIC(5, 2) NOT NULL DEFAULT 0;

ALTER TABLE resource_view_progress
  ADD COLUMN IF NOT EXISTS threshold_25_reached_at TIMESTAMP WITH TIME ZONE;

ALTER TABLE resource_view_progress
  DROP COLUMN IF EXISTS video_duration_seconds;

ALTER TABLE resource_view_progress
  DROP COLUMN IF EXISTS max_percent_viewed;

ALTER TABLE resource_view_progress
  DROP COLUMN IF EXISTS threshold_reached_at;

CREATE INDEX IF NOT EXISTS idx_resource_view_progress_class_student
  ON resource_view_progress (class_id, student_id);

CREATE INDEX IF NOT EXISTS idx_resource_view_progress_resource
  ON resource_view_progress (resource_id);

CREATE INDEX IF NOT EXISTS idx_resource_view_progress_threshold
  ON resource_view_progress (class_id, threshold_25_reached);

CREATE TABLE IF NOT EXISTS resource_attendance_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  resource_id UUID NOT NULL REFERENCES class_resources(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  attendance_date DATE NOT NULL,
  progress_percent NUMERIC(5, 2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

ALTER TABLE resource_attendance_events
  ADD COLUMN IF NOT EXISTS progress_percent NUMERIC(5, 2) NOT NULL DEFAULT 0;

DELETE FROM resource_attendance_events a
USING resource_attendance_events b
WHERE a.ctid < b.ctid
  AND a.class_id = b.class_id
  AND a.student_id = b.student_id
  AND a.attendance_date = b.attendance_date;

CREATE UNIQUE INDEX IF NOT EXISTS uq_resource_attendance_events_class_student_date
  ON resource_attendance_events (class_id, student_id, attendance_date);

CREATE INDEX IF NOT EXISTS idx_resource_attendance_events_resource
  ON resource_attendance_events (resource_id);

COMMIT;
