// =============================================================
// ProductiveDay — OAuth Callback Handler
// =============================================================
// Supabase redirects here after Google/GitHub OAuth.
// The SDK automatically exchanges the code for a session.
// =============================================================
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { createClient } from "@/lib/supabase/client";

async function getRedirectPath(supabase: ReturnType<typeof createClient>, userId: string) {
  // If the profiles table has an `onboarded` flag, use it to decide destination
  try {
    const { data } = await supabase
      .from("profiles")
      .select("onboarded")
      .eq("id", userId)
      .maybeSingle();
    if (data?.onboarded) return "/";
  } catch {
    // column may not exist yet — default to onboarding
  }
  return "/onboarding";
}

export default function AuthCallbackPage() {
  const navigate = useNavigate();

  useEffect(() => {
    const supabase = createClient();

    // onAuthStateChange fires once the session is ready
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "SIGNED_IN" && session) {
        subscription.unsubscribe();
        const dest = await getRedirectPath(supabase, session.user.id);
        navigate(dest, { replace: true });
      } else if (event === "SIGNED_OUT") {
        subscription.unsubscribe();
        navigate("/login", { replace: true });
      }
    });

    // Also check if session is already established (handles page refresh edge case)
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session) {
        subscription.unsubscribe();
        const dest = await getRedirectPath(supabase, session.user.id);
        navigate(dest, { replace: true });
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 rounded-xl gradient-brand animate-pulse shadow-brand" />
        <p className="text-sm text-muted-foreground">Signing you in…</p>
      </div>
    </div>
  );
}
