
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CSV_PATH = path.join(__dirname, '../csv_data/Scheduling Plan - Students  - Batch25-29 (Sprint 2).csv');
const JSON_PATH = path.join(__dirname, '../src/data/exam_data.json');

// Helper to parse CSV line respecting quotes
function parseCSVLine(line) {
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
    return result.map(Field => Field.replace(/^"|"$/g, '').trim());
}

// Helper to parse panel header
function parsePanelHeader(header) {
    // Expected formats:
    // "Panel 1 Prof. Vishakha - Python"
    // "Panel 1 - Scratch Programming"
    // "Panel 2 Prof. Amaan - Git, GitHub, and LinkedIn"

    // Check key subjects first to be safe
    let subject = '';
    let professor = '';

    // Normalize spaces
    const cleanHeader = header.replace(/\s+/g, ' ');

    // Extract Subject using known list or splitter
    // The splitter is usually " - "
    const parts = cleanHeader.split(' - ');
    if (parts.length > 1) {
        // Last part is usually subject, unless subject has " - " inside (unlikely)
        subject = parts.slice(1).join(' - ').trim();

        // First part contains Panel and Prof
        const prefix = parts[0];
        // Look for "Prof." or "Prof "
        const profMatch = prefix.match(/Prof\.?\s*(.+)/i);
        if (profMatch) {
            professor = 'Prof. ' + profMatch[1].trim();
        }
    } else {
        // Fallback or specific hardcoded handling if needed
        subject = header;
    }

    return { subject, professor, original: header };
}

function updateData() {
    try {
        console.log('Reading files...');
        const csvContent = fs.readFileSync(CSV_PATH, 'utf-8');
        const jsonData = JSON.parse(fs.readFileSync(JSON_PATH, 'utf-8'));

        console.log(`Loaded ${jsonData.length} students.`);

        const lines = csvContent.split(/\r?\n/);

        let currentDay = '';
        let venueRow = [];
        let headerRow = [];

        // Map column index to { subject, professor, venue }
        let columnMap = {};

        let processedCount = 0;
        let matchCount = 0;

        for (let i = 0; i < lines.length; i++) {
            let line = lines[i].trim();
            if (!line) continue;

            const cols = parseCSVLine(line);

            // 1. Detect Day
            if (cols.some(c => c.startsWith('Day '))) {
                currentDay = cols.find(c => c.startsWith('Day '));
                // Reset context
                venueRow = [];
                headerRow = [];
                columnMap = {};
                continue;
            }

            // 2. Detect Venue Row
            if (cols[0].startsWith('Venue')) {
                venueRow = cols;
                continue;
            }

            // 3. Detect Header Row (Slot No.)
            if (cols[0].startsWith('Slot No.')) {
                headerRow = cols;

                // Build Column Map
                // Columns 2 onwards are panels
                for (let c = 2; c < cols.length; c++) {
                    const header = cols[c];
                    if (!header) continue;

                    const { subject, professor } = parsePanelHeader(header);
                    const venue = venueRow[c] || 'TBD';

                    columnMap[c] = {
                        subject,
                        professor,
                        venue,
                        header
                    };
                }
                continue;
            }

            // 4. Data Row (starts with number)
            if (/^\d+/.test(cols[0])) {
                if (Object.keys(columnMap).length === 0) continue;

                // Iterate through panel columns
                for (let c = 2; c < cols.length; c++) {
                    const studentName = cols[c];
                    if (!studentName || studentName === 'NA') continue;

                    processedCount++;

                    // Find student in JSON
                    const student = jsonData.find(s => s.name.toLowerCase() === studentName.toLowerCase());
                    if (student) {
                        const colInfo = columnMap[c];
                        if (!colInfo) continue;

                        // Find matching practical exam
                        // We match by Subject mainly.
                        // Also check Type just in case.
                        const exam = student.practical.find(p => {
                            // Loose subject matching
                            return p.subject === colInfo.subject ||
                                p.subject.includes(colInfo.subject) ||
                                colInfo.subject.includes(p.subject);
                        });

                        if (exam) {
                            matchCount++;
                            exam.location = colInfo.venue;
                            if (colInfo.professor) {
                                exam.professor = colInfo.professor;
                            }
                            // Store the panel/batch info if needed, maybe in 'type' or new field?
                            // exam.panel = colInfo.header; // Logic existing UI uses 'panel' property

                            // Existing 'panel' field in JSON is roughly "Panel 2 Prof. Amaan"
                            // If our parsed professor is better, maybe update panel too?
                            // Let's just create 'professor' field and update 'location'.
                            // The task asked to mention Professor.
                        } else {
                            // console.warn(`Exam not found for ${studentName} - Subject: ${colInfo.subject}`);
                        }
                    }
                }
            }
        }

        console.log(`Processed ${processedCount} student entries.`);
        console.log(`Updated ${matchCount} exams.`);

        fs.writeFileSync(JSON_PATH, JSON.stringify(jsonData, null, 2));
        console.log('Successfully updated exam_data.json');

    } catch (error) {
        console.error('Error updating data:', error);
    }
}

updateData();
