const DAY_ORDER = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
];

const DAY_MAP = {
  mon: 'Monday',
  tue: 'Tuesday',
  wed: 'Wednesday',
  thu: 'Thursday',
  fri: 'Friday',
  sat: 'Saturday',
  sun: 'Sunday',
  monday: 'Monday',
  tuesday: 'Tuesday',
  wednesday: 'Wednesday',
  thursday: 'Thursday',
  friday: 'Friday',
  saturday: 'Saturday',
  sunday: 'Sunday',
};

function normalizeTime(value) {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  const short = /^(\d{1,2}):(\d{2})$/.exec(trimmed);
  if (short) {
    const hour = Number(short[1]);
    const minute = Number(short[2]);
    if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;
    return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
  }
  const long = /^(\d{2}:\d{2}):\d{2}$/.exec(trimmed);
  if (long) return long[1];
  return null;
}

function normalizeDay(value) {
  if (typeof value !== 'string') return null;
  return DAY_MAP[value.trim().toLowerCase()] || null;
}

function nextDateForDay(day) {
  const today = new Date();
  const target = DAY_ORDER.indexOf(day);
  if (target === -1) return new Date(today);
  const jsTarget = target + 1;
  const jsToday = today.getDay();
  const diff = (jsTarget - jsToday + 7) % 7;
  const next = new Date(today);
  next.setDate(today.getDate() + diff);
  return next;
}

function toIcsLocalDate(dateObj, time) {
  const [h, m] = String(time || '00:00').split(':').map(Number);
  const date = new Date(
    dateObj.getFullYear(),
    dateObj.getMonth(),
    dateObj.getDate(),
    h || 0,
    m || 0,
    0,
    0,
  );
  const yyyy = String(date.getFullYear());
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  const hh = String(date.getHours()).padStart(2, '0');
  const min = String(date.getMinutes()).padStart(2, '0');
  return `${yyyy}${mm}${dd}T${hh}${min}00`;
}

function toUtcCalendarDate(dateObj, time) {
  const [h, m] = String(time || '00:00').split(':').map(Number);
  const date = new Date(
    dateObj.getFullYear(),
    dateObj.getMonth(),
    dateObj.getDate(),
    h || 0,
    m || 0,
    0,
    0,
  );
  return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
}

export function formatTimeRange(startTime, endTime) {
  const start = normalizeTime(startTime);
  const end = normalizeTime(endTime);
  if (!start || !end) return '-';
  return `${start} - ${end}`;
}

export function getScheduleBlocksFromClass(classItem) {
  if (!classItem) return [];

  let blocks = [];
  if (Array.isArray(classItem.schedule_blocks)) {
    blocks = classItem.schedule_blocks
      .map((entry) => {
        const day = normalizeDay(entry?.day);
        const start_time = normalizeTime(entry?.start_time);
        const end_time = normalizeTime(entry?.end_time);
        if (!day || !start_time || !end_time || start_time >= end_time) return null;
        return { day, start_time, end_time };
      })
      .filter(Boolean);
  }

  if (!blocks.length) {
    const start_time = normalizeTime(classItem.start_time);
    const end_time = normalizeTime(classItem.end_time);
    if (start_time && end_time && start_time < end_time) {
      const days = String(classItem.schedule_days || '')
        .split(',')
        .map((part) => normalizeDay(part))
        .filter(Boolean);
      blocks = days.map((day) => ({ day, start_time, end_time }));
    }
  }

  return blocks.sort((a, b) => {
    const dayDiff = DAY_ORDER.indexOf(a.day) - DAY_ORDER.indexOf(b.day);
    if (dayDiff !== 0) return dayDiff;
    return a.start_time.localeCompare(b.start_time);
  });
}

export function buildCalendarEvents(classes = []) {
  const events = [];
  for (const classItem of classes) {
    const classId = classItem.class_id || classItem.id;
    const blocks = getScheduleBlocksFromClass(classItem);

    blocks.forEach((block, index) => {
      events.push({
        id: `${classId}-${block.day}-${block.start_time}-${index}`,
        classId,
        title: classItem.class_name,
        subject: classItem.subject || '',
        day: block.day,
        dayIndex: DAY_ORDER.indexOf(block.day),
        start_time: block.start_time,
        end_time: block.end_time,
        room_number: classItem.room_number || '',
        teacher_name: classItem.teacher_name || '',
        meeting_link: classItem.meeting_link || '',
        description: classItem.description || '',
        schedule_timezone: classItem.schedule_timezone || 'UTC',
      });
    });
  }

  return events.sort((a, b) => {
    const dayDiff = a.dayIndex - b.dayIndex;
    if (dayDiff !== 0) return dayDiff;
    return a.start_time.localeCompare(b.start_time);
  });
}

export function groupEventsByDay(events = []) {
  const grouped = DAY_ORDER.reduce((acc, day) => {
    acc[day] = [];
    return acc;
  }, {});

  for (const event of events) {
    if (!grouped[event.day]) grouped[event.day] = [];
    grouped[event.day].push(event);
  }

  return grouped;
}

export function buildGoogleCalendarDraftUrl(event) {
  const targetDate = nextDateForDay(event.day);
  const start = toUtcCalendarDate(targetDate, event.start_time);
  const end = toUtcCalendarDate(targetDate, event.end_time);
  const text = encodeURIComponent(`${event.title}${event.subject ? ` - ${event.subject}` : ''}`);
  const details = encodeURIComponent(
    `${event.description || ''}${event.meeting_link ? `\nMeeting Link: ${event.meeting_link}` : ''}`,
  );
  const location = encodeURIComponent(event.room_number || event.meeting_link || '');
  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${text}&dates=${start}/${end}&details=${details}&location=${location}`;
}

export function downloadIcsForEvents(events = [], fileName = 'class-schedule.ics') {
  if (!Array.isArray(events) || events.length === 0) return;

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Mizuka Portal//Class Schedule//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
  ];

  for (const event of events) {
    const targetDate = nextDateForDay(event.day);
    const dtStart = toIcsLocalDate(targetDate, event.start_time);
    const dtEnd = toIcsLocalDate(targetDate, event.end_time);
    const uid = `${event.id}@mizuka-portal`;
    const summary = `${event.title}${event.subject ? ` - ${event.subject}` : ''}`;
    const description = `${event.description || ''}${event.meeting_link ? `\\nMeeting Link: ${event.meeting_link}` : ''}`;
    const location = event.room_number || event.meeting_link || '';

    lines.push('BEGIN:VEVENT');
    lines.push(`UID:${uid}`);
    lines.push(`DTSTAMP:${toUtcCalendarDate(new Date(), '00:00')}`);
    lines.push(`DTSTART:${dtStart}`);
    lines.push(`DTEND:${dtEnd}`);
    lines.push('RRULE:FREQ=WEEKLY;COUNT=20');
    lines.push(`SUMMARY:${summary}`);
    lines.push(`DESCRIPTION:${description}`);
    lines.push(`LOCATION:${location}`);
    lines.push('END:VEVENT');
  }

  lines.push('END:VCALENDAR');

  const blob = new Blob([lines.join('\r\n')], { type: 'text/calendar;charset=utf-8' });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}

export { DAY_ORDER };
