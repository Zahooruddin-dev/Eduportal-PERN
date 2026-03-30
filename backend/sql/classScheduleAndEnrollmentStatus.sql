BEGIN;

ALTER TABLE classes
  ADD COLUMN IF NOT EXISTS schedule_blocks JSONB,
  ADD COLUMN IF NOT EXISTS meeting_link TEXT,
  ADD COLUMN IF NOT EXISTS schedule_timezone VARCHAR(80) DEFAULT 'UTC';

ALTER TABLE classes
  ALTER COLUMN schedule_blocks SET DEFAULT '[]'::jsonb;

CREATE TABLE IF NOT EXISTS class_enrollment_status (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'kicked', 'banned')),
  data_policy VARCHAR(20) NOT NULL DEFAULT 'keep' CHECK (data_policy IN ('keep', 'delete_grades', 'delete_all')),
  note TEXT,
  updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  UNIQUE (class_id, student_id)
);

CREATE INDEX IF NOT EXISTS idx_class_enrollment_status_class
  ON class_enrollment_status (class_id, status);

CREATE INDEX IF NOT EXISTS idx_class_enrollment_status_student
  ON class_enrollment_status (student_id, status);

INSERT INTO class_enrollment_status (class_id, student_id, status, data_policy)
SELECT e.class_id, e.student_id, 'active', 'keep'
FROM enrollments e
ON CONFLICT (class_id, student_id)
DO UPDATE SET
  status = 'active',
  data_policy = 'keep',
  updated_at = NOW();

COMMIT;
