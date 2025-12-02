// Simple Node script to turn data/authors.csv into src/data/authors.generated.ts
// Run with: npm run generate:authors

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const authorsCsvPath = path.join(ROOT, "data", "authors.csv");
const affiliationsCsvPath = path.join(ROOT, "data", "affiliations.csv");
const outPath = path.join(ROOT, "src", "data", "authors.generated.ts");

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

// Load authors (now using first/last name, program, affiliates)
const authorRows = readCsv(authorsCsvPath);
// Load affiliations to map program -> groupId / program_name
const affiliationRows = readCsv(affiliationsCsvPath);

const programToAffiliation = new Map();
for (const row of affiliationRows) {
  if (!row.program_short) continue;
  programToAffiliation.set(row.program_short, row);
}

const authors = authorRows.map((row) => {
  const program = row.program || "";
  const affiliation = programToAffiliation.get(program) || {};

  const firstName = row.first_name || "";
  const lastName = row.last_name || "";
  const nameFromParts = `${firstName} ${lastName}`.trim();

  const groupId = program || affiliation.program_short || "";
  const groupName = affiliation.program_name || program || "";

  return {
    authorId: row.author_id,
    openAlexId: row.openalex_id,
    // Fall back to original name column if needed
    name: nameFromParts || row.name || "",
    groupId,
    groupName,
    affiliate1: row.affiliate1,
    affiliate2: row.affiliate2,
    affiliate3: row.affiliate3,
    email: row.email,
    orcid: row.orcid,
    totalPublications: Number(row.total_publications || 0),
    totalCitations: Number(row.total_citations || 0),
    hIndex: Number(row.h_index || 0),
  };
});

const fileContents = `// AUTO-GENERATED FILE. DO NOT EDIT.
// Generated from data/authors.csv by scripts/generate-authors.cjs

export interface AuthorRecord {
  authorId: string;
  openAlexId: string;
  name: string;
  groupId: string;
  groupName: string;
  affiliate1: string;
  affiliate2: string;
  affiliate3: string;
  email: string;
  orcid: string;
  totalPublications: number;
  totalCitations: number;
  hIndex: number;
}

export const authors: AuthorRecord[] = ${JSON.stringify(authors, null, 2)};
`;

fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, fileContents, "utf8");

console.log(
  `Generated ${path.relative(ROOT, outPath)} from ${path.relative(
    ROOT,
    authorsCsvPath,
  )}`,
);
