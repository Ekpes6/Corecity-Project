import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Home, Search, PlusSquare, Bell, User, LogOut, Menu, X, ChevronDown } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { notificationAPI } from '../../services/api';

// Simple relative-time helper
function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

const TYPE_COLOR = {
  SUCCESS: 'bg-green-100 text-green-700',
  ALERT:   'bg-red-100 text-red-700',
  INFO:    'bg-blue-100 text-blue-700',
};

export default function Navbar() {
  const { user, logout, isAuthenticated, isSeller, isAdmin } = useAuth();
  const navigate  = useNavigate();
  const location  = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef(null);

  // ── Notification state ──────────────────────────────────────
  const [notifOpen, setNotifOpen]       = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount]   = useState(0);
  const notifRef = useRef(null);

  const fetchUnreadCount = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const res = await notificationAPI.getUnreadCount();
      setUnreadCount(res.data?.count ?? 0);
    } catch (_) { /* silent */ }
  }, [isAuthenticated]);

  const fetchNotifications = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const res = await notificationAPI.getAll();
      setNotifications(res.data ?? []);
      setUnreadCount((res.data ?? []).filter(n => !n.read).length);
    } catch (_) { /* silent */ }
  }, [isAuthenticated]);

  // Poll unread count every 30s
  useEffect(() => {
    fetchUnreadCount();
    const id = setInterval(fetchUnreadCount, 30000);
    return () => clearInterval(id);
  }, [fetchUnreadCount]);

  // Close notif dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (!notifRef.current?.contains(e.target)) setNotifOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleBellClick = () => {
    if (!notifOpen) fetchNotifications();
    setNotifOpen(v => !v);
  };

  const handleMarkRead = async (id) => {
    await notificationAPI.markRead(id).catch(() => {});
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    setUnreadCount(prev => Math.max(0, prev - 1));
  };

  const handleMarkAllRead = async () => {
    await notificationAPI.markAllRead().catch(() => {});
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    setUnreadCount(0);
  };
  // ── End notification state ──────────────────────────────────

  useEffect(() => {
    const handler = (e) => { if (!profileRef.current?.contains(e.target)) setProfileOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => setMobileOpen(false), [location]);

  const handleLogout = () => { logout(); navigate('/'); };

  const navLinks = [
    { to: '/properties',          label: 'Browse',   icon: Search },
    ...(isSeller ? [{ to: '/dashboard/list', label: 'List Property', icon: PlusSquare }] : []),
    ...(isAdmin ? [{ to: '/dashboard/moderation', label: 'Moderation', icon: Bell, auth: true }] : []),
    { to: '/dashboard',            label: 'Dashboard', icon: User, auth: true },
  ];

  return (
    <nav className="sticky top-0 z-50 bg-white border-b border-gray-100 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">

          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 group">
            <div className="w-9 h-9 bg-forest-800 rounded-xl flex items-center justify-center group-hover:bg-forest-900 transition-colors">
              <Home size={18} className="text-white" />
            </div>
            <span className="font-display font-bold text-xl text-forest-900">
              Core<span className="text-clay-500">City</span>
            </span>
          </Link>

          {/* Desktop links */}
          <div className="hidden md:flex items-center gap-1">
            {navLinks.map(({ to, label, auth }) => {
              if (auth && !isAuthenticated) return null;
              const active = location.pathname.startsWith(to);
              return (
                <Link key={to} to={to}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    active ? 'bg-forest-50 text-forest-800' : 'text-gray-600 hover:text-forest-800 hover:bg-gray-50'
                  }`}>
                  {label}
                </Link>
              );
            })}
          </div>

          {/* Right actions */}
          <div className="hidden md:flex items-center gap-3">
            {isAuthenticated ? (
              <>
                {/* ── Bell with dropdown ── */}
                <div className="relative" ref={notifRef}>
                  <button
                    onClick={handleBellClick}
                    className="relative p-2 text-gray-500 hover:text-forest-800 hover:bg-gray-50 rounded-lg transition-colors"
                    aria-label="Notifications"
                  >
                    <Bell size={20} />
                    {unreadCount > 0 && (
                      <span className="absolute top-1 right-1 min-w-[16px] h-4 px-0.5 bg-clay-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center leading-none">
                        {unreadCount > 99 ? '99+' : unreadCount}
                      </span>
                    )}
                  </button>

                  {notifOpen && (
                    <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-lift border border-gray-100 overflow-hidden z-50">
                      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                        <span className="font-semibold text-sm text-gray-800">Notifications</span>
                        {unreadCount > 0 && (
                          <button
                            onClick={handleMarkAllRead}
                            className="text-xs text-forest-700 hover:underline"
                          >
                            Mark all read
                          </button>
                        )}
                      </div>

                      <div className="max-h-80 overflow-y-auto divide-y divide-gray-50">
                        {notifications.length === 0 ? (
                          <p className="px-4 py-6 text-sm text-gray-400 text-center">No notifications yet</p>
                        ) : (
                          notifications.slice(0, 15).map(n => (
                            <button
                              key={n.id}
                              onClick={() => !n.read && handleMarkRead(n.id)}
                              className={`w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors ${!n.read ? 'bg-forest-50/60' : ''}`}
                            >
                              <div className="flex items-start gap-2">
                                <span className={`mt-0.5 px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase shrink-0 ${TYPE_COLOR[n.type] ?? TYPE_COLOR.INFO}`}>
                                  {n.type}
                                </span>
                                <div className="flex-1 min-w-0">
                                  <p className={`text-sm leading-snug truncate ${!n.read ? 'font-semibold text-gray-900' : 'text-gray-700'}`}>{n.title}</p>
                                  <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{n.body}</p>
                                  <p className="text-[10px] text-gray-400 mt-1">{timeAgo(n.createdAt)}</p>
                                </div>
                                {!n.read && <span className="w-2 h-2 bg-clay-500 rounded-full shrink-0 mt-1.5" />}
                              </div>
                            </button>
                          ))
                        )}
                      </div>

                      <div className="border-t border-gray-100 px-4 py-2">
                        <Link
                          to="/dashboard/messages"
                          onClick={() => setNotifOpen(false)}
                          className="text-xs text-forest-700 hover:underline"
                        >
                          View all in Messages →
                        </Link>
                      </div>
                    </div>
                  )}
                </div>

                <div className="relative" ref={profileRef}>
                  <button onClick={() => setProfileOpen(!profileOpen)}
                    className="flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-xl hover:bg-gray-50 transition-colors">
                    <div className="w-8 h-8 bg-forest-800 rounded-full flex items-center justify-center text-white text-sm font-semibold">
                      {user.firstName?.[0]}{user.lastName?.[0]}
                    </div>
                    <span className="text-sm font-medium text-gray-700">{user.firstName}</span>
                    <ChevronDown size={14} className={`text-gray-400 transition-transform ${profileOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {profileOpen && (
                    <div className="absolute right-0 mt-2 w-52 bg-white rounded-xl shadow-lift border border-gray-100 py-1 overflow-hidden">
                      <div className="px-4 py-2 border-b border-gray-50">
                        <p className="text-xs text-gray-400 uppercase tracking-wide">Signed in as</p>
                        <p className="text-sm font-semibold text-gray-800 truncate">{user.email}</p>
                      </div>
                      <Link to="/dashboard" className="flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50">
                        <User size={15} /> My Dashboard
                      </Link>
                      {isSeller && (
                        <Link to="/dashboard/list" className="flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50">
                          <PlusSquare size={15} /> List a Property
                        </Link>
                      )}
                      {isAdmin && (
                        <Link to="/dashboard/moderation" className="flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50">
                          <Bell size={15} /> Moderation
                        </Link>
                      )}
                      <button onClick={handleLogout}
                        className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50">
                        <LogOut size={15} /> Sign Out
                      </button>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <>
                <Link to="/login"    className="btn-secondary py-2 px-5 text-sm">Log In</Link>
                <Link to="/register" className="btn-primary  py-2 px-5 text-sm">Sign Up</Link>
              </>
            )}
          </div>

          {/* Mobile hamburger */}
          <button onClick={() => setMobileOpen(!mobileOpen)} className="md:hidden p-2 text-gray-600">
            {mobileOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden bg-white border-t border-gray-100 py-4 px-4 space-y-1">
          {navLinks.map(({ to, label, icon: Icon, auth }) => {
            if (auth && !isAuthenticated) return null;
            return (
              <Link key={to} to={to}
                className="flex items-center gap-3 px-4 py-3 rounded-xl text-gray-700 hover:bg-forest-50 hover:text-forest-800">
                <Icon size={18} /> {label}
              </Link>
            );
          })}
          {isAuthenticated ? (
            <button onClick={handleLogout}
              className="w-full flex items-center gap-3 px-4 py-3 text-red-600 hover:bg-red-50 rounded-xl">
              <LogOut size={18} /> Sign Out
            </button>
          ) : (
            <div className="pt-2 space-y-2">
              <Link to="/login"    className="block btn-secondary text-center">Log In</Link>
              <Link to="/register" className="block btn-primary  text-center">Sign Up</Link>
            </div>
          )}
        </div>
      )}
    </nav>
  );
}
