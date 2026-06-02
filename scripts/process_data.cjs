const fs = require('fs');
const path = require('path');
const { parseCsvData } = require('../server/utils/parser.cjs');

// File paths
const csvDir = path.normalize(path.join(__dirname, '../csv_data'));
const OUTPUT_JSON = path.normalize(path.join(__dirname, '../src/data/exam_data.json'));

async function processData() {
  console.log('Processing all batches (2023-27, 2024-28, 2025-29)...');

  const batches = ['2023-27', '2024-28', '2025-29'];
  let allStudents = [];

  for (const batch of batches) {
    console.log(`\n--- Parsing Batch ${batch} ---`);
    const mappingFile = path.join(csvDir, `mapping_${batch}.csv`);
    const theoryFile = path.join(csvDir, `theory_${batch}.csv`);
    const practicalFile = path.join(csvDir, `practical_${batch}.csv`);

    if (!fs.existsSync(theoryFile) || !fs.existsSync(practicalFile)) {
      console.warn(`⚠️ Schedule files for batch ${batch} not found. Skipping.`);
      continue;
    }

    const mappingCsv = fs.existsSync(mappingFile) ? fs.readFileSync(mappingFile, 'utf8') : '';
    const theoryCsv = fs.readFileSync(theoryFile, 'utf8');
    const practicalCsv = fs.readFileSync(practicalFile, 'utf8');

    try {
      const students = await parseCsvData(mappingCsv, theoryCsv, practicalCsv, {
        batch,
        useAi: false
      });
      console.log(`✅ Successfully processed ${students.length} students for batch ${batch}.`);
      allStudents = allStudents.concat(students);
    } catch (err) {
      console.error(`🔴 Error processing batch ${batch}:`, err);
    }
  }

  // Write merged output
  const outputDir = path.dirname(OUTPUT_JSON);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  fs.writeFileSync(OUTPUT_JSON, JSON.stringify(allStudents, null, 2));
  console.log(`\n🎉 Done! Wrote total ${allStudents.length} student records from all batches to ${OUTPUT_JSON}`);
}

processData();
