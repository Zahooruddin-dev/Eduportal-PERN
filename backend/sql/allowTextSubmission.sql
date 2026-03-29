
BEGIN;

-- 1) Create a new permissive constraint (if not exists) but mark NOT VALID to avoid immediate scan
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'assignment_submissions'::regclass
      AND conname = 'assignment_submissions_submission_type_check_v2'
  ) THEN
    ALTER TABLE assignment_submissions
      ADD CONSTRAINT assignment_submissions_submission_type_check_v2
      CHECK (submission_type IN ('file','link','text')) NOT VALID;
  END IF;
END$$;

-- 2) Validate the new constraint (this will check existing rows; if rows violate it, the validate will fail)
ALTER TABLE assignment_submissions
  VALIDATE CONSTRAINT assignment_submissions_submission_type_check_v2;

-- 3) Drop any other check constraints on this table (except the one we just created)
DO $$
DECLARE cname text;
BEGIN
  FOR cname IN
    SELECT conname FROM pg_constraint
    WHERE conrelid = 'assignment_submissions'::regclass
      AND contype = 'c'
      AND conname <> 'assignment_submissions_submission_type_check_v2'
  LOOP
    EXECUTE format('ALTER TABLE assignment_submissions DROP CONSTRAINT %I', cname);
  END LOOP;
END$$;

-- 4) Rename the new constraint to the canonical name
ALTER TABLE assignment_submissions
  RENAME CONSTRAINT assignment_submissions_submission_type_check_v2 TO assignment_submissions_submission_type_check;

COMMIT;

