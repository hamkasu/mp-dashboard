import { MapPin, UserCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { Mp } from "@shared/schema";
import { Link } from "wouter";

interface MPCardProps {
  mp: Mp;
}

const PARTY_COLORS: Record<string, string> = {
  PH: "bg-chart-1 text-white",
  BN: "bg-chart-2 text-white",
  GPS: "bg-chart-3 text-white",
  GRS: "bg-chart-4 text-white",
  WARISAN: "bg-chart-5 text-white",
  KDM: "bg-primary text-primary-foreground",
  PBM: "bg-secondary text-secondary-foreground",
  PN: "bg-accent text-accent-foreground",
  MUDA: "bg-muted text-muted-foreground",
  BEBAS: "bg-destructive text-destructive-foreground",
};

export function MPCard({ mp }: MPCardProps) {
  const initials = mp.name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const partyColor = PARTY_COLORS[mp.party] || "bg-muted text-muted-foreground";

  return (
    <Link href={`/mp/${mp.id}`}>
      <Card 
        className="hover-elevate overflow-hidden transition-shadow duration-200 cursor-pointer h-full"
        data-testid={`card-mp-${mp.id}`}
      >
        <div className="aspect-[3/4] relative overflow-hidden bg-muted">
          {mp.photoUrl ? (
            <img
              src={mp.photoUrl}
              alt={mp.name}
              className="object-cover w-full h-full"
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-muted">
              <UserCircle className="w-24 h-24 text-muted-foreground/50" />
            </div>
          )}
        </div>
        
        <CardContent className="p-4 space-y-3">
          <div className="space-y-2">
            <h3 className="text-lg font-semibold leading-tight line-clamp-2" data-testid={`text-mp-name-${mp.id}`}>
              {mp.title && <span className="text-muted-foreground text-sm">{mp.title} </span>}
              {mp.name}
            </h3>
            
            {mp.role && (
              <p className="text-xs text-muted-foreground uppercase tracking-wide">
                {mp.role}
              </p>
            )}
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Badge className={partyColor} data-testid={`badge-party-${mp.id}`}>
              {mp.party}
            </Badge>
          </div>

          <div className="space-y-1 text-sm">
            <div className="flex items-start gap-2">
              <MapPin className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="font-medium line-clamp-1">{mp.constituency}</p>
                <p className="text-xs text-muted-foreground">{mp.state}</p>
              </div>
            </div>
            
            <p className="text-xs text-muted-foreground font-mono">
              {mp.parliamentCode}
            </p>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
