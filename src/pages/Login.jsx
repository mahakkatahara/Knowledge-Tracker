import { useState, useContext } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import { AlertCircle, CheckCircle, Loader2 } from "lucide-react";
import Logo from "../components/Logo";
import StudyMascot from "../components/visual/StudyMascot";
import AuthDecor from "../components/visual/AuthDecor";
import RevisionQueueCard from "../components/visual/RevisionQueueCard";
import { signInWithGoogle } from "../lib/googleAuth";

const Login = () => {
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const handleGoogleSignIn = async () => {
    setError("");
    setSuccess("");
    setGoogleLoading(true);
    try {
      const accessToken = await signInWithGoogle();
      const response = await fetch(
        "https://knowledge-tracker-a7d6.onrender.com/api/auth/google",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ access_token: accessToken }),
        }
      );
      const data = await response.json();
      if (response.ok) {
        setSuccess("Login successful! Redirecting...");
        setTimeout(() => {
          login(data.user, data.token);
          navigate("/dashboard");
        }, 800);
      } else {
        setError(data.detail || "Google sign-in failed. Please try again.");
      }
    } catch (err) {
      setError(err.message || "Google sign-in failed. Please try again.");
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!email || !password) {
      setError("Please fill in all fields.");
      return;
    }
    if (!/\S+@\S+\.\S+/.test(email)) {
      setError("Please enter a valid email address.");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(
        "https://knowledge-tracker-a7d6.onrender.com/api/auth/login",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        }
      );
      const data = await response.json();
      if (response.ok) {
        setSuccess("Login successful! Redirecting...");
        setTimeout(() => {
          login(data.user, data.token);
          navigate("/dashboard");
        }, 1200);
      } else {
        setError(data.detail || "Invalid email or password.");
      }
    } catch {
      setError("Unable to connect to the server. Please ensure the backend is running.");
    } finally {
      setLoading(false);
    }
  };

  const field =
    "w-full rounded-xl border border-slate-200 bg-slate-100 px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-emerald-400 focus:bg-white focus:ring-2 focus:ring-emerald-200";

  return (
    <div className="grid min-h-screen w-full lg:h-screen lg:overflow-hidden lg:grid-cols-[minmax(0,44%)_minmax(0,56%)]">
      {/* ── LEFT · brand panel (edge-to-edge) ──────────── */}
      <div className="relative hidden overflow-hidden bg-emerald-500 p-10 lg:flex lg:flex-col">
        <AuthDecor />

        <div className="relative z-10">
          <Logo size={42} tone="light" />
          <h1 className="mt-6 text-5xl font-extrabold leading-[1.0] tracking-tight text-emerald-950">
            Welcome<br />back.
          </h1>
          <p className="mt-4 max-w-[17rem] text-sm font-medium leading-relaxed text-white/90">
            See what&apos;s fading and revise it before the forgetting curve wins.
          </p>

          {/* quick stats */}
          <div className="mt-5 flex gap-6">
            {[
              { v: "12", l: "topics tracked" },
              { v: "84%", l: "avg retention" },
              { v: "5", l: "day streak" },
            ].map((s) => (
              <div key={s.l}>
                <div className="font-display text-2xl font-bold leading-none text-white">{s.v}</div>
                <div className="mt-1 text-[11px] font-medium text-white/70">{s.l}</div>
              </div>
            ))}
          </div>
        </div>

        <RevisionQueueCard className="relative z-10 mt-5" />

        <div className="relative z-10 mt-auto flex justify-end pt-4">
          <div className="relative -mr-3">
            <StudyMascot className="h-44 w-auto drop-shadow-xl" />
            <div className="absolute -left-16 top-7 rounded-2xl bg-white px-3.5 py-2 shadow-lg">
              <p className="text-[12px] font-semibold leading-snug text-slate-700">
                2 topics due<br />today
              </p>
              <span className="absolute -right-1 bottom-4 h-3 w-3 rotate-45 bg-white" />
            </div>
          </div>
        </div>
      </div>

      {/* ── RIGHT · form ───────────────────────────────── */}
      <div className="flex items-center justify-center overflow-y-auto bg-white px-6 py-8 sm:px-12">
        <div className="w-full max-w-md">
          <div className="mb-8 lg:hidden">
            <Logo size={34} />
          </div>
          <h2 className="text-3xl font-bold tracking-tight text-slate-900">Sign in</h2>
          <p className="mt-1 text-sm text-slate-500">
            New here?{" "}
            <Link to="/signup" className="font-semibold text-emerald-600 hover:text-emerald-700">
              Create account
            </Link>
          </p>

          {error && (
            <div className="mt-6 flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600">
              <AlertCircle size={18} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}
          {success && (
            <div className="mt-6 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              <CheckCircle size={18} className="shrink-0" />
              <span>{success}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-5">
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">Email</label>
              <input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={field}
              />
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between">
                <label className="text-sm font-semibold text-slate-700">Password</label>
                <Link to="/login" className="text-sm font-semibold text-emerald-600 hover:text-emerald-700">
                  Forgot password?
                </Link>
              </div>
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={field}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="mt-1 flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-600 disabled:opacity-60"
            >
              {loading ? (
                <>
                  <Loader2 size={16} className="animate-spin" /> Signing in...
                </>
              ) : (
                "Sign in"
              )}
            </button>

            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={googleLoading}
              className="flex w-full items-center justify-center gap-2.5 rounded-xl border border-slate-200 bg-white py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.76h3.56c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.56-2.76c-.98.66-2.24 1.06-3.72 1.06-2.86 0-5.29-1.93-6.15-4.53H2.18v2.84A11 11 0 0 0 12 23z" />
                <path fill="#FBBC05" d="M5.85 14.11a6.6 6.6 0 0 1 0-4.22V7.05H2.18a11 11 0 0 0 0 9.9l3.67-2.84z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1A11 11 0 0 0 2.18 7.05l3.67 2.84C6.71 7.3 9.14 5.38 12 5.38z" />
              </svg>
              {googleLoading ? (
                <>
                  <Loader2 size={16} className="animate-spin" /> Connecting to Google...
                </>
              ) : (
                "Continue with Google"
              )}
            </button>
          </form>

          <div className="mt-6 flex items-center gap-5 text-xs font-medium text-emerald-600">
            <Link to="/" className="hover:text-emerald-700">Terms</Link>
            <Link to="/" className="hover:text-emerald-700">Privacy</Link>
            <Link to="/" className="hover:text-emerald-700">Contact</Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
