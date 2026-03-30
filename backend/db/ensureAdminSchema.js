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
			kind VARCHAR(20) NOT NULL DEFAULT 'report' CHECK (kind IN ('report', 'complaint')),
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

		CREATE INDEX IF NOT EXISTS idx_users_institute_role ON users(institute_id, role);
		CREATE INDEX IF NOT EXISTS idx_classes_institute_id ON classes(institute_id);
		CREATE INDEX IF NOT EXISTS idx_admin_invites_institute_status ON admin_invites(institute_id, status);
		CREATE INDEX IF NOT EXISTS idx_reports_institute_status ON reports(institute_id, status);
		CREATE INDEX IF NOT EXISTS idx_reports_reporter_id ON reports(reporter_id);
		CREATE INDEX IF NOT EXISTS idx_reports_target_user_id ON reports(target_user_id);
		CREATE INDEX IF NOT EXISTS idx_reports_created_at ON reports(created_at DESC);
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
