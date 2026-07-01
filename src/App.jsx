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

import Atmosphere from "./components/visual/Atmosphere";
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
    <footer className="relative mt-24 border-t border-line">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-5 py-8 text-sm text-muted sm:flex-row">
        <div className="flex items-center gap-2">
          <span className="grid h-7 w-7 place-items-center rounded-lg bg-[linear-gradient(135deg,#7c6cff,#38d6ff)] text-[11px] font-bold text-white">
            D
          </span>
          <span className="mono text-xs tracking-[0.18em] text-faint">
            DECAY · RETENTION OBSERVATORY
          </span>
        </div>
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

function App() {
  useSmoothScroll();

  return (
    <AuthProvider>
      <div className="grain relative min-h-screen">
        <Atmosphere />
        <Navbar />
        <ScrollToTop />

        <main className="relative z-10 mx-auto w-full max-w-6xl px-4 pb-10 pt-28 sm:px-5 sm:pt-32">
          <ErrorBoundary>
            <Routes>
              <Route path="/" element={<LandingPage />} />
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute>
                    <Dashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/tracker"
                element={
                  <ProtectedRoute>
                    <StudyTracker />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/quiz"
                element={
                  <ProtectedRoute>
                    <Quiz />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/chat"
                element={
                  <ProtectedRoute>
                    <ChatAssistant />
                  </ProtectedRoute>
                }
              />
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />
            </Routes>
          </ErrorBoundary>
        </main>

        <Footer />
      </div>
    </AuthProvider>
  );
}

export default App;
