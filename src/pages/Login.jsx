import { useState, useContext } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  AlertCircle,
  CheckCircle,
  Loader2,
  Mail,
  Lock,
  Eye,
  EyeOff,
} from "lucide-react";
import { AuthContext } from "../context/AuthContext";
import Logo from "../components/Logo";
import AuthShowcase from "../components/visual/AuthShowcase";
import { signInWithGoogle } from "../lib/googleAuth";

const Login = () => {
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(false);

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

  return (
    <div className="grid min-h-screen w-full bg-white lg:h-screen lg:overflow-hidden lg:grid-cols-[minmax(0,60%)_minmax(0,40%)]">
      {/* ── LEFT · product showcase panel ────────────── */}
      <AuthShowcase />

      {/* ── RIGHT · sign-in form ─────────────────────── */}
      <div className="flex items-center justify-center overflow-y-auto bg-white px-6 py-10 sm:px-10">
        <div className="w-full max-w-md">
          {/* mobile logo */}
          <div className="mb-8 lg:hidden">
            <Logo size={34} />
          </div>

          <div className="rounded-3xl bg-white p-8 shadow-[0_20px_60px_-20px_rgba(15,23,42,0.15)] ring-1 ring-slate-100 sm:p-9">
            <h2 className="text-[32px] font-extrabold leading-tight tracking-tight text-slate-900">
              Sign in
            </h2>
            <p className="mt-2 text-sm text-slate-500">
              Pick up right where you left off.{" "}
              <Link
                to="/signup"
                className="font-semibold text-emerald-600 hover:text-emerald-700"
              >
                Create account
              </Link>
            </p>

            {error && (
              <div className="mt-5 flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600">
                <AlertCircle size={18} className="shrink-0" />
                <span>{error}</span>
              </div>
            )}
            {success && (
              <div className="mt-5 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                <CheckCircle size={18} className="shrink-0" />
                <span>{success}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-5">
              {/* Email */}
              <div>
                <label className="mb-2 block text-[13px] font-semibold text-slate-800">
                  Email
                </label>
                <div className="relative">
                  <Mail
                    size={16}
                    className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                  <input
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-4 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <label className="text-[13px] font-semibold text-slate-800">
                    Password
                  </label>
                  <Link
                    to="/login"
                    className="text-[13px] font-semibold text-emerald-600 hover:text-emerald-700"
                  >
                    Forgot password?
                  </Link>
                </div>
                <div className="relative">
                  <Lock
                    size={16}
                    className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-11 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-emerald-500 transition hover:text-emerald-700"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* Remember me */}
              <label className="flex cursor-pointer items-center gap-2 text-[13px] text-slate-700">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-emerald-500 accent-emerald-500 focus:ring-emerald-400"
                />
                Remember me for 30 days
              </label>

              {/* Sign in */}
              <button
                type="submit"
                disabled={loading}
                className="mt-1 flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 py-3.5 text-sm font-semibold text-white shadow-[0_10px_20px_-8px_rgba(16,185,129,0.55)] transition hover:bg-emerald-600 disabled:opacity-60"
              >
                {loading ? (
                  <>
                    <Loader2 size={16} className="animate-spin" /> Signing in...
                  </>
                ) : (
                  "Sign in"
                )}
              </button>

              {/* divider */}
              <div className="flex items-center gap-3 py-1">
                <span className="h-px flex-1 bg-slate-200" />
                <span className="text-[12px] font-medium text-slate-400">or</span>
                <span className="h-px flex-1 bg-slate-200" />
              </div>

              {/* Google */}
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

            <div className="mt-6 flex items-center justify-center gap-6 text-[12px] font-medium text-slate-500">
              <Link to="/" className="hover:text-slate-800">Terms</Link>
              <Link to="/" className="hover:text-slate-800">Privacy</Link>
              <Link to="/" className="hover:text-slate-800">Contact</Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
