const db = require('../db/queryClasses');

async function getClasses(req, res) {
	try {
		const classes = await db.getAllClassesQuery();
		res.json(classes);
	} catch {
		res.status(500).json({ message: 'Internal server error' });
	}
}
async function createClasses(req, res) {
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
	} = req.body;
	const teacher_id = req.user.id;

	try {
		const newClass = await db.CreateNewClassQuery({
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
		});
		res.status(201).json(newClass);
	} catch (err) {
		console.error(err); // log for debugging
		res.status(500).json({ error: err.message });
	}
}

async function updateClass(req, res) {
	const { id } = req.params;
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
	} = req.body;
	const teacher_id = req.user.id;

	try {
		const updated = await db.updateClassQuery({
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
		});

		if (!updated) {
			return res
				.status(404)
				.json({ error: 'Class not found or unauthorized.' });
		}
		res.json(updated);
	} catch (err) {
		console.error(err);
		res.status(500).json({ error: err.message });
	}
}
async function deleteClass(req, res) {
	const { id } = req.params;
	try {
		await db.deleteClassByIdQuery(id);
		res.status(200).json({ message: 'Class deleted successfully' });
	} catch (err) {
		res.status(500).json({ error: err.message });
	}
}
async function getSpecificClass(req, res) {
	const { id } = req.params;
	try {
		const subjectClass = await db.getClassByIdQuery(id);
		if (!subjectClass)
			return res.status(404).json({ error: 'Class not found' });
		res.status(200).json(subjectClass);
	} catch (err) {
		res.status(500).json({ error: err.message });
	}
}
async function editSpecificClass(req, res) {
	const { id } = req.params;
	try {
		const existingClass = await db.getClassByIdQuery(id);

		if (existingClass.teacher_id !== req.user.id) {
			return res
				.status(403)
				.json({ error: "You don't have permission to edit this class" });
		}

		const subjectClass = await db.queryEditClassQuery(id, req.body);
		res.status(200).json(subjectClass);
	} catch (err) {
		res.status(500).json({ error: err.message });
	}
}
async function getMyClasses(req, res) {
	try {
		const classes = await db.getClassesByTeacherIdQuery(req.user.id);
		res.status(200).json(classes);
	} catch (err) {
		res.status(500).json({ error: err.message });
	}
}
module.exports = {
	getClasses,
	createClasses,
	deleteClass,
	getSpecificClass,
	editSpecificClass,
	getMyClasses,
	updateClass,
};
