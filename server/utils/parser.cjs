const { GoogleGenerativeAI } = require('@google/generative-ai');

/**
 * Extracts the direct CSV download link from a Google Sheets URL.
 * Supports standard sharing links and works with specific gid sheets.
 */
function getCsvUrl(sheetUrl) {
  if (!sheetUrl) return null;
  const trimmed = sheetUrl.trim();
  const idMatch = trimmed.match(/\/d\/([a-zA-Z0-9-_]+)/);
  if (!idMatch) return trimmed; // If it's already a direct link or not standard, return as is
  
  const spreadsheetId = idMatch[1];
  let exportUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv`;
  
  // Extract gid (tab identifier) if present
  const gidMatch = trimmed.match(/[#&?]gid=([0-9]+)/);
  if (gidMatch) {
    exportUrl += `&gid=${gidMatch[1]}`;
  }
  return exportUrl;
}

/**
 * Fetches the CSV content from a URL.
 * Throws a helpful error if the sheet is private (returns HTML).
 */
async function fetchCsvText(url) {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to download spreadsheet (HTTP ${res.status}). Verify the URL.`);
  }
  const text = await res.text();
  
  // If Google Sheets returns a login/redirection HTML page, it means it's private.
  if (text.trim().startsWith('<!doctype html>') || text.includes('google-signin') || text.includes('Service Login')) {
    throw new Error('Google Sheet is private. Please share the Google Sheet as "Anyone with the link can view" (Viewer role is sufficient).');
  }
  return text;
}

/**
 * Parses a single CSV line, handling quotes, double-quotes and commas.
 */
function parseCsvLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++; // skip escaped quote
      } else {
        inQuotes = !inQuotes;
      }
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

/**
 * Splits text into lines and filters out empty lines.
 */
function getLines(text) {
  return text.split(/\r?\n/).filter(line => line.trim() !== '');
}

/**
 * Maps student names to roll numbers from Mapping CSV.
 */
function parseMapping(csvText) {
  const lines = getLines(csvText);
  if (lines.length === 0) throw new Error('Mapping CSV file is empty');

  const headers = parseCsvLine(lines[0]);
  let rollColIdx = headers.findIndex(c => {
    const l = c.toLowerCase();
    return l.includes('roll') || l.includes('id') || l.includes('urn');
  });
  let nameColIdx = headers.findIndex(c => {
    const l = c.toLowerCase();
    return l.includes('name') || l.includes('student');
  });

  if (rollColIdx === -1) rollColIdx = 0;
  if (nameColIdx === -1) nameColIdx = 1;

  const students = new Map();
  for (let i = 1; i < lines.length; i++) {
    const cols = parseCsvLine(lines[i]);
    if (cols.length > Math.max(rollColIdx, nameColIdx)) {
      const rollNo = cols[rollColIdx];
      const name = cols[nameColIdx];
      if (rollNo && name && rollNo !== '__proto__' && rollNo !== 'constructor') {
        students.set(rollNo, {
          rollNo,
          name,
          theory: [],
          practical: []
        });
      }
    }
  }
  return students;
}

/**
 * Parses and maps Theory CSV schedules to student profiles.
 */
