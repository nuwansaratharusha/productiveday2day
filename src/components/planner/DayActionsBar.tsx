import { Download, Calendar, CalendarPlus } from "lucide-react";
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
    toast({
      title: "Report downloaded",
      description: `Your daily report has been saved.`,
    });
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
      description: `${count} block${count > 1 ? "s" : ""} exported as .ics file. Open it to import into Google Calendar.`,
    });
  };

  return (
    <div className="bg-card rounded-2xl p-4 border border-border shadow-sm mt-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-primary" />
          <span className="text-sm font-bold text-card-foreground">End of Day Actions</span>
        </div>
        <span className="text-xs text-muted-foreground">
          {completedCount}/{totalCount} completed
        </span>
      </div>
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          className="flex-1 h-9 gap-2 text-xs font-semibold"
          onClick={handleDownload}
        >
          <Download className="w-3.5 h-3.5" />
          Download Report
        </Button>
        <Button
          size="sm"
          className="flex-1 h-9 gap-2 text-xs font-semibold gradient-brand text-primary-foreground border-0"
          onClick={handlePushCalendar}
          disabled={!hasCompleted}
        >
          <CalendarPlus className="w-3.5 h-3.5" />
          Push to Google Calendar
        </Button>
      </div>
      {!hasCompleted && (
        <p className="text-[11px] text-muted-foreground mt-2 text-center">
          Complete blocks to enable calendar export
        </p>
      )}
    </div>
  );
}
