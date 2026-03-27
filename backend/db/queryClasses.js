const pool = require('./Pool');

async function getAllClassesQuery() {
	const { rows } = await pool.query(`SELECT * FROM classes;`);
	return rows;
}
async function CreateNewClassQuery(data) {
	const {
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
	} = data;
	const { rows } = await pool.query(
		`INSERT INTO classes (
      class_name, schedule_days, start_time, end_time, room_number,
      grade_level, subject, description, max_students, teacher_id
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
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
		room_number,
		grade_level,
		subject,
		description,
		max_students,
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
      max_students = $9
    WHERE id = $10 AND teacher_id = $11
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
			id,
			teacher_id,
		],
	);
	return rows[0];
}
async function queryEditClassQuery(id, data) {
	const { class_name, time_in_pakistan } = data;
	const { rows } = await pool.query(
		`
    UPDATE classes
    SET class_name = $1, time_in_pakistan = $2
    WHERE id = $3
    RETURNING *
    `,
		[class_name, time_in_pakistan, id],
	);
	return rows[0];
}
async function getClassByIdQuery(id) {
	const { rows } = await pool.query('SELECT * FROM classes WHERE id = $1', [
		id,
	]);
	return rows[0];
}
async function deleteClassByIdQuery(id) {
	await pool.query('DELETE FROM classes WHERE id = $1', [id]);
}
async function getClassesByTeacherIdQuery(teacherId) {
	const { rows } = await pool.query(
		'SELECT * FROM classes WHERE teacher_id = $1 ORDER BY id DESC',
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
