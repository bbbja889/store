import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

export function CinematicIntro({ onComplete }: { onComplete: () => void }) {
  const [phase, setPhase] = useState<"line" | "title" | "sub" | "done">("line");

  useEffect(() => {
    const t1 = setTimeout(() => setPhase("title"), 400);
    const t2 = setTimeout(() => setPhase("sub"), 1000);
    const t3 = setTimeout(() => setPhase("done"), 2200);
    const t4 = setTimeout(() => {
      onComplete();
    }, 2800);

    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4); };
  }, [onComplete]);

  const letters = "VICZO".split("");
  const letters2 = "STORE".split("");

  return (
    <AnimatePresence>
      {phase !== "done" ? (
        <motion.div
          key="intro"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.6, ease: "easeInOut" } }}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9999,
            background: "#0d0a07",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            overflow: "hidden",
          }}
        >
          {/* Subtle noise */}
          <div style={{
            position: "absolute", inset: 0, opacity: 0.04,
            backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
            backgroundSize: "128px 128px",
            pointerEvents: "none",
          }} />

          {/* Horizontal line that draws itself */}
          <motion.div
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ duration: 0.5, ease: [0.77, 0, 0.175, 1] }}
            style={{
              position: "absolute",
              top: "calc(50% - 64px)",
              left: 0, right: 0, height: 1,
              background: "linear-gradient(90deg, transparent, rgba(193,123,80,0.6), transparent)",
              transformOrigin: "left center",
            }}
          />
          <motion.div
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ duration: 0.5, delay: 0.1, ease: [0.77, 0, 0.175, 1] }}
            style={{
              position: "absolute",
              top: "calc(50% + 64px)",
              left: 0, right: 0, height: 1,
              background: "linear-gradient(90deg, transparent, rgba(193,123,80,0.3), transparent)",
              transformOrigin: "right center",
            }}
          />

          {/* Main title — VICZO */}
          <div style={{ display: "flex", gap: 6, marginBottom: 4 }}>
            {letters.map((l, i) => (
              <motion.span
                key={i}
                initial={{ opacity: 0, y: 50, filter: "blur(10px)" }}
                animate={phase === "title" || phase === "sub" ? {
                  opacity: 1, y: 0, filter: "blur(0px)"
                } : {}}
                transition={{
                  delay: i * 0.08,
                  duration: 0.6,
                  ease: [0.16, 1, 0.3, 1],
                }}
                style={{
                  fontFamily: "'DM Serif Display', Georgia, serif",
                  fontSize: "clamp(56px, 12vw, 120px)",
                  fontWeight: 400,
                  color: "#faf8f4",
                  letterSpacing: "0.12em",
                  lineHeight: 1,
                }}
              >
                {l}
              </motion.span>
            ))}
          </div>

          {/* STORE — slides in from below */}
          <motion.div
            initial={{ opacity: 0, y: 20, letterSpacing: "0.6em" }}
            animate={phase === "title" || phase === "sub" ? {
              opacity: 0.45, y: 0, letterSpacing: "0.45em"
            } : {}}
            transition={{ delay: 0.5, duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            style={{
              fontFamily: "'Outfit', sans-serif",
              fontSize: "clamp(12px, 2.5vw, 18px)",
              fontWeight: 300,
              color: "#c17b50",
              letterSpacing: "0.45em",
              textTransform: "uppercase",
              marginBottom: 32,
            }}
          >
            STORE
          </motion.div>

          {/* Tagline */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={phase === "sub" ? { opacity: 0.35 } : {}}
            transition={{ duration: 0.6, ease: "easeOut" }}
            style={{
              fontFamily: "'Outfit', sans-serif",
              fontSize: "clamp(12px, 2vw, 15px)",
              color: "#a09589",
              letterSpacing: "0.1em",
              fontStyle: "italic",
            }}
          >
            Apps &amp; Sites, All in One Place
          </motion.p>

          {/* Bottom credit */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={phase === "sub" ? { opacity: 0.2 } : {}}
            transition={{ duration: 0.6, delay: 0.3 }}
            style={{
              position: "absolute", bottom: 32,
              fontFamily: "'Outfit', sans-serif",
              fontSize: 11, color: "#a09589",
              letterSpacing: "0.15em", textTransform: "uppercase",
            }}
          >
            by Yashraj Ghemud
          </motion.div>

          {/* Warm glow blob behind title */}
          <motion.div
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 0.08, scale: 1 }}
            transition={{ duration: 1.2, ease: "easeOut" }}
            style={{
              position: "absolute",
              width: "60vw", height: "60vw",
              maxWidth: 600, maxHeight: 600,
              borderRadius: "50%",
              background: "radial-gradient(circle, #c17b50, transparent 70%)",
              zIndex: -1,
              filter: "blur(40px)",
            }}
          />
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
