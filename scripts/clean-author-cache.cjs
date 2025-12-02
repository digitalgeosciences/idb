// Remove cached author JSON files for authors that are no longer in data/authors.csv
// Usage:
//   node scripts/clean-author-cache.cjs
//
// This script:
//   - Reads all openalex_id values from data/authors.csv
//   - Lists JSON files in public/author-data
//   - Deletes any JSON file whose base name (e.g. A123456789) is not present in the CSV

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const authorsCsvPath = path.join(ROOT, "data", "authors.csv");
const authorDataDir = path.join(ROOT, "public", "author-data");

const normalizeOpenAlexId = (raw) => {
  if (!raw) return "";
  const trimmed = String(raw).trim();
  if (!trimmed) return "";
  const parts = trimmed.split("/");
  return parts[parts.length - 1];
};

const readAuthorIdsFromCsv = (filePath) => {
  if (!fs.existsSync(filePath)) {
    console.warn(`No authors CSV found at ${filePath}`);
    return new Set();
  }

  const raw = fs.readFileSync(filePath, "utf8");
  const lines = raw
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length < 2) return new Set();

  const headers = lines[0].split(",").map((h) => h.trim());
  const idxOpenAlex = headers.indexOf("openalex_id");
  if (idxOpenAlex === -1) {
    console.warn("No openalex_id column found in data/authors.csv");
    return new Set();
  }

  const ids = new Set();
  for (const line of lines.slice(1)) {
    const values = line.split(",").map((v) => v.trim());
    const rawId = values[idxOpenAlex] ?? "";
    const id = normalizeOpenAlexId(rawId);
    if (id) ids.add(id);
  }

  return ids;
};

const main = () => {
  const validIds = readAuthorIdsFromCsv(authorsCsvPath);

  if (!fs.existsSync(authorDataDir)) {
    console.log(`No author-data directory at ${authorDataDir}, nothing to clean.`);
    return;
  }

  const files = fs.readdirSync(authorDataDir);
  let removed = 0;
  let kept = 0;

  for (const file of files) {
    if (!file.toLowerCase().endsWith(".json")) continue;
    const base = path.basename(file, ".json");
    if (validIds.has(base)) {
      kept += 1;
      continue;
    }

    const fullPath = path.join(authorDataDir, file);
    fs.unlinkSync(fullPath);
    removed += 1;
    console.log(`Removed stale cache file: ${path.relative(ROOT, fullPath)}`);
  }

  console.log(
    `Author cache cleanup complete. Kept ${kept} file(s), removed ${removed} stale file(s).`,
  );
};

main();

