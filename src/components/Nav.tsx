import { AnimatePresence, motion } from 'motion/react';
import { LogOut, Menu, Search, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { cn } from '@/lib/cn';
import { useExperience } from '@/state/experience';
import { signIn, signOutUser, useAuth } from '@/app/useAuth';
import { playSfx } from '@/audio/engine';
import { Kbd } from './ui';

const LINKS = [
  { to: '/#vault', label: 'Vault' },
  { to: '/scan', label: 'Sentinel' },
  { to: '/upload', label: 'Publish' },
];

function SoundToggle() {
  const sound = useExperience((s) => s.sound);
  const toggle = useExperience((s) => s.toggleSound);
  return (
    <button
      onClick={toggle}
      aria-pressed={sound}
      aria-label={sound ? 'Mute sound' : 'Turn sound on'}
      className="flex h-9 w-9 items-center justify-center rounded-full text-ink-2 transition hover:bg-white/10 hover:text-ink"
    >
      <span className="flex h-3.5 items-end gap-[2px]">
        {[0.55, 1, 0.7, 0.9].map((h, i) => (
          <span
            key={i}
            className={cn('w-[2px] rounded-full bg-current transition-all duration-500', sound ? 'opacity-100' : 'opacity-50')}
            style={{ height: sound ? `${h * 100}%` : '20%', animation: sound ? `pulse-dot ${0.7 + i * 0.17}s ease-in-out infinite` : undefined }}
          />
        ))}
      </span>
    </button>
  );
}

export function Nav() {
  const phase = useExperience((s) => s.phase);
  const setPalette = useExperience((s) => s.setPaletteOpen);
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [scrolled, setScrolled] = useState(false);
  const { pathname } = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 24);
    on();
    window.addEventListener('scroll', on, { passive: true });
    return () => window.removeEventListener('scroll', on);
  }, []);
  useEffect(() => setOpen(false), [pathname]);

  const doSignIn = async () => {
    const e = await signIn();
    if (e) {
      setErr(e);
      window.setTimeout(() => setErr(null), 5000);
    }
  };

  const goVault = (e: React.MouseEvent) => {
    e.preventDefault();
    if (pathname !== '/') navigate('/#vault');
    else document.getElementById('vault')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <AnimatePresence>
      {phase === 'site' && (
        <motion.header
          initial={{ y: -90, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -90, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 110, damping: 18, mass: 1, delay: 0.15 }}
          className="fixed left-1/2 top-3 z-50 w-[calc(100%-24px)] max-w-5xl -translate-x-1/2 sm:top-4"
        >
          <div className="group relative rounded-full p-px">
            {/* the spinning conic border from v1, now in ember→fusion→tide */}
            <div className="absolute inset-0 overflow-hidden rounded-full">
              <div
                className="absolute inset-[-120%] opacity-50 transition-opacity duration-500 group-hover:opacity-100"
                style={{ background: 'conic-gradient(from 0deg, transparent 0 250deg, #ff6b2c 290deg, #9b7bff 320deg, #29d3ff 360deg)', animation: 'spin-slow 6s linear infinite' }}
              />
            </div>
            <nav
              className={cn(
                'relative flex h-14 items-center justify-between rounded-full px-3 pl-4 transition-colors duration-500 sm:px-4 sm:pl-5',
                scrolled ? 'bg-void/90 backdrop-blur-2xl' : 'bg-obsidian-900/70 backdrop-blur-xl',
              )}
              aria-label="Main"
            >
              <Link to="/" className="flex items-center gap-2.5" aria-label="VICZO home">
                <span className="relative flex h-8 w-8 items-center justify-center">
                  <span className="absolute inset-0 rotate-45 rounded-[9px] bg-gradient-to-br from-ember via-fusion to-tide opacity-90" />
                  <span className="relative font-display text-sm font-black text-void">V</span>
                </span>
                <span className="hidden flex-col leading-none sm:flex">
                  <span className="font-display text-[15px] font-extrabold tracking-tight">VICZO</span>
                  <span className="hud mt-0.5 text-[9px] text-ink-3">Store · Sentinel</span>
                </span>
              </Link>

              <div className="hidden items-center gap-1 md:flex">
                {LINKS.map((l) =>
                  l.to.startsWith('/#') ? (
                    <a key={l.to} href="/#vault" onClick={goVault} className="rounded-full px-3.5 py-2 text-sm text-ink-2 transition hover:bg-white/5 hover:text-ink" onMouseEnter={() => playSfx('tick')}>
                      {l.label}
                    </a>
                  ) : (
                    <NavLink
                      key={l.to}
                      to={l.to}
                      onMouseEnter={() => playSfx('tick')}
                      className={({ isActive }) => cn('rounded-full px-3.5 py-2 text-sm transition hover:bg-white/5 hover:text-ink', isActive ? 'text-ink' : 'text-ink-2')}
                    >
                      {l.label}
                    </NavLink>
                  ),
                )}
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPalette(true)}
                  className="hidden items-center gap-2 rounded-full border border-white/10 px-3 py-1.5 text-xs text-ink-3 transition hover:border-white/25 hover:text-ink-2 sm:flex"
                  aria-label="Search and commands"
                >
                  <Search className="h-3.5 w-3.5" />
                  <span>Search</span>
                  <Kbd>⌘K</Kbd>
                </button>
                <button onClick={() => setPalette(true)} className="flex h-9 w-9 items-center justify-center rounded-full text-ink-2 hover:bg-white/10 sm:hidden" aria-label="Search">
                  <Search className="h-4 w-4" />
                </button>
                <SoundToggle />
                {user ? (
                  <button onClick={() => void signOutUser()} className="hidden items-center gap-2 rounded-full px-3 py-2 text-xs text-ink-2 hover:bg-white/5 hover:text-ink md:flex" title={user.displayName ?? undefined}>
                    {user.photoURL ? <img src={user.photoURL} alt="" className="h-6 w-6 rounded-full" referrerPolicy="no-referrer" /> : null}
                    <LogOut className="h-3.5 w-3.5" /> Sign out
                  </button>
                ) : (
                  <button onClick={() => void doSignIn()} className="hidden rounded-full bg-ink px-4 py-2 text-xs font-medium text-void transition hover:bg-white md:block">
                    Sign in
                  </button>
                )}
                <button className="flex h-9 w-9 items-center justify-center rounded-full text-ink-2 hover:bg-white/10 md:hidden" onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-label="Menu">
                  {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
                </button>
              </div>
            </nav>
          </div>

          <AnimatePresence>
            {err && (
              <motion.p initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="glass-strong mx-auto mt-2 w-fit rounded-xl px-4 py-2 text-xs text-danger" role="alert">
                {err}
              </motion.p>
            )}
            {open && (
              <motion.div
                initial={{ opacity: 0, y: -10, scale: 0.97, filter: 'blur(8px)' }}
                animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
                exit={{ opacity: 0, y: -10, scale: 0.97, filter: 'blur(8px)' }}
                transition={{ type: 'spring', stiffness: 220, damping: 24 }}
                className="glass-strong mt-2 flex flex-col gap-1 rounded-3xl p-2 md:hidden"
              >
                <a href="/#vault" onClick={goVault} className="rounded-2xl px-4 py-3 text-sm text-ink hover:bg-white/5">
                  Vault — the catalog
                </a>
                <Link to="/scan" className="rounded-2xl px-4 py-3 text-sm text-ink hover:bg-white/5">
                  Sentinel — X-ray an APK or link
                </Link>
                <Link to="/upload" className="rounded-2xl px-4 py-3 text-sm text-ink hover:bg-white/5">
                  Publish with proof
                </Link>
                {user ? (
                  <button onClick={() => void signOutUser()} className="rounded-2xl px-4 py-3 text-left text-sm text-ink-2 hover:bg-white/5">
                    Sign out
                  </button>
                ) : (
                  <button onClick={() => void doSignIn()} className="rounded-2xl bg-ink px-4 py-3 text-left text-sm font-medium text-void">
                    Sign in with Google
                  </button>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.header>
      )}
    </AnimatePresence>
  );
}
