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
