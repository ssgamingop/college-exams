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
  // SSRF Protection: restrict requests to Google Sheets domains
  try {
    const parsedUrl = new URL(url);
    if (parsedUrl.hostname !== 'docs.google.com' && parsedUrl.hostname !== 'google.com' && !parsedUrl.hostname.endsWith('.google.com')) {
      throw new Error('SSRF Protection: Only Google Sheets links are allowed.');
    }
  } catch (err) {
    throw new Error('SSRF Protection: Invalid URL structure.');
  }

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

  // Auto-scan for header row (up to 5 lines)
  let headerRowIdx = 0;
  for (let i = 0; i < Math.min(lines.length, 5); i++) {
    const row = parseCsvLine(lines[i]);
    if (row.some(c => {
      const l = c.toLowerCase();
      return l.includes('roll') || l.includes('urn') || l.includes('name') || l.includes('student') || l.includes('id');
    })) {
      headerRowIdx = i;
      break;
    }
  }

  const headers = parseCsvLine(lines[headerRowIdx]);
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
  for (let i = headerRowIdx + 1; i < lines.length; i++) {
    const cols = parseCsvLine(lines[i]);
    if (cols.length > Math.max(rollColIdx, nameColIdx)) {
      const rollNo = cols[rollColIdx].trim();
      const name = cols[nameColIdx].trim();
      
      const isHeaderLabel = rollNo.toLowerCase().includes('roll') || 
                            rollNo.toLowerCase().includes('sr. no') || 
                            rollNo.toLowerCase().includes('urn') ||
                            rollNo.toLowerCase().includes('id');

      if (rollNo && name && rollNo !== '__proto__' && rollNo !== 'constructor' && !isHeaderLabel) {
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
 * Shortens and standardizes subject names for consistency.
 */
function cleanSubjectName(subject) {
  if (!subject) return '';
  const clean = subject.replace(/\s+/g, ' ').trim();
  
  if (/dsa\s*3/i.test(clean)) {
    return 'DSA 3';
  }
  if (/software testing|stqa/i.test(clean)) {
    return 'STQA';
  }
  if (/amazon web service|aws|gcp/i.test(clean)) {
    return 'AWS';
  }
  if (/devops/i.test(clean)) {
    return 'DevOps';
  }
  if (/system design/i.test(clean)) {
    return 'System Design';
  }
  return clean;
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
    
    // Ensure we have at least the columns up to the roll field (required for mapping)
    const requiredIdx = Math.max(subjectIdx, timeIdx, rollIdx);
    if (cols.length < requiredIdx + 1) continue;

    const dateVal = cols[dateIdx] || '';
    const subjVal = cols[subjectIdx] || '';
    const timeVal = cols[timeIdx] || '';
    const locVal = cols[locationIdx] || '';
    const rollField = cols[rollIdx] || '';

    // Skip sub-header rows stacked inside the CSV
    if (dateVal.toLowerCase().trim() === 'date' || subjVal.toLowerCase().trim() === 'subject' || rollField.toLowerCase().trim() === 'roll number') {
      continue;
    }

    if (dateVal) currentDate = dateVal;
    
    // Reset carried over location when a new subject begins to prevent leakage
    if (subjVal) {
      currentSubject = subjVal;
      currentLocation = '';
    }
    
    if (timeVal) currentTime = timeVal;
    if (locVal) currentLocation = locVal;

    if (!rollField) continue;

    let subject = currentSubject;
    if (subject.startsWith('Aptitude - I - DILR')) {
      const mode = modeIdx !== -1 && cols[modeIdx] ? cols[modeIdx].trim() : '';
      if (mode.toLowerCase().includes('mcq')) {
        subject = 'Aptitude - I - DILR (MCQ)';
      } else {
        subject = 'Aptitude - I - DILR (Theory)';
      }
    } else {
      subject = cleanSubjectName(subject);
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
      const rangeSeparator = part.includes(' to ') ? ' to ' : 
                             part.includes('-') ? '-' : 
                             part.includes('–') ? '–' : 
                             part.includes('—') ? '—' : null;
      if (rangeSeparator) {
        const rollParts = part.split(rangeSeparator);
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
            subject: cleanSubjectName(headerInfo.subject),
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
 * Queries Groq API (using Llama 3.3 70B) to detect layout markers from CSV samples.
 */
async function getMarkersWithGroq(mappingCsv, theoryCsv, practicalCsv, apiKey) {
  if (!apiKey) throw new Error('Groq API Key is required for AI-Assisted Sync.');

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
    "headerRow": 2, // Row index (0-based) where headers are defined (e.g. Date, Subject, Time...)
    "dateIndex": 0, // Column index of Date
    "subjectIndex": 1, // Column index of Subject
    "timeIndex": 3, // Column index of Time Slot
    "locationIndex": 6, // Column index of Location/Classroom details
    "rollIndex": 4 // Column index of Roll Range (e.g. "123 to 145")
  },
  "practical": {
    "dayRowIdentifier": "Day", // The substring that identifies a Date/Day row (e.g., "Day" or "Date")
    "panelRowIdentifier": "Slot No.", // The substring identifying the Panel/Slot No row (e.g., "Slot No.")
    "timeRowIdentifier": "Time", // The substring identifying the Time/Subject row (e.g., "Time")
    "venueRowIdentifier": "Venue" // The substring identifying the Venue/Location row (e.g., "Venue")
  }
}

Respond ONLY with a valid JSON object. Do not include any explanation or markdown formatting outside the JSON.
`;

  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.1
    })
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(`Groq API Error: ${errData.error?.message || response.statusText}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error('Groq did not return any completion content.');
  }

  try {
    return JSON.parse(content.trim());
  } catch (error) {
    console.error('Failed to parse Groq JSON response:', content);
    throw new Error('Groq did not return valid JSON mapping metadata.');
  }
}

/**
 * Dynamically generates student mappings from the practical schedule if mapping is not provided.
 */
function generateDynamicMapping(practicalCsv, batch) {
  const lines = getLines(practicalCsv);
  const names = new Set();
  
  const dayRowMarker = 'Day';
  const panelMarker = 'Slot No.';
  const timeMarker = 'Time';
  const venueMarker = 'Venue';

  for (let i = 0; i < lines.length; i++) {
    const row = parseCsvLine(lines[i]);
    if (!row || row.length === 0) continue;
    
    // Skip date, venue, panel and time slots rows
    const dateCell = (row[0] && row[0].includes(dayRowMarker)) ? row[0] 
                   : (row[1] && row[1].includes(dayRowMarker) ? row[1] : null);
    if (dateCell) continue;
    if ((row[0] && row[0].includes(venueMarker)) || (row[1] && row[1].includes(venueMarker))) continue;
    if (row[0] && row[0].includes(panelMarker)) continue;
    if (row[1] && row[1].includes(timeMarker)) continue;

    const time = row[1];
    if (!time || (!time.includes('M') && !time.includes('-'))) continue;

    for (let j = 2; j < row.length; j++) {
      const cell = row[j];
      if (cell && cell.length > 2 && cell !== 'NA' && cell !== 'Break' && cell !== 'Break (1:15 PM – 2:00 PM)') {
        names.add(cell.replace(/\u00A0/g, ' ').replace(/\s+/g, ' ').trim());
      }
    }
  }

  // Deduce starting roll number based on batch name
  let startRoll = 150096725001n;
  const match = batch.match(/^20?(\d{2})-(\d{2})$/);
  if (match) {
    const entryYear = match[1]; // e.g. "23" or "24"
    startRoll = BigInt(`1500967${entryYear}001`);
  }

  const sortedNames = Array.from(names).sort();
  const students = new Map();
  sortedNames.forEach((name, index) => {
    const rollNo = (startRoll + BigInt(index)).toString();
    students.set(rollNo, {
      rollNo,
      name,
      theory: [],
      practical: []
    });
  });

  return students;
}

/**
 * Combines Mapping, Theory, and Practical CSV inputs into the student array.
 */
async function parseCsvData(mappingCsv, theoryCsv, practicalCsv, options = {}) {
  let markers = {};

  if (options.useAi && mappingCsv && mappingCsv.trim().length > 0) {
    try {
      console.log('🤖 AI Sync Enabled: Consulting Groq to detect schema structure...');
      markers = await getMarkersWithGroq(mappingCsv, theoryCsv, practicalCsv, options.groqApiKey);
      console.log('🤖 Groq Layout Analysis Results:', JSON.stringify(markers, null, 2));
    } catch (err) {
      console.warn('⚠️ AI Ingestion warning: Groq layout analysis failed. Falling back to Heuristics.', err.message);
    }
  }

  // 1. Process mapping or dynamically generate it
  let students;
  if (!mappingCsv || mappingCsv.trim().length === 0 || mappingCsv.trim() === 'Roll Number,Name of student') {
    console.log(`⚠️ Mapping CSV not provided. Dynamically generating mapping from practical schedule...`);
    students = generateDynamicMapping(practicalCsv, options.batch || '2025-29');
  } else {
    students = parseMapping(mappingCsv);
  }
  console.log(`Parsed ${students.size} students for batch ${options.batch || '2025-29'}.`);

  // 2. Process Theory
  parseTheory(theoryCsv, students, markers.theory || {});
  console.log('Parsed Theory exams successfully.');

  // 3. Process Practical
  parsePractical(practicalCsv, students, markers.practical || {});
  console.log('Parsed Practical exams successfully.');

  // Assign batch attribute to each student
  const batchName = options.batch || '2025-29';
  students.forEach(student => {
    student.batch = batchName;
  });

  return Array.from(students.values());
}

module.exports = {
  getCsvUrl,
  fetchCsvText,
  parseCsvData
};
