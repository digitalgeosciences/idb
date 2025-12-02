import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sparkles } from "lucide-react";

interface ResearchTopicsProps {
  topics: string[];
}

export const ResearchTopics = ({ topics }: ResearchTopicsProps) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          Research Areas
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-2">
          {topics.map((topic, idx) => (
            <Badge 
              key={idx} 
              variant="secondary"
              className="text-sm px-3 py-1 hover:bg-primary hover:text-primary-foreground cursor-pointer transition-colors"
            >
              {topic}
            </Badge>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
