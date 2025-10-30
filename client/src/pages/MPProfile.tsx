import { useQuery } from "@tanstack/react-query";
import { useRoute, Link } from "wouter";
import { ArrowLeft, MapPin, UserCircle, Flag, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import type { Mp } from "@shared/schema";

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

export default function MPProfile() {
  const [, params] = useRoute("/mp/:id");
  const mpId = params?.id;

  const { data: mp, isLoading } = useQuery<Mp>({
    queryKey: ["/api/mps", mpId],
    enabled: !!mpId,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-5xl mx-auto px-4 md:px-6 lg:px-8 py-6 md:py-8">
          <div className="animate-pulse space-y-6">
            <div className="h-10 w-32 bg-muted rounded" />
            <div className="grid md:grid-cols-3 gap-6">
              <div className="h-80 bg-muted rounded-lg" />
              <div className="md:col-span-2 space-y-4">
                <div className="h-12 bg-muted rounded w-3/4" />
                <div className="h-6 bg-muted rounded w-1/2" />
                <div className="h-24 bg-muted rounded" />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!mp) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <UserCircle className="h-24 w-24 text-muted-foreground/50 mx-auto" />
          <h2 className="text-2xl font-bold">MP Not Found</h2>
          <Link href="/">
            <Button variant="default">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Dashboard
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const initials = mp.name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const partyColor = PARTY_COLORS[mp.party] || "bg-muted text-muted-foreground";

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-5xl mx-auto px-4 md:px-6 lg:px-8 py-6 md:py-8">
        <div className="space-y-6 md:space-y-8">
          {/* Back Button */}
          <Link href="/">
            <Button variant="ghost" size="sm" data-testid="button-back">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Dashboard
            </Button>
          </Link>

          {/* Profile Header */}
          <div className="grid md:grid-cols-3 gap-6 md:gap-8">
            {/* Photo */}
            <div className="flex justify-center md:justify-start">
              <div className="w-full max-w-xs">
                <div className="aspect-[3/4] rounded-lg overflow-hidden bg-muted border">
                  {mp.photoUrl ? (
                    <img
                      src={mp.photoUrl}
                      alt={mp.name}
                      className="object-cover w-full h-full"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <UserCircle className="w-32 h-32 text-muted-foreground/50" />
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Info */}
            <div className="md:col-span-2 space-y-4">
              {mp.role && (
                <p className="text-sm text-muted-foreground uppercase tracking-wide font-medium">
                  {mp.role}
                </p>
              )}
              
              <div>
                <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-2" data-testid="text-mp-name">
                  {mp.title && <span className="text-muted-foreground">{mp.title} </span>}
                  {mp.name}
                </h1>
                
                <div className="flex items-center gap-3 flex-wrap">
                  <Badge className={`${partyColor} text-base px-3 py-1`}>
                    {mp.party}
                  </Badge>
                  <Badge variant="outline" className="text-base px-3 py-1 font-mono">
                    {mp.parliamentCode}
                  </Badge>
                </div>
              </div>

              <Separator />

              {/* Details Grid */}
              <div className="grid gap-4">
                <div className="flex items-start gap-3">
                  <MapPin className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-sm text-muted-foreground uppercase tracking-wide mb-1">
                      Constituency
                    </p>
                    <p className="text-lg font-semibold">{mp.constituency}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Flag className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-sm text-muted-foreground uppercase tracking-wide mb-1">
                      State
                    </p>
                    <p className="text-lg font-semibold">{mp.state}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <UserCircle className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-sm text-muted-foreground uppercase tracking-wide mb-1">
                      Gender
                    </p>
                    <p className="text-lg font-semibold">{mp.gender}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Additional Information Cards */}
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Parliamentary Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="text-sm text-muted-foreground">Parliament Code</p>
                  <p className="font-mono font-semibold">{mp.parliamentCode}</p>
                </div>
                <Separator />
                <div>
                  <p className="text-sm text-muted-foreground">Party Affiliation</p>
                  <p className="font-semibold">{mp.party}</p>
                </div>
                {mp.role && (
                  <>
                    <Separator />
                    <div>
                      <p className="text-sm text-muted-foreground">Current Role</p>
                      <p className="font-semibold">{mp.role}</p>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  Constituency Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="text-sm text-muted-foreground">Constituency Name</p>
                  <p className="font-semibold">{mp.constituency}</p>
                </div>
                <Separator />
                <div>
                  <p className="text-sm text-muted-foreground">State/Territory</p>
                  <p className="font-semibold">{mp.state}</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
