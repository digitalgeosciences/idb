// Generate an RSS feed of publications from data/works.csv.
//
// Usage:
//   node scripts/generate-rss.cjs
//
// Reads:
//   data/works.csv
// Writes:
//   public/rss.xml

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const worksPath = path.join(ROOT, "data", "works.csv");
const outPath = path.join(ROOT, "public", "rss.xml");

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

const escapeXml = (str) => {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
};

const main = () => {
  const { headers, rows } = readCsv(worksPath);
  if (!headers.length) {
    console.error("No data/works.csv found or file is empty. Skipping RSS generation.");
    process.exit(0);
  }

  const titleKey = headers.find((h) => h.toLowerCase() === "title") || "title";
  const doiKey = headers.find((h) => h.toLowerCase() === "doi") || "doi";
  const workIdKey = headers.find((h) => h.toLowerCase() === "work_id") || "work_id";
  const yearKey = headers.find((h) => h.toLowerCase() === "year") || "year";
  const programKey = headers.find((h) => h.toLowerCase() === "program") || "program";
  const venueKey = headers.find((h) => h.toLowerCase() === "venue") || "venue";
  const citationsKey =
    headers.find((h) => h.toLowerCase() === "citations") || "citations";
  const publicationDateKey =
    headers.find((h) => h.toLowerCase() === "publication_date") ||
    "publication_date";

  // Sort newest first by publication_date (fallback: year)
  const sorted = [...rows].sort((a, b) => {
    const ad = Date.parse(a[publicationDateKey] || "");
    const bd = Date.parse(b[publicationDateKey] || "");
    if (!Number.isNaN(ad) && !Number.isNaN(bd)) return bd - ad;
    const ay = Number(a[yearKey] || 0);
    const by = Number(b[yearKey] || 0);
    return by - ay;
  });

  const maxItems = 50;
  const items = sorted.slice(0, maxItems);

  const siteUrl =
    process.env.RSS_SITE_URL ||
    "https://digitalgeosciences.github.io/dashboard3.2/";

  const nowRfc822 = new Date().toUTCString();

  const lines = [];
  lines.push('<?xml version="1.0" encoding="UTF-8"?>');
  lines.push('<rss version="2.0">');
  lines.push("  <channel>");
  lines.push("    <title>Integrative Dashboard – Publications</title>");
  lines.push(`    <link>${escapeXml(siteUrl)}</link>`);
  lines.push(
    "    <description>Recent publications from the Integrative Geosciences dashboard.</description>",
  );
  lines.push(`    <lastBuildDate>${escapeXml(nowRfc822)}</lastBuildDate>`);
  lines.push("    <ttl>60</ttl>");

  for (const row of items) {
    const title = row[titleKey] || "Untitled publication";
    const doi = (row[doiKey] || "").trim();
    const workId = row[workIdKey] || "";
    const year = row[yearKey] || "";
    const program = row[programKey] || "";
    const venue = row[venueKey] || "";
    const citations = row[citationsKey] || "";
    const pubDateRaw = row[publicationDateKey] || "";

    let link = "";
    if (doi) {
      link = doi.toLowerCase().startsWith("http")
        ? doi
        : `https://doi.org/${doi.replace(/^doi:/i, "").trim()}`;
    } else if (workId) {
      link = workId;
    } else {
      link = siteUrl;
    }

    let pubDate = "";
    const t = Date.parse(pubDateRaw);
    if (!Number.isNaN(t)) {
      pubDate = new Date(t).toUTCString();
    }

    const descriptionParts = [];
    if (program) descriptionParts.push(`Program: ${program}`);
    if (venue) descriptionParts.push(`Venue: ${venue}`);
    if (year) descriptionParts.push(`Year: ${year}`);
    if (citations !== "") descriptionParts.push(`Citations: ${citations}`);
    const description = descriptionParts.join(" • ");

    lines.push("    <item>");
    lines.push(`      <title>${escapeXml(title)}</title>`);
    lines.push(`      <link>${escapeXml(link)}</link>`);
    if (pubDate) {
      lines.push(`      <pubDate>${escapeXml(pubDate)}</pubDate>`);
    }
    if (workId) {
      lines.push(
        `      <guid isPermaLink="false">${escapeXml(workId)}</guid>`,
      );
    }
    if (description) {
      lines.push(`      <description>${escapeXml(description)}</description>`);
    }
    lines.push("    </item>");
  }

  lines.push("  </channel>");
  lines.push("</rss>");

  fs.writeFileSync(outPath, lines.join("\n"), "utf8");
  console.log(`RSS feed written to ${outPath}`);
};

main();
