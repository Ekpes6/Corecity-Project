import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Home, Search, PlusSquare, Bell, User, LogOut, Menu, X, ChevronDown } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function Navbar() {
  const { user, logout, isAuthenticated, isSeller } = useAuth();
  const navigate  = useNavigate();
  const location  = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef(null);

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
              House<span className="text-clay-500">Link</span>
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
                <button className="relative p-2 text-gray-500 hover:text-forest-800 hover:bg-gray-50 rounded-lg transition-colors">
                  <Bell size={20} />
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-clay-500 rounded-full" />
                </button>

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
