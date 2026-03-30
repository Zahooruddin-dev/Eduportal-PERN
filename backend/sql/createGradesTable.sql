CREATE TABLE IF NOT EXISTS grades (
  id SERIAL PRIMARY KEY,
  class_id TEXT NOT NULL,
  teacher_id TEXT,
  student_id TEXT,
  assignment_id TEXT,
  grade NUMERIC,
  max_grade NUMERIC,
  grade_type TEXT,
  feedback TEXT,
  released BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_grades_class_id ON grades(class_id);
CREATE INDEX IF NOT EXISTS idx_grades_student_id ON grades(student_id);
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
