const fs = require('fs');
const path = require('path');

// File paths
const MAPPING_CSV = path.normalize(path.join(__dirname, '../csv_data/Batch25-29__Sem1-Sprint1 - Data.csv'));
const THEORY_CSV = path.normalize(path.join(__dirname, '../csv_data/theory.csv'));
const PRACTICAL_CSV = path.normalize(path.join(__dirname, '../csv_data/panel.csv'));
const OUTPUT_JSON = path.normalize(path.join(__dirname, '../src/data/exam_data.json'));

// Helper to parse CSV line
function parseLine(line) {
    const result = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
            inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
            result.push(current.trim());
            current = '';
        } else {
            current += char;
        }
    }
    result.push(current.trim());
    return result.map(field => field.replace(/^"|"$/g, '').trim());
}

// Read file helper
function readFile(filePath) {
    const normalizedPath = path.normalize(filePath);
    const allowedBase = path.normalize(path.join(__dirname, '..'));
    if (!normalizedPath.startsWith(allowedBase)) {
        throw new Error('Path traversal detected');
    }
    return fs.readFileSync(normalizedPath, 'utf-8').split(/\r?\n/).filter(line => line.trim() !== '');
}

function processData() {
    console.log('Processing data...');

    // 2. Process Mapping (Roll No <-> Name)
    const mappingLines = readFile(MAPPING_CSV);
    const students = new Map(); // RollNo -> { name, rollNo, theory: [], practical: [] }

    // Skip header (line 0)
    const headerCols = parseLine(mappingLines[0]);
    let rollColIdx = headerCols.findIndex(c => c.toLowerCase().includes('roll'));
    let nameColIdx = headerCols.findIndex(c => c.toLowerCase().includes('name'));

    if (rollColIdx === -1) rollColIdx = 0;
    if (nameColIdx === -1) nameColIdx = 1;

    for (let i = 1; i < mappingLines.length; i++) {
        const cols = parseLine(mappingLines[i]);
        if (cols.length > Math.max(rollColIdx, nameColIdx)) {
            const rollNo = cols[rollColIdx];
            const name = cols[nameColIdx];
            if (rollNo && name) {
                if (rollNo !== '__proto__' && rollNo !== 'constructor') {
                    students.set(rollNo, {
                        rollNo,
                        name,
                        theory: [],
                        practical: []
                    });
                }
            }
        }
    }
    console.log(`Loaded ${students.size} students.`);

    // 2. Process Theory Schedule (Range based)
    const theoryLines = readFile(THEORY_CSV);
    let currentTheoryDate = '';
    let currentSubject = '';

    // Skip header rows if any. Looking at file, line 2 has headers: Date,Subject,Mode of Exam,Time Slot ,Roll Number,No. of Students,Class Details
    // Data starts from line 3.

    for (let i = 2; i < theoryLines.length; i++) {
        const cols = parseLine(theoryLines[i]);
        if (cols.length < 5) continue;

        // Date is sometimes empty, meaning it carries over from previous row? 
        // Looking at file: "23rd December 2025" is in first row of block. Subsequent rows have empty date.
        if (cols[0] && cols[0].toLowerCase().trim() !== 'date') currentTheoryDate = cols[0];
        if (cols[1] && cols[1].toLowerCase().trim() !== 'subject') currentSubject = cols[1];

        let subject = currentSubject;
        if (subject === 'Aptitude - I - DILR') {
            const mode = cols[2] ? cols[2].trim() : '';
            if (mode.toLowerCase().includes('mcq')) {
                subject = 'Aptitude - I - DILR (MCQ)';
            } else {
                subject = 'Aptitude - I - DILR (Theory)';
            }
        }
        const timeSlot = cols[3];
        const rollField = cols[4]; // "150096725002 to 150096725027" or mixed
        const location = cols[6]; // Class Details

        if (!rollField) continue;

        const parts = rollField.split(',').map(p => p.trim());

        parts.forEach(part => {
            if (part.includes(' to ')) {
                const [startRoll, endRoll] = part.split(' to ').map(r => BigInt(r.trim()));
                // Assign to students in range
                Array.from(students.values()).forEach(student => {
                    const studentRoll = BigInt(student.rollNo);
                    if (studentRoll >= startRoll && studentRoll <= endRoll) {
                        student.theory.push({
                            date: currentTheoryDate,
                            subject,
                            time: timeSlot,
                            location: location || 'TBD',
                            type: 'Theory'
                        });
                    }
                });
            } else {
                // Single roll number
                try {
                    const singleRoll = BigInt(part);
                    Array.from(students.values()).forEach(student => {
                        if (BigInt(student.rollNo) === singleRoll) {
                            student.theory.push({
                                date: currentTheoryDate,
                                subject,
                                time: timeSlot,
                                location: location || 'TBD',
                                type: 'Theory'
                            });
                        }
                    });
                } catch (e) {
                    console.warn(`Skipping invalid roll number part: ${part}`);
                }
            }
        });
    }
    console.log('Processed theory schedule.');

    // 3. Process Practical Schedule (Name based)
    const practicalLines = readFile(PRACTICAL_CSV);
    let currentPracticalDate = '';

    const subjectMap = new Map(); // colIndex -> { subject, panel, professor }
    const venueMap = new Map(); // colIndex -> Venue Name
    const tempPanels = new Map();

    function parsePanelHeader(header) {
        let subject = '';
        let professor = '';
        let panel = '';

        const cleanHeader = header.replace(/\s+/g, ' ').trim();
        const match = cleanHeader.match(/^(Panel\s*\d+|Batch\s*\d+)(?:\s*\((.*?)\))?\s*-\s*(.*)$/i);
        if (match) {
            panel = match[1].trim();
            professor = match[2] ? match[2].trim() : '';
            subject = match[3] ? match[3].trim() : '';
        } else {
            const parts = cleanHeader.split(' - ');
            if (parts.length > 1) {
                 subject = parts.slice(1).join(' - ').trim();
                 panel = parts[0].trim();
            } else {
                 subject = cleanHeader;
                 panel = 'Unknown';
            }
        }

        return { subject, panel, professor };
    }

    for (let i = 0; i < practicalLines.length; i++) {
        const line = practicalLines[i];
        const row = parseLine(line);
        if (!row || row.length === 0) continue;

        // Detect Date Row
        const dateCell = (row[0] && row[0].includes('Day')) ? row[0] : (row[1] && row[1].includes('Day') ? row[1] : null);
        if (dateCell) {
            currentPracticalDate = dateCell.trim();
            venueMap.clear();
            subjectMap.clear();
            tempPanels.clear();
            continue;
        }

        // Detect Venue Row
        if ((row[0] && row[0].includes('Venue')) || (row[1] && row[1].includes('Venue'))) {
            row.forEach((cell, idx) => {
                if (cell && cell.includes('Bunker')) {
                    venueMap.set(idx, cell.trim());
                }
            });
            if (!(row[0] && row[0].includes('Slot No.'))) {
                continue;
            }
        }

        // Detect Header Row (Slot No.)
        if (row[0] && row[0].includes('Slot No.')) {
            row.forEach((cell, idx) => {
                if (idx >= 2 && cell) {
                    tempPanels.set(idx, cell.trim());
                }
            });
            continue;
        }

        if (row[1] && row[1].includes('Time')) {
            row.forEach((cell, idx) => {
                if (idx >= 2 && cell) {
                    const parsed = parsePanelHeader(cell);
                    const panelName = tempPanels.get(idx) || 'Unknown';
                    subjectMap.set(idx, {
                        subject: parsed.subject,
                        panel: panelName,
                        professor: parsed.professor
                    });
                }
            });
            continue;
        }

        // Process Student Row
        if (!currentPracticalDate) continue;

        const time = row[1];
        if (!time || !time.includes('M')) continue;

        // Iterate through student columns
        for (let j = 2; j < row.length; j++) {
            const studentName = row[j];
            if (studentName && studentName.length > 2 && studentName !== 'NA') {

                // Normalize name
                const normalizeName = (name) => name.replace(/\u00A0/g, ' ').replace(/\s+/g, ' ').trim().toLowerCase();

                const student = Array.from(students.values()).find(s =>
                    normalizeName(s.name) === normalizeName(studentName)
                );

                if (student) {
                    const headerInfo = subjectMap.get(j) || { subject: 'Unknown', panel: 'Unknown' };
                    let baseLocation = venueMap.get(j) || 'TBD';
                    let professor = headerInfo.professor || '';
                    
                    let location = baseLocation;
                    if (professor) {
                        location = `${baseLocation} (${professor})`;
                    }

                    student.practical.push({
                        date: currentPracticalDate,
                        subject: headerInfo.subject,
                        panel: headerInfo.panel,
                        time: time.trim(),
                        location: location,
                        type: 'Practical',
                        professor: professor
                    });
                }
            }
        }
    }
    console.log('Processed practical schedule.');

    // Write output
    const outputDir = path.normalize(path.dirname(OUTPUT_JSON));
    const allowedBase = path.normalize(path.join(__dirname, '..'));
    if (!outputDir.startsWith(allowedBase)) {
        throw new Error('Path traversal detected');
    }
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }

    fs.writeFileSync(OUTPUT_JSON, JSON.stringify(Array.from(students.values()), null, 2));
    console.log(`Wrote data to ${OUTPUT_JSON}`);
}

processData();
