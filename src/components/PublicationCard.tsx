import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ExternalLink } from "lucide-react";

interface Publication {
  id: string;
  title: string;
  authors: string[];
  year: number;
  citations: number;
  journal: string;
  type: string;
}

interface PublicationCardProps {
  publication: Publication;
}

export const PublicationCard = ({ publication }: PublicationCardProps) => {
  return (
    <Card className="p-6 transition-all hover:shadow-md border-border/50">
      <div className="space-y-3">
        <div className="flex items-start justify-between gap-4">
          <h3 className="text-lg font-semibold text-foreground leading-tight flex-1">
            {publication.title}
          </h3>
          <ExternalLink className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-1 cursor-pointer hover:text-primary transition-colors" />
        </div>
        
        <p className="text-sm text-muted-foreground">
          {publication.authors.join(", ")}
        </p>
        
        <div className="flex items-center gap-4 text-sm">
          <span className="text-muted-foreground">{publication.journal}</span>
          <span className="text-muted-foreground">•</span>
          <span className="text-muted-foreground">{publication.year}</span>
        </div>
        
        <div className="flex items-center gap-2">
          <Badge variant="secondary">{publication.type}</Badge>
          <Badge variant="outline" className="bg-accent/10 text-accent-foreground border-accent/20">
            {publication.citations} citations
          </Badge>
        </div>
      </div>
    </Card>
  );
};
