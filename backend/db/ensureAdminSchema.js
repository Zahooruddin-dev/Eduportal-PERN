const pool = require('./Pool');

async function ensureAdminSchema() {
	await pool.query(`
		CREATE EXTENSION IF NOT EXISTS pgcrypto;

		CREATE TABLE IF NOT EXISTS institutes (
			id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
			name VARCHAR(160) NOT NULL UNIQUE,
			created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
		);

		ALTER TABLE users ADD COLUMN IF NOT EXISTS institute_id UUID;
		ALTER TABLE classes ADD COLUMN IF NOT EXISTS institute_id UUID;

		DO $$
		BEGIN
			IF NOT EXISTS (
				SELECT 1
				FROM information_schema.table_constraints
				WHERE constraint_schema = 'public'
				AND table_name = 'users'
				AND constraint_name = 'users_institute_id_fkey'
			) THEN
				ALTER TABLE users
				ADD CONSTRAINT users_institute_id_fkey
				FOREIGN KEY (institute_id) REFERENCES institutes(id) ON DELETE CASCADE;
			END IF;
		END
		$$;

		DO $$
		BEGIN
			IF NOT EXISTS (
				SELECT 1
				FROM information_schema.table_constraints
				WHERE constraint_schema = 'public'
				AND table_name = 'classes'
				AND constraint_name = 'classes_institute_id_fkey'
			) THEN
				ALTER TABLE classes
				ADD CONSTRAINT classes_institute_id_fkey
				FOREIGN KEY (institute_id) REFERENCES institutes(id) ON DELETE CASCADE;
			END IF;
		END
		$$;

		CREATE TABLE IF NOT EXISTS admin_invites (
			id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
			institute_id UUID NOT NULL REFERENCES institutes(id) ON DELETE CASCADE,
			email VARCHAR(255) NOT NULL,
			invite_token_hash TEXT NOT NULL UNIQUE,
			requested_by UUID REFERENCES users(id) ON DELETE SET NULL,
			status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'revoked', 'expired')),
			expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
			accepted_by UUID REFERENCES users(id) ON DELETE SET NULL,
			created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
			accepted_at TIMESTAMP WITH TIME ZONE
		);

		CREATE TABLE IF NOT EXISTS reports (
			id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
			institute_id UUID NOT NULL REFERENCES institutes(id) ON DELETE CASCADE,
			reporter_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
			reporter_role VARCHAR(20) NOT NULL CHECK (reporter_role IN ('admin', 'teacher', 'student', 'parent')),
			target_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
			kind VARCHAR(20) NOT NULL DEFAULT 'report' CHECK (kind IN ('report', 'complaint', 'suggestion')),
			report_type VARCHAR(50) NOT NULL CHECK (report_type IN (
				'technical_issue',
				'teacher_conduct',
				'schedule_issue',
				'fees_issue',
				'academic_issue',
				'attendance_issue',
				'bullying_harassment',
				'infrastructure_issue',
				'other'
			)),
			title VARCHAR(200) NOT NULL,
			description TEXT NOT NULL,
			attachment_url TEXT,
			status VARCHAR(20) NOT NULL DEFAULT 'submitted' CHECK (status IN ('submitted', 'under_process', 'resolved', 'rejected', 'closed')),
			admin_feedback TEXT,
			updated_by_admin_id UUID REFERENCES users(id) ON DELETE SET NULL,
			created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
			updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
		);

		CREATE TABLE IF NOT EXISTS parent_profiles (
			user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
			child_full_name VARCHAR(160) NOT NULL,
			child_grade VARCHAR(80) NOT NULL,
			relationship_to_child VARCHAR(80) NOT NULL,
			child_student_id UUID REFERENCES users(id) ON DELETE SET NULL,
			parent_phone VARCHAR(40) NOT NULL,
			alternate_phone VARCHAR(40),
			address TEXT,
			notes TEXT,
			created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
			updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
		);

		CREATE TABLE IF NOT EXISTS teacher_profiles (
			user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
			institute_id UUID NOT NULL REFERENCES institutes(id) ON DELETE CASCADE,
			subjects TEXT[] NOT NULL,
			preferred_class_id UUID REFERENCES classes(id) ON DELETE SET NULL,
			preferred_grade_label VARCHAR(100),
			bio TEXT,
			office_hours TEXT,
			meeting_link TEXT,
			focus_areas TEXT[],
			created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
			updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
			CONSTRAINT teacher_profiles_subjects_not_empty CHECK (cardinality(subjects) > 0)
		);

		ALTER TABLE teacher_profiles ADD COLUMN IF NOT EXISTS bio TEXT;
		ALTER TABLE teacher_profiles ADD COLUMN IF NOT EXISTS office_hours TEXT;
		ALTER TABLE teacher_profiles ADD COLUMN IF NOT EXISTS meeting_link TEXT;
		ALTER TABLE teacher_profiles ADD COLUMN IF NOT EXISTS focus_areas TEXT[];

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

		DO $$
		BEGIN
			IF EXISTS (
				SELECT 1
				FROM information_schema.columns
				WHERE table_schema = 'public'
				AND table_name = 'password_resets'
				AND column_name = 'code'
			) THEN
				UPDATE password_resets
				SET code_hash = encode(digest(code, 'sha256'), 'hex')
				WHERE code IS NOT NULL
				AND code_hash IS NULL;
			END IF;
		END
		$$;

		DELETE FROM password_resets
		WHERE code_hash IS NULL;

		ALTER TABLE password_resets ALTER COLUMN code_hash SET NOT NULL;

		ALTER TABLE password_resets DROP COLUMN IF EXISTS code;

		ALTER TABLE parent_profiles
		ADD COLUMN IF NOT EXISTS child_student_id UUID;

		DO $$
		BEGIN
			IF NOT EXISTS (
				SELECT 1
				FROM information_schema.table_constraints
				WHERE constraint_schema = 'public'
				AND table_name = 'parent_profiles'
				AND constraint_name = 'parent_profiles_child_student_id_fkey'
			) THEN
				ALTER TABLE parent_profiles
				ADD CONSTRAINT parent_profiles_child_student_id_fkey
				FOREIGN KEY (child_student_id) REFERENCES users(id) ON DELETE SET NULL;
			END IF;
		END
		$$;

		CREATE TABLE IF NOT EXISTS admin_announcements (
			id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
			institute_id UUID NOT NULL REFERENCES institutes(id) ON DELETE CASCADE,
			created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
			title VARCHAR(255) NOT NULL,
			content TEXT NOT NULL,
			audience_scope VARCHAR(40) NOT NULL CHECK (audience_scope IN (
				'all',
				'students',
				'teachers',
				'parents',
				'students_teachers',
				'students_parents',
				'teachers_parents'
			)),
			expires_at TIMESTAMP WITH TIME ZONE,
			created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
		);

		CREATE TABLE IF NOT EXISTS admin_announcement_reads (
			announcement_id UUID NOT NULL REFERENCES admin_announcements(id) ON DELETE CASCADE,
			user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
			read_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
			PRIMARY KEY (announcement_id, user_id)
		);

		CREATE TABLE IF NOT EXISTS conversations (
			id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
			institute_id UUID NOT NULL REFERENCES institutes(id) ON DELETE CASCADE,
			is_direct BOOLEAN NOT NULL DEFAULT true,
			created_by UUID REFERENCES users(id) ON DELETE SET NULL,
			created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
			updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
			last_message_at TIMESTAMP WITH TIME ZONE
		);

		CREATE TABLE IF NOT EXISTS conversation_participants (
			conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
			user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
			joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
			last_read_at TIMESTAMP WITH TIME ZONE,
			PRIMARY KEY (conversation_id, user_id)
		);

		CREATE TABLE IF NOT EXISTS messages (
			id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
			conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
			sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
			content TEXT NOT NULL,
			reply_to_message_id UUID REFERENCES messages(id) ON DELETE SET NULL,
			is_deleted BOOLEAN NOT NULL DEFAULT false,
			created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
			updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
			edited_at TIMESTAMP WITH TIME ZONE
		);

		CREATE INDEX IF NOT EXISTS idx_users_institute_role ON users(institute_id, role);
		CREATE INDEX IF NOT EXISTS idx_users_institute_created ON users(institute_id, created_at DESC);
		CREATE INDEX IF NOT EXISTS idx_classes_institute_id ON classes(institute_id);
		CREATE INDEX IF NOT EXISTS idx_enrollments_class_student ON enrollments(class_id, student_id);
		CREATE INDEX IF NOT EXISTS idx_enrollments_student_class ON enrollments(student_id, class_id);
		CREATE INDEX IF NOT EXISTS idx_attendance_class_date ON attendance(class_id, date DESC);
		CREATE INDEX IF NOT EXISTS idx_attendance_student_date ON attendance(student_id, date DESC);
		CREATE INDEX IF NOT EXISTS idx_attendance_class_student_date ON attendance(class_id, student_id, date DESC);

		DO $$
		DECLARE resource_type_constraint RECORD;
		BEGIN
			IF to_regclass('public.class_resources') IS NOT NULL THEN
				ALTER TABLE class_resources
				ADD COLUMN IF NOT EXISTS content_mode VARCHAR(20) NOT NULL DEFAULT 'view';

				ALTER TABLE class_resources
				ADD COLUMN IF NOT EXISTS material_category VARCHAR(30) NOT NULL DEFAULT 'lecture';

				ALTER TABLE class_resources
				ADD COLUMN IF NOT EXISTS youtube_video_id VARCHAR(32);

				ALTER TABLE class_resources
				ADD COLUMN IF NOT EXISTS meta JSONB NOT NULL DEFAULT '{}'::jsonb;

				FOR resource_type_constraint IN
					SELECT conname
					FROM pg_constraint
					WHERE conrelid = 'class_resources'::regclass
					AND contype = 'c'
					AND pg_get_constraintdef(oid) ILIKE '%type%'
				LOOP
					EXECUTE format('ALTER TABLE class_resources DROP CONSTRAINT IF EXISTS %I', resource_type_constraint.conname);
				END LOOP;

				ALTER TABLE class_resources
				ADD CONSTRAINT class_resources_type_check
				CHECK (type IN ('file', 'link', 'youtube'));

				IF NOT EXISTS (
					SELECT 1
					FROM pg_constraint
					WHERE conrelid = 'class_resources'::regclass
					AND conname = 'class_resources_content_mode_check'
				) THEN
					ALTER TABLE class_resources
					ADD CONSTRAINT class_resources_content_mode_check
					CHECK (content_mode IN ('view', 'read'));
				END IF;

				IF NOT EXISTS (
					SELECT 1
					FROM pg_constraint
					WHERE conrelid = 'class_resources'::regclass
					AND conname = 'class_resources_material_category_check'
				) THEN
					ALTER TABLE class_resources
					ADD CONSTRAINT class_resources_material_category_check
					CHECK (material_category IN ('lecture', 'reading', 'glossary', 'notice', 'info', 'download', 'assessment'));
				END IF;
			END IF;
		END
		$$;

		DO $$
		BEGIN
			IF to_regclass('public.class_resources') IS NOT NULL
				AND to_regclass('public.classes') IS NOT NULL
				AND to_regclass('public.users') IS NOT NULL
			THEN
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

				CREATE INDEX IF NOT EXISTS idx_resource_view_progress_class_student
				ON resource_view_progress(class_id, student_id);

				CREATE INDEX IF NOT EXISTS idx_resource_view_progress_resource
				ON resource_view_progress(resource_id);

				CREATE INDEX IF NOT EXISTS idx_resource_view_progress_threshold
				ON resource_view_progress(class_id, threshold_25_reached);

				CREATE TABLE IF NOT EXISTS resource_attendance_events (
					id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
					class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
					resource_id UUID NOT NULL REFERENCES class_resources(id) ON DELETE CASCADE,
					student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
					attendance_date DATE NOT NULL,
					progress_percent NUMERIC(5, 2) NOT NULL DEFAULT 0,
					created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
					UNIQUE (class_id, student_id, attendance_date)
				);

				ALTER TABLE resource_attendance_events
				ADD COLUMN IF NOT EXISTS progress_percent NUMERIC(5, 2) NOT NULL DEFAULT 0;

				CREATE INDEX IF NOT EXISTS idx_resource_attendance_events_class_student
				ON resource_attendance_events(class_id, student_id, attendance_date DESC);

				CREATE INDEX IF NOT EXISTS idx_resource_attendance_events_resource
				ON resource_attendance_events(resource_id);
			END IF;
		END
		$$;

		CREATE INDEX IF NOT EXISTS idx_grades_student_released_created ON grades(student_id, released, created_at DESC);
		CREATE INDEX IF NOT EXISTS idx_grades_class_created ON grades(class_id, created_at DESC);
		CREATE INDEX IF NOT EXISTS idx_admin_invites_institute_status ON admin_invites(institute_id, status);
		CREATE INDEX IF NOT EXISTS idx_reports_institute_status ON reports(institute_id, status);
		CREATE INDEX IF NOT EXISTS idx_reports_reporter_id ON reports(reporter_id);
		CREATE INDEX IF NOT EXISTS idx_reports_target_user_id ON reports(target_user_id);
		CREATE INDEX IF NOT EXISTS idx_reports_created_at ON reports(created_at DESC);
		CREATE INDEX IF NOT EXISTS idx_parent_profiles_child_grade ON parent_profiles(child_grade);
		CREATE INDEX IF NOT EXISTS idx_parent_profiles_child_student_id ON parent_profiles(child_student_id);
		CREATE INDEX IF NOT EXISTS idx_admin_announcements_institute_created ON admin_announcements(institute_id, created_at DESC);
		CREATE INDEX IF NOT EXISTS idx_admin_announcements_audience_scope ON admin_announcements(audience_scope);
		CREATE INDEX IF NOT EXISTS idx_admin_announcement_reads_user_read ON admin_announcement_reads(user_id, read_at DESC);
		CREATE INDEX IF NOT EXISTS idx_teacher_profiles_institute ON teacher_profiles(institute_id);
		CREATE INDEX IF NOT EXISTS idx_teacher_profiles_class ON teacher_profiles(preferred_class_id);
		CREATE INDEX IF NOT EXISTS idx_auth_refresh_tokens_user ON auth_refresh_tokens(user_id, created_at DESC);
		CREATE INDEX IF NOT EXISTS idx_auth_refresh_tokens_expires ON auth_refresh_tokens(expires_at);
		CREATE INDEX IF NOT EXISTS idx_auth_refresh_tokens_active ON auth_refresh_tokens(user_id, expires_at) WHERE revoked_at IS NULL;
		CREATE INDEX IF NOT EXISTS idx_password_resets_email_created ON password_resets(email, created_at DESC);
		CREATE INDEX IF NOT EXISTS idx_password_resets_active ON password_resets(email, expires_at) WHERE consumed_at IS NULL;
		CREATE INDEX IF NOT EXISTS idx_conversations_institute_last_message ON conversations(institute_id, last_message_at DESC);
		CREATE INDEX IF NOT EXISTS idx_conversation_participants_user ON conversation_participants(user_id, last_read_at);
		CREATE INDEX IF NOT EXISTS idx_messages_conversation_created ON messages(conversation_id, created_at DESC);
		CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender_id, created_at DESC);

		CREATE TABLE IF NOT EXISTS quizzes (
			id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
			class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
			teacher_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
			title VARCHAR(255) NOT NULL,
			description TEXT,
			instructions TEXT,
			type VARCHAR(20) NOT NULL CHECK (type IN ('multiple-choice', 'short-answer', 'mixed')),
			is_published BOOLEAN NOT NULL DEFAULT false,
			allow_review BOOLEAN NOT NULL DEFAULT true,
			show_answers BOOLEAN NOT NULL DEFAULT false,
			randomize_questions BOOLEAN NOT NULL DEFAULT false,
			shuffle_answers BOOLEAN NOT NULL DEFAULT false,
			time_limit_minutes INTEGER,
			pass_percentage NUMERIC(5, 2),
			attempts_allowed INTEGER,
			copy_protection_enabled BOOLEAN NOT NULL DEFAULT true,
			paste_protection_enabled BOOLEAN NOT NULL DEFAULT true,
			disable_right_click BOOLEAN NOT NULL DEFAULT true,
			created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
			updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
			UNIQUE (class_id, title)
		);

		CREATE TABLE IF NOT EXISTS quiz_questions (
			id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
			quiz_id UUID NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
			question_text TEXT NOT NULL,
			question_type VARCHAR(20) NOT NULL CHECK (question_type IN ('multiple-choice', 'short-answer')),
			points NUMERIC(8, 2) NOT NULL DEFAULT 1,
			correct_answer TEXT,
			order_index INTEGER NOT NULL,
			created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
			updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
			UNIQUE (quiz_id, order_index)
		);

		CREATE TABLE IF NOT EXISTS quiz_question_options (
			id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
			question_id UUID NOT NULL REFERENCES quiz_questions(id) ON DELETE CASCADE,
			option_text TEXT NOT NULL,
			is_correct BOOLEAN NOT NULL DEFAULT false,
			order_index INTEGER NOT NULL,
			created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
			UNIQUE (question_id, order_index)
		);

		CREATE TABLE IF NOT EXISTS quiz_submissions (
			id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
			quiz_id UUID NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
			student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
			started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
			submitted_at TIMESTAMP WITH TIME ZONE,
			score NUMERIC(8, 2),
			max_score NUMERIC(8, 2),
			percentage NUMERIC(5, 2),
			attempt_number INTEGER NOT NULL DEFAULT 1,
			is_graded BOOLEAN NOT NULL DEFAULT false,
			time_spent_seconds INTEGER,
			created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
			updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
			UNIQUE (quiz_id, student_id, attempt_number)
		);

		CREATE TABLE IF NOT EXISTS quiz_answers (
			id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
			submission_id UUID NOT NULL REFERENCES quiz_submissions(id) ON DELETE CASCADE,
			question_id UUID NOT NULL REFERENCES quiz_questions(id) ON DELETE CASCADE,
			selected_option_id UUID REFERENCES quiz_question_options(id) ON DELETE SET NULL,
			text_answer TEXT,
			points_earned NUMERIC(8, 2),
			is_correct BOOLEAN,
			created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
			updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
			UNIQUE (submission_id, question_id)
		);

		CREATE INDEX IF NOT EXISTS idx_quizzes_class ON quizzes(class_id);
		CREATE INDEX IF NOT EXISTS idx_quizzes_teacher ON quizzes(teacher_id);
		CREATE INDEX IF NOT EXISTS idx_quizzes_published ON quizzes(class_id, is_published);
		CREATE INDEX IF NOT EXISTS idx_quiz_questions_quiz ON quiz_questions(quiz_id);
		CREATE INDEX IF NOT EXISTS idx_question_options_question ON quiz_question_options(question_id);
		CREATE INDEX IF NOT EXISTS idx_quiz_submissions_quiz ON quiz_submissions(quiz_id);
		CREATE INDEX IF NOT EXISTS idx_quiz_submissions_student ON quiz_submissions(student_id);
		CREATE INDEX IF NOT EXISTS idx_quiz_submissions_graded ON quiz_submissions(quiz_id, is_graded);
		CREATE INDEX IF NOT EXISTS idx_quiz_answers_submission ON quiz_answers(submission_id);
		CREATE INDEX IF NOT EXISTS idx_quiz_answers_question ON quiz_answers(question_id);
	`);

	await pool.query(`
		DO $$
		DECLARE users_role_constraint RECORD;
		BEGIN
			FOR users_role_constraint IN
				SELECT conname
				FROM pg_constraint
				WHERE conrelid = 'users'::regclass
				AND contype = 'c'
				AND pg_get_constraintdef(oid) ILIKE '%role%'
			LOOP
				EXECUTE format('ALTER TABLE users DROP CONSTRAINT IF EXISTS %I', users_role_constraint.conname);
			END LOOP;

			ALTER TABLE users
			ADD CONSTRAINT users_role_check
			CHECK (role IN ('admin', 'teacher', 'student', 'parent'));
		END
		$$;

		DO $$
		DECLARE reports_kind_constraint RECORD;
		BEGIN
			FOR reports_kind_constraint IN
				SELECT conname
				FROM pg_constraint
				WHERE conrelid = 'reports'::regclass
				AND contype = 'c'
				AND pg_get_constraintdef(oid) ILIKE '%kind%'
			LOOP
				EXECUTE format('ALTER TABLE reports DROP CONSTRAINT IF EXISTS %I', reports_kind_constraint.conname);
			END LOOP;

			ALTER TABLE reports
			ADD CONSTRAINT reports_kind_check
			CHECK (kind IN ('report', 'complaint', 'suggestion'));
		END
		$$;

		DO $$
		DECLARE reports_reporter_role_constraint RECORD;
		BEGIN
			FOR reports_reporter_role_constraint IN
				SELECT conname
				FROM pg_constraint
				WHERE conrelid = 'reports'::regclass
				AND contype = 'c'
				AND pg_get_constraintdef(oid) ILIKE '%reporter_role%'
			LOOP
				EXECUTE format('ALTER TABLE reports DROP CONSTRAINT IF EXISTS %I', reports_reporter_role_constraint.conname);
			END LOOP;

			ALTER TABLE reports
			ADD CONSTRAINT reports_reporter_role_check
			CHECK (reporter_role IN ('admin', 'teacher', 'student', 'parent'));
		END
		$$;
	`);

	const { rows } = await pool.query(`
		WITH current_default AS (
			SELECT id FROM institutes ORDER BY created_at ASC LIMIT 1
		), created_default AS (
			INSERT INTO institutes(name)
			SELECT $1
			WHERE NOT EXISTS (SELECT 1 FROM institutes)
			RETURNING id
		)
		SELECT id FROM created_default
		UNION ALL
		SELECT id FROM current_default
		LIMIT 1;
	`, ['Default Institute']);

	const defaultInstituteId = rows[0]?.id;

	if (defaultInstituteId) {
		await pool.query(
			`UPDATE users SET institute_id = $1 WHERE institute_id IS NULL`,
			[defaultInstituteId],
		);

		await pool.query(
			`UPDATE classes c
			 SET institute_id = u.institute_id
			 FROM users u
			 WHERE c.institute_id IS NULL
			 AND c.teacher_id = u.id`,
		);

		await pool.query(
			`UPDATE classes SET institute_id = $1 WHERE institute_id IS NULL`,
			[defaultInstituteId],
		);
	}

	await pool.query(`
		ALTER TABLE users
		ALTER COLUMN institute_id SET NOT NULL;

		ALTER TABLE classes
		ALTER COLUMN institute_id SET NOT NULL;
	`);
}

module.exports = {
	ensureAdminSchema,
};
