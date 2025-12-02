// Batch-update author publication metrics from OpenAlex into data/authors.csv
// Usage:
//   node scripts/update-authors-from-openalex.cjs
//
// For each row in data/authors.csv with a non-empty `openalex_id`, this script:
//   - fetches the author from https://api.openalex.org/authors/{id}
//   - updates total_publications, total_citations, and h_index
// All other columns are preserved as-is.

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const csvPath = path.join(ROOT, "data", "authors.csv");
const BASE_URL = "https://api.openalex.org";

const readCsv = (filePath) => {
  if (!fs.existsSync(filePath)) return { headers: [], rows: [] };

  const raw = fs.readFileSync(filePath, "utf8");
  const lines = raw
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length < 2) return { headers: [], rows: [] };

  const headers = lines[0].split(",").map((h) => h.trim());
  const rows = lines.slice(1).map((line) => {
    const values = line.split(",").map((v) => v.trim());
    const record = {};
    headers.forEach((header, idx) => {
      record[header] = values[idx] ?? "";
    });
    return record;
  });

  return { headers, rows };
};

const writeCsv = (filePath, headers, rows) => {
  const lines = [];
  lines.push(headers.join(","));
  for (const row of rows) {
    const values = headers.map((h) => (row[h] ?? "").toString());
    lines.push(values.join(","));
  }
  fs.writeFileSync(filePath, lines.join("\n"), "utf8");
};

const normalizeOpenAlexId = (raw) => {
  if (!raw) return "";
  const trimmed = raw.trim();
  if (!trimmed) return "";
  // Accept full URLs like https://openalex.org/A123456789
  const parts = trimmed.split("/");
  return parts[parts.length - 1];
};

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const updateFromOpenAlex = async () => {
  const { headers, rows } = readCsv(csvPath);
  if (headers.length === 0) {
    console.error("No data/authors.csv found or file is empty.");
    process.exit(1);
  }

  // Ensure required columns exist
  const required = ["total_publications", "total_citations", "h_index"];
  for (const col of required) {
    if (!headers.includes(col)) {
      headers.push(col);
    }
  }

  let updatedCount = 0;

  for (const row of rows) {
    const openAlexRaw = row.openalex_id || row.openAlexId;
    const openAlexId = normalizeOpenAlexId(openAlexRaw);
    if (!openAlexId) continue;

    try {
      const url = `${BASE_URL}/authors/${openAlexId}?mailto=research@example.com`;
      const res = await fetch(url);
      if (!res.ok) {
        console.warn(`Failed to fetch ${openAlexId}: HTTP ${res.status}`);
        continue;
      }
      const data = await res.json();

      row.total_publications = String(data.works_count ?? row.total_publications ?? "");
      row.total_citations = String(data.cited_by_count ?? row.total_citations ?? "");

      const summaryStats = data.summary_stats || {};
      row.h_index = String(
        summaryStats.h_index ?? data.h_index ?? row.h_index ?? "",
      );

      updatedCount += 1;
      // Be polite to the API
      await delay(200);
    } catch (err) {
      console.warn(`Error updating ${openAlexId}:`, err.message || err);
    }
  }

  writeCsv(csvPath, headers, rows);
  console.log(`Updated ${updatedCount} authors in data/authors.csv from OpenAlex.`);
};

updateFromOpenAlex().catch((err) => {
  console.error("Unexpected error:", err);
  process.exit(1);
});
