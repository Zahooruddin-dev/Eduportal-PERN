const pool = require('./Pool');

async function registerQuery(
	username,
	email,
	password_hash,
	role = 'student',
	institute_id = null,
) {
	const { rows } = await pool.query(
		`
		INSERT INTO users (username,email,password_hash,role,institute_id)
		VALUES (
			$1,
			$2,
			$3,
			$4,
			COALESCE($5, (SELECT id FROM institutes ORDER BY created_at ASC LIMIT 1))
		)
		RETURNING id, username, email, role, profile_pic, created_at, institute_id`,
		[username, email, password_hash, role, institute_id],
	);
	return rows[0];
}
async function updateUsername(id, username, profilePic) {
	const query = profilePic
		? `UPDATE users SET username = $1 ,profile_pic = $2 WHERE id = $3 RETURNING * ` // If Profile picture exits in update username request this query would be used
		: `UPDATE users SET username = $1 WHERE id =$2 RETURNING *`; // If it doesn't exist  that this query would be run
	const params = profilePic ? [username, profilePic, id] : [username, id];
	const { rows } = await pool.query(query, params);
	return rows[0];
}

async function updatePasswordQuery(userId, newPasswordHash) {
	const { rows } = await pool.query(
		`UPDATE users SET password_hash = $1 WHERE id = $2 RETURNING id`,
		[newPasswordHash, userId],
	);
	return rows[0] || null;
}

async function deleteUserQuery(email) {
	const { rows } = await pool.query(
		'DELETE FROM users WHERE email = $1 RETURNING id',
		[email],
	);
	return rows[0] || null;
}

async function deleteUserByIdQuery(userId) {
	const { rows } = await pool.query(
		'DELETE FROM users WHERE id = $1 RETURNING id',
		[userId],
	);
	return rows[0] || null;
}
async function getUserByEmail(email) {
	const { rows } = await pool.query('SELECT * FROM users WHERE email =$1', [
		email,
	]);
	return rows[0] || null;
}

async function saveResetCode(email, code, expires) {
	await pool.query('DELETE FROM password_resets WHERE email =$1', [email]);

	const query = `INSERT INTO  password_resets (email,code,expires_at)
  VALUES ($1,$2,$3)`;

	await pool.query(query, [email, code, expires]);
}

async function verifyResetCode(email, code) {
	const query = `
    SELECT * FROM password_resets 
    WHERE email = $1 AND code = $2 AND expires_at > NOW()
  `;
	const { rows } = await pool.query(query, [email, code]);
	return rows[0] || null;
}
async function deleteResetCode(email) {
	await pool.query('DELETE FROM password_resets WHERE email =$1', [email]);
}
async function updateUserPassword(email, hashedPassword) {
	await pool.query('UPDATE users SET password_hash = $1 WHERE email = $2', [
		hashedPassword,
		email,
	]);
}
module.exports = {
	registerQuery,
	updateUsername,
	deleteUserQuery,
	deleteUserByIdQuery,
	getUserByEmail,
	updatePasswordQuery,
	verifyResetCode,
	deleteResetCode,
	saveResetCode,
	updateUserPassword,
};
