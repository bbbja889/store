import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Menu, X, Upload, LogOut, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { auth, signInWithGoogle, logout } from "@/firebase";
import { onAuthStateChanged, User as FirebaseUser } from "firebase/auth";

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const location = useLocation();

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => setUser(u));
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    setMobileMenuOpen(false);
    setIsSearchOpen(false);
  }, [location.pathname]);

  const handleSignIn = async () => {
    setAuthError(null);
    try {
      await signInWithGoogle();
    } catch (error: any) {
      setAuthError(error?.message || "Failed to sign in with Google.");
      setTimeout(() => setAuthError(null), 5000);
    }
  };

  return (
    <motion.header
      initial={{ y: -100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ type: "spring", stiffness: 100, damping: 20, mass: 1 }}
      className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-[95%] max-w-5xl"
    >
      {/* Animated Glowing Border Container */}
      <div className="relative rounded-full p-[1px] shadow-[0_8px_32px_rgba(0,0,0,0.2)] group">
        {/* Spinning Gradient */}
        <div className="absolute inset-0 rounded-full overflow-hidden">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 4, ease: "linear" }}
            className="absolute inset-[-100%] bg-[conic-gradient(from_0deg,transparent_0_300deg,var(--color-primary)_360deg)] opacity-50 group-hover:opacity-100 transition-opacity duration-500"
          />
        </div>

        {/* Inner Glass Navbar */}
        <div className={cn(
          "relative flex items-center justify-between px-4 sm:px-6 h-16 rounded-full transition-colors duration-500",
          scrolled ? "bg-[#0a0a0c]/95 backdrop-blur-2xl" : "bg-[#121215]/80 backdrop-blur-xl"
        )}>

          {/* Logo */}
          <Link to="/" className="flex items-center gap-3 relative z-10 group/logo">
            <motion.div
              whileHover={{ rotate: 180, scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              transition={{ type: "spring", stiffness: 200, damping: 10 }}
              className="w-10 h-10 rounded-full bg-gradient-to-tr from-[var(--color-primary)] to-[var(--color-accent)] flex items-center justify-center shadow-[0_0_20px_rgba(193,123,80,0.4)] group-hover/logo:shadow-[0_0_30px_rgba(193,123,80,0.7)] transition-shadow"
            >
              <span style={{ fontFamily: "'DM Serif Display', serif", color: "#fff", fontSize: 20, fontWeight: 400 }}>V</span>
            </motion.div>
            <div className="hidden sm:flex flex-col">
              <span style={{
                fontFamily: "'DM Serif Display', serif",
                fontSize: 20,
                color: "#fff",
                letterSpacing: "-0.02em",
                lineHeight: 1.1
              }}>
                Viczo <span style={{ color: "var(--color-primary)" }}>Store</span>
              </span>
              <span className="text-[10px] text-white/40 font-medium tracking-widest uppercase">
                Directory
              </span>
            </div>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-2 relative z-10">
            {/* Expandable Search */}
            <div className="relative flex items-center justify-end h-10">
              <AnimatePresence>
                {isSearchOpen && (
                  <motion.input
                    initial={{ width: 0, opacity: 0, paddingLeft: 0, paddingRight: 0 }}
                    animate={{ width: 220, opacity: 1, paddingLeft: 40, paddingRight: 16 }}
                    exit={{ width: 0, opacity: 0, paddingLeft: 0, paddingRight: 0 }}
                    transition={{ type: "spring", stiffness: 250, damping: 25 }}
                    type="text"
                    placeholder="Search apps & sites..."
                    autoFocus
                    onBlur={() => setIsSearchOpen(false)}
                    className="absolute right-0 h-10 bg-white/5 border border-white/10 rounded-full text-sm text-white placeholder:text-white/40 focus:outline-none focus:border-[var(--color-primary)] focus:bg-white/10 transition-colors"
                  />
                )}
              </AnimatePresence>
              <motion.button
                whileHover={{ scale: 1.1, backgroundColor: "rgba(255,255,255,0.1)" }}
                whileTap={{ scale: 0.9 }}
                onClick={() => setIsSearchOpen(!isSearchOpen)}
                className="w-10 h-10 rounded-full flex items-center justify-center text-white/70 hover:text-white transition-colors relative z-10"
              >
                <Search className="w-4 h-4" />
              </motion.button>
            </div>

            <div className="w-px h-6 bg-white/10 mx-2" />

            <Link to="/upload">
              <motion.button
                whileHover={{ scale: 1.05, backgroundColor: "rgba(255,255,255,0.1)" }}
                whileTap={{ scale: 0.95 }}
                className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium text-white/80 hover:text-white transition-colors"
              >
                <Upload className="w-4 h-4" />
                Upload
              </motion.button>
            </Link>

            {user ? (
              <motion.button
                whileHover={{ scale: 1.05, backgroundColor: "rgba(255,255,255,0.1)" }}
                whileTap={{ scale: 0.95 }}
                onClick={logout}
                className="flex items-center gap-2 px-4 py-2 rounded-full border border-white/10 text-white/80 hover:text-white text-sm font-medium transition-colors ml-2"
              >
                <LogOut className="w-4 h-4" />
                Sign Out
              </motion.button>
            ) : (
              <motion.button
                whileHover={{ scale: 1.05, boxShadow: "0 0 20px rgba(193,123,80,0.4)" }}
                whileTap={{ scale: 0.95 }}
                onClick={handleSignIn}
                className="flex items-center gap-2 px-5 py-2 rounded-full bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-primary-dark)] text-white text-sm font-medium border border-white/10 ml-2 relative overflow-hidden group/btn"
              >
                <motion.div
                  className="absolute inset-0 bg-white/20"
                  initial={{ x: "-100%" }}
                  whileHover={{ x: "100%" }}
                  transition={{ duration: 0.5, ease: "easeInOut" }}
                />
                <Sparkles className="w-4 h-4 relative z-10" />
                <span className="relative z-10">Sign In</span>
              </motion.button>
            )}
          </div>

          {/* Mobile toggle */}
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            className="md:hidden w-10 h-10 rounded-full flex items-center justify-center text-white/70 hover:text-white hover:bg-white/10 transition-colors relative z-10"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </motion.button>
        </div>
      </div>

      {/* Auth Error Toast */}
      <AnimatePresence>
        {authError && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className="absolute top-20 left-1/2 -translate-x-1/2 bg-red-500/10 border border-red-500/50 text-red-200 px-4 py-2 rounded-xl text-sm shadow-lg backdrop-blur-md z-50 whitespace-nowrap"
          >
            {authError}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mobile Menu - Crazy Dropdown */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95, filter: "blur(10px)" }}
            animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
            exit={{ opacity: 0, y: -20, scale: 0.95, filter: "blur(10px)" }}
            transition={{ type: "spring", stiffness: 200, damping: 20 }}
            className="absolute top-20 left-0 right-0 bg-[#0a0a0c]/95 backdrop-blur-2xl border border-white/10 rounded-3xl p-4 shadow-2xl overflow-hidden md:hidden"
          >
            <div className="flex flex-col gap-2 relative z-10">
              <div className="relative mb-2">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                <input
                  type="text"
                  placeholder="Search apps & sites..."
                  className="w-full h-12 pl-11 pr-4 rounded-2xl bg-white/5 border border-white/10 text-sm focus:outline-none focus:border-[var(--color-primary)] focus:bg-white/10 text-white placeholder:text-white/40 transition-colors"
                />
              </div>
              
              <Link to="/upload">
                <motion.button
                  whileTap={{ scale: 0.98 }}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl bg-white/5 hover:bg-white/10 text-white text-sm font-medium transition-colors"
                >
                  <Upload className="w-4 h-4 text-[var(--color-primary)]" />
                  Upload Creation
                </motion.button>
              </Link>
              
              {user ? (
                <motion.button
                  whileTap={{ scale: 0.98 }}
                  onClick={logout}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl bg-white/5 hover:bg-white/10 text-white/80 text-sm font-medium transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  Sign Out
                </motion.button>
              ) : (
                <motion.button
                  whileTap={{ scale: 0.98 }}
                  onClick={handleSignIn}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-primary-dark)] text-white text-sm font-medium shadow-[0_4px_20px_rgba(193,123,80,0.4)]"
                >
                  <Sparkles className="w-4 h-4" />
                  Sign In with Google
                </motion.button>
              )}
            </div>
            
            {/* Decorative background blob for mobile menu */}
            <div className="absolute -bottom-20 -right-20 w-40 h-40 bg-[var(--color-primary)] rounded-full blur-[60px] opacity-20 pointer-events-none" />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.header>
  );
}
