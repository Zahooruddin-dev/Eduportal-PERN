const pool = require('./Pool');

async function upsertResourceProgress({
	resourceId,
	classId,
	studentId,
	watchSeconds,
	durationSeconds,
	lastPositionSeconds,
	progressPercent,
	thresholdReached,
}) {
	const { rows } = await pool.query(
		`WITH existing AS (
			SELECT threshold_25_reached
			FROM resource_view_progress
			WHERE resource_id = $1 AND student_id = $3
		),
		upserted AS (
			INSERT INTO resource_view_progress (
				resource_id,
				class_id,
				student_id,
				watch_seconds,
				duration_seconds,
				last_position_seconds,
				progress_percent,
				threshold_25_reached,
				threshold_25_reached_at,
				last_event_at,
				updated_at
			)
			VALUES (
				$1,
				$2,
				$3,
				$4,
				$5,
				$6,
				$7,
				$8,
				CASE WHEN $8 THEN NOW() ELSE NULL END,
				NOW(),
				NOW()
			)
			ON CONFLICT (resource_id, student_id)
			DO UPDATE SET
				class_id = EXCLUDED.class_id,
				watch_seconds = GREATEST(resource_view_progress.watch_seconds, EXCLUDED.watch_seconds),
				duration_seconds = GREATEST(resource_view_progress.duration_seconds, EXCLUDED.duration_seconds),
				last_position_seconds = GREATEST(resource_view_progress.last_position_seconds, EXCLUDED.last_position_seconds),
				progress_percent = GREATEST(resource_view_progress.progress_percent, EXCLUDED.progress_percent),
				threshold_25_reached = resource_view_progress.threshold_25_reached OR EXCLUDED.threshold_25_reached,
				threshold_25_reached_at = CASE
					WHEN resource_view_progress.threshold_25_reached THEN resource_view_progress.threshold_25_reached_at
					WHEN EXCLUDED.threshold_25_reached THEN NOW()
					ELSE resource_view_progress.threshold_25_reached_at
				END,
				last_event_at = NOW(),
				updated_at = NOW()
			RETURNING *
		)
		SELECT
			upserted.*,
			COALESCE((SELECT threshold_25_reached FROM existing), false) AS previous_threshold
		FROM upserted`,
		[
			resourceId,
			classId,
			studentId,
			watchSeconds,
			durationSeconds,
			lastPositionSeconds,
			progressPercent,
			thresholdReached,
		],
	);

	return rows[0];
}

async function getResourceProgressForStudent(resourceId, studentId) {
	const { rows } = await pool.query(
		`SELECT *
		 FROM resource_view_progress
		 WHERE resource_id = $1
		   AND student_id = $2`,
		[resourceId, studentId],
	);

	return rows[0] || null;
}

async function createAttendanceEventIfMissing({
	resourceId,
	classId,
	studentId,
	attendanceDate,
	progressPercent,
}) {
	const { rows } = await pool.query(
		`INSERT INTO resource_attendance_events (
			class_id,
			resource_id,
			student_id,
			attendance_date,
			progress_percent
		)
		VALUES ($1, $2, $3, $4, $5)
		ON CONFLICT (class_id, student_id, attendance_date)
		DO NOTHING
		RETURNING *`,
		[classId, resourceId, studentId, attendanceDate, progressPercent],
	);

	return rows[0] || null;
}

async function getResourceProgressSummary(resourceId, classId) {
	const { rows } = await pool.query(
		`SELECT
			COUNT(*)::int AS tracked_students,
			COUNT(*) FILTER (WHERE threshold_25_reached = true)::int AS threshold_students,
			COALESCE(AVG(progress_percent), 0)::numeric(5,2) AS avg_progress_percent,
			COALESCE(MAX(progress_percent), 0)::numeric(5,2) AS max_progress_percent
		 FROM resource_view_progress
		 WHERE resource_id = $1
		   AND class_id = $2`,
		[resourceId, classId],
	);

	return rows[0] || {
		tracked_students: 0,
		threshold_students: 0,
		avg_progress_percent: 0,
		max_progress_percent: 0,
	};
}

module.exports = {
	upsertResourceProgress,
	getResourceProgressForStudent,
	createAttendanceEventIfMissing,
	getResourceProgressSummary,
};
