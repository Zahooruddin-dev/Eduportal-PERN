const pool = require('./Pool');

async function registerQuery(
	username,
	email,
	password_hash,
	role = 'student',
	institute_id = null,
	parentProfile = null,
) {
	const client = await pool.connect();
	try {
		await client.query('BEGIN');
		const { rows } = await client.query(
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

		const user = rows[0];

		if (role === 'parent') {
			await client.query(
				`INSERT INTO parent_profiles (
					user_id,
					child_full_name,
					child_grade,
					relationship_to_child,
					parent_phone,
					alternate_phone,
					address,
					notes
				)
				VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
				[
					user.id,
					parentProfile?.childFullName,
					parentProfile?.childGrade,
					parentProfile?.relationshipToChild,
					parentProfile?.parentPhone,
					parentProfile?.alternatePhone || null,
					parentProfile?.address || null,
					parentProfile?.notes || null,
				],
			);
		}

		await client.query('COMMIT');
		return user;
	} catch (error) {
		await client.query('ROLLBACK');
		throw error;
	} finally {
		client.release();
	}
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

async function getParentProfileByUserId(userId) {
	const { rows } = await pool.query(
		`SELECT
			user_id,
			child_full_name,
			child_grade,
			relationship_to_child,
			parent_phone,
			alternate_phone,
			address,
			notes,
			created_at,
			updated_at
		 FROM parent_profiles
		 WHERE user_id = $1`,
		[userId],
	);
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
	getParentProfileByUserId,
};
