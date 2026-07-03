import { useState, useContext } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { AuthContext } from "../context/AuthContext";
import { Lock, Mail, AlertCircle, CheckCircle, Activity, Loader2 } from "lucide-react";
import Button from "../components/Button";
import SpotlightCard from "../components/ui/SpotlightCard";
import DecayCurve from "../components/visual/DecayCurve";

const Login = () => {
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

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
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email, password }),
  }
);
      const data = await response.json();
      if (response.ok) {
        setSuccess("Login successful! Redirecting...");
        setTimeout(() => {
          login(data.user, data.token);
          navigate("/dashboard");
        }, 1500);
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
    "w-full rounded-xl border border-line bg-black/30 py-3 pl-11 pr-3 text-sm text-ink outline-none transition focus:border-synapse/60 focus:ring-2 focus:ring-synapse/25";

  return (
    <div className="grid min-h-[72vh] items-center gap-10 lg:grid-cols-2">
      {/* Brand panel */}
      <motion.div
        initial={{ opacity: 0, x: -24 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.7 }}
        className="hidden lg:block"
      >
        <span className="eyebrow">Retention Lab</span>
        <h2 className="mt-4 text-5xl font-semibold leading-tight">
          Welcome back to your <span className="text-gradient">memory engine</span>.
        </h2>
        <p className="mt-4 max-w-md text-muted">
          Your forgetting curves are waiting. Log in to see what's decaying and what to
          revise next.
        </p>
        <div className="mt-10 rounded-2xl border border-line glass p-5">
          <div className="mono mb-3 text-[11px] tracking-[0.2em] text-faint">
            LIVE FORGETTING CURVE
          </div>
          <DecayCurve retention={58} className="h-40 w-full" />
        </div>
      </motion.div>

      {/* Form */}
      <motion.div
        initial={{ opacity: 0, y: 26 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, delay: 0.1 }}
        className="mx-auto w-full max-w-md"
      >
        <SpotlightCard className="p-8 sm:p-10" glow="56,214,255">
          <div className="mb-8 text-center">
            <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-[linear-gradient(135deg,#7c6cff,#38d6ff)] glow-synapse">
              <Activity size={26} className="text-white" />
            </span>
            <h1 className="mt-5 text-2xl font-semibold">Welcome back</h1>
            <p className="mt-1 text-sm text-muted">Log in to access your study insights</p>
          </div>

          {error && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-5 flex items-center gap-2 rounded-xl border border-lost/30 bg-lost/10 px-4 py-3 text-sm text-lost"
            >
              <AlertCircle size={18} className="shrink-0" />
              <span>{error}</span>
            </motion.div>
          )}
          {success && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-5 flex items-center gap-2 rounded-xl border border-retained/30 bg-retained/10 px-4 py-3 text-sm text-retained"
            >
              <CheckCircle size={18} className="shrink-0" />
              <span>{success}</span>
            </motion.div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <div>
              <label className="mb-2 block text-sm font-medium text-muted">Email address</label>
              <div className="relative">
                <Mail size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-faint" />
                <input
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={field}
                />
              </div>
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-muted">Password</label>
              <div className="relative">
                <Lock size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-faint" />
                <input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={field}
                />
              </div>
            </div>

            <Button type="submit" disabled={loading} className="mt-2 w-full">
              {loading ? (
                <>
                  <Loader2 size={16} className="animate-spin" /> Logging in...
                </>
              ) : (
                "Log In"
              )}
            </Button>
          </form>

          <p className="mt-7 text-center text-sm text-muted">
            Don't have an account?{" "}
            <Link to="/signup" className="font-semibold text-signal hover:text-synapse-bright">
              Sign Up
            </Link>
          </p>
        </SpotlightCard>
      </motion.div>
    </div>
  );
};

export default Login;
