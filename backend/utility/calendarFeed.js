const DAY_CODE_MAP = {
	MONDAY: 'MO',
	TUESDAY: 'TU',
	WEDNESDAY: 'WE',
	THURSDAY: 'TH',
	FRIDAY: 'FR',
	SATURDAY: 'SA',
	SUNDAY: 'SU',
};

const DAY_INDEX_MAP = {
	SU: 0,
	MO: 1,
	TU: 2,
	WE: 3,
	TH: 4,
	FR: 5,
	SA: 6,
};

const DAY_LABEL_MAP = {
	MO: 'Monday',
	TU: 'Tuesday',
	WE: 'Wednesday',
	TH: 'Thursday',
	FR: 'Friday',
	SA: 'Saturday',
	SU: 'Sunday',
};

function pad(value) {
	return String(value).padStart(2, '0');
}

function parseDateOnly(value) {
	if (!value) return null;
	if (value instanceof Date) {
		return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()));
	}
	const str = String(value).slice(0, 10);
	if (!/^\d{4}-\d{2}-\d{2}$/.test(str)) return null;
	const [year, month, day] = str.split('-').map(Number);
	return new Date(Date.UTC(year, month - 1, day));
}

function formatDateOnly(value) {
	const date = parseDateOnly(value);
	if (!date) return null;
	return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;
}

function formatIcsDate(value) {
	const date = parseDateOnly(value);
	if (!date) return null;
	return `${date.getUTCFullYear()}${pad(date.getUTCMonth() + 1)}${pad(date.getUTCDate())}`;
}

function formatUtcDateTime(value) {
	const date = value instanceof Date ? value : new Date(value);
	if (Number.isNaN(date.getTime())) return null;
	return `${date.getUTCFullYear()}${pad(date.getUTCMonth() + 1)}${pad(date.getUTCDate())}T${pad(date.getUTCHours())}${pad(date.getUTCMinutes())}${pad(date.getUTCSeconds())}Z`;
}

function normalizeTimeValue(value, fallback) {
	const source = String(value || fallback || '').trim();
	const match = source.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
	if (!match) return fallback;
	const hours = Number(match[1]);
	const minutes = Number(match[2]);
	if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return fallback;
	return `${pad(hours)}:${pad(minutes)}`;
}

function normalizeDayValue(day) {
	if (!day) return null;
	const key = String(day).trim().toUpperCase();
	if (DAY_CODE_MAP[key]) return DAY_CODE_MAP[key];
	const three = key.slice(0, 3);
	const lookup = {
		MON: 'MO',
		TUE: 'TU',
		WED: 'WE',
		THU: 'TH',
		FRI: 'FR',
		SAT: 'SA',
		SUN: 'SU',
	};
	return lookup[three] || null;
}

function addDays(date, days) {
	const next = new Date(date.getTime());
	next.setUTCDate(next.getUTCDate() + days);
	return next;
}

function eachDateInRange(startsOn, endsOn) {
	const start = parseDateOnly(startsOn);
	const end = parseDateOnly(endsOn);
	if (!start || !end || start > end) return [];
	const values = [];
	let cursor = start;
	while (cursor <= end) {
		values.push(formatDateOnly(cursor));
		cursor = addDays(cursor, 1);
	}
	return values;
}

function firstDateForDay(termStartDate, dayCode) {
	const startDay = termStartDate.getUTCDay();
	const targetDay = DAY_INDEX_MAP[dayCode];
	if (targetDay === undefined) return null;
	const delta = (targetDay - startDay + 7) % 7;
	return addDays(termStartDate, delta);
}

function sanitizeTimezone(timezone) {
	if (!timezone) return 'UTC';
	const valid = String(timezone).trim();
	if (!valid) return 'UTC';
	if (!/^[A-Za-z_\/+-]+$/.test(valid)) return 'UTC';
	return valid;
}

