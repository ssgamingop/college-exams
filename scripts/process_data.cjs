const fs = require('fs');
const path = require('path');

// File paths
// File paths
const MAPPING_CSV = path.join(__dirname, '../csv_data/Batch25-29__Sem1-Sprint1 - Data.csv');
const THEORY_CSV = path.join(__dirname, '../csv_data/Scheduling Plan - Students  - 25 - 29 (Theory) - Sprint 2.csv');
const PRACTICAL_CSV = path.join(__dirname, '../csv_data/Scheduling Plan - Students  - Batch25-29 (Sprint 2).csv');
const OUTPUT_JSON = path.join(__dirname, '../src/data/exam_data.json');

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
    return fs.readFileSync(filePath, 'utf-8').split(/\r?\n/).filter(line => line.trim() !== '');
}

/**
 * Build student records from CSV inputs, attach theory and practical schedules, and write the aggregated JSON output.
 *
 * Reads mapping, theory, and practical CSV files; populates each student's `theory` and `practical` arrays with scheduled items
 * (theory entries matched by roll-number ranges; practical entries matched by normalized student names and annotated with subject, panel, time, and location);
 * ensures the output directory exists and writes the resulting array of student objects to OUTPUT_JSON.
 */
function processData() {
    console.log('Processing data...');

    // 2. Process Mapping (Roll No <-> Name)
    const mappingLines = readFile(MAPPING_CSV);
    const students = {}; // RollNo -> { name, rollNo, theory: [], practical: [] }

    // Skip header (line 0)
    for (let i = 1; i < mappingLines.length; i++) {
        const cols = parseLine(mappingLines[i]);
        if (cols.length >= 3) {
            const rollNo = cols[0];
            const name = cols[2];
            students[rollNo] = {
                rollNo,
                name,
                theory: [],
                practical: []
            };
        }
    }
    console.log(`Loaded ${Object.keys(students).length} students.`);

    // 2. Process Theory Schedule (Range based)
    const theoryLines = readFile(THEORY_CSV);
    let currentTheoryDate = '';

    // Skip header rows if any. Looking at file, line 2 has headers: Date,Subject,Mode of Exam,Time Slot ,Roll Number,No. of Students,Class Details
    // Data starts from line 3.

    for (let i = 2; i < theoryLines.length; i++) {
        const cols = parseLine(theoryLines[i]);
        if (cols.length < 5) continue;

        // Date is sometimes empty, meaning it carries over from previous row? 
        // Looking at file: "23rd December 2025" is in first row of block. Subsequent rows have empty date.
        if (cols[0]) currentTheoryDate = cols[0];

        const subject = cols[1];
        const timeSlot = cols[3];
        const rollField = cols[4]; // "150096725002 to 150096725027" or mixed
        const location = cols[6]; // Class Details

        if (!rollField) continue;

        const parts = rollField.split(',').map(p => p.trim());

        parts.forEach(part => {
            if (part.includes(' to ')) {
                const [startRoll, endRoll] = part.split(' to ').map(r => BigInt(r.trim()));
                // Assign to students in range
                Object.values(students).forEach(student => {
                    const studentRoll = BigInt(student.rollNo);
                    if (studentRoll >= startRoll && studentRoll <= endRoll) {
                        student.theory.push({
                            date: currentTheoryDate,
                            subject,
                            time: timeSlot,
                            location: location,
                            type: 'Theory'
                        });
                    }
                });
            } else {
                // Single roll number
                try {
                    const singleRoll = BigInt(part);
                    Object.values(students).forEach(student => {
                        if (BigInt(student.rollNo) === singleRoll) {
                            student.theory.push({
                                date: currentTheoryDate,
                                subject,
                                time: timeSlot,
                                location: location,
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

    let subjectMap = {}; // colIndex -> { subject, panel, professor }
    let venueMap = {}; // colIndex -> Venue Name

    // Helper to parse header for Panel + Subject + Professor
    function parsePanelHeader(header) {
        // Expected formats: "Panel 1 Prof. Vishakha - Python" or "Panel 2 - Subject"
        let subject = '';
        let professor = '';
        let panel = '';

        const cleanHeader = header.replace(/\s+/g, ' ');
        const parts = cleanHeader.split(' - ');

        if (parts.length > 1) {
            subject = parts.slice(1).join(' - ').trim();
            const prefix = parts[0];

            // Extract Panel
            const panelMatch = prefix.match(/(Panel\s*\d+|Batch\s*\d+)/i);
            panel = panelMatch ? panelMatch[0] : 'Unknown';

            // Extract Professor
            const profMatch = prefix.match(/Prof\.?\s*(.+)/i);
            if (profMatch) {
                // If regex captured "Prof. Name", use it. remove "Panel 1" if stuck to it? 
                // straightforward: just check if "Prof" exists in prefix
                const prefixParts = prefix.split(/Prof\.?/i);
                if (prefixParts.length > 1) {
                    professor = 'Prof. ' + prefixParts[1].trim();
                }
            }
        } else {
            subject = header.trim();
            panel = 'Unknown';
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
            venueMap = {};
            subjectMap = {};
            continue;
        }

        // Detect Venue Row
        if ((row[0] && row[0].includes('Venue')) || (row[1] && row[1].includes('Venue'))) {
            row.forEach((cell, idx) => {
                if (cell && cell.includes('Bunker')) {
                    venueMap[idx] = cell.trim();
                }
            });
            continue;
        }

        // Detect Header Row (Slot No.)
        if (row[1] === 'Time' || row[0] === 'Slot No.') {
            row.forEach((cell, idx) => {
                if (cell && (cell.includes('Panel') || cell.includes('Batch'))) {
                    subjectMap[idx] = parsePanelHeader(cell);
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

                const student = Object.values(students).find(s =>
                    normalizeName(s.name) === normalizeName(studentName)
                );

                if (student) {
                    const headerInfo = subjectMap[j] || { subject: 'Unknown', panel: 'Unknown' };
                    let location = venueMap[j] || 'TBD';

                    student.practical.push({
                        date: currentPracticalDate,
                        subject: headerInfo.subject,
                        panel: headerInfo.panel,
                        time: time.trim(),
                        location: location,
                        type: 'Practical',
                        professor: headerInfo.professor // Add Professor field
                    });
                }
            }
        }
    }
    console.log('Processed practical schedule.');

    // Write output
    const outputDir = path.dirname(OUTPUT_JSON);
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }

    fs.writeFileSync(OUTPUT_JSON, JSON.stringify(Object.values(students), null, 2));
    console.log(`Wrote data to ${OUTPUT_JSON}`);
}

processData();