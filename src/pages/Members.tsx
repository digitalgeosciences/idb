import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, ArrowUpDown, Download, FileText, Link as LinkIcon, Search, Users, User } from "lucide-react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";

import { SiteShell } from "@/components/SiteShell";
import { authors } from "@/data/authors.generated";
import { groups } from "@/data/groups.generated";
import { worksTable } from "@/data/worksTable.generated";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/use-toast";
import { Input } from "@/components/ui/input";

type MemberSortField = "name" | "program" | "publications" | "citations" | "hIndex";

interface MemberRow {
  id: string;
  name: string;
  email: string;
  program: string;
  affiliations: string;
  publications: number;
  citations: number;
  hIndex: number;
  openAlexId: string;
}

const ALL_PROGRAMS = "";

const getProgramName = (code: string) => {
  const match = groups.find(
    (g) => g.shortName === code || g.groupId === code,
  );
  return match?.name || code;
};


const PAGE_SIZE = 15;

const Members = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const programFilter = searchParams.get("program") || ALL_PROGRAMS;

  const [sortBy, setSortBy] = useState<MemberSortField>("hIndex");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [searchQuery, setSearchQuery] = useState("");
  const programOptions = useMemo(() => {
    const codes = new Set<string>();
    for (const author of authors) {
      if (author.groupId) codes.add(author.groupId);
    }
    return Array.from(codes).sort();
  }, []);

  const allYears = useMemo(() => {
    const years = new Set<number>();
    for (const w of worksTable) {
      if (w.year && w.year >= 1900 && w.year <= new Date().getFullYear() + 1) {
        years.add(w.year);
      }
    }
    return Array.from(years).sort((a, b) => a - b);
  }, []);

  const [startYear, setStartYear] = useState<number | null>(null);
  const [endYear, setEndYear] = useState<number | null>(null);

  // Initialize year range once we know available years
  // Initialize year range once we know available years (full range)
  useEffect(() => {
    if (!allYears.length) return;
    const minYear = allYears[0];
    const maxYear = allYears[allYears.length - 1];
    setStartYear((prev) => (prev == null ? minYear : prev));
    setEndYear((prev) => (prev == null ? maxYear : prev));
  }, [allYears]);


  const metricsByAuthor = useMemo(() => {
    if (!allYears.length) {
      return new Map<string, { publications: number; citations: number; hIndex: number }>();
    }

    const from = startYear ?? allYears[0];
    const to = endYear ?? allYears[allYears.length - 1];

    const temp = new Map<
      string,
      { citationsList: number[] }
    >();

    for (const w of worksTable) {
      if (!w.year) continue;
      if (w.year < from || w.year > to) continue;
      const citations = w.citations ?? 0;
      const authorsList = Array.from(new Set(w.allAuthors || []));
      for (const name of authorsList) {
        const bucket = temp.get(name) ?? { citationsList: [] };
        bucket.citationsList.push(citations);
        temp.set(name, bucket);
      }
    }

    const result = new Map<string, { publications: number; citations: number; hIndex: number }>();

    for (const [authorName, value] of temp) {
      const pubs = value.citationsList.length;
      const citations = value.citationsList.reduce((sum, c) => sum + c, 0);
      let h = 0;
      const sorted = [...value.citationsList].sort((a, b) => b - a);
      for (let i = 0; i < sorted.length; i += 1) {
        if (sorted[i] >= i + 1) h = i + 1;
        else break;
      }
      result.set(authorName, { publications: pubs, citations, hIndex: h });
    }

    return result;
  }, [allYears, startYear, endYear]);

  const rows = useMemo<MemberRow[]>(() => {
    return authors.map((author) => {
      const group = groups.find((g) => g.groupId === author.groupId);
      const affiliates = [author.affiliate1, author.affiliate2, author.affiliate3]
        .filter(Boolean)
        .join(", ");
      const metrics = metricsByAuthor.get(author.name) || null;

      return {
        id: author.authorId,
        name: author.name,
        email: author.email,
        program: group?.shortName || author.groupId || "",
        affiliations: affiliates,
        publications: metrics ? metrics.publications : 0,
        citations: metrics ? metrics.citations : 0,
        hIndex: author.hIndex,
        openAlexId: author.openAlexId,
      };
    });
  }, [metricsByAuthor]);

  const filteredRows = useMemo(() => {
    let next = rows;

    if (programFilter) {
      next = next.filter((row) => row.program === programFilter);
    }

    const query = searchQuery.trim().toLowerCase();
    if (query) {
      next = next.filter((row) => {
        const haystack = [
          row.name,
          row.email,
          row.program,
          row.affiliations,
        ]
          .join(" ")
          .toLowerCase();
        return haystack.includes(query);
      });
    }

    return next;
  }, [rows, programFilter, searchQuery]);

  const sortedRows = useMemo(() => {
    const items = [...filteredRows];
    items.sort((a, b) => {
      const dir = sortOrder === "asc" ? 1 : -1;
      switch (sortBy) {
        case "name":
          return a.name.localeCompare(b.name) * dir;
        case "program":
          return a.program.localeCompare(b.program) * dir;
        case "publications":
          return (a.publications - b.publications) * dir;
        case "citations":
          return (a.citations - b.citations) * dir;
        case "hIndex":
        default:
          return (a.hIndex - b.hIndex) * dir;
      }
    });
    return items;
  }, [filteredRows, sortBy, sortOrder]);

  const visibleRows = sortedRows.slice(0, visibleCount);
  const hasMoreToShow = visibleCount < sortedRows.length;

  const buildYearRange = () => {
    const from = startYear ?? (allYears.length ? allYears[0] : undefined);
    const to = endYear ?? (allYears.length ? allYears[allYears.length - 1] : undefined);
    return { from, to };
  };

  const buildMemberPublicationsPath = (authorName: string) => {
    const search = new URLSearchParams();
    if (programFilter) search.set("program", programFilter);
    const { from, to } = buildYearRange();
    if (from != null) search.set("fromYear", String(from));
    if (to != null) search.set("toYear", String(to));
    search.set("author", authorName);
    return `/publications?${search.toString()}`;
  };

  const buildMemberCitationsPath = (authorName: string) => {
    const search = new URLSearchParams();
    if (programFilter) search.set("program", programFilter);
    const { from, to } = buildYearRange();
    if (from != null) search.set("fromYear", String(from));
    if (to != null) search.set("toYear", String(to));
    search.set("author", authorName);
    return `/citations?${search.toString()}`;
  };

  const toggleSort = (field: MemberSortField) => {
    if (sortBy === field) {
      setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(field);
      setSortOrder(field === "name" || field === "program" ? "asc" : "desc");
    }
  };

  const handleSavePdf = () => {
    window.print();
  };

  const handleCopyLink = async () => {
    const url = window.location.href;
    try {
      await navigator.clipboard.writeText(url);
      toast({
        title: "Link copied",
        description: "Members page URL copied to clipboard.",
      });
    } catch {
      // ignore
    }
  };

  const handleExportCsv = () => {
    if (!sortedRows.length) return;

    const headers = [
      "author_name",
      "email",
      "program",
      "affiliations",
      "publications",
      "citations",
      "h_index",
    ];

    const escape = (value: unknown) => {
      const str = value == null ? "" : String(value);
      if (str === "") return "";
      const cleaned = str.replace(/\r?\n/g, " ");
      if (/[",]/.test(cleaned)) {
        return `"${cleaned.replace(/"/g, '""')}"`;
      }
      return cleaned;
    };

    const lines = [headers.join(",")];

    for (const row of sortedRows) {
      lines.push(
        [
          escape(row.name),
          escape(row.email),
          escape(row.program),
          escape(row.affiliations),
          escape(row.publications),
          escape(row.citations),
          escape(row.hIndex),
        ].join(","),
      );
    }

    const csv = lines.join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "members.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <SiteShell>
      <main className="container mx-auto px-4 py-6 space-y-4">
        <Button variant="ghost" onClick={() => navigate("/")}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to dashboard
        </Button>

        <Card className="border-border/60">
          <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3 sm:flex-1">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                <CardTitle>Members</CardTitle>
              </div>
              <div className="flex w-full justify-center text-xs text-muted-foreground">
                <div className="relative w-full max-w-md">
                  <Input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setVisibleCount(PAGE_SIZE);
                    }}
                    placeholder="Search members, programs, affiliations…"
                    className="h-8 pl-7 pr-2 text-xs"
                  />
                  <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                </div>
              </div>

            </div>
            <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
              <div className="flex items-center gap-1">
                <span className="font-semibold text-foreground">Scope:</span>
                <select
                  className="h-7 rounded border border-border bg-background px-2 text-xs"
                  value={programFilter}
                  onChange={(e) => {
                    const value = e.target.value;
                    const next = new URLSearchParams(searchParams);
                    if (value === ALL_PROGRAMS) {
                      next.delete("program");
                    } else {
                      next.set("program", value);
                    }
                    navigate(`/members?${next.toString()}`);
                  }}
                >
                  <option value={ALL_PROGRAMS}>All programs</option>
                  {programOptions.map((code) => (
                    <option key={code} value={code}>
                      {getProgramName(code)}
                    </option>
                  ))}
                </select>
              </div>
              {allYears.length > 0 && (
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-foreground">Year range:</span>
                  <select
                    className="h-7 rounded border border-border bg-background px-2 text-xs"
                    value={startYear ?? ""}
                    onChange={(e) => {
                      const value = Number(e.target.value);
                      setStartYear(value);
                      if (endYear != null && value > endYear) setEndYear(value);
                    }}
                  >
                    {allYears.map((y) => (
                      <option key={y} value={y}>
                        {y}
                      </option>
                    ))}
                  </select>
                  <span>to</span>
                  <select
                    className="h-7 rounded border border-border bg-background px-2 text-xs"
                    value={endYear ?? ""}
                    onChange={(e) => {
                      const value = Number(e.target.value);
                      setEndYear(value);
                      if (startYear != null && value < startYear) setStartYear(value);
                    }}
                  >
                    {allYears.map((y) => (
                      <option key={y} value={y}>
                        {y}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={handleSavePdf}
                  title="Save PDF"
                >
                  <Download className="h-3 w-3" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={handleExportCsv}
                  title="Export CSV"
                >
                  <FileText className="h-3 w-3" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={handleCopyLink}
                  title="Copy link"
                >
                  <LinkIcon className="h-3 w-3" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto rounded-md border border-border/60 bg-card/40">
              <Table className="w-full text-xs sm:text-sm">
                <TableHeader>
                  <TableRow>
                    <TableHead>
                      <button
                        type="button"
                        className="flex items-center gap-1 bg-transparent p-0 text-xs font-medium text-muted-foreground hover:text-foreground border-0 focus-visible:outline-none"
                        onClick={() => toggleSort("name")}
                      >
                        Author
                        <ArrowUpDown className="h-3 w-3" />
                      </button>
                    </TableHead>
                    <TableHead className="hidden sm:table-cell">Email</TableHead>
                    <TableHead className="hidden sm:table-cell">
                      <button
                        type="button"
                        className="flex items-center gap-1 bg-transparent p-0 text-xs font-medium text-muted-foreground hover:text-foreground border-0 focus-visible:outline-none"
                        onClick={() => toggleSort("program")}
                      >
                        Program / Affiliation(s)
                        <ArrowUpDown className="h-3 w-3" />
                      </button>
                    </TableHead>

                    <TableHead className="hidden md:table-cell text-right">
                      <button
                        type="button"
                        className="flex w-full items-center justify-end gap-1 bg-transparent p-0 text-xs font-medium text-muted-foreground hover:text-foreground border-0 focus-visible:outline-none"
                        onClick={() => toggleSort("publications")}
                      >
                        Publications
                        <ArrowUpDown className="h-3 w-3" />
                      </button>
                    </TableHead>
                    <TableHead className="hidden md:table-cell text-right">
                      <button
                        type="button"
                        className="flex w-full items-center justify-end gap-1 bg-transparent p-0 text-xs font-medium text-muted-foreground hover:text-foreground border-0 focus-visible:outline-none"
                        onClick={() => toggleSort("citations")}
                      >
                        Citations
                        <ArrowUpDown className="h-3 w-3" />
                      </button>
                    </TableHead>
                    <TableHead className="hidden md:table-cell text-right">
                      <button
                        type="button"
                        className="flex w-full items-center justify-end gap-1 bg-transparent p-0 text-xs font-medium text-muted-foreground hover:text-foreground border-0 focus-visible:outline-none"
                        onClick={() => toggleSort("hIndex")}
                      >
                        h-index
                        <ArrowUpDown className="h-3 w-3" />
                      </button>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visibleRows.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell className="align-top font-medium text-foreground">
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-2">
                            <User className="h-3 w-3 text-primary" />
                            {row.openAlexId ? (
                              <button
                                type="button"
                                className="text-primary hover:underline"
                                onClick={() => navigate(`/author/${row.openAlexId}`)}
                              >
                                {row.name}
                              </button>
                            ) : (
                              row.name
                            )}
                          </div>

                          {/* Mobile compact line */}
                          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-muted-foreground md:hidden">
                            {(row.program || row.affiliations) && (
                              <span>
                                {row.program}
                                {row.affiliations ? ` / ${row.affiliations}` : ""}
                              </span>
                            )}
                            <span>•</span>
                            <Link
                              to={buildMemberPublicationsPath(row.name)}
                              className="text-primary hover:underline"
                            >
                              {row.publications} publications
                            </Link>
                            <span>•</span>
                            <Link
                              to={buildMemberCitationsPath(row.name)}
                              className="text-primary hover:underline"
                            >
                              {row.citations} citations
                            </Link>
                            <span>•</span>
                            <span>h-index {row.hIndex}</span>
                          </div>
                        </div>
                      </TableCell>

                      <TableCell className="text-muted-foreground hidden sm:table-cell">
                        {row.email}
                      </TableCell>
                      <TableCell className="text-muted-foreground hidden sm:table-cell">
                        {row.program}
                        {row.affiliations ? ` / ${row.affiliations}` : ""}
                      </TableCell>

                      <TableCell className="hidden md:table-cell text-right cell-compact font-medium text-foreground">
                        {row.publications > 0 ? (
                          <Link
                            to={buildMemberPublicationsPath(row.name)}
                            className="text-primary hover:underline"
                          >
                            {row.publications}
                          </Link>
                        ) : (
                          row.publications
                        )}
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-right cell-compact font-medium text-foreground">
                        {row.citations > 0 ? (
                          <Link
                            to={buildMemberCitationsPath(row.name)}
                            className="text-primary hover:underline"
                          >
                            {row.citations}
                          </Link>
                        ) : (
                          row.citations
                        )}
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-right cell-compact font-medium text-foreground">
                        {row.hIndex}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            {hasMoreToShow && (
              <div className="flex justify-center gap-2 pt-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setVisibleCount((count) =>
                      Math.min(count + PAGE_SIZE, sortedRows.length),
                    )
                  }
                >
                  Load more
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setVisibleCount(sortedRows.length)}
                >
                  Load all
                </Button>
              </div>
            )}
          </CardContent>

        </Card>
      </main>
    </SiteShell>
  );
};

export default Members;
