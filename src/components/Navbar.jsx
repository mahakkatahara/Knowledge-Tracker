import { useState, useContext, useEffect } from "react";
import { NavLink, Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Menu, X, LayoutDashboard, Calendar, ClipboardCheck,
  MessageSquare, Home, LogOut,
} from "lucide-react";
import { AuthContext } from "../context/AuthContext";
import { cn } from "../lib/cn";
import Button from "./Button";
import Logo from "./Logo";

const LINKS = [
  { to: "/", label: "Home", icon: Home, end: true },
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/tracker", label: "Tracker", icon: Calendar },
  { to: "/quiz", label: "Quiz", icon: ClipboardCheck },
  { to: "/chat", label: "Assistant", icon: MessageSquare },
];

const Navbar = () => {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { user, logout, isAuthenticated } = useContext(AuthContext);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const handleLogout = () => {
    logout();
    closeMenu();
    navigate("/login");
  };
  const closeMenu = () => setIsOpen(false);

  const linkClass = ({ isActive }) =>
    cn(
      "group relative flex items-center gap-1.5 rounded-full px-3.5 py-2 text-[13px] font-medium transition-colors",
      isActive ? "text-ink" : "text-muted hover:text-ink"
    );

  return (
    <header className="fixed inset-x-0 top-0 z-50 flex justify-center px-3 pt-3 sm:px-4 sm:pt-4">
      <nav
        className={cn(
          "flex w-full max-w-[1680px] items-center justify-between gap-2 rounded-full border px-3 py-2 transition-all duration-300 sm:px-4",
          scrolled
            ? "glass-strong border-line-strong shadow-[0_18px_50px_-22px_rgba(0,0,0,0.9)]"
            : "border-line bg-surface-2 backdrop-blur-md"
        )}
      >
        <Link to="/" onClick={closeMenu} className="pl-1">
          <Logo size={36} />
        </Link>

        <ul className="hidden items-center gap-0.5 lg:flex">
          {LINKS.map(({ to, label, icon: Icon, end }) => (
            <li key={to}>
              <NavLink to={to} end={end} className={linkClass}>
                {({ isActive }) => (
                  <>
                    {isActive && (
                      <motion.span
                        layoutId="nav-pill"
                        className="absolute inset-0 -z-10 rounded-full border border-line-strong bg-emerald-50"
                        transition={{ type: "spring", stiffness: 380, damping: 30 }}
                      />
                    )}
                    <Icon size={15} className={isActive ? "text-signal" : ""} />
                    <span>{label}</span>
                  </>
                )}
              </NavLink>
            </li>
          ))}
        </ul>

        <div className="flex items-center gap-2">
          {isAuthenticated ? (
            <div className="hidden items-center gap-3 sm:flex">
              <span className="text-[13px] text-muted">
                Hi, <span className="font-medium text-ink">{user?.name}</span>
              </span>
              <Button variant="secondary" size="sm" onClick={handleLogout}>
                <LogOut size={14} /> Log Out
              </Button>
            </div>
          ) : (
            <div className="hidden items-center gap-2 sm:flex">
              <Link to="/login"><Button variant="outline" size="sm">Log In</Button></Link>
              <Link to="/signup"><Button variant="primary" size="sm">Sign Up</Button></Link>
            </div>
          )}

          <button
            className="grid h-9 w-9 place-items-center rounded-full border border-line bg-surface-2 text-ink lg:hidden"
            onClick={() => setIsOpen((v) => !v)}
            aria-label="Toggle menu"
          >
            {isOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </nav>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.22 }}
            className="absolute left-3 right-3 top-[72px] z-50 lg:hidden"
          >
            <div className="glass-strong rounded-3xl border border-line-strong p-3">
              <ul className="flex flex-col gap-1">
                {LINKS.map(({ to, label, icon: Icon, end }) => (
                  <li key={to}>
                    <NavLink
                      to={to} end={end} onClick={closeMenu}
                      className={({ isActive }) =>
                        cn(
                          "flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition-colors",
                          isActive ? "bg-emerald-50 text-ink" : "text-muted hover:bg-surface-2"
                        )
                      }
                    >
                      <Icon size={17} />
                      {label}
                    </NavLink>
                  </li>
                ))}
              </ul>
              <div className="mt-3 border-t border-line pt-3">
                {isAuthenticated ? (
                  <Button variant="secondary" size="md" className="w-full" onClick={handleLogout}>
                    <LogOut size={15} /> Log Out
                  </Button>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    <Link to="/login" onClick={closeMenu}><Button variant="outline" size="md" className="w-full">Log In</Button></Link>
                    <Link to="/signup" onClick={closeMenu}><Button variant="primary" size="md" className="w-full">Sign Up</Button></Link>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
};

export default Navbar;
