import { dbQuery } from "../db/db.js"; 

export const markBulkAttendance = async (req, res) => {
    const { classId, attendanceData } = req.body; 
    // attendanceData format: [{ studentId: 1, status: 'present' }, ...]
    // Get YYYY-MM-DD format for Postgres DATE type
    const today = new Date().toISOString().split('T')[0];

    try {
        const queries = attendanceData.map((record) => {
            return db.query(
                `INSERT INTO attendance (class_id, student_id, status, date) 
                 VALUES ($1, $2, $3, $4) 
                 ON CONFLICT (student_id, class_id, date) 
                 DO UPDATE SET status = EXCLUDED.status`,
                [classId, record.studentId, record.status, today]
            );
        });

        await Promise.all(queries);
        
        res.status(200).json({ 
            success: true, 
            message: `Attendance updated for ${attendanceData.length} students.` 
        });
    } catch (error) {
        console.error("Attendance Error:", error);
        res.status(500).json({ success: false, error: "Database update failed." });
    }
};

export const getClassAttendance = async (req, res) => {
    const { classId } = req.params;
    const today = new Date().toISOString().split('T')[0];

    try {
        const result = await db.query(
            `SELECT student_id, status FROM attendance WHERE class_id = $1 AND date = $2`,
            [classId, today]
        );
        res.status(200).json(result.rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};