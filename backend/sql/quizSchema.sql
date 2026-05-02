DO $$
BEGIN
	IF to_regclass('public.quizzes') IS NULL THEN
		CREATE TABLE quizzes (
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
			created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
			updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
			UNIQUE (class_id, title)
		);

		CREATE INDEX idx_quizzes_class ON quizzes(class_id);
		CREATE INDEX idx_quizzes_teacher ON quizzes(teacher_id);
		CREATE INDEX idx_quizzes_published ON quizzes(class_id, is_published);
	END IF;

	IF to_regclass('public.quiz_questions') IS NULL THEN
		CREATE TABLE quiz_questions (
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

		CREATE INDEX idx_quiz_questions_quiz ON quiz_questions(quiz_id);
	END IF;

	IF to_regclass('public.quiz_question_options') IS NULL THEN
		CREATE TABLE quiz_question_options (
			id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
			question_id UUID NOT NULL REFERENCES quiz_questions(id) ON DELETE CASCADE,
			option_text TEXT NOT NULL,
			is_correct BOOLEAN NOT NULL DEFAULT false,
			order_index INTEGER NOT NULL,
			created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
			UNIQUE (question_id, order_index)
		);

		CREATE INDEX idx_question_options_question ON quiz_question_options(question_id);
	END IF;

	IF to_regclass('public.quiz_submissions') IS NULL THEN
		CREATE TABLE quiz_submissions (
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

		CREATE INDEX idx_quiz_submissions_quiz ON quiz_submissions(quiz_id);
		CREATE INDEX idx_quiz_submissions_student ON quiz_submissions(student_id);
		CREATE INDEX idx_quiz_submissions_graded ON quiz_submissions(quiz_id, is_graded);
	END IF;

	IF to_regclass('public.quiz_answers') IS NULL THEN
		CREATE TABLE quiz_answers (
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

		CREATE INDEX idx_quiz_answers_submission ON quiz_answers(submission_id);
		CREATE INDEX idx_quiz_answers_question ON quiz_answers(question_id);
	END IF;

	ALTER TABLE quizzes ADD COLUMN IF NOT EXISTS copy_protection_enabled BOOLEAN NOT NULL DEFAULT true;
	ALTER TABLE quizzes ADD COLUMN IF NOT EXISTS paste_protection_enabled BOOLEAN NOT NULL DEFAULT true;
	ALTER TABLE quizzes ADD COLUMN IF NOT EXISTS disable_right_click BOOLEAN NOT NULL DEFAULT true;

END $$;
