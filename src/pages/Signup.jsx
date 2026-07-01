import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Lock, Mail, User, AlertCircle, CheckCircle, Activity, Loader2 } from "lucide-react";
import Button from "../components/Button";
import SpotlightCard from "../components/ui/SpotlightCard";
import DecayCurve from "../components/visual/DecayCurve";

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
      const response = await fetch("http://localhost:8000/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });
      const data = await response.json();
      if (response.ok) {
        setSuccess("Registration successful! Redirecting to login...");
        setTimeout(() => {
          navigate("/login");
        }, 2000);
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
          Build a memory that <span className="text-gradient">doesn't fade</span>.
        </h2>
        <p className="mt-4 max-w-md text-muted">
          Create an account and start charting your forgetting curves. Every topic you
          add gets a live retention score from day one.
        </p>
        <div className="mt-10 grid grid-cols-3 gap-3">
          {[
            { k: "Retained", c: "text-retained" },
            { k: "Decaying", c: "text-decaying" },
            { k: "At risk", c: "text-lost" },
          ].map((b) => (
            <div key={b.k} className="rounded-2xl border border-line glass p-4 text-center">
              <div className={`font-display text-lg font-semibold ${b.c}`}>●</div>
              <div className="mt-1 text-xs text-muted">{b.k}</div>
            </div>
          ))}
        </div>
        <div className="mt-6 rounded-2xl border border-line glass p-5">
          <DecayCurve retention={74} className="h-32 w-full" />
        </div>
      </motion.div>

      {/* Form */}
      <motion.div
        initial={{ opacity: 0, y: 26 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, delay: 0.1 }}
        className="mx-auto w-full max-w-md"
      >
        <SpotlightCard className="p-8 sm:p-10" glow="47,224,192">
          <div className="mb-8 text-center">
            <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-[linear-gradient(135deg,#7c6cff,#38d6ff)] glow-synapse">
              <Activity size={26} className="text-white" />
            </span>
            <h1 className="mt-5 text-2xl font-semibold">Create account</h1>
            <p className="mt-1 text-sm text-muted">Start tracking your knowledge retention</p>
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

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label className="mb-2 block text-sm font-medium text-muted">Full name</label>
              <div className="relative">
                <User size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-faint" />
                <input type="text" placeholder="John Doe" value={name} onChange={(e) => setName(e.target.value)} className={field} />
              </div>
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-muted">Email address</label>
              <div className="relative">
                <Mail size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-faint" />
                <input type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} className={field} />
              </div>
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-muted">Password</label>
              <div className="relative">
                <Lock size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-faint" />
                <input type="password" placeholder="Minimum 6 characters" value={password} onChange={(e) => setPassword(e.target.value)} className={field} />
              </div>
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-muted">Confirm password</label>
              <div className="relative">
                <Lock size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-faint" />
                <input type="password" placeholder="Re-enter password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className={field} />
              </div>
            </div>

            <Button type="submit" variant="accent" disabled={loading} className="mt-3 w-full">
              {loading ? (
                <>
                  <Loader2 size={16} className="animate-spin" /> Creating account...
                </>
              ) : (
                "Sign Up"
              )}
            </Button>
          </form>

          <p className="mt-7 text-center text-sm text-muted">
            Already have an account?{" "}
            <Link to="/login" className="font-semibold text-signal hover:text-synapse-bright">
              Log In
            </Link>
          </p>
        </SpotlightCard>
      </motion.div>
    </div>
  );
};

export default Signup;
