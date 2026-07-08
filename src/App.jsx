import { Routes, Route, useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import Navbar from "./components/Navbar";

import LandingPage from "./pages/LandingPage";
import Dashboard from "./pages/Dashboard";
import StudyTracker from "./pages/StudyTracker";
import Quiz from "./pages/Quiz";
import ChatAssistant from "./pages/ChatAssistant";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import ErrorBoundary from "./components/ErrorBoundary";

import Logo from "./components/Logo";
import useSmoothScroll from "./hooks/useSmoothScroll";

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" in window ? "instant" : "auto" });
  }, [pathname]);
  return null;
}

function Footer() {
  return (
    <footer className="relative mt-20 border-t border-line">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-5 py-7 text-sm text-muted sm:flex-row">
        <Logo size={30} />
        <div className="flex items-center gap-5 text-xs">
          <Link to="/dashboard" className="transition-colors hover:text-ink">Dashboard</Link>
          <Link to="/tracker" className="transition-colors hover:text-ink">Tracker</Link>
          <Link to="/quiz" className="transition-colors hover:text-ink">Quiz</Link>
          <span className="text-faint">Built on the Ebbinghaus curve</span>
        </div>
      </div>
    </footer>
  );
}

const AllRoutes = () => (
  <Routes>
    <Route path="/" element={<LandingPage />} />
    <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
    <Route path="/tracker" element={<ProtectedRoute><StudyTracker /></ProtectedRoute>} />
    <Route path="/quiz" element={<ProtectedRoute><Quiz /></ProtectedRoute>} />
    <Route path="/chat" element={<ProtectedRoute><ChatAssistant /></ProtectedRoute>} />
    <Route path="/login" element={<Login />} />
    <Route path="/signup" element={<Signup />} />
  </Routes>
);

function Shell() {
  const { pathname } = useLocation();
  const authRoute = pathname === "/login" || pathname === "/signup";

  // Auth pages: full-screen, no navbar/footer, no page padding.
  if (authRoute) {
    return (
      <>
        <ScrollToTop />
        <ErrorBoundary>
          <AllRoutes />
        </ErrorBoundary>
      </>
    );
  }

  return (
    <div className="relative min-h-screen">
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 -z-10"
        style={{
          background:
            "radial-gradient(60% 50% at 12% 0%, rgba(16,185,129,0.10), transparent 60%), radial-gradient(55% 45% at 100% 100%, rgba(13,148,136,0.10), transparent 60%)",
        }}
      />
      <Navbar />
      <ScrollToTop />
      <main className="relative z-10 mx-auto w-full max-w-6xl px-4 pb-10 pt-24 sm:px-5 sm:pt-28">
        <ErrorBoundary>
          <AllRoutes />
        </ErrorBoundary>
      </main>
      <Footer />
    </div>
  );
}

function App() {
  useSmoothScroll();
  return (
    <AuthProvider>
      <Shell />
    </AuthProvider>
  );
}

export default App;