function parseTheory(csvText, students, markers = {}) {
  const lines = getLines(csvText);
  if (lines.length === 0) return;

  let headerRowIdx = markers.headerRow !== undefined ? markers.headerRow : 2;

  // Auto-scan if header row is not specified
  if (markers.headerRow === undefined) {
    for (let i = 0; i < Math.min(lines.length, 5); i++) {
      const row = parseCsvLine(lines[i]);
      if (row.some(c => c.toLowerCase().includes('subject') || c.toLowerCase().includes('roll'))) {
        headerRowIdx = i;
        break;
      }
    }
  }

  if (headerRowIdx >= lines.length) headerRowIdx = 0;

  const headers = parseCsvLine(lines[headerRowIdx]);
  
  let dateIdx = markers.dateIndex !== undefined ? markers.dateIndex : headers.findIndex(c => c.toLowerCase().includes('date') || c.toLowerCase().includes('day'));
  let subjectIdx = markers.subjectIndex !== undefined ? markers.subjectIndex : headers.findIndex(c => c.toLowerCase().includes('subject') || c.toLowerCase().includes('paper') || c.toLowerCase().includes('course'));
  let timeIdx = markers.timeIndex !== undefined ? markers.timeIndex : headers.findIndex(c => c.toLowerCase().includes('time') || c.toLowerCase().includes('slot') || c.toLowerCase().includes('session'));
  let locationIdx = markers.locationIndex !== undefined ? markers.locationIndex : headers.findIndex(c => c.toLowerCase().includes('location') || c.toLowerCase().includes('class') || c.toLowerCase().includes('room') || c.toLowerCase().includes('venue'));
  let rollIdx = markers.rollIndex !== undefined ? markers.rollIndex : headers.findIndex(c => c.toLowerCase().includes('roll') || c.toLowerCase().includes('student') || c.toLowerCase().includes('range'));
  let modeIdx = headers.findIndex(c => c.toLowerCase().includes('mode') || c.toLowerCase().includes('type'));

  if (dateIdx === -1) dateIdx = 0;
  if (subjectIdx === -1) subjectIdx = 1;
  if (modeIdx === -1) modeIdx = 2;
  if (timeIdx === -1) timeIdx = 3;
  if (rollIdx === -1) rollIdx = 4;
  if (locationIdx === -1) locationIdx = 6;

  // Identify any non-standard columns to save as dynamic keys
  const standardIndices = [dateIdx, subjectIdx, timeIdx, locationIdx, rollIdx];
  if (modeIdx !== -1) standardIndices.push(modeIdx);
  
  const extraFields = [];
  headers.forEach((h, idx) => {
    if (!standardIndices.includes(idx) && h.trim().length > 0) {
      const key = h.replace(/[^a-zA-Z0-9 ]/g, '').trim().toLowerCase().replace(/ (\w)/g, (_, c) => c.toUpperCase());
      extraFields.push({ index: idx, key });
    }
  });

  let currentDate = '';
  let currentSubject = '';
  let currentTime = '';
  let currentLocation = '';

  for (let i = headerRowIdx + 1; i < lines.length; i++) {
    const cols = parseCsvLine(lines[i]);
    if (cols.length < Math.max(dateIdx, subjectIdx, timeIdx, locationIdx, rollIdx) + 1) continue;

    const dateVal = cols[dateIdx];
    const subjVal = cols[subjectIdx];
    const timeVal = cols[timeIdx];
    const locVal = cols[locationIdx];
    const rollField = cols[rollIdx];

    if (dateVal && dateVal.toLowerCase() !== 'date') currentDate = dateVal;
    if (subjVal && subjVal.toLowerCase() !== 'subject') currentSubject = subjVal;
    if (timeVal && timeVal.toLowerCase() !== 'time') currentTime = timeVal;
    if (locVal && locVal.toLowerCase() !== 'location') currentLocation = locVal;

    if (!rollField) continue;

    let subject = currentSubject;
    if (subject === 'Aptitude - I - DILR') {
      const mode = modeIdx !== -1 && cols[modeIdx] ? cols[modeIdx].trim() : '';
      if (mode.toLowerCase().includes('mcq')) {
        subject = 'Aptitude - I - DILR (MCQ)';
      } else {
        subject = 'Aptitude - I - DILR (Theory)';
      }
    }

    // Capture additional headers as dynamic keys
    const extraData = {};
    extraFields.forEach(f => {
      if (cols[f.index]) {
        extraData[f.key] = cols[f.index];
      }
    });

    const parts = rollField.split(',').map(p => p.trim());
    parts.forEach(part => {
      if (part.includes(' to ')) {
        const rollParts = part.split(' to ');
        if (rollParts.length < 2) return;
        try {
          const startRoll = BigInt(rollParts[0].trim());
          const endRoll = BigInt(rollParts[1].trim());

          Array.from(students.values()).forEach(student => {
            try {
              const studentRoll = BigInt(student.rollNo);
              if (studentRoll >= startRoll && studentRoll <= endRoll) {
                student.theory.push({
                  date: currentDate,
                  subject,
                  time: currentTime,
                  location: currentLocation || 'TBD',
                  type: 'Theory',
                  ...extraData
                });
              }
            } catch (e) {}
          });
        } catch (e) {}
      } else {
        try {
          const singleRoll = BigInt(part);
          Array.from(students.values()).forEach(student => {
            try {
              if (BigInt(student.rollNo) === singleRoll) {
                student.theory.push({
                  date: currentDate,
                  subject,
                  time: currentTime,
                  location: currentLocation || 'TBD',
                  type: 'Theory',
                  ...extraData
                });
              }
            } catch (e) {}
          });
        } catch (e) {}
      }
    });
  }
}

