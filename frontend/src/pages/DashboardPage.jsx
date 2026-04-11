import React, { useState, useEffect } from 'react';
import { Link, Routes, Route, NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Home, PlusSquare, CreditCard, Bell, Settings,
  TrendingUp, Eye, MessageSquare, Star, ChevronRight, LogOut
} from 'lucide-react';
import { propertyAPI, transactionAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import PropertyCard from '../components/property/PropertyCard';
import ListPropertyPage from './ListPropertyPage';
import { formatNaira, timeAgo } from '../utils/nigeria';
import toast from 'react-hot-toast';

// ── Dashboard Overview ─────────────────────────────────────────
function DashboardHome() {
  const { user } = useAuth();
  const [myProperties, setMyProperties] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      propertyAPI.getMyList().catch(() => ({ data: [] })),
      transactionAPI.getMine().catch(() => ({ data: [] })),
    ]).then(([p, t]) => {
      setMyProperties(p.data);
      setTransactions(t.data);
    }).finally(() => setLoading(false));
  }, []);

  const totalViews    = myProperties.reduce((s, p) => s + (p.viewsCount || 0), 0);
  const activeListings = myProperties.filter((p) => p.status === 'ACTIVE').length;
  const totalEarnings  = transactions
    .filter((t) => t.status === 'SUCCESS' && t.sellerId === user?.id)
    .reduce((s, t) => s + Number(t.amount), 0);

  const stats = [
    { icon: Home,       label: 'My Listings',   value: myProperties.length, color: 'forest' },
    { icon: Eye,        label: 'Total Views',    value: totalViews.toLocaleString(), color: 'blue' },
    { icon: TrendingUp, label: 'Active Listings',value: activeListings, color: 'green' },
    { icon: CreditCard, label: 'Total Earnings', value: formatNaira(totalEarnings, true), color: 'clay' },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h2 className="font-display text-2xl font-bold text-forest-900">
          Welcome, {user?.firstName}! 👋
        </h2>
        <p className="text-gray-500 text-sm mt-1">Here's an overview of your activity</p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map(({ icon: Icon, label, value, color }) => (
          <div key={label} className="card p-5">
            <div className={`w-10 h-10 rounded-xl mb-3 flex items-center justify-center ${
              color === 'clay' ? 'bg-orange-50' : `bg-${color === 'forest' ? 'forest' : color}-50`
            }`}>
              <Icon size={20} className={
                color === 'clay' ? 'text-clay-500' :
                color === 'blue' ? 'text-blue-600' : 'text-forest-800'
              } />
            </div>
            <p className="text-2xl font-bold text-gray-800">{value}</p>
            <p className="text-xs text-gray-500 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* My listings preview */}
      {myProperties.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-800">My Properties</h3>
            <Link to="/dashboard/listings" className="text-sm text-forest-800 hover:underline flex items-center gap-1">
              View all <ChevronRight size={14} />
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {myProperties.slice(0, 3).map((p) => <PropertyCard key={p.id} property={p} />)}
          </div>
        </div>
      )}

      {/* Recent transactions */}
      {transactions.length > 0 && (
        <div>
          <h3 className="font-semibold text-gray-800 mb-4">Recent Transactions</h3>
          <div className="card divide-y divide-gray-50">
            {transactions.slice(0, 5).map((t) => (
              <div key={t.id} className="flex items-center justify-between px-5 py-4">
                <div>
                  <p className="text-sm font-medium text-gray-800">{t.reference}</p>
                  <p className="text-xs text-gray-400">{timeAgo(t.createdAt)} · {t.type}</p>
                </div>
                <div className="text-right">
                  <p className="naira text-sm font-bold text-gray-800">{formatNaira(t.amount)}</p>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    t.status === 'SUCCESS' ? 'bg-green-50 text-green-700' :
                    t.status === 'FAILED'  ? 'bg-red-50 text-red-700'    :
                    'bg-yellow-50 text-yellow-700'
                  }`}>{t.status}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {myProperties.length === 0 && transactions.length === 0 && !loading && (
        <div className="text-center py-16 card">
          <div className="text-5xl mb-4">🏠</div>
          <h3 className="font-display text-xl font-bold text-gray-700 mb-2">Your dashboard is empty</h3>
          <p className="text-gray-400 mb-6">Start by browsing properties or listing your own</p>
          <div className="flex gap-3 justify-center">
            <Link to="/properties" className="btn-secondary">Browse Properties</Link>
            <Link to="/dashboard/list" className="btn-primary">List a Property</Link>
          </div>
        </div>
      )}
    </div>
  );
}

// ── My Listings ───────────────────────────────────────────────
function MyListings() {
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    propertyAPI.getMyList()
      .then((r) => setProperties(r.data))
      .catch(() => toast.error('Failed to load listings'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="animate-pulse space-y-4">{[...Array(3)].map((_, i) => <div key={i} className="h-40 bg-gray-100 rounded-xl" />)}</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="font-display text-2xl font-bold text-forest-900">My Listings</h2>
        <Link to="/dashboard/list" className="btn-primary text-sm flex items-center gap-2">
          <PlusSquare size={15} /> Add New
        </Link>
      </div>
      {properties.length === 0 ? (
        <div className="text-center py-16 card">
          <p className="text-gray-400 mb-4">No listings yet</p>
          <Link to="/dashboard/list" className="btn-primary">List Your First Property</Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {properties.map((p) => <PropertyCard key={p.id} property={p} />)}
        </div>
      )}
    </div>
  );
}

function ModerationPage() {
  const { isAdmin } = useAuth();
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [approvingId, setApprovingId] = useState(null);

  useEffect(() => {
    if (!isAdmin) {
      setLoading(false);
      return;
    }

    propertyAPI.getPending()
      .then((response) => setProperties(response.data))
      .catch(() => toast.error('Failed to load pending listings'))
      .finally(() => setLoading(false));
  }, [isAdmin]);

  const handleApprove = async (propertyId) => {
    setApprovingId(propertyId);
    try {
      const response = await propertyAPI.approve(propertyId);
      setProperties((current) => current.filter((property) => property.id !== propertyId));
      toast.success(`Listing approved: ${response.data.title}`);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to approve listing');
    } finally {
      setApprovingId(null);
    }
  };

  if (!isAdmin) {
    return (
      <div className="text-center py-16 card">
        <div className="text-5xl mb-4">🔒</div>
        <h3 className="font-display text-xl font-bold text-gray-700 mb-2">Admin access required</h3>
        <p className="text-gray-400">Only administrators can review pending listings.</p>
      </div>
    );
  }

  if (loading) {
    return <div className="animate-pulse space-y-4">{[...Array(3)].map((_, index) => <div key={index} className="h-40 bg-gray-100 rounded-xl" />)}</div>;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="font-display text-2xl font-bold text-forest-900">Moderation Queue</h2>
          <p className="text-gray-500 text-sm mt-1">Approve pending listings so they appear in public search.</p>
        </div>
        <span className="text-sm bg-forest-50 text-forest-800 px-3 py-1 rounded-full font-medium">
          {properties.length} pending
        </span>
      </div>

      {properties.length === 0 ? (
        <div className="text-center py-16 card">
          <div className="text-5xl mb-4">✅</div>
          <h3 className="font-display text-xl font-bold text-gray-700 mb-2">No pending listings</h3>
          <p className="text-gray-400">Everything in the moderation queue has been reviewed.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {properties.map((property) => (
            <div key={property.id} className="card p-5 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs bg-yellow-50 text-yellow-700 px-2 py-1 rounded-full font-medium">{property.status}</span>
                  <span className="text-xs text-gray-400">#{property.id}</span>
                </div>
                <h3 className="font-semibold text-gray-800 mb-1">{property.title}</h3>
                <p className="text-sm text-gray-500 mb-2">{property.address}</p>
                <p className="text-sm text-gray-500">{formatNaira(property.price, true)} · {property.listingType.replaceAll('_', ' ')}</p>
              </div>
              <div className="flex items-center gap-3">
                <Link to={`/properties/${property.id}`} className="btn-secondary text-sm">View</Link>
                <button
                  type="button"
                  onClick={() => handleApprove(property.id)}
                  disabled={approvingId === property.id}
                  className="btn-primary text-sm"
                >
                  {approvingId === property.id ? 'Approving…' : 'Approve'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main dashboard shell ────────────────────────────────────────
export default function DashboardPage() {
  const { user, logout, isSeller, isAdmin } = useAuth();
  const navigate = useNavigate();

  const navItems = [
    { to: '/dashboard',          label: 'Overview',       icon: LayoutDashboard, end: true },
    { to: '/dashboard/listings', label: 'My Listings',    icon: Home },
    { to: '/dashboard/list',     label: 'Add Property',   icon: PlusSquare,  sellerOnly: true },
    { to: '/dashboard/moderation', label: 'Moderation',   icon: Bell, adminOnly: true },
    { to: '/dashboard/payments', label: 'Payments',       icon: CreditCard },
    { to: '/dashboard/messages', label: 'Messages',       icon: MessageSquare },
    { to: '/dashboard/settings', label: 'Settings',       icon: Settings },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 page-enter">
      <div className="flex gap-8">
        {/* Sidebar */}
        <aside className="hidden lg:flex flex-col w-60 shrink-0">
          <div className="card p-5 mb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-forest-800 rounded-full flex items-center justify-center text-white font-bold text-lg">
                {user?.firstName?.[0]}{user?.lastName?.[0]}
              </div>
              <div>
                <p className="font-semibold text-gray-800 text-sm">{user?.firstName} {user?.lastName}</p>
                <span className="text-xs bg-forest-50 text-forest-800 px-2 py-0.5 rounded-full">{user?.role}</span>
              </div>
            </div>
          </div>

          <nav className="card p-2 space-y-0.5">
            {navItems.map(({ to, label, icon: Icon, end, sellerOnly, adminOnly }) => {
              if (sellerOnly && !isSeller) return null;
              if (adminOnly && !isAdmin) return null;
              return (
                <NavLink key={to} to={to} end={end}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm transition-colors font-medium ${
                      isActive ? 'bg-forest-800 text-white' : 'text-gray-600 hover:bg-gray-50 hover:text-forest-800'
                    }`
                  }>
                  <Icon size={17} /> {label}
                </NavLink>
              );
            })}
            <button onClick={() => { logout(); navigate('/'); }}
              className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm text-red-500 hover:bg-red-50 transition-colors font-medium">
              <LogOut size={17} /> Sign Out
            </button>
          </nav>
        </aside>

        {/* Content */}
        <main className="flex-1 min-w-0">
          <Routes>
            <Route index               element={<DashboardHome />} />
            <Route path="listings"     element={<MyListings />} />
            <Route path="list"         element={<ListPropertyPage />} />
            <Route path="moderation"   element={<ModerationPage />} />
            <Route path="payments"     element={<PaymentsPage />} />
            <Route path="messages"     element={<PlaceholderPage icon="💬" title="Messages" />} />
            <Route path="settings"     element={<PlaceholderPage icon="⚙️" title="Settings" />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}

