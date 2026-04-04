// =============================================================
// ProductiveDay — Migration Banner
// =============================================================
import { useState, useEffect } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { runMigration } from "./migrate";

export function MigrationBanner() {
  const { user } = useAuth();
  const [result, setResult] = useState<{ tasks: number; plans: number; show: boolean } | null>(null);

  useEffect(() => {
    if (!user) return;
    runMigration().then((res) => {
      if (!res.alreadyMigrated && (res.tasks > 0 || res.plans > 0)) {
        setResult({ tasks: res.tasks, plans: res.plans, show: true });
      }
    });
  }, [user]);

  if (!result?.show) return null;

  return (
    <div className="mx-4 mt-3 px-4 py-3 rounded-xl bg-green-50 border border-green-200 flex items-center justify-between animate-fade-in">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-green-600">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
        <div>
          <p className="text-sm font-semibold text-green-800">Data migrated successfully</p>
          <p className="text-xs text-green-600">
            {result.tasks > 0 && `${result.tasks} task${result.tasks !== 1 ? "s" : ""}`}
            {result.tasks > 0 && result.plans > 0 && " and "}
            {result.plans > 0 && `${result.plans} plan${result.plans !== 1 ? "s" : ""}`}
            {" "}imported from your browser.
          </p>
        </div>
      </div>
      <button
        onClick={() => setResult(null)}
        className="text-green-500 hover:text-green-700 p-1 ml-2 flex-shrink-0"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>
    </div>
  );
}
