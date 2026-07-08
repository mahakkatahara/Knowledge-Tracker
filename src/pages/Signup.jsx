import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AlertCircle, CheckCircle, Loader2 } from "lucide-react";
import Logo from "../components/Logo";
import StudyMascot from "../components/visual/StudyMascot";
import AuthDecor from "../components/visual/AuthDecor";
import RevisionQueueCard from "../components/visual/RevisionQueueCard";

const Signup = () => {
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!name || !email || !password || !confirmPassword) {
      setError("Please fill in all fields.");
      return;
    }
    if (!/\S+@\S+\.\S+/.test(email)) {
      setError("Please enter a valid email address.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters long.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("https://knowledge-tracker-a7d6.onrender.com/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });
      const data = await response.json();
      if (response.ok) {
        setSuccess("Account created! Redirecting to sign in...");
        setTimeout(() => {
          navigate("/login");
        }, 1600);
      } else {
        setError(data.detail || "Registration failed. Please try again.");
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
      {/* ── LEFT · brand panel ─────────────────────────── */}
      <div className="relative hidden overflow-hidden bg-emerald-500 p-10 lg:flex lg:flex-col">
        <AuthDecor />

        <div className="relative z-10">
          <Logo size={42} tone="light" />
          <h1 className="mt-6 text-5xl font-extrabold leading-[1.0] tracking-tight text-emerald-950">
            Start<br />remembering.
          </h1>
          <p className="mt-4 max-w-[17rem] text-sm font-medium leading-relaxed text-white/90">
            Track every topic and let us predict what you&apos;re about to forget.
          </p>

          {/* quick stats */}
          <div className="mt-5 flex gap-6">
            {[
              { v: "90%", l: "forgotten in days" },
              { v: "3", l: "risk tiers" },
              { v: "100%", l: "on-device" },
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
                Never lose a<br />topic again
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
          <h2 className="text-3xl font-bold tracking-tight text-slate-900">Create account</h2>
          <p className="mt-1 text-sm text-slate-500">
            Already a member?{" "}
            <Link to="/login" className="font-semibold text-emerald-600 hover:text-emerald-700">
              Sign in
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

          <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">Full name</label>
              <input
                type="text"
                placeholder="Ada Lovelace"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={field}
              />
            </div>
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
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">Password</label>
                <input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={field}
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">Confirm</label>
                <input
                  type="password"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className={field}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="mt-1 flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-600 disabled:opacity-60"
            >
              {loading ? (
                <>
                  <Loader2 size={16} className="animate-spin" /> Creating account...
                </>
              ) : (
                "Create account"
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

export default Signup;