function formatLocalDateTimeForIcs(dateValue, timeValue) {
	const date = formatIcsDate(dateValue);
	const time = normalizeTimeValue(timeValue, '00:00');
	if (!date || !time) return null;
	const [hours, minutes] = time.split(':');
	return `${date}T${hours}${minutes}00`;
}

function escapeIcs(value) {
	if (value === null || value === undefined) return '';
	return String(value)
		.replace(/\\/g, '\\\\')
		.replace(/\n/g, '\\n')
		.replace(/\r/g, '')
		.replace(/,/g, '\\,')
		.replace(/;/g, '\\;');
}

function normalizeScheduleBlocks(item) {
	if (Array.isArray(item.schedule_blocks) && item.schedule_blocks.length > 0) {
		return item.schedule_blocks
			.map((block) => ({
				dayCode: normalizeDayValue(block.day),
				startTime: normalizeTimeValue(block.start, null),
				endTime: normalizeTimeValue(block.end, null),
			}))
			.filter((block) => block.dayCode && block.startTime && block.endTime);
	}

	if (Array.isArray(item.schedule_days) && item.start_time && item.end_time) {
		const start = normalizeTimeValue(item.start_time, null);
		const end = normalizeTimeValue(item.end_time, null);
		if (!start || !end) return [];
		return item.schedule_days
			.map((day) => ({
				dayCode: normalizeDayValue(day),
				startTime: start,
				endTime: end,
			}))
			.filter((block) => block.dayCode);
	}

	return [];
}

function buildInstructionalExceptionMap(exceptions) {
	const byClass = new Map();
	const instituteWide = [];
	for (const exception of exceptions || []) {
		if (!exception.blocks_instruction) continue;
		const allDates = eachDateInRange(exception.starts_on, exception.ends_on);
		if (allDates.length === 0) continue;
		if (exception.class_id) {
			const existing = byClass.get(exception.class_id) || [];
			existing.push(...allDates);
			byClass.set(exception.class_id, existing);
		} else {
			instituteWide.push(...allDates);
		}
	}
	return { byClass, instituteWide };
}

function dedupe(values) {
	return [...new Set(values)];
}

function buildClassSessionEvents({ classes, term, exceptions }) {
	if (!Array.isArray(classes) || classes.length === 0) return [];
	const termStart = parseDateOnly(term?.starts_on || new Date());
	const termEnd = parseDateOnly(term?.ends_on || addDays(new Date(), 120));
	if (!termStart || !termEnd || termStart > termEnd) return [];

	const exceptionMap = buildInstructionalExceptionMap(exceptions || []);
	const termUntil = `${formatIcsDate(termEnd)}T235959Z`;
	const events = [];

	for (const klass of classes) {
		const timezone = sanitizeTimezone(klass.schedule_timezone || 'UTC');
		const blocks = normalizeScheduleBlocks(klass);
		if (blocks.length === 0) continue;
		const classExceptionDates = dedupe([
			...(exceptionMap.instituteWide || []),
			...(exceptionMap.byClass.get(klass.class_id) || []),
		]);

		for (const block of blocks) {
			const first = firstDateForDay(termStart, block.dayCode);
			if (!first || first > termEnd) continue;
			const exDates = classExceptionDates
				.filter((dateValue) => {
					const dateObj = parseDateOnly(dateValue);
					if (!dateObj) return false;
					if (dateObj < first || dateObj > termEnd) return false;
					return dateObj.getUTCDay() === DAY_INDEX_MAP[block.dayCode];
				})
				.map((dateValue) => formatLocalDateTimeForIcs(dateValue, block.startTime))
				.filter(Boolean);

			events.push({
				id: `class-${klass.class_id}-${block.dayCode}-${block.startTime.replace(':', '')}`,
				type: 'class_session',
				title: `${klass.class_name}${klass.subject ? ` - ${klass.subject}` : ''}`,
				description: `${klass.description || ''}${klass.teacher_name ? `\nTeacher: ${klass.teacher_name}` : ''}${klass.meeting_link ? `\nMeeting Link: ${klass.meeting_link}` : ''}`.trim(),
				location: klass.room_number || klass.meeting_link || '',
				timezone,
				allDay: false,
				dayCode: block.dayCode,
				day: DAY_LABEL_MAP[block.dayCode] || null,
				start_time: block.startTime,
				end_time: block.endTime,
				startDate: formatDateOnly(first),
				startTime: block.startTime,
				endDate: formatDateOnly(first),
				endTime: block.endTime,
				recurrenceRule: `FREQ=WEEKLY;BYDAY=${block.dayCode};UNTIL=${termUntil}`,
				exDates,
				classId: klass.class_id,
				className: klass.class_name,
				subject: klass.subject,
				room_number: klass.room_number || '',
				teacher_name: klass.teacher_name || '',
				meeting_link: klass.meeting_link || '',
				schedule_timezone: timezone,
			});
		}
	}

	return events;
}