function PaymentsPage() {
  const [transactions, setTransactions] = useState([]);
  useEffect(() => {
    transactionAPI.getMine().then((r) => setTransactions(r.data)).catch(() => {});
  }, []);
  return (
    <div>
      <h2 className="font-display text-2xl font-bold text-forest-900 mb-6">My Payments</h2>
      {transactions.length === 0 ? (
        <div className="text-center py-16 card"><p className="text-gray-400">No transactions yet</p></div>
      ) : (
        <div className="card divide-y divide-gray-50">
          {transactions.map((t) => (
            <div key={t.id} className="flex items-center justify-between px-5 py-4">
              <div>
                <p className="text-sm font-medium text-gray-800">{t.type} — Property #{t.propertyId}</p>
                <p className="text-xs text-gray-400">{t.reference} · {timeAgo(t.createdAt)}</p>
              </div>
              <div className="text-right">
                <p className="naira text-sm font-bold">{formatNaira(t.totalAmount)}</p>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                  t.status === 'SUCCESS' ? 'bg-green-50 text-green-700' :
                  t.status === 'FAILED'  ? 'bg-red-50 text-red-700' :
                  'bg-yellow-50 text-yellow-700'
                }`}>{t.status}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function PlaceholderPage({ icon, title }) {
  return (
    <div className="text-center py-24 card">
      <div className="text-5xl mb-4">{icon}</div>
      <h3 className="font-display text-xl font-bold text-gray-700">{title}</h3>
      <p className="text-gray-400 mt-2">Coming soon</p>
    </div>
  );
}
