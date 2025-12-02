// Classify works into themes and areas using simple keyword matching.
//
// Usage:
//   node scripts/classify-works.cjs
//
// This script:
//   - Reads cached OpenAlex JSON files from public/author-data (created by cache-openalex-works.cjs)
//   - For each work, looks at the title (and venue) and matches against keyword lists
//   - Keywords are loaded from:
//       data/themes.csv  (column "Keywords")
//       data/areas.csv   (column "Keywords")
//   - Writes data/works-classified.csv with extra columns:
//       themes (theme codes from data/themes.csv)
//       areas  (area codes from data/areas.csv)
//
// To configure classification, add a "Keywords" column to themes.csv and areas.csv
// with semicolon-separated phrases, e.g.:
//   Code,Theme,Definition,Keywords
//   ER,Enhanced Recovery,"...",enhanced recovery; EOR; polymer flood

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const authorDataDir = path.join(ROOT, "public", "author-data");
const authorsCsvPath = path.join(ROOT, "data", "authors.csv");
const outCsvPath = path.join(ROOT, "data", "works-classified.csv");
const themesCsvPath = path.join(ROOT, "data", "themes.csv");
const areasCsvPath = path.join(ROOT, "data", "areas.csv");

const escapeCsv = (value) => {
  const str = value == null ? "" : String(value);
  if (str === "") return "";
  const cleaned = str.replace(/\r?\n/g, " ");
  if (/[",]/.test(cleaned)) {
    return `"${cleaned.replace(/"/g, '""')}"`;
  }
  return cleaned;
};

const readAuthorsCsv = (filePath) => {
  if (!fs.existsSync(filePath)) return new Map();

  const raw = fs.readFileSync(filePath, "utf8");
  const lines = raw
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length < 2) return new Map();

  const headers = lines[0].split(",").map((h) => h.trim());
  const rows = lines.slice(1).map((line) => {
    const values = line.split(",").map((v) => v.trim());
    const record = {};
    headers.forEach((header, idx) => {
      record[header] = values[idx] ?? "";
    });
    return record;
  });

  const map = new Map();
  for (const row of rows) {
    const id = normalizeOpenAlexId(row.openalex_id || row.openAlexId);
    if (!id) continue;
    map.set(id, row);
  }
  return map;
};

const readKeywordMapFromCsv = (filePath) => {
  const map = {};

  if (!fs.existsSync(filePath)) {
    console.warn(`No CSV found at ${filePath}, skipping keywords.`);
    return map;
  }

  const raw = fs.readFileSync(filePath, "utf8");
  const lines = raw
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length < 2) {
    console.warn(`CSV at ${filePath} has no data rows, skipping keywords.`);
    return map;
  }

  const headers = lines[0].split(",").map((h) => h.trim());
  const lowerHeaders = headers.map((h) => h.toLowerCase());

  const idxCode = lowerHeaders.indexOf("code");
  const idxKeywords = lowerHeaders.indexOf("keywords");

  if (idxCode === -1 || idxKeywords === -1) {
    console.warn(
      `CSV at ${filePath} must have "Code" (or "CODE") and "Keywords" columns. No keywords loaded.`,
    );
    return map;
  }

  for (const line of lines.slice(1)) {
    const values = line.split(",").map((v) => v.trim());
    const code = values[idxCode];
    const kwCell = values[idxKeywords] || "";
    if (!code || !kwCell) continue;

    const keywords = kwCell
      .split(/[;|]/)
      .map((k) => k.trim())
      .filter((k) => k.length > 0);

    if (!keywords.length) continue;
    map[code] = keywords;
  }

  return map;
};

const normalizeOpenAlexId = (raw) => {
  if (!raw) return "";
  const trimmed = String(raw).trim();
  if (!trimmed) return "";
  const parts = trimmed.split("/");
  return parts[parts.length - 1];
};

const classifyFromKeywords = (text, keywordMap) => {
  const lower = text.toLowerCase();
  const hits = new Set();

  for (const [code, keywords] of Object.entries(keywordMap)) {
    for (const kw of keywords) {
      if (!kw) continue;
      if (lower.includes(kw.toLowerCase())) {
        hits.add(code);
        break;
      }
    }
  }

  return Array.from(hits).sort();
};

const main = () => {
  if (!fs.existsSync(authorDataDir)) {
    console.error(`No author-data directory at ${authorDataDir}. Run cache-openalex-works.cjs first.`);
    process.exit(1);
  }

  const authorsByOpenAlexId = readAuthorsCsv(authorsCsvPath);
  const themeKeywordMap = readKeywordMapFromCsv(themesCsvPath);
  const areaKeywordMap = readKeywordMapFromCsv(areasCsvPath);

  const headers = [
    "work_id",
    "author_openalex_id",
    "program",
    "title",
    "year",
    "venue",
    "citations",
    "coauthor_openalex_ids",
    "themes",
    "areas",
  ];

  const files = fs.readdirSync(authorDataDir).filter((f) => f.toLowerCase().endsWith(".json"));

  const lines = [];
  lines.push(headers.join(","));

  let total = 0;

  for (const file of files) {
    const fullPath = path.join(authorDataDir, file);
    const idFromFile = path.basename(file, ".json");

    let payload;
    try {
      const raw = fs.readFileSync(fullPath, "utf8");
      payload = JSON.parse(raw);
    } catch (err) {
      console.warn(`Skipping invalid JSON file ${file}:`, err && err.message ? err.message : err);
      continue;
    }

    const details = payload.details || {};
    const works = Array.isArray(payload.works) ? payload.works : [];
    const openAlexId = normalizeOpenAlexId(details.id || idFromFile);
    const authorRow = authorsByOpenAlexId.get(openAlexId) || {};

    const program = authorRow.program || authorRow.groupId || "";

    for (const work of works) {
      const title = work.title || "";
      const venue = work.primary_location?.source?.display_name || "";
      const textForClassification = `${title} ${venue}`;

      const themeCodes = classifyFromKeywords(textForClassification, themeKeywordMap);
      const areaCodes = classifyFromKeywords(textForClassification, areaKeywordMap);

      const authorships = Array.isArray(work.authorships) ? work.authorships : [];
      const coauthorIds = Array.from(
        new Set(
          authorships
            .map((a) => normalizeOpenAlexId(a.author && a.author.id))
            .filter((id) => id && id !== openAlexId),
        ),
      );

      const row = [
        work.id || "",
        openAlexId,
        program,
        title,
        work.publication_year ?? "",
        venue,
        work.cited_by_count ?? "",
        coauthorIds.join("|"),
        themeCodes.join("|"),
        areaCodes.join("|"),
      ];

      lines.push(row.map(escapeCsv).join(","));
      total += 1;
    }
  }

  fs.writeFileSync(outCsvPath, lines.join("\n"), "utf8");
  console.log(`Classified ${total} works -> ${path.relative(ROOT, outCsvPath)}`);
};

main();
