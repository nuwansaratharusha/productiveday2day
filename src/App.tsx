import { Component, type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";

// ── ErrorBoundary ─────────────────────────────────────────────
// Catches any render-time JS errors and shows a recovery screen
// instead of a blank white page.
class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  render() {
    if (this.state.error) {
      return (
        <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "2rem", background: "#f9fafb", fontFamily: "Inter, sans-serif" }}>
          <div style={{ maxWidth: 480, width: "100%", background: "#fff", borderRadius: 16, padding: "2rem", boxShadow: "0 4px 24px rgba(0,0,0,0.08)", border: "1px solid #e5e7eb" }}>
            <div style={{ width: 48, height: 48, borderRadius: 12, background: "#fee2e2", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "1.25rem" }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
            </div>
            <h2 style={{ margin: "0 0 0.5rem", fontSize: "1.125rem", fontWeight: 700, color: "#111827" }}>Something went wrong</h2>
            <p style={{ margin: "0 0 1.25rem", fontSize: "0.875rem", color: "#6b7280", lineHeight: 1.6 }}>
              The app encountered an unexpected error. Please try refreshing the page.
            </p>
            <details style={{ marginBottom: "1.25rem" }}>
              <summary style={{ fontSize: "0.75rem", color: "#9ca3af", cursor: "pointer", userSelect: "none" }}>Error details</summary>
              <pre style={{ marginTop: "0.5rem", fontSize: "0.7rem", color: "#dc2626", background: "#fef2f2", borderRadius: 8, padding: "0.75rem", overflow: "auto", whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                {this.state.error.message}{"\n\n"}{this.state.error.stack}
              </pre>
            </details>
            <button
              onClick={() => window.location.reload()}
              style={{ width: "100%", padding: "0.625rem 1rem", borderRadius: 10, background: "linear-gradient(135deg,#6366f1,#8b5cf6)", color: "#fff", fontSize: "0.875rem", fontWeight: 600, border: "none", cursor: "pointer" }}
            >
              Refresh Page
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
import { AuthProvider } from "@/components/auth/AuthProvider";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { AppLayout } from "@/components/layout/AppLayout";
import { NavProvider } from "@/lib/context/NavContext";
import Index from "./pages/Index.tsx";
import HabitsPage from "./pages/HabitsPage.tsx";
import CalendarPage from "./pages/CalendarPage.tsx";
import AnalyticsPage from "./pages/AnalyticsPage.tsx";
import ProfilePage from "./pages/ProfilePage.tsx";
import LoginPage from "./pages/LoginPage.tsx";
import SignupPage from "./pages/SignupPage.tsx";
import AuthCallbackPage from "./pages/AuthCallbackPage.tsx";
import NotFound from "./pages/NotFound.tsx";
import CreatorDashboard from "./pages/creator/CreatorDashboard.tsx";
import IdeasVault from "./pages/creator/IdeasVault.tsx";
import ContentPipeline from "./pages/creator/ContentPipeline.tsx";
import ScriptEditor from "./pages/creator/ScriptEditor.tsx";
import FinancePage from "./pages/FinancePage.tsx";

const queryClient = new QueryClient();

const App = () => (
  <ErrorBoundary>
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <NavProvider>
          <AppLayout>
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/signup" element={<SignupPage />} />
              <Route path="/auth/callback" element={<AuthCallbackPage />} />
              <Route path="/" element={<ProtectedRoute><Index /></ProtectedRoute>} />
              <Route path="/habits" element={<ProtectedRoute><HabitsPage /></ProtectedRoute>} />
              <Route path="/calendar" element={<ProtectedRoute><CalendarPage /></ProtectedRoute>} />
              <Route path="/analytics" element={<ProtectedRoute><AnalyticsPage /></ProtectedRoute>} />
              <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
              <Route path="/calendar" element={<ProtectedRoute><CalendarPage /></ProtectedRoute>} />
              <Route path="/finance" element={<ProtectedRoute><FinancePage /></ProtectedRoute>} />
              <Route path="/creator" element={<ProtectedRoute><CreatorDashboard /></ProtectedRoute>} />
              <Route path="/creator/ideas" element={<ProtectedRoute><IdeasVault /></ProtectedRoute>} />
              <Route path="/creator/pipeline" element={<ProtectedRoute><ContentPipeline /></ProtectedRoute>} />
              <Route path="/creator/scripts" element={<ProtectedRoute><ScriptEditor /></ProtectedRoute>} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </AppLayout>
          </NavProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
