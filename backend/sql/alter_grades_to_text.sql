DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='grades' AND column_name='class_id' AND data_type <> 'text') THEN
    ALTER TABLE grades ALTER COLUMN class_id TYPE text USING class_id::text;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='grades' AND column_name='teacher_id' AND data_type <> 'text') THEN
    ALTER TABLE grades ALTER COLUMN teacher_id TYPE text USING teacher_id::text;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='grades' AND column_name='student_id' AND data_type <> 'text') THEN
    ALTER TABLE grades ALTER COLUMN student_id TYPE text USING student_id::text;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='grades' AND column_name='assignment_id' AND data_type <> 'text') THEN
    ALTER TABLE grades ALTER COLUMN assignment_id TYPE text USING assignment_id::text;
  END IF;
END$$;
