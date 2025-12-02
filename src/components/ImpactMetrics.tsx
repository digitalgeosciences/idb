import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, Award, BarChart3, Target } from "lucide-react";

interface ImpactMetricsProps {
  hIndex: number;
  totalPublications: number;
  totalCitations: number;
  publicationsWithData?: { citations: number }[];
}

export const ImpactMetrics = ({ 
  hIndex, 
  totalPublications, 
  totalCitations,
  publicationsWithData = []
}: ImpactMetricsProps) => {
  // Calculate i10-index (publications with 10+ citations)
  const i10Index = publicationsWithData.filter(p => p.citations >= 10).length;
  
  // Calculate average citations per publication
  const avgCitations = totalPublications > 0 
    ? (totalCitations / totalPublications).toFixed(1) 
    : "0";
  
  // Calculate yearly publication rate (assuming 5 years active)
  const yearlyRate = (totalPublications / 5).toFixed(1);

  const metrics = [
    {
      title: "h-index",
      value: hIndex,
      description: "Has published h papers with at least h citations each",
      icon: Award,
      color: "text-primary"
    },
    {
      title: "i10-index",
      value: i10Index,
      description: "Publications with at least 10 citations",
      icon: Target,
      color: "text-secondary"
    },
    {
      title: "Avg Citations",
      value: avgCitations,
      description: "Average citations per publication",
      icon: BarChart3,
      color: "text-accent"
    },
    {
      title: "Annual Output",
      value: yearlyRate,
      description: "Average publications per year",
      icon: TrendingUp,
      color: "text-primary"
    }
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-primary" />
          Impact Metrics
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {metrics.map((metric) => (
            <div 
              key={metric.title}
              className="p-4 rounded-lg border border-border/50 bg-card hover:border-primary/30 transition-colors"
            >
              <div className="flex items-center gap-2 mb-2">
                <metric.icon className={`h-4 w-4 ${metric.color}`} />
                <h4 className="font-semibold text-sm text-muted-foreground">{metric.title}</h4>
              </div>
              <p className="text-3xl font-bold text-foreground mb-1">{metric.value}</p>
              <p className="text-xs text-muted-foreground leading-tight">{metric.description}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
