CREATE TABLE enrollments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID REFERENCES students(id) ON DELETE CASCADE,
    class_id UUID REFERENCES classes(id) ON DELETE CASCADE,
    enrollment_date DATE DEFAULT CURRENT_DATE,
    UNIQUE(student_id, class_id) 
);
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(50) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role VARCHAR(20) DEFAULT 'student' CHECK (role IN ('admin', 'teacher', 'student')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
ALTER TABLE users ADD COLUMN profile_pic TEXT;

ALTER TABLE enrollments 
DROP CONSTRAINT enrollments_student_id_fkey;

ALTER TABLE enrollments 
ADD CONSTRAINT enrollments_student_id_fkey 
FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE classes 
ADD COLUMN teacher_id UUID REFERENCES users(id) ON DELETE SET NULL;
CREATE TABLE announcements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    class_id UUID REFERENCES classes(id) ON DELETE CASCADE,
    teacher_id UUID REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
ON CASCADE TEST
SELECT 
    tc.table_name, 
    kcu.column_name, 
    rc.delete_rule 
FROM 
    information_schema.table_constraints AS tc 
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
    JOIN information_schema.referential_constraints AS rc
      ON tc.constraint_name = rc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_name = 'announcements';
TO SWITCH TO CASCADE
-- 1. Find the name of the constraint (usually 'classes_teacher_id_fkey')
-- 2. Drop it
ALTER TABLE classes 
DROP CONSTRAINT IF EXISTS classes_teacher_id_fkey;

-- 3. Re-add it with CASCADE
ALTER TABLE classes 
ADD CONSTRAINT classes_teacher_id_fkey 
FOREIGN KEY (teacher_id) REFERENCES users(id) 
ON DELETE CASCADE;

NOW ON enrollments
SELECT 
    tc.table_name, 
    kcu.column_name, 
    rc.delete_rule 
FROM 
    information_schema.table_constraints AS tc 
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
    JOIN information_schema.referential_constraints AS rc
      ON tc.constraint_name = rc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_name = 'enrollments';

CREATE TABLE password_resets (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) NOT NULL,
    code VARCHAR(6) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
ALTER TABLE password_rests
RENAME to password_resets;
ALTER TABLE announcements 
ADD COLUMN expires_at TIMESTAMP;
SELECT 
    conname AS constraint_name, 
    contype AS constraint_type,
    confrelid::regclass AS referenced_table
FROM pg_constraint
WHERE conrelid = 'enrollments'::regclass;
SELECT 
    relname AS table_name, 
    conname AS constraint_name
FROM pg_constraint c
JOIN pg_class t ON c.conrelid = t.oid
WHERE confrelid = 'students'::regclass;


CREATE TABLE attendance (
    id BIGSERIAL PRIMARY KEY,
    class_id BIGINT NOT NULL,
    student_id BIGINT NOT NULL,
    status VARCHAR(10) CHECK (status IN ('present', 'absent', 'late')),
    date DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_attendance_class FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE,
    CONSTRAINT fk_attendance_student FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE(student_id, class_id, date)
);
ALTER TABLE classes
ADD COLUMN grade_level VARCHAR(50),
ADD COLUMN subject VARCHAR(100),
ADD COLUMN description TEXT,
ADD COLUMN max_students INTEGER DEFAULT 30,
ALTER COLUMN room_number DROP NOT NULL; -- make room optional

BEGIN;

-- Remove old column
ALTER TABLE classes DROP COLUMN IF EXISTS time_in_pakistan;

-- Convert schedule_days to plain text
ALTER TABLE classes ALTER COLUMN schedule_days TYPE TEXT;

-- Add new columns if they don't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='classes' AND column_name='grade_level') THEN
        ALTER TABLE classes ADD COLUMN grade_level VARCHAR(50);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='classes' AND column_name='subject') THEN
        ALTER TABLE classes ADD COLUMN subject VARCHAR(100);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='classes' AND column_name='description') THEN
        ALTER TABLE classes ADD COLUMN description TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='classes' AND column_name='max_students') THEN
        ALTER TABLE classes ADD COLUMN max_students INTEGER DEFAULT 30;
    END IF;
END $$;

-- Ensure room_number is nullable
ALTER TABLE classes ALTER COLUMN room_number DROP NOT NULL;

COMMIT;
-- enrollments: queries for a student's enrolled classes
CREATE INDEX IF NOT EXISTS idx_enrollments_student_id ON enrollments(student_id);

-- enrollments: queries for class roster (students in a class)
CREATE INDEX IF NOT EXISTS idx_enrollments_class_id ON enrollments(class_id);

-- announcements: filter by class and show only non-expired, newest first
CREATE INDEX IF NOT EXISTS idx_announcements_class_id_expires ON announcements(class_id, expires_at, created_at DESC);

-- announcements: filter by teacher (for deletion)
CREATE INDEX IF NOT EXISTS idx_announcements_teacher_id ON announcements(teacher_id);

-- classes: filter by teacher (teacher's classes)
CREATE INDEX IF NOT EXISTS idx_classes_teacher_id ON classes(teacher_id);

-- (Optional) If you often join users by role, consider:
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- Enable UUID generation if not already (PostgreSQL has gen_random_uuid() built-in)
CREATE TABLE IF NOT EXISTS class_resources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
    teacher_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    type VARCHAR(20) NOT NULL CHECK (type IN ('file', 'link')),
    content TEXT NOT NULL,  -- file path or URL
    description TEXT,
    tags TEXT[],  -- e.g., {'lecture_notes', 'assignment'}
    is_published BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_resources_class_id ON class_resources(class_id);
CREATE INDEX IF NOT EXISTS idx_resources_teacher_id ON class_resources(teacher_id);
CREATE TABLE IF NOT EXISTS resource_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    resource_id UUID NOT NULL REFERENCES class_resources(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    parent_comment_id UUID REFERENCES resource_comments(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_resource_comments_resource_id ON resource_comments(resource_id);
CREATE INDEX IF NOT EXISTS idx_resource_comments_parent_id ON resource_comments(parent_comment_id);
CREATE INDEX IF NOT EXISTS idx_resource_comments_user_id ON resource_comments(user_id);