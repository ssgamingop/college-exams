export const generateICS = (student) => {
    if (!student) return '';

    const events = [];
    const now = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';

    // Helper to parse date and time
    const parseDateTime = (dateStr, timeStr) => {
        // Current year assumption as per plan
        const currentYear = 2025;

        let month, day;

        // Handle "23rd December 2025"
        if (dateStr.includes('2025')) {
            const parts = dateStr.split(' ');
            day = parseInt(parts[0]); // "23rd" -> 23
            month = getMonthIndex(parts[1]);
        }
        // Handle "Day 1 : 17th Dec : Wed"
        else if (dateStr.includes(':')) {
            const parts = dateStr.split(':');
            const datePart = parts[1].trim(); // "17th Dec"
            const dateSubParts = datePart.split(' ');
            day = parseInt(dateSubParts[0]);
            month = getMonthIndex(dateSubParts[1]);
        } else {
            // Fallback or error
            console.error("Unknown date format:", dateStr);
            return null;
        }

        // Parse Time "10:00 AM –10:30 AM" or "10:00 AM – 12:00 PM"
        // Normalize en-dash, em-dash to hyphen
        const normalizedTimeStr = timeStr.replace(/[–—]/g, '-');
        const [startStr, endStr] = normalizedTimeStr.split('-').map(s => s.trim());

        const startDate = new Date(currentYear, month, day);
        const endDate = new Date(currentYear, month, day);

        const setTime = (dateObj, timeString) => {
            const match = timeString.match(/(\d+):(\d+)\s*(AM|PM)/i);
            if (!match) return;
            let [_, hours, minutes, period] = match;
            hours = parseInt(hours);
            minutes = parseInt(minutes);

            if (period.toUpperCase() === 'PM' && hours !== 12) hours += 12;
            if (period.toUpperCase() === 'AM' && hours === 12) hours = 0;

            dateObj.setHours(hours, minutes, 0, 0);
        };

        setTime(startDate, startStr);
        setTime(endDate, endStr);

        return { start: startDate, end: endDate };
    };

    const getMonthIndex = (monthStr) => {
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const fullMonths = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

        let index = months.findIndex(m => monthStr.startsWith(m));
        if (index === -1) {
            index = fullMonths.findIndex(m => m.toLowerCase() === monthStr.toLowerCase());
        }
        return index;
    };

    const formatICSDate = (date) => {
        return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    };

    // Process Theory Exams
    student.theory.forEach(exam => {
        const dt = parseDateTime(exam.date, exam.time);
        if (dt) {
            events.push({
                summary: `Theory Exam: ${exam.subject}`,
                start: dt.start,
                end: dt.end,
                description: `Subject: ${exam.subject}\\nType: Theory`,
                location: 'Exam Hall'
            });
        }
    });

    // Process Practical Exams
    student.practical.forEach(exam => {
        const dt = parseDateTime(exam.date, exam.time);
        if (dt) {
            events.push({
                summary: `Practical Exam: ${exam.subject}`,
                start: dt.start,
                end: dt.end,
                description: `Subject: ${exam.subject}\\nType: Practical`,
                location: 'Lab'
            });
        }
    });

    let icsContent = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//College Exams//Scheduler//EN',
        'CALSCALE:GREGORIAN',
        'METHOD:PUBLISH'
    ];

    events.forEach(event => {
        icsContent.push(
            'BEGIN:VEVENT',
            `DTSTAMP:${now}`,
            `DTSTART:${formatICSDate(event.start)}`,
            `DTEND:${formatICSDate(event.end)}`,
            `SUMMARY:${event.summary}`,
            `DESCRIPTION:${event.description}`,
            `LOCATION:${event.location}`,
            'END:VEVENT'
        );
    });

    icsContent.push('END:VCALENDAR');

    return icsContent.join('\r\n');
};

export const downloadICS = (filename, content) => {
    const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' });
    const link = document.createElement('a');
    link.href = window.URL.createObjectURL(blob);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};