function buildDeadlineEvents(assignments) {
	if (!Array.isArray(assignments) || assignments.length === 0) return [];
	const events = [];

	for (const item of assignments) {
		if (!item.due_at && !item.due_date) continue;
		const titleType = item.type ? String(item.type).toUpperCase() : 'TASK';
		const timezone = sanitizeTimezone(item.schedule_timezone || 'UTC');

		if (item.due_at) {
			const dueAt = new Date(item.due_at);
			if (Number.isNaN(dueAt.getTime())) continue;
			const startAt = new Date(dueAt.getTime() - 30 * 60 * 1000);
			events.push({
				id: `deadline-${item.assignment_id}`,
				type: 'deadline',
				title: `[${titleType}] ${item.title}`,
				description: `${item.class_name}${item.subject ? ` - ${item.subject}` : ''}`,
				location: '',
				timezone,
				allDay: false,
				startUtc: startAt.toISOString(),
				endUtc: dueAt.toISOString(),
				classId: item.class_id,
				className: item.class_name,
				subject: item.subject,
				dueAt: dueAt.toISOString(),
			});
			continue;
		}

		const dueDate = formatDateOnly(item.due_date);
		if (!dueDate) continue;
		events.push({
			id: `deadline-${item.assignment_id}`,
			type: 'deadline',
			title: `[${titleType}] ${item.title}`,
			description: `${item.class_name}${item.subject ? ` - ${item.subject}` : ''}`,
			location: '',
			timezone,
			allDay: false,
			startDate: dueDate,
			startTime: '23:29',
			endDate: dueDate,
			endTime: '23:59',
			classId: item.class_id,
			className: item.class_name,
			subject: item.subject,
			dueDate,
		});
	}

	return events;
}

function buildExceptionEvents(exceptions) {
	if (!Array.isArray(exceptions) || exceptions.length === 0) return [];
	return exceptions
		.map((exception) => {
			const startDate = formatDateOnly(exception.starts_on);
			const endDate = formatDateOnly(exception.ends_on);
			if (!startDate || !endDate) return null;
			const endNext = formatDateOnly(addDays(parseDateOnly(endDate), 1));
			if (!endNext) return null;
			return {
				id: `exception-${exception.id}`,
				type: 'exception',
				title: exception.title,
				description: exception.description || '',
				location: '',
				timezone: 'UTC',
				allDay: true,
				startDate,
				endDate: endNext,
				classId: exception.class_id || null,
				category: exception.category,
				blocksInstruction: Boolean(exception.blocks_instruction),
			};
		})
		.filter(Boolean);
}

