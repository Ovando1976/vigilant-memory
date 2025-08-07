// src/components/driver/Sidebar.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FaBars,
  FaTimes,
  FaTachometerAlt,
  FaListAlt,
  FaDollarSign,
  FaCog,
} from 'react-icons/fa';
import clsx from 'clsx';
import { useArgonController } from '../../context/ArgonControllerContext';

/* ---------- link metadata ---------- */
const baseLinks = [
  { to: '/driver', icon: FaTachometerAlt, label: 'Dashboard', end: true },
  { to: '/driver/requests', icon: FaListAlt, label: 'Rides' },
  {
    to: '/driver/earnings',
    icon: FaDollarSign,
    label: 'Earnings',
    roles: ['owner', 'manager'],
  },
  { to: '/driver/settings', icon: FaCog, label: 'Settings' },
];

export default function Sidebar({
  mini,
  onToggleMini,
  pendingRides = 0, // badge count for the “Rides” link
  userRole = 'driver', // current user role
}) {
  const [{ darkMode, gtaMode }] = useArgonController();
  const [open, setOpen] = useState(false); // mobile drawer

  /* ensure Tailwind `dark:` utilities work */
  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode || gtaMode);
  }, [darkMode, gtaMode]);

  /* palette */
  const palette = gtaMode
    ? {
        bg: 'bg-zinc-900',
        border: 'border-pink-600/40',
        active:
          "before:content-[''] before:absolute before:inset-y-0 before:left-0 before:w-2 before:bg-pink-500",
        brand: 'text-pink-400 drop-shadow-[0_0_4px_#f0f]',
        text: 'text-gray-200',
      }
    : {
        bg: darkMode ? 'bg-gray-900' : 'bg-white',
        border: darkMode ? 'border-cyan-700' : 'border-gray-300',
        active:
          "before:content-[''] before:absolute before:inset-y-0 before:left-0 before:w-2 before:bg-gradient-to-b before:from-cyan-400 before:to-violet-600",
        brand: 'text-cyan-600 dark:text-cyan-300',
        text: darkMode ? 'text-gray-200' : 'text-gray-800',
      };

  /* apply role filter + badge injection */
  const links = baseLinks
    .filter((l) => !l.roles || l.roles.includes(userRole))
    .map((l) => (l.label === 'Rides' ? { ...l, badge: pendingRides } : l));

  /* nav list component */
  const NavList = ({ compact, onNavigate }) =>
    links.map((link) => (
      <NavButton
        key={link.to}
        {...link}
        compact={compact}
        palette={palette}
        onNavigate={onNavigate}
      />
    ));

  return (
    <>
      {/* ═══ DESKTOP ═══ */}
      <aside
        className={clsx(
          'hidden md:flex flex-col sticky top-0 h-screen p-4 shadow-lg transition-all duration-300',
          palette.bg,
          palette.border,
          mini ? 'w-20' : 'w-64',
          'border-r',
        )}
      >
        {/* brand + collapse */}
        <div className="flex items-center justify-between mb-6">
          <span
            className={clsx(
              'text-lg font-extrabold uppercase tracking-widest whitespace-nowrap transition-opacity',
              mini && 'opacity-0 pointer-events-none delay-75',
              palette.brand,
            )}
          >
            Driver Hub
          </span>
          <button
            aria-label={mini ? 'Expand sidebar' : 'Collapse sidebar'}
            onClick={() => onToggleMini?.(!mini)}
            className="text-xl p-2 rounded hover:bg-white/10 focus:outline-none"
          >
            {mini ? <FaBars /> : <FaTimes />}
          </button>
        </div>

        <nav className="space-y-2 flex-1">
          <NavList compact={mini} />
        </nav>
      </aside>

      {/* ═══ MOBILE DRAWER ═══ */}
      <AnimatePresence>
        {open && (
          <motion.aside
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'spring', stiffness: 260, damping: 25 }}
            className={clsx(
              'fixed inset-y-0 left-0 z-40 w-64 p-4 shadow-2xl md:hidden',
              palette.bg,
              palette.border,
              'border-r',
            )}
          >
            <button
              aria-label="Close sidebar"
              className="text-2xl p-2 rounded hover:bg-white/10 mb-6"
              onClick={() => setOpen(false)}
            >
              <FaTimes />
            </button>
            <nav className="space-y-2">
              <NavList compact={false} onNavigate={() => setOpen(false)} />
            </nav>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* FAB toggle (mobile) */}
      <button
        aria-label="Open sidebar"
        onClick={() => setOpen(true)}
        className={clsx(
          'fixed bottom-6 left-6 z-30 md:hidden p-3 rounded-full shadow-lg',
          palette.bg,
          palette.border,
          'border',
        )}
      >
        <FaBars />
      </button>
    </>
  );
}

/* ─────────────────────────────── */
function NavButton({
  to,
  icon: Icon,
  label,
  end,
  compact,
  palette,
  badge = 0,
  onNavigate,
}) {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const isActive = end ? pathname === to : pathname.startsWith(to);

  /* analytics */
  const handleClick = () => {
    if (window.analytics?.track) {
      window.analytics.track('nav_click', { to });
    }
    navigate(to);
    onNavigate?.();
  };

  return (
    <button
      type="button"
      aria-current={isActive ? 'page' : undefined}
      onClick={handleClick}
      className={clsx(
        'relative flex items-center gap-3 px-4 py-2.5 rounded-md font-semibold text-sm tracking-wide transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-offset-2',
        isActive
          ? clsx(palette.active, 'bg-white/10 text-white shadow-inner')
          : clsx(palette.text, 'hover:bg-white/5'),
        compact && 'justify-center px-3',
      )}
    >
      <span className="relative">
        <Icon className="text-lg shrink-0" />
        {badge > 0 && !compact && (
          <span className="absolute -top-1 -right-2 inline-flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white">
            {badge > 99 ? '99+' : badge}
          </span>
        )}
      </span>
      <span className={clsx('whitespace-nowrap', compact && 'sr-only')}>
        {label}
      </span>
    </button>
  );
}
