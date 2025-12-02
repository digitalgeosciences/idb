import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { FileText, Quote, TrendingUp } from "lucide-react";

interface Member {
  id: string;
  name: string;
  role: string;
  email: string;
  hIndex: number;
  i10Index: number;
  totalCitations: number;
  totalPublications: number;
  avatar: string;
}

interface MemberCardProps {
  member: Member;
  onClick?: () => void;
}

export const MemberCard = ({ member, onClick }: MemberCardProps) => {
  const getRoleBadgeVariant = (role: string) => {
    if (role.includes("Principal")) return "default";
    if (role.includes("Co-Principal")) return "secondary";
    if (role.includes("Senior")) return "secondary";
    return "outline";
  };

  return (
    <Card 
      className="p-4 transition-all hover:shadow-lg border-border/50 cursor-pointer hover:border-primary/30"
      onClick={onClick}
    >
      <div className="flex items-start gap-4">
        <Avatar className="h-12 w-12">
          <AvatarFallback className="bg-primary/10 text-primary font-semibold">
            {member.avatar}
          </AvatarFallback>
        </Avatar>
        
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-foreground truncate">{member.name}</h4>
          <Badge variant={getRoleBadgeVariant(member.role)} className="mt-1 text-xs">
            {member.role}
          </Badge>
          
          <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-border/50">
            <div className="flex flex-col items-center">
              <FileText className="h-3.5 w-3.5 text-primary mb-1" />
              <p className="text-sm font-bold text-foreground">{member.totalPublications}</p>
              <p className="text-xs text-muted-foreground">Pubs</p>
            </div>
            
            <div className="flex flex-col items-center">
              <Quote className="h-3.5 w-3.5 text-primary mb-1" />
              <p className="text-sm font-bold text-foreground">{member.totalCitations}</p>
              <p className="text-xs text-muted-foreground">Citations</p>
            </div>
            
            <div className="flex flex-col items-center">
              <TrendingUp className="h-3.5 w-3.5 text-primary mb-1" />
              <p className="text-sm font-bold text-foreground">{member.hIndex}</p>
              <p className="text-xs text-muted-foreground">h-index</p>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
};
