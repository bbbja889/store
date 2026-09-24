import { useRef, useEffect, useState, useCallback } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { Navbar } from "./Navbar";
import { Footer } from "./Footer";
import { CinematicIntro } from "../../pages/CinematicIntro";
import { motion, AnimatePresence } from "framer-motion";

// Interactive particle background
function InteractiveBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mouse = useRef({ x: -1000, y: -1000, radius: 150 });
  const scrollY = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    let animationFrameId: number;

    let particles: any[] = [];
    const colors = ["#c17b50", "#5b8a6b", "#7c6fcd", "#d4a853"];

    const init = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      particles = [];
      const numParticles = Math.min(Math.floor(window.innerWidth / 12), 120);
      for (let i = 0; i < numParticles; i++) {
        particles.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          z: Math.random() * 0.6 + 0.2, // Depth for parallax
          vx: (Math.random() - 0.5) * 0.8,
          vy: (Math.random() - 0.5) * 0.8,
          baseSize: Math.random() * 2.5 + 1,
          color: colors[Math.floor(Math.random() * colors.length)],
        });
      }
    };

    init();

    const handleResize = () => init();
    const handleMouseMove = (e: MouseEvent) => {
      mouse.current.x = e.clientX;
      mouse.current.y = e.clientY;
    };
    const handleMouseLeave = () => {
      mouse.current.x = -1000;
      mouse.current.y = -1000;
    };
    const handleClick = (e: MouseEvent) => {
      // Shockwave effect
      particles.forEach((p) => {
        const dx = p.x - e.clientX;
        const dy = p.y - e.clientY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 400) {
          const force = (400 - dist) / 400;
          p.vx += (dx / dist) * force * 25;
          p.vy += (dy / dist) * force * 25;
        }
      });

      // Spawn burst particles
      for (let i = 0; i < 15; i++) {
        particles.push({
          x: e.clientX,
          y: e.clientY,
          z: Math.random() * 0.8 + 0.4,
          vx: (Math.random() - 0.5) * 30,
          vy: (Math.random() - 0.5) * 30,
          baseSize: Math.random() * 4 + 2,
          color: colors[Math.floor(Math.random() * colors.length)],
          life: 100, // Fades out
        });
      }
    };
    const handleScroll = () => {
      scrollY.current = window.scrollY;
    };

    window.addEventListener("resize", handleResize);
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseleave", handleMouseLeave);
    window.addEventListener("click", handleClick);
    window.addEventListener("scroll", handleScroll, { passive: true });

    let lastScrollY = scrollY.current;

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const scrollDelta = scrollY.current - lastScrollY;
      lastScrollY = scrollY.current;

      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];

        // Parallax scroll effect
        p.y -= scrollDelta * p.z * 0.8;

        // Movement
        p.x += p.vx;
        p.y += p.vy;

        // Friction to slow down after explosions
        p.vx *= 0.96;
        p.vy *= 0.96;

        // Base drift if moving too slow
        if (Math.abs(p.vx) < 0.3) p.vx += (Math.random() - 0.5) * 0.15;
        if (Math.abs(p.vy) < 0.3) p.vy += (Math.random() - 0.5) * 0.15;

        // Mouse interaction (gentle repel)
        const dx = mouse.current.x - p.x;
        const dy = mouse.current.y - p.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < mouse.current.radius) {
          const force = (mouse.current.radius - dist) / mouse.current.radius;
          p.vx -= (dx / dist) * force * 0.6;
          p.vy -= (dy / dist) * force * 0.6;
          
          // Draw line to mouse
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(mouse.current.x, mouse.current.y);
          ctx.strokeStyle = p.color;
          ctx.globalAlpha = 0.3 * force;
          ctx.lineWidth = 1;
          ctx.stroke();
          ctx.globalAlpha = 1;
        }

        // Wrap around screen
        if (p.x < -50) p.x = canvas.width + 50;
        if (p.x > canvas.width + 50) p.x = -50;
        if (p.y < -50) p.y = canvas.height + 50;
        if (p.y > canvas.height + 50) p.y = -50;

        // Draw particle
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.baseSize * p.z, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        
        // Handle temporary burst particles
        if (p.life !== undefined) {
          ctx.globalAlpha = p.life / 100;
          p.life -= 2;
          if (p.life <= 0) {
            particles.splice(i, 1);
            ctx.globalAlpha = 1;
            continue;
          }
        }
        
        ctx.fill();
        ctx.globalAlpha = 1;

        // Connections between particles
        for (let j = i + 1; j < particles.length; j++) {
          const p2 = particles[j];
          const dx2 = p.x - p2.x;
          const dy2 = p.y - p2.y;
          const dist2 = Math.sqrt(dx2 * dx2 + dy2 * dy2);

          if (dist2 < 120) {
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.strokeStyle = p.color; // use first particle's color
            ctx.globalAlpha = 0.15 * (1 - dist2 / 120);
            ctx.lineWidth = 0.8;
            ctx.stroke();
            ctx.globalAlpha = 1;
          }
        }
      }

      animationFrameId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseleave", handleMouseLeave);
      window.removeEventListener("click", handleClick);
      window.removeEventListener("scroll", handleScroll);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 0,
        pointerEvents: "none",
        width: "100%",
        height: "100%",
      }}
    />
  );
}

export function Layout() {
  const location = useLocation();
  const [introComplete, setIntroComplete] = useState(false);
  const [showContent, setShowContent] = useState(false);

  const handleIntroComplete = useCallback(() => {
    setIntroComplete(true);
    setTimeout(() => setShowContent(true), 50);
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-[var(--color-bg-base)] text-[var(--color-text-primary)]" style={{ position: "relative" }}>
      {/* Interactive particle background */}
      <InteractiveBackground />

      {/* Cinematic intro */}
      {!showContent && (
        <CinematicIntro onComplete={handleIntroComplete} />
      )}

      {/* Main site content */}
      <div style={{
        position: "relative", zIndex: 1,
        display: "flex", flexDirection: "column", minHeight: "100vh",
        opacity: showContent ? 1 : 0,
        transition: "opacity 0.5s ease",
      }}>
        <Navbar />
        <main className="flex-grow pt-28">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.4, ease: "easeOut" }}
              className="h-full"
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </main>
        <Footer />
      </div>
    </div>
  );
}
