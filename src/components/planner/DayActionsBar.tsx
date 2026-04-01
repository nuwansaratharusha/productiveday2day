import { Download, CalendarPlus, CheckSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TimeBlockData } from "@/data/plannerData";
import { downloadDailyReport, pushToGoogleCalendar } from "@/lib/calendarUtils";
import { toast } from "@/hooks/use-toast";

interface DayActionsBarProps {
  blocks: TimeBlockData[];
  completed: Record<string, boolean>;
  selectedDay: number;
}

export function DayActionsBar({ blocks, completed, selectedDay }: DayActionsBarProps) {
  const completedCount = blocks.filter((b) => completed[b.id]).length;
  const totalCount = blocks.length;
  const hasCompleted = completedCount > 0;

  const handleDownload = () => {
    downloadDailyReport(blocks, completed, selectedDay);
    toast({ title: "Report downloaded", description: "Your daily report has been saved." });
  };

  const handlePushCalendar = () => {
    const count = pushToGoogleCalendar(blocks, completed);
    if (count === 0) {
      toast({
        title: "No completed blocks",
        description: "Complete some blocks first to push to Google Calendar.",
        variant: "destructive",
      });
      return;
    }
    toast({
      title: "Calendar file downloaded",
      description: `${count} block${count > 1 ? "s" : ""} exported as .ics. Open it to import into Google Calendar.`,
    });
  };

  return (
    <div className="bg-card rounded-2xl border border-border shadow-card mt-4 p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <CheckSquare className="w-3.5 h-3.5 text-muted-foreground" />
          <span className="text-[12px] font-bold text-card-foreground">End of Day</span>
        </div>
        <span className="text-[11px] text-muted-foreground">
          <span className="font-semibold text-foreground">{completedCount}</span> / {totalCount} done
        </span>
      </div>

      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          className="flex-1 h-9 gap-1.5 text-xs font-semibold rounded-lg"
          onClick={handleDownload}
        >
          <Download className="w-3.5 h-3.5" />
          Download Report
        </Button>
        <Button
          size="sm"
          className="flex-1 h-9 gap-1.5 text-xs font-semibold gradient-brand text-primary-foreground border-0 rounded-lg"
          onClick={handlePushCalendar}
          disabled={!hasCompleted}
        >
          <CalendarPlus className="w-3.5 h-3.5" />
          Push to Calendar
        </Button>
      </div>

      {!hasCompleted && (
        <p className="text-[11px] text-muted-foreground mt-2.5 text-center">
          Complete blocks to enable calendar export
        </p>
      )}
    </div>
  );
}
