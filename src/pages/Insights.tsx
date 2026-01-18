import { useEffect, useMemo, useRef, useState } from "react";
import { SiteShell } from "@/components/SiteShell";
import { worksTable } from "@/data/worksTable.generated";
import { filterWorks } from "@/lib/blacklist";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import {
  Download,
  FileText,
  Linkedin,
  Link as LinkIcon,
  FileText as FileTextIcon,
  ArrowLeft,
  Search,
  ArrowUpDown,
  Info,
  Tag,
  BookOpen,
  BarChart3,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import {
  Line,
  LineChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Legend as RechartsLegend,
  ReferenceArea,
} from "recharts";
import insightsConfig from "../../data/config/insightsconfig.json";

type Range = { from: number | null; to: number | null };

type TopicInsight = {
  topic: string;
  pubsA: number;
  pubsB: number;
  citesA: number;
  citesB: number;
  pubsDeltaPct: number | null;
  citesDeltaPct: number | null;
  insight: string;
};

const thresholdsConfig =
  (insightsConfig as { insightThresholds?: any })?.insightThresholds || {
    strongSurge: { pubs: 2, cites: 2 },
    growingPriority: { pubs: 1.5, cites: 1.2 },
    impactLed: { cites: 1.5, pubsMax: 1 },
    outputSoftening: { pubs: 1.2, citesMax: 0.9 },
    declineDrop: 0.8,
  };

const formatPct = (value: number | null) => {
  if (value === Infinity) return "New";
  if (value === -Infinity) return "Absent";
  if (value == null || !isFinite(value)) return "N/A";
  const pct = Math.round(value * 100);
  if (pct === 0) return "Stable";
  const sign = pct > 0 ? "+" : "";
  return `${sign}${pct}%`;
};

const deltaClass = (value: number | null) => {
  if (value === Infinity) return "text-emerald-600";
  if (value === -Infinity) return "text-rose-700";
  if (value == null || !isFinite(value)) return "text-muted-foreground";
  if (value > 0) return "text-emerald-600";
  if (value < 0) return "text-rose-700";
  return "text-slate-600";
};

const classifyMetricChange = (delta: number | null) => {
  if (delta === Infinity) return "Emerging";
  if (delta === -Infinity) return "Absent";
  if (delta == null || !isFinite(delta)) return "N/A";
  if (delta >= 0.5) return "Rising";
  if (delta >= 0.2) return "Up";
  if (delta <= -0.5) return "Declining";
  if (delta <= -0.2) return "Softening";
  return "Stable";
};

const badgeTone = (status: string) => {
  if (status === "Emerging" || status === "Rising" || status === "Up") return "bg-emerald-100 text-emerald-700";
  if (status === "Declining" || status === "Softening" || status === "Absent") return "bg-rose-100 text-rose-700";
  if (status === "Stable") return "bg-slate-100 text-slate-700";
  return "bg-muted text-muted-foreground";
};

const deriveInsight = (row: TopicInsight) => {
  const { pubsA, pubsB, citesA, citesB } = row;
  const pubsGrowth = pubsA === 0 ? (pubsB > 0 ? Infinity : 0) : pubsB / pubsA;
  const citesGrowth = citesA === 0 ? (citesB > 0 ? Infinity : 0) : citesB / citesA;

  const strongSurge = thresholdsConfig.strongSurge || { pubs: 2, cites: 2 };
  const growingPriority = thresholdsConfig.growingPriority || { pubs: 1.5, cites: 1.2 };
  const impactLed = thresholdsConfig.impactLed || { cites: 1.5, pubsMax: 1 };
  const outputSoftening = thresholdsConfig.outputSoftening || { pubs: 1.2, citesMax: 0.9 };
  const declineDrop = typeof thresholdsConfig.declineDrop === "number" ? thresholdsConfig.declineDrop : 0.8;

  if (pubsA === 0 && pubsB > 0) return "Emerging in period B";
  if (pubsA > 0 && pubsB === 0) return "Absent in period B";
  if (pubsGrowth >= strongSurge.pubs && citesGrowth >= strongSurge.cites)
    return "Strong surge in output and impact";
  if (pubsGrowth >= growingPriority.pubs && citesGrowth >= growingPriority.cites)
    return "Growing priority with rising impact";
  if (pubsGrowth >= outputSoftening.pubs && citesGrowth < outputSoftening.citesMax)
    return "Output rising, impact softening";
  if (pubsGrowth < declineDrop && citesGrowth < declineDrop) return "Declining emphasis";
  if (citesGrowth >= impactLed.cites && pubsGrowth <= (impactLed.pubsMax ?? 1))
    return "Impact rising faster than output";
  return "Stable focus";
};

const buildAggregates = (from: number | null, to: number | null, works: typeof worksTable) => {
  const map = new Map<string, { pubs: number; cites: number }>();
  works.forEach((work) => {
    if (typeof work.year !== "number") return;
    if (from != null && work.year < from) return;
    if (to != null && work.year > to) return;
    (work.topics || []).forEach((topic) => {
      if (!topic) return;
      const current = map.get(topic) || { pubs: 0, cites: 0 };
      current.pubs += 1;
      current.cites += work.citations || 0;
      map.set(topic, current);
    });
  });
  return map;
};

const InsightsPage = () => {
  const navigate = useNavigate();
  const cleanWorks = useMemo(() => filterWorks(worksTable), []);
  const { toast } = useToast();

  const allYears = useMemo(() => {
    const years = new Set<number>();
    cleanWorks.forEach((w) => {
      if (typeof w.year === "number") years.add(w.year);
    });
    return Array.from(years).sort((a, b) => a - b);
  }, [cleanWorks]);

  const [rangeA, setRangeA] = useState<Range>({ from: null, to: null });
  const [rangeB, setRangeB] = useState<Range>({ from: null, to: null });
  const [searchQuery, setSearchQuery] = useState("");
  const [sortKey, setSortKey] = useState<
    "topic" | "pubsA" | "pubsB" | "pubsDelta" | "citesA" | "citesB" | "citesDelta" | "insight"
  >("pubsDelta");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [showLegend, setShowLegend] = useState(false);
  const [showChart, setShowChart] = useState(false);
  const [chartScale, setChartScale] = useState<"linear" | "log">("linear");
  const [xDomain, setXDomain] = useState<[number, number] | null>(null);
  const [yDomain, setYDomain] = useState<[number, number] | null>(null);
  const [dragStart, setDragStart] = useState<number | null>(null);
  const [dragEnd, setDragEnd] = useState<number | null>(null);
  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);
  const [showPubsSeries, setShowPubsSeries] = useState(true);
  const [showCitesSeries, setShowCitesSeries] = useState(true);
  const initializedSelection = useRef(false);

  useEffect(() => {
    if (!allYears.length) return;
    const min = allYears[0];
    const max = allYears[allYears.length - 1];

    const clamp = (value: number | null | undefined) => {
      if (value == null || Number.isNaN(value)) return null;
      return Math.min(Math.max(value, min), max);
    };

    const normalizeRange = (from: number | null | undefined, to: number | null | undefined) => {
      let f = clamp(from) ?? min;
      let t = clamp(to) ?? max;
      if (f > t) {
        f = min;
        t = max;
      }
      return { from: f, to: t };
    };

    const defaultA =
      (insightsConfig as { insightsDefaultPeriodA?: { from?: number; to?: number } })?.insightsDefaultPeriodA || {};
    const defaultB =
      (insightsConfig as { insightsDefaultPeriodB?: { from?: number; to?: number } })?.insightsDefaultPeriodB || {};

    // If Period A "from" is missing, use the oldest; if Period B "to" is missing, use the newest.
    const resolvedAFrom = defaultA.from ?? min;
    const resolvedATo = defaultA.to;
    const resolvedBFrom = defaultB.from;
    const resolvedBTo = defaultB.to ?? max;

    setRangeA(normalizeRange(resolvedAFrom, resolvedATo));
    setRangeB(normalizeRange(resolvedBFrom, resolvedBTo));
  }, [allYears]);

  const insights = useMemo<TopicInsight[]>(() => {
    if (!allYears.length) return [];
    const aggA = buildAggregates(rangeA.from, rangeA.to, cleanWorks);
    const aggB = buildAggregates(rangeB.from, rangeB.to, cleanWorks);
    const topics = new Set<string>([...aggA.keys(), ...aggB.keys()]);
    const rows: TopicInsight[] = [];
    topics.forEach((topic) => {
      const a = aggA.get(topic) || { pubs: 0, cites: 0 };
      const b = aggB.get(topic) || { pubs: 0, cites: 0 };
      const pubsDeltaPct =
        a.pubs === 0
          ? b.pubs > 0
            ? Infinity
            : 0
          : b.pubs === 0
            ? -Infinity
            : (b.pubs - a.pubs) / a.pubs;
      const citesDeltaPct =
        a.cites === 0
          ? b.cites > 0
            ? Infinity
            : 0
          : b.cites === 0
            ? -Infinity
            : (b.cites - a.cites) / a.cites;
      const row: TopicInsight = {
        topic,
        pubsA: a.pubs,
        pubsB: b.pubs,
        citesA: a.cites,
        citesB: b.cites,
        pubsDeltaPct,
        citesDeltaPct,
        insight: "",
      };
      row.insight = deriveInsight(row);
      rows.push(row);
    });
    const query = searchQuery.trim().toLowerCase();
    const filtered = query
      ? rows.filter(
          (row) =>
            row.topic.toLowerCase().includes(query) ||
            row.insight.toLowerCase().includes(query),
        )
      : rows;
    const dir = sortDir === "asc" ? 1 : -1;
    const sorted = [...filtered].sort((a, b) => {
      const compare = (x: number | null, y: number | null) => {
        const xv = x ?? -Infinity;
        const yv = y ?? -Infinity;
        if (xv === Infinity && yv !== Infinity) return 1;
        if (yv === Infinity && xv !== Infinity) return -1;
        return (xv - yv) * dir;
      };
      if (sortKey === "topic") return a.topic.localeCompare(b.topic) * dir;
      if (sortKey === "insight") return a.insight.localeCompare(b.insight) * dir;
      if (sortKey === "pubsA") return compare(a.pubsA, b.pubsA);
      if (sortKey === "citesA") return compare(a.citesA, b.citesA);
      if (sortKey === "pubsDelta") return compare(a.pubsDeltaPct, b.pubsDeltaPct);
      if (sortKey === "citesDelta") return compare(a.citesDeltaPct, b.citesDeltaPct);
      if (sortKey === "pubsB") return compare(a.pubsB, b.pubsB);
      if (sortKey === "citesB") return compare(a.citesB, b.citesB);
      return 0;
    });
    return sorted;
  }, [allYears.length, cleanWorks, rangeA.from, rangeA.to, rangeB.from, rangeB.to, searchQuery, sortDir, sortKey]);

  const toggleTopicSelection = (topic: string) => {
    setSelectedTopics((prev) => (prev.includes(topic) ? prev.filter((t) => t !== topic) : [...prev, topic]));
  };

  const chartYearRange = useMemo(() => {
    if (!allYears.length) return { from: null as number | null, to: null as number | null };
    const minYear = allYears[0];
    const maxYear = allYears[allYears.length - 1];
    const start = Math.min(rangeA.from ?? minYear, rangeB.from ?? minYear);
    const end = Math.max(rangeA.to ?? maxYear, rangeB.to ?? maxYear);
    return { from: start, to: end };
  }, [allYears, rangeA.from, rangeA.to, rangeB.from, rangeB.to]);

  const chartData = useMemo(() => {
    if (!selectedTopics.length || chartYearRange.from == null || chartYearRange.to == null) return [];
    const years: number[] = [];
    for (let y = chartYearRange.from; y <= chartYearRange.to; y += 1) years.push(y);
    const byTopicYear = new Map<
      string,
      {
        pubs: Map<number, number>;
        cites: Map<number, number>;
      }
    >();
    selectedTopics.forEach((topic) => {
      byTopicYear.set(topic, { pubs: new Map(), cites: new Map() });
    });
    cleanWorks.forEach((work) => {
      if (typeof work.year !== "number") return;
      if (work.year < chartYearRange.from || work.year > chartYearRange.to) return;
      (work.topics || []).forEach((topic) => {
        if (!topic || !byTopicYear.has(topic)) return;
        const entry = byTopicYear.get(topic)!;
        entry.pubs.set(work.year, (entry.pubs.get(work.year) || 0) + 1);
        entry.cites.set(work.year, (entry.cites.get(work.year) || 0) + (work.citations || 0));
      });
    });
    return years.map((year) => {
      const row: Record<string, number | string> = { year };
      selectedTopics.forEach((topic) => {
        const entry = byTopicYear.get(topic);
        const pubsVal = entry?.pubs.get(year) ?? 0;
        const citesVal = entry?.cites.get(year) ?? 0;
        const safePubs = chartScale === "log" && pubsVal === 0 ? 0.1 : pubsVal;
        const safeCites = chartScale === "log" && citesVal === 0 ? 0.1 : citesVal;
        row[`${topic}-pubs`] = safePubs;
        row[`${topic}-cites`] = safeCites;
      });
      return row;
    });
  }, [selectedTopics, chartYearRange.from, chartYearRange.to, cleanWorks, chartScale]);

  const chartExtent = useMemo(() => {
    let min = Number.POSITIVE_INFINITY;
    let max = Number.NEGATIVE_INFINITY;
    chartData.forEach((row) => {
      selectedTopics.forEach((topic) => {
        const p = row[`${topic}-pubs`] as number | undefined;
        const c = row[`${topic}-cites`] as number | undefined;
        if (typeof p === "number") {
          min = Math.min(min, p);
          max = Math.max(max, p);
        }
        if (typeof c === "number") {
          min = Math.min(min, c);
          max = Math.max(max, c);
        }
      });
    });
    if (!isFinite(min) || !isFinite(max)) return null;
    if (min === max) return { min: Math.max(0, min - 1), max: max + 1 };
    return { min, max };
  }, [chartData, selectedTopics]);

  const xTicks = useMemo(() => {
    if (!chartData.length) return undefined;
    const years = chartData.map((row) => row.year as number).filter((y) => typeof y === "number");
    if (years.length <= 8) return years;
    const step = Math.ceil(years.length / 8);
    return years.filter((_, idx) => idx % step === 0 || idx === years.length - 1);
  }, [chartData]);

  const xAxisDomain = useMemo<[number | "auto", number | "auto"]>(() => {
    if (xDomain) return xDomain;
    if (chartYearRange.from != null && chartYearRange.to != null) return [chartYearRange.from, chartYearRange.to];
    return ["auto", "auto"];
  }, [xDomain, chartYearRange.from, chartYearRange.to]);

  const yAxisDomain = useMemo<[number | "auto", number | "auto"]>(() => {
    if (yDomain) return yDomain;
    if (!chartExtent) return ["auto", "auto"];
    if (chartScale === "log") return [Math.max(0.1, chartExtent.min || 0.1), "auto"];
    const pad = Math.max(1, (chartExtent.max - chartExtent.min) * 0.08);
    return [Math.max(0, chartExtent.min - pad), chartExtent.max + pad];
  }, [yDomain, chartExtent, chartScale]);

  const resetAxes = () => {
    setXDomain(null);
    setYDomain(null);
    setDragStart(null);
    setDragEnd(null);
  };

  const handleWheelZoomY = (event: React.WheelEvent<HTMLDivElement>) => {
    if (!chartExtent) return;
    event.preventDefault();
    const factor = event.deltaY > 0 ? 1.1 : 0.9;
    const [currentMin, currentMax] = yDomain ?? [chartExtent.min, chartExtent.max];
    const span = Math.max(1, currentMax - currentMin);
    const center = currentMin + span / 2;
    let newSpan = span * factor;
    if (chartScale === "log") {
      const logMin = Math.log10(Math.max(currentMin, 0.1));
      const logMax = Math.log10(Math.max(currentMax, 0.1));
      const logSpan = Math.max(0.1, logMax - logMin) * factor;
      const logCenter = (logMin + logMax) / 2;
      const newLogMin = logCenter - logSpan / 2;
      const newLogMax = logCenter + logSpan / 2;
      setYDomain([Math.max(0.1, 10 ** newLogMin), Math.max(0.2, 10 ** newLogMax)]);
      return;
    }
    newSpan = Math.max(1, newSpan);
      const newMin = Math.max(0, center - newSpan / 2);
      const newMax = center + newSpan / 2;
      setYDomain([newMin, newMax]);
    };

  const handleDragStart = (state: any) => {
    if (state?.activeLabel == null) return;
    setDragStart(state.activeLabel as number);
    setDragEnd(state.activeLabel as number);
  };

  const handleDragMove = (state: any) => {
    if (dragStart == null) return;
    if (state?.activeLabel == null) return;
    setDragEnd(state.activeLabel as number);
  };

  const handleDragEnd = () => {
    if (dragStart != null && dragEnd != null && dragStart !== dragEnd) {
      const [start, end] = dragStart < dragEnd ? [dragStart, dragEnd] : [dragEnd, dragStart];
      setXDomain([start, end]);
    }
    setDragStart(null);
    setDragEnd(null);
  };

  const topicColor = (topic: string) => {
    const palette = ["#10b981", "#3b82f6", "#8b5cf6", "#f59e0b", "#ef4444", "#14b8a6", "#6366f1"];
    const idx = selectedTopics.indexOf(topic);
    return palette[idx % palette.length];
  };

  useEffect(() => {
    if (initializedSelection.current) return;
    if (insights.length) {
      initializedSelection.current = true;
      setSelectedTopics([insights[0].topic]);
    }
  }, [insights]);

  const handleExportCsv = () => {
    const headers = [
      "Topic",
      `Pubs ${rangeA.from ?? ""}-${rangeA.to ?? ""}`,
      `Pubs ${rangeB.from ?? ""}-${rangeB.to ?? ""}`,
      `Cites ${rangeA.from ?? ""}-${rangeA.to ?? ""}`,
      `Cites ${rangeB.from ?? ""}-${rangeB.to ?? ""}`,
      "Pubs change",
      "Cites change",
      "Insight",
    ];
    const lines = insights.map((row) =>
      [
        row.topic.replace(/"/g, '""'),
        row.pubsA,
        row.pubsB,
        row.citesA,
        row.citesB,
        formatPct(row.pubsDeltaPct),
        formatPct(row.citesDeltaPct),
        row.insight.replace(/"/g, '""'),
      ].map((cell) => `"${cell}"`).join(","),
    );
    const csv = [headers.join(","), ...lines].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "insights.csv";
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    toast({ title: "Exported CSV", description: "Downloaded insights.csv" });
  };

  const buildTopicLink = (topic: string, range: Range) => {
    const search = new URLSearchParams();
    if (range.from != null) search.set("fromYear", String(range.from));
    if (range.to != null) search.set("toYear", String(range.to));
    search.set("topic", topic);
    return `/publications?${search.toString()}`;
  };

  const handlePrint = () => {
    window.print();
  };

  const handleShareLinkedIn = () => {
    const url = window.location.href;
    const shareUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`;
    window.open(shareUrl, "_blank", "noopener,noreferrer");
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast({ title: "Link copied", description: "Insights link copied to clipboard." });
    } catch {
      toast({ title: "Could not copy link", variant: "destructive" });
    }
  };

  const handleExportSvgOrPng = (format: "svg" | "png") => {
    const table = document.getElementById("insights-table");
    if (!table) return;
    const clone = table.cloneNode(true) as HTMLElement;
    clone.style.fontFamily = "Inter, system-ui, -apple-system, sans-serif";
    clone.style.fontSize = "12px";
    clone.style.width = "100%";
    const html = `
      <div style="font-family: Inter, system-ui, -apple-system, sans-serif; font-size: 12px; padding: 12px; color: #111827;">
        <div style="display:flex; justify-content: space-between; align-items:center; margin-bottom: 8px;">
          <div><strong>Year range:</strong> ${rangeA.from ?? ""}-${rangeA.to ?? ""} vs ${rangeB.from ?? ""}-${rangeB.to ?? ""}</div>
          <div><strong>Visible series:</strong> Topics${showInstitutions ? ", Institutions" : ""}${showPublications ? ", Publications" : ""}${showCitations ? ", Citations" : ""}</div>
        </div>
        ${clone.outerHTML}
      </div>
    `;
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="1600">
      <foreignObject x="0" y="0" width="1200" height="1600">
        ${html.replace(/&/g, "&amp;")}
      </foreignObject>
    </svg>`;
    const blob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const timestamp = Date.now();
    if (format === "svg") {
      const link = document.createElement("a");
      link.href = url;
      link.download = `insights-${timestamp}.svg`;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      return;
    }
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = 1200;
      canvas.height = 1600;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);
      canvas.toBlob((pngBlob) => {
        if (!pngBlob) return;
        const pngUrl = URL.createObjectURL(pngBlob);
        const link = document.createElement("a");
        link.href = pngUrl;
        link.download = `insights-${timestamp}.png`;
        link.click();
        setTimeout(() => {
          URL.revokeObjectURL(pngUrl);
          URL.revokeObjectURL(url);
        }, 1000);
      });
    };
    img.src = url;
  };

  const handleRangeChange = (
    which: "A" | "B",
    field: "from" | "to",
    value: number,
  ) => {
    if (which === "A") {
      setRangeA((prev) => ({ ...prev, [field]: value }));
      if (field === "to" && rangeB.from != null && value >= rangeB.from) {
        setRangeB((prev) => ({ ...prev, from: value + 1 }));
      }
    } else {
      setRangeB((prev) => ({ ...prev, [field]: value }));
      if (field === "from" && rangeA.to != null && value <= rangeA.to) {
        setRangeA((prev) => ({ ...prev, to: value - 1 }));
      }
    }
  };

  return (
    <SiteShell>
      <main className="container mx-auto px-4 py-6 space-y-4">
        <div className="flex flex-wrap gap-2">
          <Button variant="ghost" onClick={() => navigate("/")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to dashboard
          </Button>
          <Button variant="ghost" onClick={() => navigate(-1)} className="px-2 text-xs">
            Back to previous
          </Button>
        </div>

        <Card className="border-border/60">
          <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3 sm:flex-1">
              <div className="flex items-center gap-2">
                <FileTextIcon className="h-5 w-5 text-primary" />
                <CardTitle className="text-base sm:text-lg text-foreground">Topic insights</CardTitle>
              </div>
              <div className="flex w-full max-w-lg items-center">
                <div className="relative w-full">
                  <Input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search topic or insight..."
                    className="h-9 pl-8 pr-3 text-sm"
                  />
                  <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                </div>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={handlePrint}
                title="Save PDF"
              >
                <Download className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={handleExportCsv}
                title="Export CSV"
              >
                <FileText className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={handleShareLinkedIn}
                title="Share on LinkedIn"
              >
                <Linkedin className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={handleCopyLink}
                title="Copy link"
              >
                <LinkIcon className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground justify-end">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-foreground">Period A</span>
                <label className="font-semibold text-foreground">From</label>
                <select
                  className="h-8 rounded border border-border bg-background px-2 text-xs"
                  value={rangeA.from ?? ""}
                  onChange={(e) => handleRangeChange("A", "from", Number(e.target.value))}
                >
                  {allYears.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
                <label className="font-semibold text-foreground">to</label>
                <select
                  className="h-8 rounded border border-border bg-background px-2 text-xs"
                  value={rangeA.to ?? ""}
                  onChange={(e) => handleRangeChange("A", "to", Number(e.target.value))}
                >
                  {allYears.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-foreground">Period B</span>
                <label className="font-semibold text-foreground">From</label>
                <select
                  className="h-8 rounded border border-border bg-background px-2 text-xs"
                  value={rangeB.from ?? ""}
                  onChange={(e) => handleRangeChange("B", "from", Number(e.target.value))}
                >
                  {allYears.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
                <label className="font-semibold text-foreground">to</label>
                <select
                  className="h-8 rounded border border-border bg-background px-2 text-xs"
                  value={rangeB.to ?? ""}
                  onChange={(e) => handleRangeChange("B", "to", Number(e.target.value))}
                >
                  {allYears.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-[11px]"
                onClick={() => setShowLegend((prev) => !prev)}
              >
                {showLegend ? (
                  <>
                    <ChevronUp className="h-3 w-3" />
                    Hide legend
                  </>
                ) : (
                  <>
                    <ChevronDown className="h-3 w-3" />
                    Show legend
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-[11px]"
                onClick={() => setShowChart((prev) => !prev)}
              >
                {showChart ? (
                  <>
                    <ChevronUp className="h-3 w-3" />
                    Hide chart
                  </>
                ) : (
                  <>
                    <ChevronDown className="h-3 w-3" />
                    Show chart
                  </>
                )}
              </Button>
              <span className="text-xs text-muted-foreground">
                {selectedTopics.length ? `${selectedTopics.length} topic${selectedTopics.length > 1 ? "s" : ""} selected` : "Click a topic to plot it"}
              </span>
            </div>

            {showChart && (
              <Card className="border-border/60 mb-4">
                <CardContent className="h-[420px] space-y-3 pb-4 pt-4 overflow-hidden">
                  <div className="flex flex-wrap items-center gap-4 text-[11px] text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        className={`flex items-center gap-1 rounded px-2 py-1 transition ${
                          showPubsSeries ? "bg-muted/50 text-foreground" : "bg-muted text-muted-foreground"
                        }`}
                        onClick={() => setShowPubsSeries((prev) => !prev)}
                      >
                        <BookOpen className="h-3 w-3" />
                        Publications
                      </button>
                      <button
                        type="button"
                        className={`flex items-center gap-1 rounded px-2 py-1 transition ${
                          showCitesSeries ? "bg-muted/50 text-foreground" : "bg-muted text-muted-foreground"
                        }`}
                        onClick={() => setShowCitesSeries((prev) => !prev)}
                      >
                        <BarChart3 className="h-3 w-3" />
                        Citations
                      </button>
                      <span className="flex items-center gap-2 text-[11px] text-muted-foreground">
                        <span className="text-foreground">Scale:</span>
                        <button
                          className={`rounded px-2 py-1 text-[11px] ${chartScale === "linear" ? "bg-muted/50 text-foreground" : "bg-muted text-muted-foreground"}`}
                          onClick={() => setChartScale("linear")}
                          type="button"
                        >
                          Linear
                        </button>
                        <button
                          className={`rounded px-2 py-1 text-[11px] ${chartScale === "log" ? "bg-muted/50 text-foreground" : "bg-muted text-muted-foreground"}`}
                          onClick={() => setChartScale("log")}
                          type="button"
                        >
                          Log
                        </button>
                      </span>
                      <button
                        type="button"
                        className="rounded bg-muted px-2 py-1 text-[11px] text-foreground transition hover:bg-muted/70"
                        onClick={resetAxes}
                        title="Reset zoom on both axes"
                      >
                        Reset axes
                      </button>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
                    {selectedTopics.map((topic) => (
                      <span key={topic} className="flex items-center gap-1 text-foreground">
                        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: topicColor(topic) }} />
                        {topic}
                      </span>
                    ))}
                  </div>
                  {selectedTopics.length === 0 ? (
                    <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                      Select topics to plot.
                    </div>
                  ) : (
                    <div className="h-full w-full" onWheel={handleWheelZoomY}>
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart
                          data={chartData}
                          margin={{ left: 12, right: 12, top: 8, bottom: 32 }}
                          onMouseDown={handleDragStart}
                          onMouseMove={handleDragMove}
                          onMouseUp={handleDragEnd}
                        >
                          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                          <XAxis
                            dataKey="year"
                            type="number"
                            tickMargin={8}
                            domain={xAxisDomain}
                            ticks={xTicks}
                            interval="preserveStartEnd"
                            padding={{ left: 8, right: 8 }}
                            allowDecimals={false}
                            allowDataOverflow
                          />
                          <YAxis
                            type="number"
                            scale={chartScale === "log" ? "log" : "linear"}
                            domain={yAxisDomain}
                            allowDecimals={false}
                            allowDataOverflow
                          />
                          <RechartsTooltip
                            formatter={(value: any, name: string) => [value, name]}
                            labelFormatter={(label) => `Year: ${label}`}
                          />
                          {dragStart != null && dragEnd != null && dragStart !== dragEnd && (
                            <ReferenceArea
                              x1={dragStart}
                              x2={dragEnd}
                              strokeOpacity={0.1}
                              fill="#0ea5e9"
                              fillOpacity={0.1}
                            />
                          )}
                          {showPubsSeries &&
                            selectedTopics.map((topic) => (
                              <Line
                                key={`${topic}-pubs`}
                                type="monotone"
                                dataKey={`${topic}-pubs`}
                                name={`${topic} pubs`}
                                stroke={topicColor(topic)}
                                strokeWidth={2}
                                dot={false}
                                isAnimationActive={false}
                              />
                            ))}
                          {showCitesSeries &&
                            selectedTopics.map((topic) => (
                              <Line
                                key={`${topic}-cites`}
                                type="monotone"
                                dataKey={`${topic}-cites`}
                                name={`${topic} cites`}
                                stroke={topicColor(topic)}
                                strokeWidth={2}
                                strokeDasharray="4 2"
                                dot={false}
                                isAnimationActive={false}
                              />
                            ))}
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {showLegend && (
              <div className="rounded-md border border-border/60 bg-muted/40 p-3 text-[11px] text-muted-foreground">
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="space-y-2">
                    <div className="font-semibold text-foreground">Legend</div>
                    <div className="grid gap-1 sm:grid-cols-2">
                      <span className="inline-flex items-center gap-2">
                        <BookOpen className="h-3 w-3 text-primary" />
                        Pubs A = Period A publications
                      </span>
                      <span className="inline-flex items-center gap-2">
                        <BookOpen className="h-3 w-3 text-primary" />
                        Pubs B = Period B publications
                      </span>
                      <span className="inline-flex items-center gap-2">
                        <BookOpen className="h-3 w-3 text-primary" />
                        Pubs Δ% = % change from Period A to B
                      </span>
                      <span className="inline-flex items-center gap-2">
                        <BarChart3 className="h-3 w-3 text-primary" />
                        Cites A = Period A citations
                      </span>
                      <span className="inline-flex items-center gap-2">
                        <BarChart3 className="h-3 w-3 text-primary" />
                        Cites B = Period B citations
                      </span>
                      <span className="inline-flex items-center gap-2">
                        <BarChart3 className="h-3 w-3 text-primary" />
                        Cites Δ% = % change from Period A to B
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="font-semibold text-foreground">Badges:</span>
                      <span className="inline-flex items-center gap-1">
                        <span className={`inline-flex items-center justify-center rounded-full p-1 ${badgeTone("Stable")}`}>
                          <BookOpen className="h-3 w-3" />
                        </span>
                        Publications trend
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <span className={`inline-flex items-center justify-center rounded-full p-1 ${badgeTone("Stable")}`}>
                          <BarChart3 className="h-3 w-3" />
                        </span>
                        Citations trend
                      </span>
                    </div>
                  </div>
                  <div className="space-y-1 text-foreground">
                    <div className="font-semibold">Insights</div>
                    <ul className="list-disc pl-4 space-y-0.5">
                      <li>Emerging: only in Period B</li>
                      <li>Declining: missing in Period B or both drop &gt;20%</li>
                      <li>Strong surge: publications ≥2x and citations ≥2x</li>
                      <li>Growing priority: publications ≥1.5x and citations ≥1.2x</li>
                      <li>Impact-led: citations ≥1.5x with publications flat/declining</li>
                      <li>Output rising, impact softening: publications ≥1.2x but citations &lt;0.9x</li>
                      <li>Stable: otherwise</li>
                    </ul>
                  </div>
                </div>
              </div>
            )}

            <div className="overflow-auto rounded-md border border-border/60" id="insights-table">
              <table className="min-w-full text-sm">
                <thead className="bg-muted/60">
                  <tr>
                    <th className="px-3 py-2 font-semibold text-foreground">Topic</th>
                    <th className="px-3 py-2 font-semibold text-foreground">
                      <button
                        type="button"
                        className="flex items-center gap-1 bg-transparent p-0 text-xs font-semibold text-foreground hover:underline"
                        onClick={() => {
                          setSortKey("pubsA");
                          setSortDir((prev) => (sortKey === "pubsA" && prev === "desc" ? "asc" : "desc"));
                        }}
                      >
                        Pubs A
                        <ArrowUpDown className="h-3 w-3" />
                      </button>
                    </th>
                    <th className="px-3 py-2 font-semibold text-foreground">
                      <button
                        type="button"
                        className="flex items-center gap-1 bg-transparent p-0 text-xs font-semibold text-foreground hover:underline"
                        onClick={() => {
                          setSortKey("pubsB");
                          setSortDir((prev) => (sortKey === "pubsB" && prev === "desc" ? "asc" : "desc"));
                        }}
                      >
                        Pubs B
                        <ArrowUpDown className="h-3 w-3" />
                      </button>
                    </th>
                    <th className="px-3 py-2 font-semibold text-foreground">
                      <button
                        type="button"
                        className="flex items-center gap-1 bg-transparent p-0 text-xs font-semibold text-foreground hover:underline"
                        onClick={() => {
                          setSortKey("pubsDelta");
                          setSortDir((prev) => (sortKey === "pubsDelta" && prev === "desc" ? "asc" : "desc"));
                        }}
                      >
                        Pubs Δ%
                        <ArrowUpDown className="h-3 w-3" />
                      </button>
                    </th>
                    <th className="px-3 py-2 font-semibold text-foreground">
                      <button
                        type="button"
                        className="flex items-center gap-1 bg-transparent p-0 text-xs font-semibold text-foreground hover:underline"
                        onClick={() => {
                          setSortKey("citesA");
                          setSortDir((prev) => (sortKey === "citesA" && prev === "desc" ? "asc" : "desc"));
                        }}
                      >
                        Cites A
                        <ArrowUpDown className="h-3 w-3" />
                      </button>
                    </th>
                    <th className="px-3 py-2 font-semibold text-foreground">
                      <button
                        type="button"
                        className="flex items-center gap-1 bg-transparent p-0 text-xs font-semibold text-foreground hover:underline"
                        onClick={() => {
                          setSortKey("citesB");
                          setSortDir((prev) => (sortKey === "citesB" && prev === "desc" ? "asc" : "desc"));
                        }}
                      >
                        Cites B
                        <ArrowUpDown className="h-3 w-3" />
                      </button>
                    </th>
                    <th className="px-3 py-2 font-semibold text-foreground">
                      <button
                        type="button"
                        className="flex items-center gap-1 bg-transparent p-0 text-xs font-semibold text-foreground hover:underline"
                        onClick={() => {
                          setSortKey("citesDelta");
                          setSortDir((prev) => (sortKey === "citesDelta" && prev === "desc" ? "asc" : "desc"));
                        }}
                      >
                        Cites Δ%
                        <ArrowUpDown className="h-3 w-3" />
                      </button>
                    </th>
                    <th className="px-3 py-2 font-semibold text-foreground">
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          className="flex items-center gap-1 bg-transparent p-0 text-xs font-semibold text-foreground hover:underline"
                          onClick={() => {
                            setSortKey("insight");
                            setSortDir((prev) => (sortKey === "insight" && prev === "desc" ? "asc" : "desc"));
                          }}
                        >
                          Insights
                          <ArrowUpDown className="h-3 w-3" />
                        </button>
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {insights.map((row) => {
                    const pubsStatus = classifyMetricChange(row.pubsDeltaPct);
                    const citesStatus = classifyMetricChange(row.citesDeltaPct);
                    const selected = selectedTopics.includes(row.topic);
                    return (
                      <tr key={row.topic} className="border-t border-border/60">
                        <td className="px-3 py-2 font-semibold text-foreground">
                          <div className="flex items-center gap-2">
                            {showChart && (
                              <button
                                type="button"
                                onClick={() => toggleTopicSelection(row.topic)}
                                className={`h-6 w-6 rounded border px-1 text-xs font-semibold transition ${
                                  selected
                                    ? "border-primary bg-primary/10 text-primary"
                                    : "border-border bg-background text-muted-foreground"
                                }`}
                                title={selected ? "Remove from chart" : "Add to chart"}
                              >
                                {selected ? "✓" : "+"}
                              </button>
                            )}
                            <Tag className="h-3.5 w-3.5 text-primary" />
                            <span className={selected ? "text-primary" : ""}>{row.topic}</span>
                          </div>
                        </td>
                        <td className="px-3 py-2">
                          <Link
                            to={buildTopicLink(row.topic, rangeA)}
                            className="text-primary hover:underline"
                          >
                            {row.pubsA}
                          </Link>
                        </td>
                        <td className="px-3 py-2">
                          <Link
                            to={buildTopicLink(row.topic, rangeB)}
                            className="text-primary hover:underline"
                          >
                            {row.pubsB}
                          </Link>
                        </td>
                        <td className="px-3 py-2">
                          <span className={deltaClass(row.pubsDeltaPct)}>{formatPct(row.pubsDeltaPct)}</span>
                        </td>
                        <td className="px-3 py-2">
                          <Link
                            to={buildTopicLink(row.topic, rangeA)}
                            className="text-primary hover:underline"
                          >
                            {row.citesA.toLocaleString()}
                          </Link>
                        </td>
                        <td className="px-3 py-2">
                          <Link
                            to={buildTopicLink(row.topic, rangeB)}
                            className="text-primary hover:underline"
                          >
                            {row.citesB.toLocaleString()}
                          </Link>
                        </td>
                        <td className="px-3 py-2">
                          <span className={deltaClass(row.citesDeltaPct)}>{formatPct(row.citesDeltaPct)}</span>
                        </td>
                        <td className="px-3 py-2 text-muted-foreground">
                          <div className="flex flex-wrap items-center gap-2">
                            <span
                              className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${badgeTone(pubsStatus)}`}
                              title={`Publications: ${pubsStatus}`}
                            >
                              <BookOpen className="h-3 w-3" />
                            </span>
                            <span
                              className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${badgeTone(citesStatus)}`}
                              title={`Citations: ${citesStatus}`}
                            >
                              <BarChart3 className="h-3 w-3" />
                            </span>
                            <span className="text-xs text-muted-foreground">{row.insight}</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </main>
    </SiteShell>
  );
};

export default InsightsPage;
