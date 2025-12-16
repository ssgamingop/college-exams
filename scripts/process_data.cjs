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
        const rollRange = cols[4]; // "150096725002 to 150096725027"
        const location = cols[6]; // Class Details

        if (!rollRange || !rollRange.includes(' to ')) continue;

        const [startRoll, endRoll] = rollRange.split(' to ').map(r => BigInt(r.trim()));

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
    }
    console.log('Processed theory schedule.');

    // 3. Process Practical Schedule (Name based)
    const practicalLines = readFile(PRACTICAL_CSV);
    let currentPracticalDate = '';

    let subjectMap = {}; // colIndex -> { subject, panel }
    let venueMap = {}; // colIndex -> Venue Name

    for (let i = 0; i < practicalLines.length; i++) {
        const line = practicalLines[i];
        const row = parseLine(line);
        if (!row || row.length === 0) continue;

        // Detect Date Row (could be in col 0 or col 1)
        // Day 1 often in col 1, others in col 0
        const dateCell = (row[0] && row[0].includes('Day')) ? row[0] : (row[1] && row[1].includes('Day') ? row[1] : null);
        if (dateCell) {
            currentPracticalDate = dateCell.trim();
            // Reset maps for new day block
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

        // Detect Header Row (Subject/Panel Mapping)
        if (row[1] === 'Time' || row[0] === 'Slot No.') {
            row.forEach((cell, idx) => {
                if (cell && cell.includes('Panel')) {
                    const parts = cell.split('-');
                    if (parts.length >= 2) {
                        const panel = parts[0].trim(); // "Panel 1"
                        const subject = parts.slice(1).join('-').trim(); // "Git..."
                        subjectMap[idx] = { subject, panel };
                    } else {
                        // Fallback if formatting is weird
                        subjectMap[idx] = { subject: cell.trim(), panel: 'Unknown' };
                    }
                }
            });
            continue;
        }

        // Process Student Row
        if (!currentPracticalDate) continue;

        const time = row[1];
        if (!time || !time.includes('M')) continue; // Simple AM/PM check

        // Iterate through student columns (starting from 2)
        for (let j = 2; j < row.length; j++) {
            const studentName = row[j];
            if (studentName && studentName.length > 2) {

                // Normalize name
                const normalizeName = (name) => name.replace(/\u00A0/g, ' ').replace(/\s+/g, ' ').trim().toLowerCase();

                const student = Object.values(students).find(s =>
                    normalizeName(s.name) === normalizeName(studentName)
                );

                if (student) {
                    const headerInfo = subjectMap[j] || { subject: 'Unknown', panel: 'Unknown' };
                    let location = venueMap[j];

                    // Fallback for Day 1 where Venue might handle differently or be missing
                    if (!location) location = 'TBD';

                    student.practical.push({
                        date: currentPracticalDate,
                        subject: headerInfo.subject,
                        panel: headerInfo.panel,
                        time: time.trim(),
                        location: location,
                        type: 'Practical'
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
