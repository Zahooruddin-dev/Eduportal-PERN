const pool = require('./Pool');

async function getAllClassesQuery(instituteId) {
	const { rows } = await pool.query(
		`SELECT c.*, u.username AS teacher_name, u.profile_pic AS teacher_profile_pic
		 FROM classes c
		 LEFT JOIN users u ON u.id = c.teacher_id
		 WHERE c.institute_id = $1
		 ORDER BY c.class_name ASC`,
		[instituteId],
	);
	return rows;
}

async function CreateNewClassQuery(data) {
	const {
		class_name,
		schedule_days,
		start_time,
		end_time,
		schedule_blocks,
		room_number,
		grade_level,
		subject,
		description,
		max_students,
		meeting_link,
		schedule_timezone,
		teacher_id,
	} = data;
	const { rows } = await pool.query(
		`INSERT INTO classes (
	      class_name, schedule_days, start_time, end_time, room_number,
	      grade_level, subject, description, max_students, teacher_id,
	      institute_id, schedule_blocks, meeting_link, schedule_timezone
	    ) VALUES (
			$1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
			(SELECT institute_id FROM users WHERE id = $10),
			$11::jsonb, $12, $13
		)
    RETURNING *`,
		[
			class_name,
			schedule_days,
			start_time,
			end_time,
			room_number,
			grade_level,
			subject,
			description,
			max_students,
			teacher_id,
			JSON.stringify(schedule_blocks || []),
			meeting_link || null,
			schedule_timezone || 'UTC',
		],
	);
	return rows[0];
}

async function updateClassQuery(data) {
	const {
		class_name,
		schedule_days,
		start_time,
		end_time,
		schedule_blocks,
		room_number,
		grade_level,
		subject,
		description,
		max_students,
		meeting_link,
		schedule_timezone,
		id,
		teacher_id,
	} = data;
	const { rows } = await pool.query(
		`UPDATE classes SET
      class_name = $1,
      schedule_days = $2,
      start_time = $3,
      end_time = $4,
      room_number = $5,
      grade_level = $6,
      subject = $7,
      description = $8,
	      max_students = $9,
	      schedule_blocks = $10::jsonb,
	      meeting_link = $11,
	      schedule_timezone = $12
	    WHERE id = $13 AND teacher_id = $14
    RETURNING *`,
		[
			class_name,
			schedule_days,
			start_time,
			end_time,
			room_number,
			grade_level,
			subject,
			description,
			max_students,
			JSON.stringify(schedule_blocks || []),
			meeting_link || null,
			schedule_timezone || 'UTC',
			id,
			teacher_id,
		],
	);
	return rows[0];
}

async function queryEditClassQuery(id, data) {
	const { class_name, meeting_link, schedule_blocks } = data;
	const { rows } = await pool.query(
		`
    UPDATE classes
    SET class_name = COALESCE($1, class_name),
		meeting_link = COALESCE($2, meeting_link),
		schedule_blocks = COALESCE($3::jsonb, schedule_blocks)
	WHERE id = $4
    RETURNING *
    `,
		[class_name || null, meeting_link || null, schedule_blocks ? JSON.stringify(schedule_blocks) : null, id],
	);
	return rows[0];
}

async function getClassByIdQuery(id) {
	const { rows } = await pool.query(
		`SELECT c.*, u.username AS teacher_name
		 FROM classes c
		 LEFT JOIN users u ON u.id = c.teacher_id
		 WHERE c.id = $1`,
		[id],
	);
	return rows[0];
}

async function deleteClassByIdQuery(id) {
	await pool.query('DELETE FROM classes WHERE id = $1', [id]);
}

async function getClassesByTeacherIdQuery(teacherId) {
	const { rows } = await pool.query(
		`SELECT c.*, u.username AS teacher_name
		 FROM classes c
		 LEFT JOIN users u ON u.id = c.teacher_id
		 WHERE c.teacher_id = $1
		 ORDER BY c.class_name ASC`,
		[teacherId],
	);
	return rows;
}

module.exports = {
	getAllClassesQuery,
	CreateNewClassQuery,
	deleteClassByIdQuery,
	getClassByIdQuery,
	queryEditClassQuery,
	getClassesByTeacherIdQuery,
	updateClassQuery,
};
