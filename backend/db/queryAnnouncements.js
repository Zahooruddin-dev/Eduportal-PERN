const pool = require('./Pool');

async function createAnnouncementQuery(classId, teacherId, title, content, expiresAt) {
  const { rows } = await pool.query(
    `INSERT INTO announcements (class_id, teacher_id, title, content, expires_at)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [classId, teacherId, title, content, expiresAt ?? null]
  );
  return rows[0];
}

async function getAnnouncementsByClassQuery(classId) {
  const { rows } = await pool.query(
    `SELECT a.*, u.username AS teacher_name
     FROM announcements a
     JOIN users u ON a.teacher_id = u.id
     WHERE a.class_id = $1
       AND (a.expires_at IS NULL OR a.expires_at > NOW())
     ORDER BY a.created_at DESC`,
    [classId]
  );
  return rows;
}

async function getAnnouncementByIdQuery(announcementId) {
  const { rows } = await pool.query(
    `SELECT a.*, u.username AS teacher_name, c.class_name
     FROM announcements a
     JOIN users u ON a.teacher_id = u.id
     JOIN classes c ON a.class_id = c.id
     WHERE a.id = $1
       AND (a.expires_at IS NULL OR a.expires_at > NOW())`,
    [announcementId]
  );
  return rows[0] ?? null;
}

async function getAnnouncementsForStudentQuery(studentId) {
  const { rows } = await pool.query(
    `SELECT a.*, u.username AS teacher_name, c.class_name
     FROM announcements a
     JOIN users u ON a.teacher_id = u.id
     JOIN classes c ON a.class_id = c.id
     JOIN enrollments e ON e.class_id = a.class_id
     WHERE e.student_id = $1
       AND (a.expires_at IS NULL OR a.expires_at > NOW())
     ORDER BY a.created_at DESC`,
    [studentId]
  );
  return rows;
}
async function deleteAnnouncementQuery(announcementId, teacherId) {
  const { rowCount } = await pool.query(
    `DELETE FROM announcements
     WHERE id = $1 AND teacher_id = $2`,
    [announcementId, teacherId]
  );
  return rowCount;
}

async function createAdminAnnouncementQuery({
  instituteId,
  createdBy,
  title,
  content,
  audienceScope,
  expiresAt,
}) {
  const { rows } = await pool.query(
    `INSERT INTO admin_announcements (
      institute_id,
      created_by,
      title,
      content,
      audience_scope,
      expires_at
    )
    VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING *`,
    [instituteId, createdBy, title, content, audienceScope, expiresAt ?? null]
  );
  return rows[0];
}

async function listAdminAnnouncementsForInstituteQuery(instituteId) {
  const { rows } = await pool.query(
    `SELECT
      aa.*,
      creator.username AS created_by_username,
      COALESCE(reads.total_reads, 0)::int AS total_reads,
      (aa.expires_at IS NOT NULL AND aa.expires_at <= NOW()) AS is_expired
    FROM admin_announcements aa
    JOIN users creator ON creator.id = aa.created_by
    LEFT JOIN (
      SELECT announcement_id, COUNT(*) AS total_reads
      FROM admin_announcement_reads
      GROUP BY announcement_id
    ) reads ON reads.announcement_id = aa.id
    WHERE aa.institute_id = $1
    ORDER BY aa.created_at DESC`,
    [instituteId]
  );
  return rows;
}

async function deleteAdminAnnouncementQuery({ announcementId, instituteId }) {
  const { rows } = await pool.query(
    `DELETE FROM admin_announcements
     WHERE id = $1
       AND institute_id = $2
     RETURNING id`,
    [announcementId, instituteId]
  );
  return rows[0] || null;
}

async function getUserAdminAnnouncementsQuery({
  userId,
  instituteId,
  audienceScopes,
  includeRead = true,
}) {
  const { rows } = await pool.query(
    `SELECT
      aa.id,
      aa.title,
      aa.content,
      aa.audience_scope,
      aa.created_at,
      aa.expires_at,
      creator.username AS created_by_username,
      (reads.user_id IS NOT NULL) AS is_read,
      reads.read_at
    FROM admin_announcements aa
    JOIN users creator ON creator.id = aa.created_by
    LEFT JOIN admin_announcement_reads reads
      ON reads.announcement_id = aa.id
      AND reads.user_id = $1
    WHERE aa.institute_id = $2
      AND aa.audience_scope = ANY($3::text[])
      AND (aa.expires_at IS NULL OR aa.expires_at > NOW())
      AND ($4::boolean OR reads.user_id IS NULL)
    ORDER BY aa.created_at DESC`,
    [userId, instituteId, audienceScopes, includeRead]
  );
  return rows;
}

async function markAdminAnnouncementReadQuery({
  announcementId,
  userId,
  instituteId,
  audienceScopes,
}) {
  const { rows } = await pool.query(
    `INSERT INTO admin_announcement_reads (announcement_id, user_id, read_at)
     SELECT aa.id, $2, NOW()
     FROM admin_announcements aa
     WHERE aa.id = $1
       AND aa.institute_id = $3
       AND aa.audience_scope = ANY($4::text[])
       AND (aa.expires_at IS NULL OR aa.expires_at > NOW())
     ON CONFLICT (announcement_id, user_id)
     DO UPDATE SET read_at = EXCLUDED.read_at
     RETURNING announcement_id, user_id, read_at`,
    [announcementId, userId, instituteId, audienceScopes]
  );
  return rows[0] || null;
}

async function markAllAdminAnnouncementsReadQuery({
  userId,
  instituteId,
  audienceScopes,
}) {
  const { rowCount } = await pool.query(
    `INSERT INTO admin_announcement_reads (announcement_id, user_id, read_at)
     SELECT aa.id, $1, NOW()
     FROM admin_announcements aa
     LEFT JOIN admin_announcement_reads reads
       ON reads.announcement_id = aa.id
       AND reads.user_id = $1
     WHERE aa.institute_id = $2
       AND aa.audience_scope = ANY($3::text[])
       AND (aa.expires_at IS NULL OR aa.expires_at > NOW())
       AND reads.user_id IS NULL
     ON CONFLICT (announcement_id, user_id) DO NOTHING`,
    [userId, instituteId, audienceScopes]
  );
  return rowCount;
}

async function getUnreadAdminAnnouncementSummaryQuery({
  userId,
  instituteId,
  audienceScopes,
  limit = 5,
}) {
  const countResult = await pool.query(
    `SELECT COUNT(*)::int AS unread_count
     FROM admin_announcements aa
     LEFT JOIN admin_announcement_reads reads
       ON reads.announcement_id = aa.id
       AND reads.user_id = $1
     WHERE aa.institute_id = $2
       AND aa.audience_scope = ANY($3::text[])
       AND (aa.expires_at IS NULL OR aa.expires_at > NOW())
       AND reads.user_id IS NULL`,
    [userId, instituteId, audienceScopes]
  );

  const itemsResult = await pool.query(
    `SELECT
      aa.id,
      aa.title,
      aa.content,
      aa.audience_scope,
      aa.created_at,
      aa.expires_at,
      creator.username AS created_by_username
     FROM admin_announcements aa
     JOIN users creator ON creator.id = aa.created_by
     LEFT JOIN admin_announcement_reads reads
       ON reads.announcement_id = aa.id
       AND reads.user_id = $1
     WHERE aa.institute_id = $2
       AND aa.audience_scope = ANY($3::text[])
       AND (aa.expires_at IS NULL OR aa.expires_at > NOW())
       AND reads.user_id IS NULL
     ORDER BY aa.created_at DESC
     LIMIT $4`,
    [userId, instituteId, audienceScopes, limit]
  );

  return {
    unreadCount: countResult.rows[0]?.unread_count || 0,
    items: itemsResult.rows,
  };
}

module.exports = {
  createAnnouncementQuery,
  getAnnouncementsByClassQuery,
  getAnnouncementByIdQuery,
  getAnnouncementsForStudentQuery,
  deleteAnnouncementQuery,
  createAdminAnnouncementQuery,
  listAdminAnnouncementsForInstituteQuery,
  deleteAdminAnnouncementQuery,
  getUserAdminAnnouncementsQuery,
  markAdminAnnouncementReadQuery,
  markAllAdminAnnouncementsReadQuery,
  getUnreadAdminAnnouncementSummaryQuery,
};