import { useCallback, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { TooltipProps } from "recharts";
import { BarChart2, Users as UsersIcon } from "lucide-react";
import { programImpactByYear } from "@/data/programImpactByYear.generated";

interface ProgramImpactChartsProps {
  data: {
    groupId: string;
    name: string;
    shortName: string;
    members: number;
    publications: number;
    citations: number;
  }[];
  startYear: number | null;
  endYear: number | null;
  scale: "linear" | "log";
  onStartYearChange: (value: number) => void;
  onEndYearChange: (value: number) => void;
  onScaleChange: (scale: "linear" | "log") => void;
}

const axisTickStyle = {
  fill: "hsl(var(--muted-foreground))",
  fontSize: 12,
};

const SimpleProgramTooltip = ({ active, payload }: TooltipProps<number, string>) => {
  if (!active || !payload || payload.length === 0) return null;

  const first = payload[0];
  const data = first.payload as { program?: string } | undefined;
  const label = data?.program ?? first.name ?? "";
  const rawValue = first.value;

  if (rawValue == null) return null;

  const value =
    typeof rawValue === "number" ? rawValue.toLocaleString() : String(rawValue);

  return (
    <div className="rounded-md border border-border bg-card px-2 py-1 text-xs text-foreground shadow-sm">
      <div className="font-semibold">{label}</div>
      <div>{value}</div>
    </div>
  );
};

export const ProgramImpactCharts = ({
  data,
  startYear,
  endYear,
  scale,
  onStartYearChange,
  onEndYearChange,
  onScaleChange,
}: ProgramImpactChartsProps) => {
  const [perMemberMetric, setPerMemberMetric] = useState<"publications" | "citations">(
    "publications",
  );
  const [totalsMetric, setTotalsMetric] = useState<"publications" | "citations">("publications");

  const programCodes = useMemo(
    () => new Set(data.map((item) => item.shortName || item.groupId || item.name)),
    [data],
  );

  const statsForPrograms = useMemo(
    () => programImpactByYear.filter((row) => programCodes.has(row.program)),
    [programCodes],
  );

  const allYears = useMemo(() => {
    const years = new Set<number>();
    for (const row of statsForPrograms) {
      years.add(row.year);
    }
    return Array.from(years).sort((a, b) => a - b);
  }, [statsForPrograms]);

  const makeChartData = useCallback(
    (from: number, to: number) => {
      return data.map((item) => {
        const code = item.shortName || item.groupId || item.name;
        const stats = statsForPrograms.filter(
          (row) => row.program === code && row.year >= from && row.year <= to,
        );

        const publications = stats.reduce((sum, s) => sum + s.publications, 0);
        const citations = stats.reduce((sum, s) => sum + s.citations, 0);

        const members = item.members;
        const publicationsPerMember =
          members > 0 && publications > 0 ? Number((publications / members).toFixed(1)) : 0;
        const citationsPerMember =
          members > 0 && citations > 0 ? Number((citations / members).toFixed(1)) : 0;

        return {
          program: item.shortName || item.name,
          members,
          publications,
          citations,
          publicationsPerMember,
          citationsPerMember,
        };
      });
    },
    [data, statsForPrograms],
  );

  const totalsData = useMemo(() => {
    if (!allYears.length) return [];
    const from = startYear ?? allYears[0];
    const to = endYear ?? allYears[allYears.length - 1];
    return makeChartData(from, to);
  }, [allYears, startYear, endYear, makeChartData]);

  const perMemberData = useMemo(() => {
    if (!allYears.length) return [];
    const from = startYear ?? allYears[0];
    const to = endYear ?? allYears[allYears.length - 1];
    return makeChartData(from, to);
  }, [allYears, startYear, endYear, makeChartData]);

  const allPositiveForTotals = totalsData.every(
    (item) => item.publications > 0 && item.citations > 0,
  );
  const allPositiveForPublicationsPerMember = perMemberData.every(
    (item) => item.publicationsPerMember > 0,
  );
  const allPositiveForCitationsPerMember = perMemberData.every(
    (item) => item.citationsPerMember > 0,
  );

  const allPositiveForSelectedPerMember =
    perMemberMetric === "publications"
      ? allPositiveForPublicationsPerMember
      : allPositiveForCitationsPerMember;

  const perMemberBarKey =
    perMemberMetric === "publications" ? "publicationsPerMember" : "citationsPerMember";
  const perMemberLabel =
    perMemberMetric === "publications" ? "Publications per member" : "Citations per member";
  const perMemberColor =
    perMemberMetric === "publications"
      ? "hsl(var(--accent))"
      : "hsl(var(--primary))";

  const totalsMetricLabel = totalsMetric === "publications" ? "Publications" : "Citations";
  const totalsMetricColor =
    totalsMetric === "publications" ? "hsl(var(--accent))" : "hsl(var(--primary))";

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <BarChart2 className="h-5 w-5 text-primary" />
            <span>Total</span>
            <button
              type="button"
              onClick={() => setTotalsMetric("publications")}
              className={`ml-1 px-3 py-1 text-sm font-semibold rounded-md border ${totalsMetric === "publications"
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-background text-foreground border-border"
                }`}
            >
              Publications
            </button>
            <button
              type="button"
              onClick={() => setTotalsMetric("citations")}
              className={`px-3 py-1 text-sm font-semibold rounded-md border ${totalsMetric === "citations"
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-background text-foreground border-border"
                }`}
            >
              Citations
            </button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="w-full h-[220px] sm:h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={totalsData} margin={{ left: -20, right: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis
                  dataKey="program"
                  stroke="hsl(var(--muted-foreground))"
                  tick={axisTickStyle}
                />
                <YAxis
                  stroke="hsl(var(--muted-foreground))"
                  tick={axisTickStyle}
                  scale={scale === "log" && allPositiveForTotals ? "log" : "linear"}
                  domain={
                    scale === "log" && allPositiveForTotals
                      ? ["dataMin", "dataMax"]
                      : ["auto", "auto"]
                  }
                />
                <Tooltip content={<SimpleProgramTooltip />} />
                <Bar dataKey={totalsMetric} name={totalsMetricLabel} fill={totalsMetricColor} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <UsersIcon className="h-5 w-5 text-primary" />
            <span>Per member</span>
            <button
              type="button"
              onClick={() => setPerMemberMetric("publications")}
              className={`ml-1 px-3 py-1 text-sm font-semibold rounded-md border ${perMemberMetric === "publications"
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-background text-foreground border-border"
                }`}
            >
              Publications
            </button>
            <button
              type="button"
              onClick={() => setPerMemberMetric("citations")}
              className={`px-3 py-1 text-sm font-semibold rounded-md border ${perMemberMetric === "citations"
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-background text-foreground border-border"
                }`}
            >
              Citations
            </button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="w-full h-[220px] sm:h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={perMemberData} margin={{ left: -20, right: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis
                  dataKey="program"
                  stroke="hsl(var(--muted-foreground))"
                  tick={axisTickStyle}
                />
                <YAxis
                  stroke="hsl(var(--muted-foreground))"
                  tick={axisTickStyle}
                  scale={
                    scale === "log" && allPositiveForSelectedPerMember ? "log" : "linear"
                  }
                  domain={
                    scale === "log" && allPositiveForSelectedPerMember
                      ? ["dataMin", "dataMax"]
                      : ["auto", "auto"]
                  }
                />
                <Tooltip content={<SimpleProgramTooltip />} />
                <Bar dataKey={perMemberBarKey} name={perMemberLabel} fill={perMemberColor} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
