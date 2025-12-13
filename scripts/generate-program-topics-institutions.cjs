// Aggregate OpenAlex-derived works, topics, and institutions into per-program,
// per-year stats for use in dashboard charts.
//
// Usage:
//   node scripts/generate-program-topics-institutions.cjs
//
// Reads:
//   data/works.csv
//   data/work_topics.csv
//   data/work_institutions.csv
// Writes:
//   src/data/programTopicsInstitutions.generated.ts

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const worksCsvPath = path.join(ROOT, "data", "works.csv");
const workTopicsCsvPath = path.join(ROOT, "data", "work_topics.csv");
const workInstitutionsCsvPath = path.join(ROOT, "data", "work_institutions.csv");
const outPath = path.join(
  ROOT,
  "src",
  "data",
  "programTopicsInstitutions.generated.ts",
);

const parseCsvLine = (line) => {
  const result = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];

    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (ch === "," && !inQuotes) {
      result.push(current);
      current = "";
      continue;
    }

    current += ch;
  }

  result.push(current);
  return result;
};

const readCsv = (filePath) => {
  if (!fs.existsSync(filePath)) return { headers: [], rows: [] };

  const raw = fs.readFileSync(filePath, "utf8");
  const lines = raw
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length < 2) return { headers: [], rows: [] };

  const headers = parseCsvLine(lines[0]).map((h) => h.trim());
  const rows = lines.slice(1).map((line) => {
    const values = parseCsvLine(line).map((v) => v.trim());
    const record = {};
    headers.forEach((header, idx) => {
      record[header] = values[idx] ?? "";
    });
    return record;
  });

  return { headers, rows };
};

const main = () => {
  const { headers: workHeaders, rows: workRows } = readCsv(worksCsvPath);
  if (!workHeaders.length) {
    console.error("No data/works.csv found or file is empty.");
    process.exit(1);
  }

  const { headers: topicHeaders, rows: topicRows } = readCsv(workTopicsCsvPath);
  const { headers: instHeaders, rows: instRows } = readCsv(workInstitutionsCsvPath);

  if (!topicHeaders.length) {
    console.warn("Warning: data/work_topics.csv not found or empty; topic counts will be zero.");
  }
  if (!instHeaders.length) {
    console.warn(
      "Warning: data/work_institutions.csv not found or empty; institution counts will be zero.",
    );
  }

  const workLower = workHeaders.map((h) => h.toLowerCase());
  const idxWorkId = workLower.indexOf("work_id");
  const idxProgram = workLower.indexOf("program");
  const idxYear = workLower.indexOf("year");

  if (idxWorkId === -1 || idxProgram === -1 || idxYear === -1) {
    console.error("data/works.csv must have work_id, program, and year columns.");
    process.exit(1);
  }

  const topicsByWork = new Set();
  if (topicHeaders.length) {
    const topicLower = topicHeaders.map((h) => h.toLowerCase());
    const idxTopicWorkId = topicLower.indexOf("work_id");
    if (idxTopicWorkId === -1) {
      console.warn("data/work_topics.csv missing work_id column; skipping topic stats.");
    } else {
      for (const row of topicRows) {
        const workId = row[topicHeaders[idxTopicWorkId]] || "";
        if (!workId) continue;
        topicsByWork.add(workId);
      }
    }
  }

  const institutionsByWork = new Map();
  if (instHeaders.length) {
    const instLower = instHeaders.map((h) => h.toLowerCase());
    const idxInstWorkId = instLower.indexOf("work_id");
    const idxInstId = instLower.indexOf("institution_id");

    if (idxInstWorkId === -1 || idxInstId === -1) {
      console.warn(
        "data/work_institutions.csv missing work_id or institution_id; skipping institution stats.",
      );
    } else {
      for (const row of instRows) {
        const workId = row[instHeaders[idxInstWorkId]] || "";
        const instId = row[instHeaders[idxInstId]] || "";
        if (!workId || !instId) continue;
        const set = institutionsByWork.get(workId) || new Set();
        set.add(instId);
        institutionsByWork.set(workId, set);
      }
    }
  }

  const aggregate = new Map();

  for (const row of workRows) {
    const workId = row[workHeaders[idxWorkId]] || "";
    const program = (row[workHeaders[idxProgram]] || "").trim();
    const yearNum = Number(row[workHeaders[idxYear]] || "");

    if (!workId || !program || !Number.isFinite(yearNum) || yearNum <= 0) continue;

    const hasTopics = topicsByWork.has(workId);
    const instSet = institutionsByWork.get(workId) || new Set();
    const institutionCount = instSet.size;

    const key = `${program}:${yearNum}`;
    const existing = aggregate.get(key) || {
      program,
      year: yearNum,
      worksWithTopics: 0,
      institutionLinks: 0,
    };

    if (hasTopics) existing.worksWithTopics += 1;
    if (institutionCount > 0) existing.institutionLinks += institutionCount;

    aggregate.set(key, existing);
  }

  const records = Array.from(aggregate.values()).sort((a, b) => {
    if (a.program === b.program) return a.year - b.year;
    return a.program.localeCompare(b.program);
  });

  const fileContents =
    "// AUTO-GENERATED FILE. DO NOT EDIT.\n" +
    "// Generated from data/works.csv, data/work_topics.csv, and data/work_institutions.csv by scripts/generate-program-topics-institutions.cjs\n\n" +
    "export interface ProgramTopicsInstitutionsYear {\n" +
    "  program: string;\n" +
    "  year: number;\n" +
    "  worksWithTopics: number;\n" +
    "  institutionLinks: number;\n" +
    "}\n\n" +
    `export const programTopicsInstitutionsByYear: ProgramTopicsInstitutionsYear[] = ${JSON.stringify(
      records,
      null,
      2,
    )};\n`;

  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, fileContents, "utf8");

  console.log(
    "Generated",
    path.relative(ROOT, outPath),
    "from",
    path.relative(ROOT, worksCsvPath),
    ",",
    path.relative(ROOT, workTopicsCsvPath),
    "and",
    path.relative(ROOT, workInstitutionsCsvPath),
  );
};

main();

