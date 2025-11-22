import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useLanguage } from "@/i18n/LanguageContext";

type SortOption = "name" | "attendance-best" | "attendance-worst" | "speeches-most" | "speeches-fewest" | "poverty-highest" | "poverty-lowest";

interface FilterSidebarProps {
  parties: { party: string; count: number }[];
  states: string[];
  selectedParties: string[];
  selectedStates: string[];
  sortBy: SortOption;
  onPartyToggle: (party: string) => void;
  onStateToggle: (state: string) => void;
  onSortChange: (sort: SortOption) => void;
  onClearFilters: () => void;
  isMobile?: boolean;
  onClose?: () => void;
}

export function FilterSidebar({
  parties,
  states,
  selectedParties,
  selectedStates,
  sortBy,
  onPartyToggle,
  onStateToggle,
  onSortChange,
  onClearFilters,
  isMobile,
  onClose,
}: FilterSidebarProps) {
  const { t } = useLanguage();
  const hasActiveFilters = selectedParties.length > 0 || selectedStates.length > 0;

  return (
    <div className="flex flex-col h-full">
      {isMobile && (
        <>
          <div className="flex items-center justify-between p-4">
            <h2 className="text-lg font-semibold">{t('filters.title')}</h2>
            <Button variant="ghost" size="icon" onClick={onClose} data-testid="button-close-filters">
              <X className="h-4 w-4" />
            </Button>
          </div>
          <Separator />
        </>
      )}

      <ScrollArea className="flex-1">
        <div className="p-4 md:p-6 space-y-6">
          {/* Sort Options */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium uppercase tracking-wide">
              {t('filters.sortBy')}
            </h3>
            <RadioGroup value={sortBy} onValueChange={(value) => onSortChange(value as SortOption)}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="name" id="sort-name" data-testid="radio-sort-name" />
                <Label htmlFor="sort-name" className="text-sm font-normal cursor-pointer">
                  {t('filters.sortName')}
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="attendance-best" id="sort-attendance-best" data-testid="radio-sort-attendance-best" />
                <Label htmlFor="sort-attendance-best" className="text-sm font-normal cursor-pointer">
                  {t('filters.sortBestAttendance')}
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="attendance-worst" id="sort-attendance-worst" data-testid="radio-sort-attendance-worst" />
                <Label htmlFor="sort-attendance-worst" className="text-sm font-normal cursor-pointer">
                  {t('filters.sortWorstAttendance')}
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="speeches-most" id="sort-speeches-most" data-testid="radio-sort-speeches-most" />
                <Label htmlFor="sort-speeches-most" className="text-sm font-normal cursor-pointer">
                  {t('filters.sortMostSpeeches')}
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="speeches-fewest" id="sort-speeches-fewest" data-testid="radio-sort-speeches-fewest" />
                <Label htmlFor="sort-speeches-fewest" className="text-sm font-normal cursor-pointer">
                  {t('filters.sortFewestSpeeches')}
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="poverty-highest" id="sort-poverty-highest" data-testid="radio-sort-poverty-highest" />
                <Label htmlFor="sort-poverty-highest" className="text-sm font-normal cursor-pointer">
                  {t('filters.sortHighestPoverty')}
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="poverty-lowest" id="sort-poverty-lowest" data-testid="radio-sort-poverty-lowest" />
                <Label htmlFor="sort-poverty-lowest" className="text-sm font-normal cursor-pointer">
                  {t('filters.sortLowestPoverty')}
                </Label>
              </div>
            </RadioGroup>
          </div>

          <Separator />

          {/* Party Filters */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium uppercase tracking-wide">
                {t('filters.party')}
              </h3>
              {selectedParties.length > 0 && (
                <span className="text-xs text-muted-foreground">
                  {selectedParties.length} {t('filters.selected')}
                </span>
              )}
            </div>
            <div className="space-y-2">
              {parties.map(({ party, count }) => (
                <div key={party} className="flex items-center space-x-2">
                  <Checkbox
                    id={`party-${party}`}
                    checked={selectedParties.includes(party)}
                    onCheckedChange={() => onPartyToggle(party)}
                    data-testid={`checkbox-party-${party}`}
                  />
                  <Label
                    htmlFor={`party-${party}`}
                    className="text-sm font-normal cursor-pointer flex-1 flex items-center justify-between"
                  >
                    <span>{party}</span>
                    <span className="text-xs text-muted-foreground">{count}</span>
                  </Label>
                </div>
              ))}
            </div>
          </div>

          <Separator />

          {/* State Filters */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium uppercase tracking-wide">
                {t('filters.state')}
              </h3>
              {selectedStates.length > 0 && (
                <span className="text-xs text-muted-foreground">
                  {selectedStates.length} {t('filters.selected')}
                </span>
              )}
            </div>
            <div className="space-y-2">
              {states.map((state) => (
                <div key={state} className="flex items-center space-x-2">
                  <Checkbox
                    id={`state-${state}`}
                    checked={selectedStates.includes(state)}
                    onCheckedChange={() => onStateToggle(state)}
                    data-testid={`checkbox-state-${state}`}
                  />
                  <Label
                    htmlFor={`state-${state}`}
                    className="text-sm font-normal cursor-pointer flex-1"
                  >
                    {state}
                  </Label>
                </div>
              ))}
            </div>
          </div>
        </div>
      </ScrollArea>

      <div className="p-4 border-t">
        <Button
          variant="outline"
          className="w-full"
          onClick={onClearFilters}
          disabled={!hasActiveFilters}
          data-testid="button-clear-filters"
        >
          {t('filters.clearAllFilters')}
        </Button>
      </div>
    </div>
  );
}
