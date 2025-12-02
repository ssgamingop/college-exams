const fs = require('fs');
const path = require('path');

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

    // 1. Process Mapping (Roll No <-> Name)
    const mappingLines = readFile(MAPPING_CSV);
    const students = {}; // RollNo -> { name, rollNo, theory: [], practical: [] }

    // Skip header (line 0)
    for (let i = 1; i < mappingLines.length; i++) {
        const parts = mappingLines[i].split(',');
        // Format: Student Roll Number,Count,Student Name
        // Note: Simple split might fail if names have commas, but looking at file it seems okay or quoted.
        // Let's use a slightly more robust split if needed, but for now simple split.
        // Actually, let's use the regex approach for safety.
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
                    type: 'Theory'
                });
            }
        });
    }
    console.log('Processed theory schedule.');

    // 3. Process Practical Schedule (Name based)
    const practicalLines = readFile(PRACTICAL_CSV);
    let currentPracticalDate = '';
    // Structure is complex. 
    // Row 1: Day 5 : 16th Dec : Tue
    // Row 2: Slot No., Time, Panel 1..., Panel 2...
    // Row 3+: Data

    // We need to track the current date as we iterate.
    // And map columns to subjects.

    let practicalHeaders = [];

    for (let i = 0; i < practicalLines.length; i++) {
        const line = practicalLines[i];
        const cols = parseLine(line);

        // Check for Date row
        if (line.includes('Day') && line.includes(':')) {
            // "Day 5 : 16th Dec : Tue" -> extract date
            currentPracticalDate = cols[0];
            continue;
        }

        // Check for Header row
        if (cols[0] === 'Slot No.') {
            practicalHeaders = cols;
            continue;
        }

        // Data row
        if (!cols[0] || !cols[1]) continue; // Skip empty or break lines
        if (cols[0].startsWith('Break')) continue;

        const timeSlot = cols[1];

        // Iterate through panel columns (index 2 onwards)
        for (let j = 2; j < cols.length; j++) {
            const studentName = cols[j];
            if (!studentName || studentName === 'NA') continue;

            // Find student by name (fuzzy match or exact?)
            // The names in practical CSV might slightly differ from Mapping CSV.
            // Let's try exact match first, then normalized.

            const student = Object.values(students).find(s =>
                s.name.toLowerCase().trim() === studentName.toLowerCase().trim()
            );

            if (student) {
                // Subject is in header? 
                // Header: "Panel 1 - Git, GitHub, and LinkedIn"
                let subject = practicalHeaders[j];
                if (!subject) continue; // Skip if no header for this column
                // Clean subject name (remove Panel X - )
                subject = subject.replace(/Panel \d+ - /, '').trim();

                student.practical.push({
                    date: currentPracticalDate,
                    subject,
                    time: timeSlot,
                    type: 'Practical'
                });
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