function formatFrontendEvent(event) {
	if (event.allDay) {
		return {
			id: event.id,
			type: event.type,
			title: event.title,
			description: event.description || '',
			start: event.startDate,
			end: event.endDate,
			allDay: true,
			classId: event.classId || null,
			category: event.category || null,
			blocksInstruction: event.blocksInstruction || false,
		};
	}

	if (event.startUtc && event.endUtc) {
		return {
			id: event.id,
			type: event.type,
			title: event.title,
			description: event.description || '',
			start: event.startUtc,
			end: event.endUtc,
			allDay: false,
			timezone: event.timezone,
			classId: event.classId || null,
			dueAt: event.dueAt || null,
		};
	}

	return {
		id: event.id,
		type: event.type,
		title: event.title,
		description: event.description || '',
		startDate: event.startDate,
		startTime: event.startTime,
		endDate: event.endDate,
		endTime: event.endTime,
		recurrenceRule: event.recurrenceRule || null,
		exDates: event.exDates || [],
		allDay: false,
		timezone: event.timezone,
		classId: event.classId || null,
		className: event.className || null,
		subject: event.subject || null,
	};
}

function buildCalendarData({ classes, assignments, exceptions, term }) {
	const classSessions = buildClassSessionEvents({ classes, term, exceptions });
	const deadlines = buildDeadlineEvents(assignments || []);
	const exceptionEvents = buildExceptionEvents(exceptions || []);
	const allEvents = [...classSessions, ...deadlines, ...exceptionEvents];
	return {
		term: term || null,
		events: allEvents.map(formatFrontendEvent),
		classSessions,
		deadlines,
		exceptions: exceptionEvents,
	};
}

function eventToIcsLines(event) {
	const lines = ['BEGIN:VEVENT'];
	lines.push(`UID:${escapeIcs(event.id)}`);
	lines.push(`DTSTAMP:${formatUtcDateTime(new Date())}`);
	lines.push(`SUMMARY:${escapeIcs(event.title)}`);
	if (event.description) lines.push(`DESCRIPTION:${escapeIcs(event.description)}`);
	if (event.location) lines.push(`LOCATION:${escapeIcs(event.location)}`);

	if (event.allDay) {
		const startDate = formatIcsDate(event.startDate);
		const endDate = formatIcsDate(event.endDate);
		if (!startDate || !endDate) return null;
		lines.push(`DTSTART;VALUE=DATE:${startDate}`);
		lines.push(`DTEND;VALUE=DATE:${endDate}`);
		lines.push('END:VEVENT');
		return lines;
	}

	if (event.startUtc && event.endUtc) {
		const startUtc = formatUtcDateTime(event.startUtc);
		const endUtc = formatUtcDateTime(event.endUtc);
		if (!startUtc || !endUtc) return null;
		lines.push(`DTSTART:${startUtc}`);
		lines.push(`DTEND:${endUtc}`);
		lines.push('END:VEVENT');
		return lines;
	}

	const timezone = sanitizeTimezone(event.timezone || 'UTC');
	const startLocal = formatLocalDateTimeForIcs(event.startDate, event.startTime);
	const endLocal = formatLocalDateTimeForIcs(event.endDate, event.endTime);
	if (!startLocal || !endLocal) return null;

	lines.push(`DTSTART;TZID=${timezone}:${startLocal}`);
	lines.push(`DTEND;TZID=${timezone}:${endLocal}`);
	if (event.recurrenceRule) lines.push(`RRULE:${event.recurrenceRule}`);
	if (Array.isArray(event.exDates) && event.exDates.length > 0) {
		lines.push(`EXDATE;TZID=${timezone}:${dedupe(event.exDates).join(',')}`);
	}
	lines.push('END:VEVENT');
	return lines;
}

function buildIcsCalendar({ calendarName, events }) {
	const lines = [
		'BEGIN:VCALENDAR',
		'VERSION:2.0',
		'PRODID:-//Institute Dashboard//Academic Calendar//EN',
		'CALSCALE:GREGORIAN',
		`X-WR-CALNAME:${escapeIcs(calendarName || 'Academic Calendar')}`,
		'METHOD:PUBLISH',
	];

	for (const event of events || []) {
		const eventLines = eventToIcsLines(event);
		if (eventLines) lines.push(...eventLines);
	}

	lines.push('END:VCALENDAR');
	return `${lines.join('\r\n')}\r\n`;
}

module.exports = {
	normalizeScheduleBlocks,
	buildCalendarData,
	buildIcsCalendar,
};