/**
 * Parses and maps Practical (viva grid) CSV to student profiles.
 */
function parsePractical(csvText, students, markers = {}) {
  const lines = getLines(csvText);
  if (lines.length === 0) return;

  const dayRowMarker = markers.dayRowIdentifier || 'Day';
  const panelMarker = markers.panelRowIdentifier || 'Slot No.';
  const timeMarker = markers.timeRowIdentifier || 'Time';
  const venueMarker = markers.venueRowIdentifier || 'Venue';

  let currentDate = '';
  const subjectMap = new Map();
  const venueMap = new Map();
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

  for (let i = 0; i < lines.length; i++) {
    const row = parseCsvLine(lines[i]);
    if (!row || row.length === 0) continue;

    // 1. Detect Date Row
    const dateCell = (row[0] && row[0].includes(dayRowMarker)) ? row[0] 
                   : (row[1] && row[1].includes(dayRowMarker) ? row[1] : null);
    if (dateCell) {
      currentDate = dateCell.trim();
      venueMap.clear();
      subjectMap.clear();
      tempPanels.clear();
      continue;
    }

    // 2. Detect Venue Row
    const isVenueRow = (row[0] && row[0].includes(venueMarker)) || (row[1] && row[1].includes(venueMarker));
    if (isVenueRow) {
      row.forEach((cell, idx) => {
        if (idx >= 2 && cell && cell.trim() !== '' && cell.trim() !== 'NA') {
          venueMap.set(idx, cell.trim());
        }
      });
      if (!(row[0] && row[0].includes(panelMarker))) {
        continue;
      }
    }

    // 3. Detect Panel/Slot Row
    if (row[0] && row[0].includes(panelMarker)) {
      row.forEach((cell, idx) => {
        if (idx >= 2 && cell) {
          tempPanels.set(idx, cell.trim());
        }
      });
      continue;
    }

    // 4. Detect Time/Subject Row
    if (row[1] && row[1].includes(timeMarker)) {
      row.forEach((cell, idx) => {
        if (idx >= 2 && cell) {
          const parsed = parsePanelHeader(cell);
          const panelName = tempPanels.get(idx) || parsed.panel || 'Unknown';
          subjectMap.set(idx, {
            subject: parsed.subject,
            panel: panelName,
            professor: parsed.professor
          });
        }
      });
      continue;
    }

    // 5. Process Student Row
    if (!currentDate) continue;
    const time = row[1];
    
    // Validate that it looks like a time row (contains a time range indicator)
    if (!time || (!time.includes('M') && !time.includes('-'))) continue;
    // Ensure slot number exists
    if (!row[0] || (isNaN(parseInt(row[0].trim())) && row[0].trim() !== '')) continue;

    for (let j = 2; j < row.length; j++) {
      const studentName = row[j];
      if (studentName && studentName.length > 2 && studentName !== 'NA' && studentName !== 'Break') {
        const normalizeName = (n) => n.replace(/\u00A0/g, ' ').replace(/\s+/g, ' ').trim().toLowerCase();
        const normName = normalizeName(studentName);

        const student = Array.from(students.values()).find(s =>
          normalizeName(s.name) === normName
        );

        if (student) {
          const headerInfo = subjectMap.get(j) || { subject: 'Unknown', panel: 'Unknown', professor: '' };
          const baseLocation = venueMap.get(j) || 'TBD';
          const professor = headerInfo.professor || '';
          
          let location = baseLocation;
          if (professor) {
            location = `${baseLocation} (${professor})`;
          }

          student.practical.push({
            date: currentDate,
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
}

/**
 * Queries Gemini AI to detect layout markers from CSV samples.
 */
async function getMarkersWithGemini(mappingCsv, theoryCsv, practicalCsv, apiKey) {
  if (!apiKey) throw new Error('Gemini API Key is required for AI-Assisted Sync.');

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: 'gemini-1.5-flash',
    generationConfig: { responseMimeType: 'application/json' }
  });

  const getSample = (csvText) => csvText.split(/\r?\n/).slice(0, 15).join('\n');
  const mappingSample = getSample(mappingCsv);
  const theorySample = getSample(theoryCsv);
  const practicalSample = getSample(practicalCsv);

  const prompt = `
You are a layout structure detection engine for a college scheduling system.
We have three CSVs containing exam schedules:
1. Mapping CSV: Maps roll numbers to student names.
2. Theory Exam CSV: Contains theory exam dates, subjects, time slots, locations, and range of roll numbers.
3. Practical Exam CSV: Contains practical slots in a grid. Rows represent time slots, columns represent panels/exams, and cell values are student names.

Here are samples of the three CSVs:

=== MAPPING CSV SAMPLE ===
${mappingSample}

=== THEORY CSV SAMPLE ===
${theorySample}

=== PRACTICAL CSV SAMPLE ===
${practicalSample}

Analyze the headers and layout structures of these samples.
Identify the correct 0-based column indices and layout patterns to parse them.
Return a JSON object conforming exactly to this structure:
{
  "theory": {
    "headerRow": <number>, // Row index (0-based) where headers are defined (e.g. Date, Subject, Time...)
    "dateIndex": <number>, // Column index of Date
    "subjectIndex": <number>, // Column index of Subject
    "timeIndex": <number>, // Column index of Time Slot
    "locationIndex": <number>, // Column index of Location/Classroom details
    "rollIndex": <number> // Column index of Roll Range (e.g. "123 to 145")
  },
  "practical": {
    "dayRowIdentifier": "<string>", // The substring that identifies a Date/Day row (e.g., "Day" or "Date")
    "panelRowIdentifier": "<string>", // The substring identifying the Panel/Slot No row (e.g., "Slot No.")
    "timeRowIdentifier": "<string>", // The substring identifying the Time/Subject row (e.g., "Time")
    "venueRowIdentifier": "<string>" // The substring identifying the Venue/Location row (e.g., "Venue")
  }
}
`;

  const response = await model.generateContent(prompt);
  const responseText = response.response.text();
  try {
    return JSON.parse(responseText.trim());
  } catch (error) {
    console.error('Failed to parse Gemini JSON response:', responseText);
    throw new Error('Gemini did not return valid JSON mapping metadata.');
  }
}

/**
 * Combines Mapping, Theory, and Practical CSV inputs into the student array.
 */
async function parseCsvData(mappingCsv, theoryCsv, practicalCsv, options = {}) {
  let markers = {};

  if (options.useAi) {
    try {
      console.log('🤖 AI Sync Enabled: Consulting Gemini to detect schema structure...');
      markers = await getMarkersWithGemini(mappingCsv, theoryCsv, practicalCsv, options.geminiApiKey);
      console.log('🤖 Gemini Layout Analysis Results:', JSON.stringify(markers, null, 2));
    } catch (err) {
      console.warn('⚠️ AI Ingestion warning: Gemini layout analysis failed. Falling back to Heuristics.', err.message);
    }
  }

  // 1. Process mapping
  const students = parseMapping(mappingCsv);
  console.log(`Parsed ${students.size} students from Mapping CSV.`);

  // 2. Process Theory
  parseTheory(theoryCsv, students, markers.theory || {});
  console.log('Parsed Theory exams successfully.');

  // 3. Process Practical
  parsePractical(practicalCsv, students, markers.practical || {});
  console.log('Parsed Practical exams successfully.');

  return Array.from(students.values());
}

module.exports = {
  getCsvUrl,
  fetchCsvText,
  parseCsvData
};
