export const generateICS = (student) => {
    if (!student) return '';

    const events = [];
    const now = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';

    // Helper to parse date and time
    const parseDateTime = (dateStr, timeStr) => {
        let currentYear = 2026; // Default to 2026

        // Extract year from date string if present (e.g. "2025", "2026")
        const yearMatch = dateStr.match(/\b(202\d)\b/);
        if (yearMatch) {
            currentYear = parseInt(yearMatch[1]);
        }

        let month, day;

        // Handle "23/06/2026"
        if (dateStr.includes('/')) {
            const parts = dateStr.split('/');
            day = parseInt(parts[0]);
            month = parseInt(parts[1]) - 1;
            if (parts[2]) {
                const yr = parseInt(parts[2]);
                if (yr > 2000) currentYear = yr;
            }
        }
        // Handle "23rd December 2025" or "19th June (Friday)"
        else {
            // Remove day-of-week context like "(Friday)"
            const cleanedDateStr = dateStr.replace(/\([a-zA-Z]+\)/, '').trim();
            const parts = cleanedDateStr.split(/[\s,]+/);
            day = parseInt(parts[0]);
            
            // Find month word (e.g. "December", "June", "Dec", "Jun")
            const monthWord = parts.find(p => getMonthIndex(p) !== -1);
            if (monthWord) {
                month = getMonthIndex(monthWord);
            }
        }

        // Handle "Day 1 : 17th Dec : Wed" or similar
        if ((month === undefined || isNaN(day) || month === -1) && dateStr.includes(':')) {
            const parts = dateStr.split(':');
            const datePart = parts[1] ? parts[1].trim() : ''; 
            const dateSubParts = datePart.split(' ');
            day = parseInt(dateSubParts[0]);
            month = getMonthIndex(dateSubParts[1]);
        }
        
        if (month === undefined || isNaN(day) || month === -1) {
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
            let desc = `Subject: ${exam.subject}\\nType: Theory`;
            if (exam.professor) desc += `\\nProfessor: ${exam.professor}`;

            events.push({
                summary: `Theory Exam: ${exam.subject}`,
                start: dt.start,
                end: dt.end,
                description: desc,
                location: exam.location && exam.location !== 'TBD' ? exam.location : 'Exam Hall'
            });
        }
    });

    // Process Practical Exams
    student.practical.forEach(exam => {
        const dt = parseDateTime(exam.date, exam.time);
        if (dt) {
            let desc = `Subject: ${exam.subject}\\nType: Practical`;
            if (exam.professor) desc += `\\nProfessor: ${exam.professor}`;
            if (exam.panel) desc += `\\nPanel: ${exam.panel}`;

            events.push({
                summary: `Practical Exam: ${exam.subject}`,
                start: dt.start,
                end: dt.end,
                description: desc,
                location: exam.location && exam.location !== 'TBD' ? exam.location : 'Lab'
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
