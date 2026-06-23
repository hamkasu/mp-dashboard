import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Flag } from "lucide-react";

interface CoalitionNumbersPopupProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  partyBreakdown: { party: string; count: number }[];
  governmentMps: number;
  oppositionMps: number;
  totalMps: number;
}

const governmentParties = ['PH', 'BN', 'GPS', 'GRS', 'WARISAN', 'UPKO', 'PBRS', 'STAR'];

export function CoalitionNumbersPopup({
  isOpen,
  onOpenChange,
  partyBreakdown,
  governmentMps,
  oppositionMps,
  totalMps
}: CoalitionNumbersPopupProps) {
  const governmentPartyBreakdown = partyBreakdown.filter(p =>
    governmentParties.includes(p.party.toUpperCase())
  );

  const oppositionPartyBreakdown = partyBreakdown.filter(p =>
    !governmentParties.includes(p.party.toUpperCase())
  );

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Flag className="h-5 w-5" />
            Coalition Numbers Breakdown
          </DialogTitle>
          <DialogDescription>
            How these numbers are calculated in the Malaysian Parliament
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <div>
            <h3 className="font-semibold text-lg mb-3">Total Parties: {partyBreakdown.length}</h3>
            <p className="text-sm text-muted-foreground mb-3">
              This represents the number of distinct political parties represented in Parliament.
            </p>
          </div>

          <div className="border-t pt-4">
            <h4 className="font-semibold text-green-700 dark:text-green-400 mb-3">
              Government Coalition: {governmentMps} MPs
            </h4>
            <div className="space-y-2 mb-3">
              {governmentPartyBreakdown.map((party) => (
                <div key={party.party} className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{party.party}</span>
                  <span className="font-semibold">{party.count}</span>
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              Includes: {governmentParties.join(', ')}
            </p>
          </div>

          <div className="border-t pt-4">
            <h4 className="font-semibold text-red-700 dark:text-red-400 mb-3">
              Opposition: {oppositionMps} MPs
            </h4>
            <div className="space-y-2 mb-3">
              {oppositionPartyBreakdown.map((party) => (
                <div key={party.party} className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{party.party}</span>
                  <span className="font-semibold">{party.count}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="border-t pt-4 bg-muted/50 p-3 rounded">
            <p className="text-xs text-muted-foreground">
              <strong>Source:</strong> Parliamentary records and official party affiliations. The government coalition is based on current political alliances as of the last election and any subsequent party changes.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
