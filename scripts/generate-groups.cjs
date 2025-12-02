// Simple Node script to turn data/affiliations.csv into src/data/groups.generated.ts
// Run with: npm run generate:groups

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
// Source data now lives in affiliations.csv (one row per program/affiliation pair)
const csvPath = path.join(ROOT, "data", "affiliations.csv");
const outPath = path.join(ROOT, "src", "data", "groups.generated.ts");

const readCsv = (filePath) => {
  if (!fs.existsSync(filePath)) return [];

  const raw = fs.readFileSync(filePath, "utf8");
  const lines = raw
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length < 2) return [];

  const headers = lines[0].split(",").map((h) => h.trim());

  return lines.slice(1).map((line) => {
    const values = line.split(",").map((v) => v.trim());
    const record = {};
    headers.forEach((header, idx) => {
      record[header] = values[idx] ?? "";
    });
    return record;
  });
};

const rows = readCsv(csvPath);

// Map the affiliation/program schema into the GroupRecord shape
// expected by the dashboard.
const groups = rows.map((row) => {
  const programShort = row.program_short || "";
  const programName = row.program_name || "";
  const name = programName || programShort;
  const affiliationShort = row.affiliation_short || "";
  const affiliationName = row.affiliation_name || "";

  return {
    groupId: programShort,
    shortName: programShort,
    name,
    affiliationShort,
    affiliationName,
  };
});

const fileContents = `// AUTO-GENERATED FILE. DO NOT EDIT.
// Generated from data/affiliations.csv by scripts/generate-groups.cjs

export interface GroupRecord {
  groupId: string;
  shortName: string;
  name: string;
  affiliationShort: string;
  affiliationName: string;
}

export const groups: GroupRecord[] = ${JSON.stringify(groups, null, 2)};
`;

fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, fileContents, "utf8");

console.log(`Generated ${path.relative(ROOT, outPath)} from ${path.relative(ROOT, csvPath)}`);
