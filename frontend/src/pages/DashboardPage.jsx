import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Link, Routes, Route, NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Home, PlusSquare, CreditCard, Bell, Settings,
  TrendingUp, Eye, MessageSquare, Star, ChevronRight, ChevronLeft, LogOut,
  CheckCircle, XCircle, Clock, RefreshCw, Search, Filter,
  Bed, Bath, MapPin, Building2, AlertCircle, ShieldCheck,
  Crown, BookMarked, BadgeCheck, Landmark, Zap, ArrowUpRight,
  CalendarCheck, Lock, Unlock, RotateCcw, Phone, User, Save,
  Wallet, Banknote, PlusCircle, Trash2, Star as StarIcon,
} from 'lucide-react';
import { propertyAPI, transactionAPI, subscriptionAPI, reservationAPI, reputationAPI, commissionAPI, notificationAPI, adminAPI, authAPI, bankAccountAPI, walletAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import PropertyCard from '../components/property/PropertyCard';
import ListPropertyPage from './ListPropertyPage';
import { formatNaira, timeAgo, formatDateTime, listingLabel, listingBadgeClass, propertyTypeLabel } from '../utils/nigeria';
import toast from 'react-hot-toast';

// ── Shared pagination ──────────────────────────────────────────
const PAGE_SIZE = 10;

function Pagination({ page, total, onChange }) {
  const totalPages = Math.ceil(total / PAGE_SIZE);
  if (totalPages <= 1) return null;
  return (
    <div className="flex items-center justify-between pt-4 text-sm text-gray-500">
      <span>{Math.min((page - 1) * PAGE_SIZE + 1, total)}–{Math.min(page * PAGE_SIZE, total)} of {total}</span>
      <div className="flex gap-1">
        <button
          onClick={() => onChange(page - 1)}
          disabled={page === 1}
          className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed"
        ><ChevronLeft size={16} /></button>
        {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
          <button
            key={p}
            onClick={() => onChange(p)}
            className={`w-8 h-8 rounded-lg text-xs font-medium ${p === page ? 'bg-forest-700 text-white' : 'hover:bg-gray-100'}`}
          >{p}</button>
        ))}
        <button
          onClick={() => onChange(page + 1)}
          disabled={page === totalPages}
          className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed"
        ><ChevronRight size={16} /></button>
      </div>
    </div>
  );
}

// ── Dashboard Overview ─────────────────────────────────────────
function DashboardHome() {
  const { user, isSeller, isAdmin, isAgent } = useAuth();
  const [myProperties, setMyProperties] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [commissions, setCommissions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetches = [
      propertyAPI.getMyList().catch(() => ({ data: [] })),
      transactionAPI.getMine().catch(() => ({ data: [] })),
    ];
    // Agents and admins also load their commission records for the earnings figure
    if (isAgent || isAdmin) {
      fetches.push(
        isAdmin
          ? commissionAPI.getAll().catch(() => ({ data: [] }))
          : commissionAPI.getMine().catch(() => ({ data: [] }))
      );
    }
    Promise.all(fetches).then(([p, t, c]) => {
      setMyProperties(p.data);
      setTransactions(t.data);
      if (c) setCommissions(c.data || []);
    }).finally(() => setLoading(false));
  }, [isAgent, isAdmin]);

  const activeProperties = myProperties.filter((p) => p.status === 'ACTIVE');
  const totalViews    = activeProperties.reduce((s, p) => s + (p.viewsCount || 0), 0);
  const activeListings = activeProperties.length;

  // Earnings logic:
  // - ADMIN: sum of all corecityCommission across all commissions
  // - AGENT: sum of agentCommission from their commissions
  // - SELLER (non-agent): sum of transaction amounts where they are the seller
  // - BUYER: sum of successful purchases they made
  let totalEarnings = 0;
  if (isAdmin) {
    totalEarnings = commissions.reduce((s, c) => s + Number(c.corecityCommission || 0), 0);
  } else if (isAgent) {
    totalEarnings = commissions.reduce((s, c) => s + Number(c.agentCommission || 0), 0);
  } else {
    totalEarnings = transactions
      .filter((t) => t.status === 'SUCCESS' && t.sellerId === user?.id)
      .reduce((s, t) => s + Number(t.amount), 0);
  }

  const earningsLabel = isAdmin ? 'CoreCity Earnings' : isAgent ? 'My Commission' : 'Total Earnings';

  const stats = [
    { icon: Home,       label: 'My Listings',   value: myProperties.length, color: 'forest' },
    { icon: Eye,        label: 'Total Views',    value: totalViews.toLocaleString(), color: 'blue' },
    { icon: TrendingUp, label: 'Active Listings',value: activeListings, color: 'green' },
    { icon: CreditCard, label: earningsLabel,    value: formatNaira(totalEarnings, true), color: 'clay' },
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

      {/* My listings preview — only ACTIVE properties */}
      {activeProperties.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-800">My Properties</h3>
            <Link to="/dashboard/listings" className="text-sm text-forest-800 hover:underline flex items-center gap-1">
              View all <ChevronRight size={14} />
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {activeProperties.slice(0, 3).map((p) => <PropertyCard key={p.id} property={p} />)}
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

      {activeProperties.length === 0 && transactions.length === 0 && !loading && (
        <div className="text-center py-16 card">
          <div className="text-5xl mb-4">🏠</div>
          <h3 className="font-display text-xl font-bold text-gray-700 mb-2">Your dashboard is empty</h3>
          <p className="text-gray-400 mb-6">Start by browsing properties or listing your own</p>
          <div className="flex gap-3 justify-center">
            <Link to="/properties" className="btn-secondary">Browse Properties</Link>
            {isSeller && <Link to="/dashboard/list" className="btn-primary">List a Property</Link>}
          </div>
        </div>
      )}
    </div>
  );
}

// ── My Listings ───────────────────────────────────────────────
function MyListings() {
  const { isSeller } = useAuth();
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
        {isSeller && (
          <Link to="/dashboard/list" className="btn-primary text-sm flex items-center gap-2">
            <PlusSquare size={15} /> Add New
          </Link>
        )}
      </div>
      {properties.length === 0 ? (
        <div className="text-center py-16 card">
          <p className="text-gray-400 mb-4">No listings yet</p>
          {isSeller && <Link to="/dashboard/list" className="btn-primary">List Your First Property</Link>}
        </div>
      ) : (
        <div className="space-y-8">
          {/* Active listings */}
          {properties.filter((p) => ['ACTIVE', 'ON_NEGOTIATION', 'SOLD', 'RENTED'].includes(p.status)).length > 0 && (
            <div>
              <h3 className="font-semibold text-gray-700 mb-3 text-sm">Active Listings</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {properties
                  .filter((p) => ['ACTIVE', 'ON_NEGOTIATION', 'SOLD', 'RENTED'].includes(p.status))
                  .map((p) => <PropertyCard key={p.id} property={p} />)}
              </div>
            </div>
          )}

          {/* Pending approval */}
          {properties.filter((p) => p.status === 'PENDING').length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <h3 className="font-semibold text-gray-700 text-sm">Awaiting Admin Approval</h3>
                <span className="bg-yellow-100 text-yellow-700 text-xs font-medium px-2 py-0.5 rounded-full">
                  {properties.filter((p) => p.status === 'PENDING').length}
                </span>
              </div>
              <div className="space-y-3">
                {properties.filter((p) => p.status === 'PENDING').map((p) => (
                  <div key={p.id} className="card p-4 flex items-center gap-4 border-l-4 border-yellow-400">
                    <img src={p.primaryImageUrl || p.imageUrls?.[0] || 'https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=400&q=70'}
                      alt={p.title} className="w-16 h-16 rounded-xl object-cover shrink-0"
                      onError={(e) => { e.target.src = 'https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=400&q=70'; }} />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-800 text-sm truncate">{p.title}</p>
                      <p className="text-xs text-gray-400 truncate">{p.address}</p>
                    </div>
                    <span className="shrink-0 text-xs font-medium bg-yellow-50 text-yellow-700 border border-yellow-200 px-3 py-1 rounded-full">Pending Review</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Rejected */}
          {properties.filter((p) => p.status === 'REJECTED').length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <h3 className="font-semibold text-gray-700 text-sm">Rejected Listings</h3>
                <span className="bg-red-100 text-red-700 text-xs font-medium px-2 py-0.5 rounded-full">
                  {properties.filter((p) => p.status === 'REJECTED').length}
                </span>
              </div>
              <div className="space-y-3">
                {properties.filter((p) => p.status === 'REJECTED').map((p) => (
                  <div key={p.id} className="card p-4 flex items-center gap-4 border-l-4 border-red-400">
                    <img src={p.primaryImageUrl || p.imageUrls?.[0] || 'https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=400&q=70'}
                      alt={p.title} className="w-16 h-16 rounded-xl object-cover shrink-0"
                      onError={(e) => { e.target.src = 'https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=400&q=70'; }} />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-800 text-sm truncate">{p.title}</p>
                      <p className="text-xs text-gray-400 truncate">{p.address}</p>
                    </div>
                    <span className="shrink-0 text-xs font-medium bg-red-50 text-red-700 border border-red-200 px-3 py-1 rounded-full">Rejected</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const PLACEHOLDER_IMG = 'https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=400&q=70';

function ModerationPage() {
  const { isAdmin } = useAuth();
  const [tab, setTab]           = useState('pending');
  const [pending, setPending]   = useState([]);
  const [rejected, setRejected] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [approvingId, setApprovingId] = useState(null);
  const [rejectingId, setRejectingId] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [search, setSearch]     = useState('');
  const [filterListing, setFilterListing] = useState('');
  // tracks how many approvals happened this session, for the stats bar
  const [sessionApproved, setSessionApproved] = useState(0);

  const loadQueues = useCallback(async (silent = false) => {
    if (!isAdmin) { setLoading(false); return; }
    if (!silent) setLoading(true); else setRefreshing(true);
    try {
      const [p, r] = await Promise.all([
        propertyAPI.getPending().catch(() => ({ data: [] })),
        propertyAPI.getRejected().catch(() => ({ data: [] })),
      ]);
      setPending(p.data);
      setRejected(r.data);
    } catch {
      toast.error('Failed to load moderation queue');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [isAdmin]);

  useEffect(() => { loadQueues(); }, [loadQueues]);

  /* ── actions ── */
  const handleApprove = async (propertyId) => {
    setApprovingId(propertyId);
    try {
      const res = await propertyAPI.approve(propertyId);
      setPending((cur) => cur.filter((p) => p.id !== propertyId));
      setSessionApproved((n) => n + 1);
      toast.success(`"${res.data.title}" is now live`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Approval failed');
    } finally {
      setApprovingId(null);
    }
  };

  const handleRejectStart = (id) => { setRejectingId(id); setRejectReason(''); };
  const handleRejectCancel = () => { setRejectingId(null); setRejectReason(''); };

  const handleRejectConfirm = async () => {
    const id = rejectingId;
    setRejectingId(null);
    try {
      const res = await propertyAPI.reject(id, rejectReason.trim() || null);
      setPending((cur) => cur.filter((p) => p.id !== id));
      setRejected((cur) => [res.data, ...cur]);
      toast.success('Listing rejected');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Rejection failed');
    }
    setRejectReason('');
  };

  /* ── guard ── */
  if (!isAdmin) {
    return (
      <div className="text-center py-20 card">
        <AlertCircle size={40} className="mx-auto mb-4 text-gray-300" />
        <h3 className="font-display text-xl font-bold text-gray-700 mb-2">Admin access required</h3>
        <p className="text-gray-400 text-sm">Only administrators can review pending listings.</p>
      </div>
    );
  }

  /* ── filter ── */
  const source     = tab === 'pending' ? pending : rejected;
  const displayed  = source.filter((p) => {
    const q = search.toLowerCase();
    const matchSearch = !q || p.title.toLowerCase().includes(q) || p.address.toLowerCase().includes(q);
    const matchListing = !filterListing || p.listingType === filterListing;
    return matchSearch && matchListing;
  });

  /* ── skeleton ── */
  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-28 bg-gray-100 rounded-2xl" />
        {[...Array(4)].map((_, i) => <div key={i} className="h-32 bg-gray-100 rounded-2xl" />)}
      </div>
    );
  }

  return (
    <div className="space-y-6">

      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl font-bold text-forest-900">Listing Moderation</h2>
          <p className="text-gray-500 text-sm mt-1">Review, approve, or reject submitted listings before they go public.</p>
        </div>
        <button
          type="button"
          onClick={() => loadQueues(true)}
          disabled={refreshing}
          className="flex items-center gap-2 btn-secondary text-sm shrink-0"
        >
          <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {/* ── Stats ── */}
      <div className="grid grid-cols-3 gap-4">
        <div className="card p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-yellow-50 flex items-center justify-center shrink-0">
            <Clock size={18} className="text-yellow-600" />
          </div>
          <div>
            <p className="text-xl font-bold text-gray-800">{pending.length}</p>
            <p className="text-xs text-gray-400">Awaiting review</p>
          </div>
        </div>
        <div className="card p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center shrink-0">
            <CheckCircle size={18} className="text-green-600" />
          </div>
          <div>
            <p className="text-xl font-bold text-gray-800">{sessionApproved}</p>
            <p className="text-xs text-gray-400">Approved this session</p>
          </div>
        </div>
        <div className="card p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center shrink-0">
            <XCircle size={18} className="text-red-500" />
          </div>
          <div>
            <p className="text-xl font-bold text-gray-800">{rejected.length}</p>
            <p className="text-xs text-gray-400">Total rejected</p>
          </div>
        </div>
      </div>

      {/* ── Tabs ── */}
      <div className="flex gap-1 p-1 bg-gray-100 rounded-xl w-fit">
        {[
          { key: 'pending',  label: 'Pending Review', count: pending.length,  icon: Clock },
          { key: 'rejected', label: 'Rejected',        count: rejected.length, icon: XCircle },
        ].map(({ key, label, count, icon: Icon }) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              tab === key
                ? 'bg-white text-forest-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <Icon size={14} />
            {label}
            <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold ${
              tab === key
                ? key === 'pending' ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-600'
                : 'bg-gray-200 text-gray-500'
            }`}>{count}</span>
          </button>
        ))}
      </div>

      {/* ── Filters ── */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by title or address…"
            className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-forest-300 bg-white"
          />
        </div>
        <div className="relative">
          <Filter size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <select
            value={filterListing}
            onChange={(e) => setFilterListing(e.target.value)}
            className="pl-8 pr-4 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-forest-300 bg-white appearance-none cursor-pointer"
          >
            <option value="">All listing types</option>
            <option value="FOR_SALE">For Sale</option>
            <option value="FOR_RENT">For Rent</option>
            <option value="SHORT_LET">Short Let</option>
          </select>
        </div>
      </div>

      {/* ── Empty state ── */}
      {displayed.length === 0 && (
        <div className="text-center py-20 card">
          {tab === 'pending'
            ? <><CheckCircle size={40} className="mx-auto mb-4 text-green-300" />
                <h3 className="font-display text-xl font-bold text-gray-700 mb-2">Queue is clear</h3>
                <p className="text-gray-400 text-sm">No pending listings match your filters.</p></>
            : <><XCircle size={40} className="mx-auto mb-4 text-gray-300" />
                <h3 className="font-display text-xl font-bold text-gray-700 mb-2">No rejected listings</h3>
                <p className="text-gray-400 text-sm">Listings you reject will appear here.</p></>
          }
        </div>
      )}

      {/* ── Property rows ── */}
      <div className="space-y-3">
        {displayed.map((property) => {
          const image = property.primaryImageUrl || property.imageUrls?.[0] || PLACEHOLDER_IMG;
          const isApproving = approvingId === property.id;
          const isRejecting = rejectingId === property.id;

          return (
            <div key={property.id} className="card overflow-hidden">
              <div className="flex gap-0">

                {/* Thumbnail */}
                <Link to={`/properties/${property.id}`} className="shrink-0 relative" style={{ width: 120 }}>
                  <img
                    src={image} alt={property.title}
                    className="w-full h-full object-cover"
                    style={{ minHeight: 120 }}
                    onError={(e) => { e.target.src = PLACEHOLDER_IMG; }}
                  />
                  <span className={`absolute top-2 left-2 text-xs px-2 py-0.5 rounded-full font-medium ${
                    tab === 'pending'
                      ? 'bg-yellow-500 text-white'
                      : 'bg-red-500 text-white'
                  }`}>{property.status}</span>
                </Link>

                {/* Details */}
                <div className="flex-1 p-4 flex flex-col justify-between min-w-0">
                  <div>
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className={listingBadgeClass(property.listingType)}>{listingLabel(property.listingType)}</span>
                      <span className="text-xs text-gray-400">{propertyTypeLabel(property.propertyType)}</span>
                      <span className="text-xs text-gray-300">·</span>
                      <span className="text-xs text-gray-400">ID #{property.id}</span>
                      <span className="text-xs text-gray-300">·</span>
                      <span className="text-xs text-gray-400">Owner #{property.ownerId}</span>
                      <span className="ml-auto text-xs text-gray-300">{timeAgo(property.createdAt)}</span>
                    </div>

                    <Link to={`/properties/${property.id}`} className="hover:text-forest-800 transition-colors">
                      <h3 className="font-semibold text-gray-800 text-sm leading-snug line-clamp-1">{property.title}</h3>
                    </Link>

                    <div className="flex items-center gap-1 text-xs text-gray-400 mt-0.5">
                      <MapPin size={11} className="shrink-0" />
                      <span className="truncate">{property.address}{property.stateName ? `, ${property.stateName}` : ''}</span>
                    </div>

                    <div className="flex items-center gap-4 mt-2 flex-wrap">
                      <span className="naira text-sm font-bold text-forest-900">{formatNaira(property.price, true)}</span>
                      {property.bedrooms > 0 && (
                        <span className="flex items-center gap-1 text-xs text-gray-500">
                          <Bed size={12} className="text-forest-600" /> {property.bedrooms}
                        </span>
                      )}
                      {property.bathrooms > 0 && (
                        <span className="flex items-center gap-1 text-xs text-gray-500">
                          <Bath size={12} className="text-forest-600" /> {property.bathrooms}
                        </span>
                      )}
                      {property.description && (
                        <span className="text-xs text-gray-400 line-clamp-1 hidden sm:block max-w-xs">{property.description}</span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  {tab === 'pending' && (
                    <div className="mt-3 flex items-center gap-2 flex-wrap">
                      {isRejecting ? (
                        <>
                          <input
                            type="text"
                            value={rejectReason}
                            onChange={(e) => setRejectReason(e.target.value)}
                            placeholder="Rejection reason (optional)"
                            className="flex-1 min-w-0 border border-red-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-300"
                            autoFocus
                            onKeyDown={(e) => { if (e.key === 'Enter') handleRejectConfirm(); if (e.key === 'Escape') handleRejectCancel(); }}
                          />
                          <button type="button" onClick={handleRejectCancel}
                            className="btn-secondary text-xs px-3 py-1.5 shrink-0">
                            Cancel
                          </button>
                          <button type="button" onClick={handleRejectConfirm}
                            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-medium transition-colors shrink-0">
                            <XCircle size={13} /> Confirm Reject
                          </button>
                        </>
                      ) : (
                        <>
                          <Link to={`/properties/${property.id}`}
                            className="btn-secondary text-xs px-3 py-1.5 flex items-center gap-1.5">
                            <Eye size={13} /> Preview
                          </Link>
                          <button type="button"
                            onClick={() => handleRejectStart(property.id)}
                            disabled={isApproving}
                            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 font-medium transition-colors disabled:opacity-40">
                            <XCircle size={13} /> Reject
                          </button>
                          <button type="button"
                            onClick={() => handleApprove(property.id)}
                            disabled={isApproving}
                            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-xl bg-forest-800 hover:bg-forest-700 text-white font-medium transition-colors disabled:opacity-40">
                            {isApproving
                              ? <><RefreshCw size={13} className="animate-spin" /> Approving…</>
                              : <><CheckCircle size={13} /> Approve & Publish</>
                            }
                          </button>
                        </>
                      )}
                    </div>
                  )}

                  {tab === 'rejected' && (
                    <div className="mt-3 flex items-center gap-2">
                      <Link to={`/properties/${property.id}`}
                        className="btn-secondary text-xs px-3 py-1.5 flex items-center gap-1.5">
                        <Eye size={13} /> Preview
                      </Link>
                      <button type="button"
                        onClick={() => handleApprove(property.id)}
                        disabled={isApproving}
                        className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-xl bg-forest-800 hover:bg-forest-700 text-white font-medium transition-colors disabled:opacity-40">
                        {isApproving
                          ? <><RefreshCw size={13} className="animate-spin" /> Approving…</>
                          : <><CheckCircle size={13} /> Approve anyway</>
                        }
                      </button>
                    </div>
                  )}

                </div>
              </div>
            </div>
          );
        })}
      </div>

    </div>
  );
}

// ── Subscription Page ─────────────────────────────────────────
const PLAN_META = {
  BASIC:     { color: 'blue',   icon: '🟦', label: 'Basic',     desc: 'Perfect for new agents' },
  STANDARD:  { color: 'green',  icon: '🟩', label: 'Standard',  desc: 'Growing your portfolio' },
  PREMIUM:   { color: 'purple', icon: '🟪', label: 'Premium',   desc: 'High-volume agents' },
  EXECUTIVE: { color: 'yellow', icon: '🌟', label: 'Executive', desc: 'Elite agents only' },
};

function SubscriptionPage() {
  const { user } = useAuth();
  const isAgent  = user?.role?.toUpperCase() === 'AGENT';
  const isSeller = user?.role?.toUpperCase() === 'SELLER';

  const [plans, setPlans]             = useState([]);
  const [mySubs, setMySubs]           = useState([]);
  const [myLoans, setMyLoans]         = useState([]);
  const [loanProgram, setLoanProgram] = useState(null);
  const [loading, setLoading]         = useState(true);
  const [subscribing, setSubscribing] = useState(null);
  const [repaying, setRepaying]       = useState(null);
  const [customAmount, setCustomAmount] = useState('');

  const load = useCallback(async () => {
    try {
      const calls = [
        subscriptionAPI.listPlans().catch(() => ({ data: [] })),
        subscriptionAPI.getMine().catch(() => ({ data: [] })),
        subscriptionAPI.getMyLoans().catch(() => ({ data: [] })),
      ];
      if (isAgent) calls.push(subscriptionAPI.getLoanProgram().catch(() => ({ data: null })));
      const [p, s, l, prog] = await Promise.all(calls);
      setPlans(p.data);
      setMySubs(s.data);
      setMyLoans(l.data);
      if (prog) setLoanProgram(prog.data);
    } finally {
      setLoading(false);
    }
  }, [isAgent]);

  useEffect(() => { load(); }, [load]);

  const activeSub    = mySubs.find((s) => s.status === 'ACTIVE');
  const activeLoan   = myLoans.find((l) => l.status === 'ACTIVE');
  const pendingLoans = myLoans.filter((l) => l.status === 'PENDING');
  const pendingSubs  = mySubs.filter((s) => s.status === 'PENDING_PAYMENT' && s.authorizationUrl);
  // Locked when any active product exists
  const hasActiveProduct = !!activeSub || !!activeLoan;

  const handleSubscribe = async (planName, useLoan = false) => {
    setSubscribing(planName + (useLoan ? '_loan' : ''));
    try {
      const payload = { plan: planName, useLoan };
      if (planName === 'EXECUTIVE' && user?.executiveAgent && customAmount) {
        payload.customAmount = parseFloat(customAmount);
      }
      const { data } = await subscriptionAPI.subscribe(payload);
      if (data.authorizationUrl) {
        // Standard subscription — redirect to Paystack
        window.location.href = data.authorizationUrl;
      } else {
        // Loan subscription — activated immediately, no payment step now
        toast.success(
          useLoan
            ? `${planName} loan subscription activated! Repay within 30 days to maintain full access.`
            : 'Subscription activated!'
        );
        load();
      }
    } catch (err) {
      const status = err.response?.status;
      // 503/502: gateway timed out. For loan path, backend may have activated already — just reload.
      // For standard path, recover by finding the pending sub with the Paystack URL.
      if (status === 503 || status === 502) {
        if (useLoan) {
          // Check if subscription was actually activated despite the timeout
          try {
            await load();
          } catch { /* ignore */ }
          toast('Network issue — please check your subscription status below', { icon: '⚠️' });
          return;
        }
        try {
          const { data: subs } = await subscriptionAPI.getMine();
          const pending = subs.find((s) =>
            s.status === 'PENDING_PAYMENT' &&
            s.plan === planName &&
            s.isLoan === false &&
            s.authorizationUrl
          );
          if (pending) {
            window.location.href = pending.authorizationUrl;
            return;
          }
        } catch { /* ignore — fall through to toast */ }
      }
      const msg = status === 409 ? err.response.data?.message || 'You already have an active plan'
                : status === 400 ? err.response.data?.message || 'Invalid request'
                : err.response?.data?.message || 'Subscription failed';
      toast.error(msg);
    } finally {
      setSubscribing(null);
    }
  };

  const handleRepay = async (loanId) => {
    setRepaying(loanId);
    try {
      const { data } = await subscriptionAPI.repayLoan(loanId);
      if (data.authorizationUrl) {
        window.location.href = data.authorizationUrl;
      } else {
        toast.error('Payment gateway did not return a URL — please try again');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Repayment failed');
    } finally {
      setRepaying(null);
    }
  };

  if (loading) return <div className="animate-pulse space-y-4">{[...Array(4)].map((_, i) => <div key={i} className="h-36 bg-gray-100 rounded-2xl" />)}</div>;

  // Loan-cycle level order for display
  const LOAN_LEVELS = ['BASIC', 'STANDARD', 'PREMIUM'];
  const LOAN_REQUIRED = { BASIC: 3, STANDARD: 4, PREMIUM: 6 };
  const LOAN_COMPLETED_KEY = { BASIC: 'basicTrialsCompleted', STANDARD: 'standardTrialsCompleted', PREMIUM: 'premiumTrialsCompleted' };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="font-display text-2xl font-bold text-forest-900">
          {isSeller ? 'Seller Subscription' : 'Agent Subscription & Loans'}
        </h2>
        <p className="text-gray-500 text-sm mt-1">
          {isSeller
            ? 'Subscribe to a plan to list properties'
            : 'Subscribe or use the interest-free loan program to list properties'}
        </p>
      </div>

      {/* Active product lock banner */}
      {hasActiveProduct && (
        <div className="card p-4 bg-amber-50 border border-amber-200 flex items-center gap-3 text-sm text-amber-800">
          <Lock size={16} className="shrink-0" />
          <span>
            You have an active {activeSub ? 'subscription' : 'loan'}. All other plans are locked until it expires or is repaid.
          </span>
        </div>
      )}

      {/* Active subscription banner */}
      {activeSub && (
        <div className="card p-5 bg-forest-50 border border-forest-200 flex items-center gap-4">
          <div className="w-12 h-12 bg-forest-800 rounded-xl flex items-center justify-center text-white shrink-0">
            <Crown size={22} />
          </div>
          <div className="flex-1">
            <p className="font-semibold text-forest-900">Active: {activeSub.plan} Plan</p>
            <p className="text-sm text-forest-700">
              {activeSub.endDate
                ? `Expires ${new Date(activeSub.endDate).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })}`
                : 'No expiry set'}
              {activeSub.loan && <span className="ml-3 text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full">Loan-funded</span>}
            </p>
          </div>
          <span className="text-xs bg-green-100 text-green-700 px-3 py-1 rounded-full font-semibold">ACTIVE</span>
        </div>
      )}

      {/* Active loan */}
      {activeLoan && (
        <div>
          <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2"><Landmark size={16} /> Active Loan</h3>
          <div className="card p-4 flex items-center justify-between gap-4">
            <div>
              <p className="font-medium text-gray-800">{activeLoan.plan} Plan Loan {activeLoan.trialNumber && <span className="text-xs text-gray-400">(Trial #{activeLoan.trialNumber})</span>}</p>
              <p className="text-xs text-gray-400">
                Borrowed: <span className="naira">{formatNaira(activeLoan.loanAmount)}</span>
                {' · '}Repaid: <span className="naira">{formatNaira(activeLoan.amountRepaid)}</span>
                {' · '}Due: {new Date(activeLoan.dueDate).toLocaleDateString('en-NG')}
              </p>
              {/* Repayment progress bar */}
              <div className="mt-2 w-48 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-forest-600 rounded-full"
                  style={{ width: `${Math.min(100, (activeLoan.amountRepaid / activeLoan.loanAmount) * 100)}%` }}
                />
              </div>
            </div>
            <button
              onClick={() => handleRepay(activeLoan.id)}
              disabled={repaying === activeLoan.id}
              className="btn-primary text-sm flex items-center gap-2 shrink-0"
            >
              {repaying === activeLoan.id ? <RefreshCw size={14} className="animate-spin" /> : <RotateCcw size={14} />}
              Repay Now
            </button>
          </div>
        </div>
      )}

      {/* Pending subscriptions (incomplete payment — Paystack never launched) */}
      {pendingSubs.length > 0 && (
        <div className="card p-4 bg-yellow-50 border border-yellow-200 text-sm text-yellow-800 flex items-start gap-2">
          <RefreshCw size={14} className="shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-medium">{pendingSubs.length} subscription payment{pendingSubs.length > 1 ? 's' : ''} incomplete — Paystack may not have launched.</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {pendingSubs.map((s) => (
                <a key={s.id} href={s.authorizationUrl}
                  className="inline-flex items-center gap-1 text-xs font-semibold bg-yellow-800 text-yellow-50 px-3 py-1.5 rounded-full hover:bg-yellow-900">
                  Resume {s.plan}{s.isLoan ? ' (Loan)' : ''} →
                </a>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Pending loans (awaiting payment) */}
      {pendingLoans.length > 0 && (
        <div className="card p-4 bg-yellow-50 border border-yellow-200 text-sm text-yellow-800 flex items-center gap-2">
          <RefreshCw size={14} className="shrink-0" />
          {pendingLoans.length} loan payment{pendingLoans.length > 1 ? 's' : ''} pending Paystack confirmation.
        </div>
      )}

      {/* 13-Trial loan cycle progress (agents only) */}
      {isAgent && loanProgram && (
        <div className="card p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-gray-800 flex items-center gap-2"><Landmark size={16} /> Loan Program Progress</h3>
            <span className={`text-xs px-2 py-1 rounded-full font-bold ${loanProgram.programStatus === 'COMPLETED' ? 'bg-green-100 text-green-700' : 'bg-blue-50 text-blue-700'}`}>
              {loanProgram.totalTrialsCompleted}/13 Trials
            </span>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {LOAN_LEVELS.map((level) => {
              const completed = loanProgram[LOAN_COMPLETED_KEY[level]] || 0;
              const required  = LOAN_REQUIRED[level];
              const isCurrent = loanProgram.currentLevel === level;
              const isDone    = completed >= required;
              return (
                <div key={level} className={`rounded-xl p-3 text-center border ${isCurrent ? 'border-forest-400 bg-forest-50' : isDone ? 'border-green-200 bg-green-50' : 'border-gray-100 bg-gray-50'}`}>
                  <p className={`text-xs font-bold uppercase ${isCurrent ? 'text-forest-800' : isDone ? 'text-green-700' : 'text-gray-400'}`}>{level}</p>
                  <p className="text-2xl font-bold mt-1 text-gray-800">{completed}<span className="text-sm text-gray-400">/{required}</span></p>
                  <p className="text-xs text-gray-400 mt-0.5">{isDone ? '✓ Complete' : isCurrent ? `${required - completed} left` : 'Locked'}</p>
                </div>
              );
            })}
          </div>
          {loanProgram.programStatus === 'COMPLETED' && (
            <p className="text-sm text-center text-green-700 font-medium">🎉 You have completed all 13 loan trials! Contact support to apply for a new cycle.</p>
          )}
          {loanProgram.currentLevel !== 'COMPLETED' && loanProgram.eligiblePlan && (
            <p className="text-xs text-gray-500 text-center">Next eligible loan: <strong>{loanProgram.eligiblePlan}</strong> plan · {loanProgram.trialsRemainingInLevel} trial{loanProgram.trialsRemainingInLevel !== 1 ? 's' : ''} remaining in current level</p>
          )}
        </div>
      )}

      {/* Plan cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        {plans.map((plan) => {
          const meta     = PLAN_META[plan.name] || {};
          const isCurrent = activeSub?.plan === plan.name && activeSub?.status === 'ACTIVE';
          const isExec   = plan.name === 'EXECUTIVE';
          const locked   = hasActiveProduct && !isCurrent;
          const busy     = (key) => subscribing === key;

          // Loan eligibility: agent only, must be at the right loan level
          const loanAllowed = isAgent && plan.loanEligible && !hasActiveProduct
            && (!loanProgram || loanProgram.eligiblePlan === plan.name);

          return (
            <div key={plan.name} className={`card p-6 flex flex-col gap-5 ${isCurrent ? 'ring-2 ring-forest-800' : locked ? 'opacity-50' : ''}`}>
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-2xl">{meta.icon}</span>
                  <h3 className="font-display text-xl font-bold text-gray-800 mt-1">{meta.label}</h3>
                  <p className="text-xs text-gray-400">{meta.desc}</p>
                </div>
                {isCurrent && <span className="text-xs bg-forest-100 text-forest-800 px-2 py-1 rounded-full font-bold">Current</span>}
                {locked && !isCurrent && <span className="text-xs bg-gray-100 text-gray-400 px-2 py-1 rounded-full"><Lock size={10} className="inline" /> Locked</span>}
              </div>

              <div>
                <p className="naira text-2xl font-bold text-forest-900">
                  {isExec && user?.executiveAgent ? 'Custom ≥ ₦10,000' : formatNaira(plan.monthlyFee)}
                </p>
                <p className="text-xs text-gray-400">per month · {plan.maxListings} listings max</p>
              </div>

              <ul className="text-sm text-gray-600 space-y-1.5">
                <li className="flex items-center gap-2"><CheckCircle size={13} className="text-green-500 shrink-0" /> Up to <strong>{plan.maxListings}</strong> active listings</li>
                {isAgent && (
                  <li className="flex items-center gap-2">
                    {plan.loanEligible
                      ? <><Unlock size={13} className="text-blue-500 shrink-0" /> Interest-free loan available</>
                      : <><Lock size={13} className="text-gray-300 shrink-0" /><span className="text-gray-300">No loan option</span></>
                    }
                  </li>
                )}
                {isExec && <li className="flex items-center gap-2"><Star size={13} className="text-yellow-500 shrink-0" /> Requires 1,000+ reputation &amp; no negative reviews</li>}
              </ul>

              {isExec && user?.executiveAgent && (
                <input
                  type="number"
                  min="10000"
                  step="1000"
                  value={customAmount}
                  onChange={(e) => setCustomAmount(e.target.value)}
                  placeholder="Enter amount (min ₦10,000)"
                  className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-forest-300"
                />
              )}

              <div className="flex flex-col gap-2 mt-auto">
                <button
                  onClick={() => handleSubscribe(plan.name, false)}
                  disabled={isCurrent || locked || !!subscribing}
                  className={`btn-primary text-sm flex items-center justify-center gap-2 ${(isCurrent || locked) ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {busy(plan.name) ? <RefreshCw size={14} className="animate-spin" /> : <ArrowUpRight size={14} />}
                  {isCurrent ? 'Current Plan' : locked ? 'Locked' : 'Subscribe & Pay'}
                </button>
                {loanAllowed && (
                  <button
                    onClick={() => handleSubscribe(plan.name, true)}
                    disabled={!!subscribing}
                    className="btn-secondary text-sm flex items-center justify-center gap-2"
                  >
                    {busy(plan.name + '_loan') ? <RefreshCw size={14} className="animate-spin" /> : <Landmark size={14} />}
                    Get Interest-Free Loan
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* History */}
      {mySubs.length > 0 && (
        <div>
          <h3 className="font-semibold text-gray-800 mb-3">Subscription History</h3>
          <div className="card divide-y divide-gray-50">
            {mySubs.map((s) => (
              <div key={s.id} className="flex items-center justify-between px-5 py-3">
                <div>
                  <p className="text-sm font-medium text-gray-800">{s.plan} Plan {s.loan && <span className="text-xs text-orange-500">(Loan)</span>}</p>
                  <p className="text-xs text-gray-400">{timeAgo(s.createdAt)}</p>
                </div>
                <div className="text-right">
                  <p className="naira text-sm font-bold">{formatNaira(s.amountPaid)}</p>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    s.status === 'ACTIVE'          ? 'bg-green-50 text-green-700'   :
                    s.status === 'EXPIRED'         ? 'bg-gray-100 text-gray-500'    :
                    s.status === 'CANCELLED'       ? 'bg-red-50 text-red-600'       :
                    s.status === 'FAILED'          ? 'bg-red-50 text-red-600'       :
                    s.status === 'PENDING_PAYMENT' ? 'bg-yellow-50 text-yellow-700' :
                    'bg-gray-50 text-gray-500'
                  }`}>
                    {s.status === 'PENDING_PAYMENT' ? 'Awaiting Payment'
                      : s.status === 'FAILED' ? 'Transaction Cancelled'
                      : s.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Reservations Page ─────────────────────────────────────────
function ReservationCard({ r }) {
  const daysRemaining = r.expiresAt
    ? Math.max(0, Math.ceil((new Date(r.expiresAt) - Date.now()) / 86_400_000))
    : null;

  // Lifecycle countdown for COMPLETED reservations (RENT / SHORTLET)
  const lifecycleMs   = r.lifecycle?.endTime ? (new Date(r.lifecycle.endTime) - Date.now()) : 0;
  const lifecycleDays  = Math.max(0, Math.ceil(lifecycleMs / 86_400_000));
  const lifecycleHours = Math.max(0, Math.ceil(lifecycleMs / 3_600_000));
  const lifecycleExpired = r.lifecycle?.endTime ? lifecycleMs <= 0 : false;
  const lifecycleLabel = lifecycleExpired
    ? 'Occupancy ended'
    : lifecycleDays < 1
      ? `${lifecycleHours}h remaining`
      : `${lifecycleDays} day${lifecycleDays !== 1 ? 's' : ''} remaining`;

  const statusStyle = {
    ACTIVE:          'bg-green-50 text-green-700',
    PENDING_PAYMENT: 'bg-yellow-50 text-yellow-700',
    COMPLETED:       'bg-blue-50 text-blue-700',
    EXPIRED:         'bg-gray-100 text-gray-500',
  }[r.status] ?? 'bg-gray-100 text-gray-500';

  return (
    <div className="card overflow-hidden">
      <div className="flex flex-col sm:flex-row">
        {r.primaryImageUrl ? (
          <img
            src={r.primaryImageUrl}
            alt={r.propertyTitle || 'Property'}
            className="w-full sm:w-40 h-36 sm:h-auto object-cover shrink-0"
          />
        ) : (
          <div className="w-full sm:w-40 h-36 sm:h-auto bg-gray-100 flex items-center justify-center shrink-0">
            <Building2 size={32} className="text-gray-300" />
          </div>
        )}

        <div className="flex-1 p-4 flex flex-col gap-2">
          <div className="flex items-start justify-between gap-2 flex-wrap">
            <div>
              <h3 className="font-display font-semibold text-gray-900 text-sm leading-tight">
                {r.propertyTitle || `Property #${r.propertyId}`}
              </h3>
              {r.propertyAddress && (
                <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                  <MapPin size={11} /> {r.propertyAddress}
                </p>
              )}
            </div>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${statusStyle}`}>
              {r.status.replace('_', ' ')}
            </span>
          </div>

          {r.propertyPrice != null && (
            <p className="naira text-sm font-bold text-forest-900">
              {formatNaira(r.propertyPrice)}
              {r.propertyListingType === 'RENT' && (
                <span className="text-xs font-normal text-gray-400"> /yr</span>
              )}
            </p>
          )}

          {r.status === 'ACTIVE' && daysRemaining !== null && (
            <div className={`flex items-center gap-1 text-xs font-medium ${daysRemaining <= 1 ? 'text-red-600' : 'text-amber-600'}`}>
              <Clock size={12} />
              {daysRemaining === 0 ? 'Expires today!' : `${daysRemaining} day${daysRemaining !== 1 ? 's' : ''} remaining`}
            </div>
          )}

          {r.status === 'ACTIVE' && r.ownerName && (
            <div className="flex items-center gap-3 mt-1 flex-wrap">
              <p className="text-xs text-gray-600">
                <span className="font-medium">Contact: </span>{r.ownerName}
              </p>
              {r.ownerPhone && (
                <a
                  href={`tel:${r.ownerPhone}`}
                  className="flex items-center gap-1 text-xs bg-forest-50 text-forest-800 hover:bg-forest-100 px-2 py-1 rounded-lg font-medium transition-colors"
                >
                  <Phone size={11} /> Call
                </a>
              )}
            </div>
          )}

          {r.status === 'COMPLETED' && r.lifecycle && (
            <div className="flex items-center gap-1 text-xs font-medium text-blue-700 mt-1">
              <Clock size={12} />
              {r.lifecycle.type === 'PURCHASE'
                ? 'Ownership transferred'
                : r.lifecycle.endTime
                  ? `${r.lifecycle.type === 'SHORTLET' ? 'Shortlet' : 'Rental'}: ${lifecycleLabel}`
                  : 'Transaction complete'}
            </div>
          )}

          <div className="flex items-center gap-3 mt-auto pt-1 flex-wrap">
            <Link
              to={`/properties/${r.propertyId}`}
              className="text-xs text-forest-800 hover:underline flex items-center gap-1"
            >
              View Property <ArrowUpRight size={11} />
            </Link>
            {r.status === 'ACTIVE' && r.propertyAddress && (
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(r.propertyAddress)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-xs bg-blue-50 text-blue-700 hover:bg-blue-100 px-2 py-1 rounded-lg font-medium transition-colors"
              >
                <MapPin size={11} /> View on Map
              </a>
            )}
            {r.status === 'PENDING_PAYMENT' && r.authorizationUrl && (
              <a
                href={r.authorizationUrl}
                className="text-xs text-amber-700 hover:underline flex items-center gap-1"
              >
                Complete Payment <ArrowUpRight size={11} />
              </a>
            )}
            <span className="text-xs text-gray-300 ml-auto">
              {r.paymentReference?.slice(0, 20)}
            </span>
            {r.createdAt && (
              <span className="text-xs text-gray-400 ml-auto">{timeAgo(r.createdAt)}</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function ReservationsPage() {
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading]           = useState(true);
  const [page, setPage]                 = useState(1);

  useEffect(() => {
    reservationAPI.getMine()
      .then((r) => setReservations(r.data))
      .catch(() => toast.error('Failed to load reservations'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="space-y-4">
      {[...Array(3)].map((_, i) => <div key={i} className="h-36 bg-gray-100 rounded-2xl animate-pulse" />)}
    </div>
  );

  const paginated = reservations.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div>
      <h2 className="font-display text-2xl font-bold text-forest-900 mb-6">My Reservations</h2>
      {reservations.length === 0 ? (
        <div className="text-center py-16 card">
          <CalendarCheck size={40} className="mx-auto mb-4 text-gray-300" />
          <p className="text-gray-400 mb-3">No reservations yet</p>
          <Link to="/properties" className="btn-primary">Browse Properties</Link>
        </div>
      ) : (
        <div className="space-y-4">
          {paginated.map((r) => <ReservationCard key={r.id} r={r} />)}
          <Pagination page={page} total={reservations.length} onChange={setPage} />
        </div>
      )}
    </div>
  );
}

// ── Reputation Page ───────────────────────────────────────────
function ReputationPage() {
  const { user } = useAuth();
  const [rep, setRep]       = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) return;
    reputationAPI.getAgentReputation(user.id)
      .then((r) => setRep(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user?.id]);

  if (loading) return <div className="animate-pulse space-y-4"><div className="h-40 bg-gray-100 rounded-2xl" /><div className="h-60 bg-gray-100 rounded-2xl" /></div>;

  const score = rep?.reputationScore ?? 0;
  const isExec = rep?.executiveAgent;
  const events = rep?.recentEvents ?? [];
  const EXEC_THRESHOLD = 1000;
  const progress = Math.min((score / EXEC_THRESHOLD) * 100, 100);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-2xl font-bold text-forest-900">My Reputation</h2>
        <p className="text-gray-500 text-sm mt-1">Your reputation score is built from customer feedback and successful transactions</p>
      </div>

      {/* Score card */}
      <div className={`card p-6 flex flex-col sm:flex-row items-center gap-6 ${isExec ? 'bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200' : ''}`}>
        <div className="w-24 h-24 rounded-full flex items-center justify-center shrink-0 shadow-inner" style={{
          background: isExec ? 'linear-gradient(135deg,#f59e0b,#ef4444)' : '#f0fdf4',
        }}>
          <span className="text-3xl font-bold text-white" style={{ color: isExec ? 'white' : '#166534' }}>{score}</span>
        </div>
        <div className="flex-1 text-center sm:text-left">
          <h3 className="font-display text-xl font-bold text-gray-800 flex items-center gap-2 justify-center sm:justify-start">
            {isExec && <Crown size={18} className="text-yellow-500" />}
            {isExec ? 'Executive Agent' : 'Reputation Score'}
          </h3>
          <p className="text-gray-500 text-sm mt-1">
            {isExec ? 'You have reached Executive Agent status. You can subscribe with a custom contribution.' :
             `${EXEC_THRESHOLD - score} more points to Executive Agent status`}
          </p>
          {!isExec && (
            <div className="mt-3">
              <div className="flex justify-between text-xs text-gray-400 mb-1">
                <span>Progress to Executive</span>
                <span>{Math.round(progress)}%</span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-forest-800 rounded-full transition-all" style={{ width: `${progress}%` }} />
              </div>
            </div>
          )}
        </div>
        <div className="grid grid-cols-2 gap-3 shrink-0">
          <div className="text-center">
            <p className="text-xl font-bold text-gray-800">{rep?.positiveCount ?? 0}</p>
            <p className="text-xs text-green-600 flex items-center justify-center gap-1"><CheckCircle size={10} /> Positive</p>
          </div>
          <div className="text-center">
            <p className="text-xl font-bold text-gray-800">{rep?.negativeCount ?? 0}</p>
            <p className="text-xs text-red-500 flex items-center justify-center gap-1"><XCircle size={10} /> Negative</p>
          </div>
        </div>
      </div>

      {/* Recent events */}
      {events.length > 0 && (
        <div>
          <h3 className="font-semibold text-gray-800 mb-3">Recent Reputation Events</h3>
          <div className="card divide-y divide-gray-50">
            {events.map((e, i) => (
              <div key={i} className="flex items-start justify-between px-5 py-3 gap-4">
                <div className="flex items-start gap-3">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${e.negative ? 'bg-red-50' : 'bg-green-50'}`}>
                    {e.negative ? <XCircle size={14} className="text-red-500" /> : <CheckCircle size={14} className="text-green-500" />}
                  </div>
                  <div>
                    <p className="text-sm text-gray-700">{e.comment || (e.source === 'SYSTEM_VALIDATION' ? 'System validation event' : 'Customer feedback')}</p>
                    <p className="text-xs text-gray-400">{e.source?.replace('_', ' ')} · {timeAgo(e.createdAt)}</p>
                  </div>
                </div>
                <span className={`text-sm font-bold shrink-0 ${e.negative ? 'text-red-500' : 'text-green-600'}`}>
                  {e.negative ? '-' : '+'}{e.points}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {events.length === 0 && (
        <div className="text-center py-12 card">
          <Star size={36} className="mx-auto mb-3 text-gray-200" />
          <p className="text-gray-400 text-sm">No reputation events yet. Complete transactions to build your score.</p>
        </div>
      )}
    </div>
  );
}

// ── Main dashboard shell ────────────────────────────────────────
export default function DashboardPage() {
  const { user, logout, isSeller, isAdmin, isAgent } = useAuth();
  const navigate = useNavigate();

  const navItems = [
    { to: '/dashboard',               label: 'Overview',       icon: LayoutDashboard, end: true },
    { to: '/dashboard/listings',      label: 'My Listings',    icon: Home },
    { to: '/dashboard/list',          label: 'Add Property',   icon: PlusSquare,  sellerOnly: true },
    { to: '/dashboard/moderation',    label: 'Moderation',     icon: ShieldCheck, adminOnly: true },
    { to: '/dashboard/payments',      label: 'Payments',       icon: CreditCard },
    { to: '/dashboard/commissions',   label: 'Commissions',    icon: Landmark,    agentAdminOrSeller: true },
    { to: '/dashboard/reservations',  label: 'Reservations',   icon: CalendarCheck },
    { to: '/dashboard/subscription',  label: 'Subscription',   icon: Crown,       agentOrSeller: true },
    { to: '/dashboard/reputation',    label: 'Reputation',     icon: BadgeCheck,  agentOnly: true },
    { to: '/dashboard/messages',      label: 'Messages',       icon: MessageSquare },
    { to: '/dashboard/account',       label: 'Account',        icon: Wallet },
    { to: '/dashboard/settings',      label: 'Settings',       icon: Settings },
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
            {navItems.map(({ to, label, icon: Icon, end, sellerOnly, adminOnly, agentOnly, agentOrSeller, agentAdminOrSeller }) => {
              if (sellerOnly && !isSeller) return null;
              if (adminOnly && !isAdmin) return null;
              if (agentOnly && !isAgent) return null;
              if (agentOrSeller && !isAgent && !isSeller) return null;
              if (agentAdminOrSeller && !isAgent && !isAdmin && !isSeller) return null;
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
          {/* Mobile nav tabs */}
          <div className="lg:hidden flex gap-1 overflow-x-auto pb-2 mb-4 scrollbar-none">
            {navItems.map(({ to, label, icon: Icon, end, sellerOnly, adminOnly, agentOnly, agentOrSeller, agentAdminOrSeller }) => {
              if (sellerOnly && !isSeller) return null;
              if (adminOnly && !isAdmin) return null;
              if (agentOnly && !isAgent) return null;
              if (agentOrSeller && !isAgent && !isSeller) return null;
              if (agentAdminOrSeller && !isAgent && !isAdmin && !isSeller) return null;
              return (
                <NavLink key={to} to={to} end={end}
                  className={({ isActive }) =>
                    `flex items-center gap-1.5 whitespace-nowrap px-3 py-2 rounded-xl text-xs font-medium shrink-0 transition-colors ${
                      isActive ? 'bg-forest-800 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`
                  }>
                  <Icon size={14} /> {label}
                </NavLink>
              );
            })}
          </div>
          <Routes>
            <Route index               element={<DashboardHome />} />
            <Route path="listings"     element={<MyListings />} />
            <Route path="list"         element={<ListPropertyPage />} />
            <Route path="moderation"   element={<ModerationPage />} />
            <Route path="payments"     element={<PaymentsPage />} />
            <Route path="commissions"  element={<CommissionsPage />} />
            <Route path="reservations" element={<ReservationsPage />} />
            <Route path="subscription" element={<SubscriptionPage />} />
            <Route path="reputation"   element={<ReputationPage />} />
            <Route path="messages"     element={<MessagesPage />} />
            <Route path="account"      element={<AccountPage />} />
            <Route path="settings"     element={<SettingsPage />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}

function PaymentsPage() {
  const { isAdmin } = useAuth();
  const [items, setItems]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage]     = useState(1);

  useEffect(() => {
    const loanFetch = isAdmin
      ? subscriptionAPI.getAllLoans().catch(() => ({ data: [] }))
      : subscriptionAPI.getMyLoans().catch(() => ({ data: [] }));
    const txnFetch = isAdmin
      ? transactionAPI.getAll().catch(() => ({ data: [] }))
      : transactionAPI.getMine().catch(() => ({ data: [] }));
    const rsvFetch = isAdmin
      ? reservationAPI.getAll().catch(() => ({ data: [] }))
      : reservationAPI.getMine().catch(() => ({ data: [] }));

    Promise.all([txnFetch, rsvFetch, loanFetch]).then(([txnRes, rsvRes, loanRes]) => {
      const txns = (txnRes.data || []).map((t) => ({
        id: `TXN-${t.id}`,
        label: t.type,
        sub: t.propertyId ? `Property #${t.propertyId}` : '',
        amount: t.totalAmount,
        status: t.status,
        reference: t.reference,
        date: t.createdAt,
      }));

      const rsv = (rsvRes.data || [])
        .filter((r) => r.paidAt != null)
        .map((r) => ({
          id: `RSV-${r.id}`,
          label: 'RESERVATION FEE',
          sub: r.propertyTitle || `Property #${r.propertyId}`,
          amount: 1000,
          status: 'SUCCESS',
          reference: r.paymentReference,
          date: r.paidAt,
        }));

      const loans = (loanRes.data || [])
        .filter((l) => l.repaymentStatus === 'SUCCESS')
        .map((l) => ({
          id: `LOAN-${l.id}`,
          label: `LOAN REPAYMENT — ${l.plan} Plan`,
          sub: `Trial #${l.trialNumber} of 13`,
          amount: l.loanAmount,
          status: 'SUCCESS',
          reference: l.repaymentReference || `REP-${l.id}`,
          date: l.createdAt,
        }));

      const all = [...txns, ...rsv, ...loans].sort((a, b) => new Date(b.date) - new Date(a.date));
      setItems(all);
      setPage(1);
    }).finally(() => setLoading(false));
  }, [isAdmin]);

  if (loading) return (
    <div className="space-y-3">
      {[...Array(4)].map((_, i) => <div key={i} className="h-16 bg-gray-100 rounded-2xl animate-pulse" />)}
    </div>
  );

  const paginated = items.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div>
      <h2 className="font-display text-2xl font-bold text-forest-900 mb-6">
        {isAdmin ? 'All Payments' : 'My Payments'}
      </h2>
      {items.length === 0 ? (
        <div className="text-center py-16 card"><p className="text-gray-400">No transactions yet</p></div>
      ) : (
        <div>
          <div className="card divide-y divide-gray-50">
            {paginated.map((t) => (
              <div key={t.id} className="flex items-center justify-between px-5 py-4">
                <div>
                  <p className="text-sm font-medium text-gray-800">
                    {t.label}{t.sub ? ` — ${t.sub}` : ''}
                  </p>
                  <p className="text-xs text-gray-400">{t.reference} · {timeAgo(t.date)}</p>
                </div>
                <div className="text-right">
                  <p className="naira text-sm font-bold">{formatNaira(t.amount)}</p>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    t.status === 'SUCCESS' ? 'bg-green-50 text-green-700' :
                    t.status === 'FAILED'  ? 'bg-red-50 text-red-700'    :
                    'bg-yellow-50 text-yellow-700'
                  }`}>{t.status}</span>
                </div>
              </div>
            ))}
          </div>
          <Pagination page={page} total={items.length} onChange={setPage} />
        </div>
      )}
    </div>
  );
}

function CommissionsPage() {
  const { isAdmin, isAgent } = useAuth();
  const [commissions, setCommissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  useEffect(() => {
    const fetch = isAdmin ? commissionAPI.getAll() : commissionAPI.getMine();
    fetch
      .then((r) => { setCommissions(r.data || []); setPage(1); })
      .catch(() => toast.error('Failed to load commissions'))
      .finally(() => setLoading(false));
  }, [isAdmin]);

  if (loading) return <div className="animate-pulse space-y-3">{[...Array(4)].map((_, i) => <div key={i} className="h-20 bg-gray-100 rounded-xl" />)}</div>;

  // Totals
  const totalAgentCommission    = commissions.reduce((s, c) => s + Number(c.agentCommission    || 0), 0);
  const totalCorecityCommission = commissions.reduce((s, c) => s + Number(c.corecityCommission || 0), 0);
  const totalValue              = commissions.reduce((s, c) => s + Number(c.propertyValue      || 0), 0);

  const paginated = commissions.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div className="space-y-6">
      <h2 className="font-display text-2xl font-bold text-forest-900">
        {isAdmin ? 'All Commissions' : 'My Commissions'}
      </h2>

      {/* Summary cards */}
      <div className={`grid gap-4 ${isAdmin ? 'grid-cols-1 sm:grid-cols-3' : 'grid-cols-1 sm:grid-cols-2'}`}>
        <div className="card p-5">
          <p className="text-xs text-gray-500 mb-1">Total Property Value</p>
          <p className="text-xl font-bold text-gray-800 naira">{formatNaira(totalValue)}</p>
        </div>
        {isAdmin && (
          <div className="card p-5 border-l-4 border-forest-700">
            <p className="text-xs text-gray-500 mb-1">CoreCity Earnings (3%)</p>
            <p className="text-xl font-bold text-forest-800 naira">{formatNaira(totalCorecityCommission)}</p>
          </div>
        )}
        <div className="card p-5 border-l-4 border-blue-400">
          <p className="text-xs text-gray-500 mb-1">{isAdmin ? 'Agent Earnings (7%)' : 'My Commission (7%)'}</p>
          <p className="text-xl font-bold text-blue-700 naira">{formatNaira(totalAgentCommission)}</p>
        </div>
      </div>

      {/* Commission rows */}
      {commissions.length === 0 ? (
        <div className="text-center py-16 card">
          <Landmark size={36} className="mx-auto mb-3 text-gray-200" />
          <p className="text-gray-400">No commissions yet. Commissions are generated when a property payment is completed.</p>
        </div>
      ) : (
        <div className="space-y-0">
          <div className="card divide-y divide-gray-50">
            {paginated.map((c) => (
              <div key={c.id} className="px-5 py-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-800">Property #{c.propertyId}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      Transaction #{c.transactionId}
                      {isAdmin && ` · Agent #${c.agentId}`}
                      {' · '}{timeAgo(c.createdAt)}
                    </p>
                    <div className="flex flex-wrap gap-3 mt-2 text-xs text-gray-500">
                      <span>Property value: <span className="font-medium text-gray-700 naira">{formatNaira(c.propertyValue)}</span></span>
                      {isAdmin && <span>CoreCity (3%): <span className="font-medium text-forest-700 naira">{formatNaira(c.corecityCommission)}</span></span>}
                      <span>{isAdmin ? 'Agent (7%)' : 'My share (7%)'}: <span className="font-medium text-blue-700 naira">{formatNaira(c.agentCommission)}</span></span>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="naira text-base font-bold text-gray-800">
                      {formatNaira(isAdmin ? c.corecityCommission : c.agentCommission)}
                    </p>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      c.status === 'DISBURSED' ? 'bg-green-50 text-green-700' : 'bg-yellow-50 text-yellow-700'
                    }`}>{c.status}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <Pagination page={page} total={commissions.length} onChange={setPage} />
        </div>
      )}
    </div>
  );
}

function MessagesPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';

  // ── Shared inbox state ───────────────────────────────────────
  const [notifications, setNotifications] = useState([]);
  const [loadingNotifs, setLoadingNotifs]  = useState(true);

  const loadNotifications = async () => {
    setLoadingNotifs(true);
    try {
      const res = await notificationAPI.getAll();
      setNotifications(res.data ?? []);
    } catch (_) {}
    finally { setLoadingNotifs(false); }
  };

  useEffect(() => { loadNotifications(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleMarkRead = async (id) => {
    await notificationAPI.markRead(id).catch(() => {});
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };

  const handleMarkAllRead = async () => {
    await notificationAPI.markAllRead().catch(() => {});
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  // ── Admin compose state ──────────────────────────────────────
  const [targetType, setTargetType] = useState('ALL'); // ALL | ROLE | USER
  const [targetRole, setTargetRole]   = useState('AGENT');
  // Autocomplete state for individual user
  const [userQuery, setUserQuery]         = useState('');
  const [userResults, setUserResults]     = useState([]);
  const [selectedUser, setSelectedUser]   = useState(null); // {id, email, firstName, lastName, role}
  const [userSearching, setUserSearching] = useState(false);
  const userSearchRef = useRef(null);
  const userDebounceRef = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e) => { if (!userSearchRef.current?.contains(e.target)) setUserResults([]); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleUserQuery = (val) => {
    setUserQuery(val);
    setSelectedUser(null);
    clearTimeout(userDebounceRef.current);
    if (val.trim().length < 2) { setUserResults([]); return; }
    userDebounceRef.current = setTimeout(async () => {
      setUserSearching(true);
      try {
        const res = await adminAPI.searchUsers(val.trim());
        setUserResults(res.data ?? []);
      } catch (_) { setUserResults([]); }
      finally { setUserSearching(false); }
    }, 300);
  };

  const handleSelectUser = (u) => {
    setSelectedUser(u);
    setUserQuery(`${u.firstName} ${u.lastName} <${u.email}>`);
    setUserResults([]);
  };
  const [notifTitle, setNotifTitle]   = useState('');
  const [notifBody, setNotifBody]     = useState('');
  const [notifType, setNotifType]     = useState('INFO');
  const [sending, setSending]         = useState(false);
  const [sentMsg, setSentMsg]         = useState('');

  const handleAdminSend = async (e) => {
    e.preventDefault();
    if (!notifTitle.trim() || !notifBody.trim()) return;
    setSending(true);
    setSentMsg('');
    try {
      const payload = {
        title: notifTitle.trim(),
        body:  notifBody.trim(),
        type:  notifType,
      };
      if (targetType === 'USER') {
        if (!selectedUser) { setSentMsg('Error: please select a user from the list'); setSending(false); return; }
        payload.userId = selectedUser.id;
      } else if (targetType === 'ROLE') {
        payload.role = targetRole;
      } else {
        payload.role = 'ALL';
      }
      const res = await notificationAPI.adminSend(payload);
      setSentMsg(`Sent to ${res.data?.sent ?? '?'} user(s).`);
      setNotifTitle('');
      setNotifBody('');
    } catch (err) {
      setSentMsg('Error: ' + (err.response?.data?.message ?? 'Failed to send'));
    } finally { setSending(false); }
  };

  const TYPE_BADGE = { INFO: 'bg-blue-100 text-blue-700', SUCCESS: 'bg-green-100 text-green-700', ALERT: 'bg-red-100 text-red-600' };

  const unread = notifications.filter(n => !n.read).length;

  return (
    <div className="space-y-6">
      <h2 className="font-display text-2xl font-bold text-forest-900">
        {isAdmin ? 'Messages & Notifications' : 'My Notifications'}
      </h2>

      {/* ── Admin compose panel ── */}
      {isAdmin && (
        <div className="card p-6">
          <h3 className="font-semibold text-gray-800 mb-4">Send Notification</h3>
          <form onSubmit={handleAdminSend} className="space-y-4">
            {/* Target */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Target</label>
                <select
                  value={targetType}
                  onChange={e => setTargetType(e.target.value)}
                  className="input-field w-full"
                >
                  <option value="ALL">All Users</option>
                  <option value="ROLE">By Role</option>
                  <option value="USER">Individual User</option>
                </select>
              </div>
              {targetType === 'ROLE' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                  <select value={targetRole} onChange={e => setTargetRole(e.target.value)} className="input-field w-full">
                    <option value="AGENT">Agents</option>
                    <option value="SELLER">Sellers</option>
                    <option value="BUYER">Buyers</option>
                  </select>
                </div>
              )}
              {targetType === 'USER' && (
                <div className="relative" ref={userSearchRef}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Search User</label>
                  <input
                    type="text"
                    value={userQuery}
                    onChange={e => handleUserQuery(e.target.value)}
                    placeholder="Type name or email…"
                    className="input-field w-full"
                    autoComplete="off"
                  />
                  {/* Dropdown */}
                  {(userResults.length > 0 || userSearching) && (
                    <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lift max-h-56 overflow-y-auto">
                      {userSearching && <p className="px-4 py-3 text-sm text-gray-400">Searching…</p>}
                      {!userSearching && userResults.length === 0 && (
                        <p className="px-4 py-3 text-sm text-gray-400">No users found</p>
                      )}
                      {userResults.map(u => (
                        <button
                          key={u.id}
                          type="button"
                          onMouseDown={() => handleSelectUser(u)}
                          className="w-full text-left px-4 py-2.5 hover:bg-forest-50 transition-colors"
                        >
                          <p className="text-sm font-medium text-gray-800">{u.firstName} {u.lastName}</p>
                          <p className="text-xs text-gray-500">{u.email} · <span className="capitalize">{u.role?.toLowerCase()}</span></p>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Title + Type */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                <input
                  type="text"
                  value={notifTitle}
                  onChange={e => setNotifTitle(e.target.value)}
                  placeholder="Notification title"
                  className="input-field w-full"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                <select value={notifType} onChange={e => setNotifType(e.target.value)} className="input-field w-full">
                  <option value="INFO">Info</option>
                  <option value="SUCCESS">Success</option>
                  <option value="ALERT">Alert</option>
                </select>
              </div>
            </div>

            {/* Body */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Message</label>
              <textarea
                value={notifBody}
                onChange={e => setNotifBody(e.target.value)}
                rows={3}
                placeholder="Notification body…"
                className="input-field w-full resize-none"
                required
              />
            </div>

            <div className="flex items-center gap-4">
              <button type="submit" disabled={sending} className="btn-primary px-6">
                {sending ? 'Sending…' : 'Send Notification'}
              </button>
              {sentMsg && (
                <span className={`text-sm font-medium ${sentMsg.startsWith('Error') ? 'text-red-600' : 'text-green-700'}`}>
                  {sentMsg}
                </span>
              )}
            </div>
          </form>
        </div>
      )}

      {/* ── Inbox ── */}
      <div className="card p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-800">
            Inbox {unread > 0 && <span className="ml-2 px-2 py-0.5 bg-clay-500 text-white text-xs rounded-full">{unread} unread</span>}
          </h3>
          {unread > 0 && (
            <button onClick={handleMarkAllRead} className="text-sm text-forest-700 hover:underline">
              Mark all read
            </button>
          )}
        </div>

        {loadingNotifs ? (
          <div className="text-center py-12 text-gray-400">Loading…</div>
        ) : notifications.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-400">No notifications yet</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {notifications.map(n => (
              <button
                key={n.id}
                onClick={() => !n.read && handleMarkRead(n.id)}
                className={`w-full text-left px-2 py-4 hover:bg-gray-50 transition-colors rounded-lg ${!n.read ? 'bg-forest-50/40' : ''}`}
              >
                <div className="flex items-start gap-3">
                  <span className={`mt-0.5 px-2 py-0.5 rounded text-[10px] font-semibold uppercase shrink-0 ${TYPE_BADGE[n.type] ?? TYPE_BADGE.INFO}`}>
                    {n.type}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm ${!n.read ? 'font-semibold text-gray-900' : 'text-gray-700'}`}>{n.title}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{n.body}</p>
                    <p className="text-[10px] text-gray-400 mt-1">
                      {formatDateTime(n.createdAt)}
                    </p>
                  </div>
                  {!n.read && <span className="w-2 h-2 bg-clay-500 rounded-full shrink-0 mt-2" />}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Account Page — Bank Accounts + Wallet
// ─────────────────────────────────────────────────────────────────────────────
function AccountPage() {
  const { user } = useAuth();

  // ── Bank Accounts ─────────────────────────────────────────────────────────
  const [accounts, setAccounts]           = useState([]);
  const [acctLoading, setAcctLoading]     = useState(true);
  const [showAddForm, setShowAddForm]     = useState(false);
  const [bankName, setBankName]           = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [accountName, setAccountName]     = useState('');
  const [acctSaving, setAcctSaving]       = useState(false);

  // ── Wallet ────────────────────────────────────────────────────────────────
  const [wallet, setWallet]               = useState(null);
  const [walletLoading, setWalletLoading] = useState(true);
  const [txHistory, setTxHistory]         = useState([]);
  const [txLoading, setTxLoading]         = useState(true);
  const [fundAmount, setFundAmount]       = useState('');
  const [fundLoading, setFundLoading]     = useState(false);
  const [showFundModal, setShowFundModal] = useState(false);

  const loadAccounts = useCallback(async () => {
    try {
      setAcctLoading(true);
      const { data } = await bankAccountAPI.getAll();
      setAccounts(data);
    } catch {
      toast.error('Could not load bank accounts');
    } finally {
      setAcctLoading(false);
    }
  }, []);

  const loadWallet = useCallback(async () => {
    try {
      setWalletLoading(true);
      const { data } = await walletAPI.getBalance();
      setWallet(data);
    } catch {
      toast.error('Could not load wallet');
    } finally {
      setWalletLoading(false);
    }
  }, []);

  const loadTxHistory = useCallback(async () => {
    try {
      setTxLoading(true);
      const { data } = await walletAPI.getHistory();
      setTxHistory(data);
    } catch {
      /* silent */
    } finally {
      setTxLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAccounts();
    loadWallet();
    loadTxHistory();
  }, [loadAccounts, loadWallet, loadTxHistory]);

  const handleAddAccount = async (e) => {
    e.preventDefault();
    if (!bankName.trim() || !accountNumber.trim() || !accountName.trim()) {
      toast.error('All fields are required');
      return;
    }
    if (!/^\d{10}$/.test(accountNumber)) {
      toast.error('Account number must be exactly 10 digits');
      return;
    }
    try {
      setAcctSaving(true);
      await bankAccountAPI.add({ bankName, accountNumber, accountName });
      toast.success('Bank account added');
      setBankName(''); setAccountNumber(''); setAccountName('');
      setShowAddForm(false);
      loadAccounts();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to add account');
    } finally {
      setAcctSaving(false);
    }
  };

  const handleSetPrimary = async (id) => {
    try {
      await bankAccountAPI.setPrimary(id);
      toast.success('Primary account updated');
      loadAccounts();
    } catch {
      toast.error('Could not update primary account');
    }
  };

  const handleDeleteAccount = async (id) => {
    if (!window.confirm('Delete this bank account?')) return;
    try {
      await bankAccountAPI.remove(id);
      toast.success('Account removed');
      loadAccounts();
    } catch {
      toast.error('Could not delete account');
    }
  };

  const handleFundWallet = async (e) => {
    e.preventDefault();
    const amount = parseFloat(fundAmount);
    if (!fundAmount || isNaN(amount) || amount < 100) {
      toast.error('Minimum top-up is ₦100');
      return;
    }
    try {
      setFundLoading(true);
      const { data } = await walletAPI.fund({ amount });
      if (!data?.authorizationUrl) {
        toast.error('Payment gateway did not return a valid URL. Please try again.');
        return;
      }
      // Open Paystack in a new tab so the user can return to the dashboard
      const win = window.open(data.authorizationUrl, '_blank', 'noopener,noreferrer');
      if (!win) {
        toast.error('Pop-up blocked. Please allow pop-ups for this site and try again.');
      } else {
        toast.success('Paystack payment page opened in a new tab');
        setShowFundModal(false);
        setFundAmount('');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not initiate wallet top-up');
    } finally {
      setFundLoading(false);
    }
  };

  const NIGERIAN_BANKS = [
    'Access Bank', 'First Bank', 'GTBank', 'Zenith Bank', 'UBA',
    'Stanbic IBTC', 'Sterling Bank', 'Union Bank', 'Fidelity Bank', 'FCMB',
    'Wema Bank', 'Heritage Bank', 'Keystone Bank', 'Polaris Bank', 'SunTrust Bank',
    'Providus Bank', 'Coronation Bank', 'Titan Trust Bank', 'Kuda Bank',
    'Moniepoint', 'Opay', 'PalmPay', 'VFD Microfinance Bank',
  ];

  return (
    <div className="space-y-8 page-enter">
      {/* ── Bank Accounts ──────────────────────────────────────────────────── */}
      <div className="card p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="font-display text-lg font-bold text-forest-900 flex items-center gap-2">
              <Banknote size={20} className="text-forest-700" /> Bank Accounts
            </h3>
            <p className="text-sm text-gray-500 mt-0.5">Manage your bank accounts for withdrawals</p>
          </div>
          <button
            onClick={() => setShowAddForm((v) => !v)}
            className="btn-secondary flex items-center gap-2 text-sm">
            <PlusCircle size={16} /> {showAddForm ? 'Cancel' : 'Add Account'}
          </button>
        </div>

        {/* Add form */}
        {showAddForm && (
          <form onSubmit={handleAddAccount} className="bg-forest-50 rounded-xl p-5 mb-5 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Bank Name *</label>
              <select value={bankName} onChange={(e) => setBankName(e.target.value)} className="input-field">
                <option value="">Select bank</option>
                {NIGERIAN_BANKS.map((b) => <option key={b} value={b}>{b}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Account Number *</label>
                <input
                  type="text" maxLength={10} value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value.replace(/\D/g, ''))}
                  placeholder="10-digit NUBAN" className="input-field" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Account Name *</label>
                <input
                  type="text" value={accountName}
                  onChange={(e) => setAccountName(e.target.value)}
                  placeholder="As on bank record" className="input-field" />
              </div>
            </div>
            <button type="submit" disabled={acctSaving} className="btn-primary">
              {acctSaving ? 'Saving…' : 'Save Account'}
            </button>
          </form>
        )}

        {/* Account list */}
        {acctLoading ? (
          <div className="flex items-center justify-center py-8 text-gray-400">
            <RefreshCw size={20} className="animate-spin mr-2" /> Loading…
          </div>
        ) : accounts.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <Banknote size={32} className="mx-auto mb-2 opacity-40" />
            <p className="text-sm">No bank accounts yet. Add one above.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {accounts.map((acct) => (
              <div key={acct.id} className={`flex items-center justify-between p-4 rounded-xl border ${
                acct.primary ? 'border-forest-300 bg-forest-50' : 'border-gray-100 bg-white'
              }`}>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-gray-800 text-sm">{acct.bankName}</span>
                    {acct.primary && (
                      <span className="text-xs bg-forest-700 text-white px-2 py-0.5 rounded-full">Primary</span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">{acct.accountName} &middot; ••••{acct.accountNumber?.slice(-4)}</p>
                </div>
                <div className="flex items-center gap-2">
                  {!acct.primary && (
                    <button
                      onClick={() => handleSetPrimary(acct.id)}
                      className="text-xs text-forest-700 border border-forest-300 px-2 py-1 rounded-lg hover:bg-forest-50">
                      Set Primary
                    </button>
                  )}
                  <button
                    onClick={() => handleDeleteAccount(acct.id)}
                    className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg">
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Wallet ─────────────────────────────────────────────────────────── */}
      <div className="card p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="font-display text-lg font-bold text-forest-900 flex items-center gap-2">
              <Wallet size={20} className="text-forest-700" /> Wallet
            </h3>
            <p className="text-sm text-gray-500 mt-0.5">Fund and use your CoreCity wallet for faster payments</p>
          </div>
          <button
            onClick={() => setShowFundModal((v) => !v)}
            className="btn-primary flex items-center gap-2 text-sm">
            <PlusCircle size={16} /> Top Up
          </button>
        </div>

        {/* Balance */}
        {walletLoading ? (
          <div className="flex items-center text-gray-400 py-4">
            <RefreshCw size={18} className="animate-spin mr-2" /> Loading…
          </div>
        ) : (
          <div className="bg-forest-800 text-white rounded-2xl p-6 mb-6">
            <p className="text-forest-200 text-sm mb-1">Available Balance</p>
            <p className="text-3xl font-bold font-display">
              ₦{wallet?.balance != null ? Number(wallet.balance).toLocaleString('en-NG', { minimumFractionDigits: 2 }) : '0.00'}
            </p>
            <p className="text-forest-300 text-xs mt-1">{wallet?.currency ?? 'NGN'}</p>
          </div>
        )}

        {/* Fund modal */}
        {showFundModal && (
          <form onSubmit={handleFundWallet} className="bg-forest-50 rounded-xl p-5 mb-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Amount (₦) *</label>
              <input
                type="number" min="100" step="100"
                value={fundAmount} onChange={(e) => setFundAmount(e.target.value)}
                placeholder="e.g. 5000" className="input-field" />
              <p className="text-xs text-gray-400 mt-1">Minimum ₦100. You will be redirected to Paystack to complete payment.</p>
            </div>
            <div className="flex gap-3">
              <button type="button" onClick={() => setShowFundModal(false)} className="btn-secondary flex-1">Cancel</button>
              <button type="submit" disabled={fundLoading} className="btn-primary flex-1">
                {fundLoading ? 'Redirecting…' : 'Proceed to Payment'}
              </button>
            </div>
          </form>
        )}

        {/* Transaction history */}
        <div>
          <h4 className="text-sm font-semibold text-gray-700 mb-3">Transaction History</h4>
          {txLoading ? (
            <div className="flex items-center text-gray-400 py-4">
              <RefreshCw size={18} className="animate-spin mr-2" /> Loading…
            </div>
          ) : txHistory.length === 0 ? (
            <p className="text-sm text-gray-400 py-4 text-center">No wallet transactions yet.</p>
          ) : (
            <div className="space-y-2">
              {txHistory.map((tx) => (
                <div key={tx.id} className="flex items-center justify-between py-3 border-b border-gray-50 last:border-0">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      tx.type === 'CREDIT' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'
                    }`}>
                      {tx.type === 'CREDIT' ? <ArrowUpRight size={14} /> : <ArrowUpRight size={14} className="rotate-180" />}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-800">{tx.description || (tx.type === 'CREDIT' ? 'Wallet Top-up' : 'Debit')}</p>
                      <p className="text-xs text-gray-400">{tx.createdAt ? new Date(tx.createdAt).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' }) : ''}</p>
                    </div>
                  </div>
                  <div className="text-right flex flex-col items-end gap-1">
                    <p className={`text-sm font-semibold ${tx.type === 'CREDIT' ? 'text-green-700' : 'text-red-600'}`}>
                      {tx.type === 'CREDIT' ? '+' : '-'}₦{Number(tx.amount).toLocaleString('en-NG', { minimumFractionDigits: 2 })}
                    </p>
                    <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                      tx.status === 'SUCCESSFUL' ? 'bg-green-100 text-green-700' :
                      tx.status === 'PENDING'    ? 'bg-yellow-100 text-yellow-700' :
                      'bg-red-100 text-red-600'
                    }`}>{tx.status}</span>
                    {tx.status === 'PENDING' && tx.type === 'CREDIT' && (
                      <div className="flex gap-3 mt-1">
                        <button
                          type="button"
                          onClick={async (e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            try {
                              const { data } = await walletAPI.resume(tx.reference);
                              const win = window.open(data.authorizationUrl, '_blank', 'noopener,noreferrer');
                              if (!win) {
                                toast.error('Pop-up blocked. Please allow pop-ups for this site and try again.');
                              }
                            } catch (err) {
                              toast.error(err.response?.data?.message || 'Could not resume payment');
                            }
                          }}
                          className="text-xs text-forest-700 underline hover:text-forest-900">
                          Resume Payment
                        </button>
                        <button
                          type="button"
                          onClick={async (e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            try {
                              const { data } = await walletAPI.verify(tx.reference);
                              toast.success(data.message);
                              // Reload wallet data to reflect updated balance
                              const [walletRes, historyRes] = await Promise.all([
                                walletAPI.getBalance(),
                                walletAPI.getHistory(),
                              ]);
                              setWallet(walletRes.data);
                              setTxHistory(historyRes.data);
                            } catch (err) {
                              toast.error(err.response?.data?.message || 'Could not verify payment');
                            }
                          }}
                          className="text-xs text-blue-600 underline hover:text-blue-800">
                          Verify Payment
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Settings Page
// ─────────────────────────────────────────────────────────────────────────────
function SettingsPage() {
  const { user, updateUser, isAdmin, isAgent, isSeller } = useAuth();

  // ── Profile form ───────────────────────────────────────────────────────────
  const [firstName, setFirstName]         = useState(user?.firstName ?? '');
  const [lastName, setLastName]           = useState(user?.lastName ?? '');
  const [savingProfile, setSavingProfile] = useState(false);

  // ── Password form ──────────────────────────────────────────────────────────
  const [currentPwd, setCurrentPwd]   = useState('');
  const [newPwd, setNewPwd]           = useState('');
  const [confirmPwd, setConfirmPwd]   = useState('');
  const [savingPwd, setSavingPwd]     = useState(false);
  const [showPwdForm, setShowPwdForm] = useState(false);

  // ── Identity verification form ────────────────────────────────────────────
  const [nin, setNin]                   = useState('');
  const [bvn, setBvn]                   = useState('');
  const [savingId, setSavingId]         = useState(false);
  const [showIdForm, setShowIdForm]     = useState(false);
  // local verified state mirrors user.verified so the badge updates instantly
  const [localVerified, setLocalVerified] = useState(user?.verified ?? false);
  const [localNinSet, setLocalNinSet]     = useState(user?.ninSet ?? false);
  const [localBvnSet, setLocalBvnSet]     = useState(user?.bvnSet ?? false);

  const handleProfileSave = async (e) => {
    e.preventDefault();
    if (!firstName.trim() || !lastName.trim()) { toast.error('Name cannot be empty'); return; }
    setSavingProfile(true);
    try {
      const { data } = await authAPI.updateMe({ firstName: firstName.trim(), lastName: lastName.trim() });
      updateUser(data);
      toast.success('Profile updated');
    } catch {
      toast.error('Failed to update profile');
    } finally {
      setSavingProfile(false);
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    if (newPwd.length < 8) { toast.error('New password must be at least 8 characters'); return; }
    if (newPwd !== confirmPwd) { toast.error('Passwords do not match'); return; }
    setSavingPwd(true);
    try {
      await authAPI.changePassword({ currentPassword: currentPwd, newPassword: newPwd });
      toast.success('Password changed successfully');
      setCurrentPwd(''); setNewPwd(''); setConfirmPwd('');
      setShowPwdForm(false);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Incorrect current password');
    } finally {
      setSavingPwd(false);
    }
  };

  const ROLE_STYLE = {
    ADMIN:  'bg-red-100 text-red-800',
    AGENT:  'bg-blue-100 text-blue-800',
    SELLER: 'bg-amber-100 text-amber-800',
    BUYER:  'bg-green-100 text-green-800',
  };

  const initials     = `${user?.firstName?.[0] ?? ''}${user?.lastName?.[0] ?? ''}`.toUpperCase();
  const memberSince  = user?.createdAt
    ? new Date(user.createdAt).toLocaleDateString('en-NG', { month: 'long', year: 'numeric' })
    : null;

  return (
    <div className="space-y-6 max-w-2xl">
      <h2 className="font-display text-2xl font-bold text-forest-900">Settings</h2>

      {/* ── Profile card ─────────────────────────────────────────────────── */}
      <div className="card p-6 flex items-center gap-4">
        <div className="w-16 h-16 rounded-full bg-forest-800 flex items-center justify-center text-white text-xl font-bold shrink-0 overflow-hidden">
          {user?.avatarUrl
            ? <img src={user.avatarUrl} alt="avatar" className="w-16 h-16 object-cover" />
            : initials}
        </div>
        <div>
          <p className="font-display font-bold text-lg text-gray-900">{user?.firstName} {user?.lastName}</p>
          <p className="text-sm text-gray-500">{user?.email}</p>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ROLE_STYLE[user?.role?.toUpperCase()] ?? 'bg-gray-100 text-gray-600'}`}>
              {user?.role}
            </span>
            {localVerified
              ? <span className="text-xs text-green-600 flex items-center gap-1"><CheckCircle size={11} /> Verified</span>
              : <span className="text-xs text-amber-600 flex items-center gap-1"><Clock size={11} /> Unverified</span>
            }
            {memberSince && <span className="text-xs text-gray-400">Member since {memberSince}</span>}
          </div>
        </div>
      </div>

      {/* ── Edit profile ─────────────────────────────────────────────────── */}
      <div className="card p-6 space-y-4">
        <h3 className="font-semibold text-gray-800 flex items-center gap-2"><User size={16} /> Profile Information</h3>
        <form onSubmit={handleProfileSave} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
              <input
                value={firstName}
                onChange={e => setFirstName(e.target.value)}
                className="input-field w-full"
                placeholder="First name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
              <input
                value={lastName}
                onChange={e => setLastName(e.target.value)}
                className="input-field w-full"
                placeholder="Last name"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                value={user?.email ?? ''}
                readOnly
                className="input-field w-full bg-gray-50 text-gray-500 cursor-not-allowed"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
              <input
                value={user?.phone ?? ''}
                readOnly
                className="input-field w-full bg-gray-50 text-gray-500 cursor-not-allowed"
              />
            </div>
          </div>
          <div className="flex justify-end">
            <button type="submit" disabled={savingProfile} className="btn-primary flex items-center gap-2">
              {savingProfile
                ? <><RefreshCw size={14} className="animate-spin" /> Saving…</>
                : <><Save size={14} /> Save Changes</>}
            </button>
          </div>
        </form>
      </div>

      {/* ── Change password ───────────────────────────────────────────────── */}
      <div className="card p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-gray-800 flex items-center gap-2"><Lock size={16} /> Security</h3>
          <button
            type="button"
            onClick={() => setShowPwdForm(v => !v)}
            className="text-sm text-forest-800 hover:underline"
          >
            {showPwdForm ? 'Cancel' : 'Change Password'}
          </button>
        </div>

        {!showPwdForm && (
          <p className="text-sm text-gray-500">Your password is managed securely. Click "Change Password" to update it.</p>
        )}

        {showPwdForm && (
          <form onSubmit={handlePasswordChange} className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Current Password</label>
              <input
                type="password"
                value={currentPwd}
                onChange={e => setCurrentPwd(e.target.value)}
                className="input-field w-full"
                placeholder="Enter current password"
                autoComplete="current-password"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
              <input
                type="password"
                value={newPwd}
                onChange={e => setNewPwd(e.target.value)}
                className="input-field w-full"
                placeholder="Minimum 8 characters"
                autoComplete="new-password"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Confirm New Password</label>
              <input
                type="password"
                value={confirmPwd}
                onChange={e => setConfirmPwd(e.target.value)}
                className="input-field w-full"
                placeholder="Repeat new password"
                autoComplete="new-password"
              />
            </div>
            {newPwd && confirmPwd && newPwd !== confirmPwd && (
              <p className="text-xs text-red-500 flex items-center gap-1"><XCircle size={12} /> Passwords do not match</p>
            )}
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={savingPwd || !currentPwd || !newPwd || !confirmPwd}
                className="btn-primary flex items-center gap-2"
              >
                {savingPwd
                  ? <><RefreshCw size={14} className="animate-spin" /> Updating…</>
                  : <><Lock size={14} /> Update Password</>}
              </button>
            </div>
          </form>
        )}
      </div>

      {/* ── Identity Verification ────────────────────────────────────────── */}
      <div className="card p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-gray-800 flex items-center gap-2">
            <BadgeCheck size={16} /> Identity Verification
          </h3>
          {localVerified
            ? <span className="text-xs text-green-600 font-semibold flex items-center gap-1"><CheckCircle size={13} /> Verified</span>
            : (
              <button
                type="button"
                onClick={() => setShowIdForm(v => !v)}
                className="text-sm text-forest-800 hover:underline"
              >
                {showIdForm ? 'Cancel' : 'Verify Now'}
              </button>
            )
          }
        </div>

        {/* Status badges */}
        <div className="flex gap-3 flex-wrap">
          <span className={`text-xs px-2 py-1 rounded-full flex items-center gap-1 ${
            localNinSet ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
          }`}>
            {localNinSet ? <CheckCircle size={11} /> : <Clock size={11} />}
            NIN {localNinSet ? 'submitted' : 'not submitted'}
          </span>
          <span className={`text-xs px-2 py-1 rounded-full flex items-center gap-1 ${
            localBvnSet ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
          }`}>
            {localBvnSet ? <CheckCircle size={11} /> : <Clock size={11} />}
            BVN {localBvnSet ? 'submitted' : 'not submitted'}
          </span>
        </div>

        {localVerified && (
          <p className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-4 py-2 flex items-center gap-2">
            <ShieldCheck size={15} /> Your identity has been verified. Your account is fully trusted.
          </p>
        )}

        {!localVerified && !showIdForm && (
          <p className="text-sm text-gray-500">
            Submit your NIN and BVN to verify your identity. Both are required for full verification.
            Your data is encrypted and never shared.
          </p>
        )}

        {!localVerified && showIdForm && (
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              if (!nin.trim() && !bvn.trim()) { toast.error('Enter at least NIN or BVN'); return; }
              if (nin.trim() && !/^\d{11}$/.test(nin.trim())) { toast.error('NIN must be exactly 11 digits'); return; }
              if (bvn.trim() && !/^\d{11}$/.test(bvn.trim())) { toast.error('BVN must be exactly 11 digits'); return; }
              setSavingId(true);
              try {
                const payload = {};
                if (nin.trim()) payload.nin = nin.trim();
                if (bvn.trim()) payload.bvn = bvn.trim();
                const { data } = await authAPI.verifyIdentity(payload);
                updateUser(data);
                setLocalNinSet(data.ninSet);
                setLocalBvnSet(data.bvnSet);
                setLocalVerified(data.verified);
                setNin(''); setBvn('');
                if (data.verified) {
                  toast.success('Identity verified! Your account is now fully trusted.');
                  setShowIdForm(false);
                } else {
                  toast.success('Details saved. Submit the remaining field to complete verification.');
                }
              } catch (err) {
                toast.error(err.response?.data?.message || 'Verification failed. Please check your details.');
              } finally {
                setSavingId(false);
              }
            }}
            className="space-y-3"
          >
            {!localNinSet && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">NIN (National Identification Number)</label>
                <input
                  value={nin}
                  onChange={e => setNin(e.target.value.replace(/\D/g, '').slice(0, 11))}
                  className="input-field w-full font-mono tracking-widest"
                  placeholder="11-digit NIN"
                  maxLength={11}
                  inputMode="numeric"
                />
              </div>
            )}
            {!localBvnSet && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">BVN (Bank Verification Number)</label>
                <input
                  value={bvn}
                  onChange={e => setBvn(e.target.value.replace(/\D/g, '').slice(0, 11))}
                  className="input-field w-full font-mono tracking-widest"
                  placeholder="11-digit BVN"
                  maxLength={11}
                  inputMode="numeric"
                />
              </div>
            )}
            <p className="text-xs text-gray-400 flex items-start gap-1">
              <Lock size={11} className="mt-0.5 shrink-0" />
              Your NIN and BVN are encrypted with AES-256 and never shared with third parties.
            </p>
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={savingId}
                className="btn-primary flex items-center gap-2"
              >
                {savingId
                  ? <><RefreshCw size={14} className="animate-spin" /> Submitting…</>
                  : <><ShieldCheck size={14} /> Submit for Verification</>}
              </button>
            </div>
          </form>
        )}
      </div>

      {/* ── Agent status ──────────────────────────────────────────────────── */}
      {isAgent && (
        <div className="card p-6 space-y-4">
          <h3 className="font-semibold text-gray-800 flex items-center gap-2"><Star size={16} /> Agent Status</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-forest-50 rounded-xl p-4 text-center">
              <p className="text-3xl font-bold text-forest-800">{user?.reputationScore ?? 0}</p>
              <p className="text-xs text-forest-600 mt-1">Reputation Score</p>
            </div>
            <div className={`rounded-xl p-4 text-center flex flex-col items-center justify-center gap-1 ${user?.executiveAgent ? 'bg-gradient-to-br from-yellow-50 to-orange-50 border border-yellow-200' : 'bg-gray-50'}`}>
              <Crown size={22} className={user?.executiveAgent ? 'text-yellow-500' : 'text-gray-300'} />
              <p className={`text-xs font-semibold ${user?.executiveAgent ? 'text-yellow-700' : 'text-gray-400'}`}>
                {user?.executiveAgent ? 'Executive Agent' : 'Standard Agent'}
              </p>
            </div>
          </div>
          <div className="flex gap-4 flex-wrap pt-1">
            <Link to="/dashboard/reputation" className="text-sm text-forest-800 hover:underline flex items-center gap-1">
              Reputation History <ArrowUpRight size={13} />
            </Link>
            <Link to="/dashboard/commissions" className="text-sm text-forest-800 hover:underline flex items-center gap-1">
              My Commissions <ArrowUpRight size={13} />
            </Link>
            <Link to="/dashboard/subscription" className="text-sm text-forest-800 hover:underline flex items-center gap-1">
              Manage Subscription <ArrowUpRight size={13} />
            </Link>
          </div>
        </div>
      )}

      {/* ── Seller quick links (non-agent sellers only) ───────────────────── */}
      {isSeller && !isAgent && (
        <div className="card p-6 space-y-3">
          <h3 className="font-semibold text-gray-800 flex items-center gap-2"><Home size={16} /> Seller Quick Access</h3>
          <div className="flex gap-4 flex-wrap">
            <Link to="/dashboard/listings" className="text-sm text-forest-800 hover:underline flex items-center gap-1">
              My Listings <ArrowUpRight size={13} />
            </Link>
            <Link to="/dashboard/payments" className="text-sm text-forest-800 hover:underline flex items-center gap-1">
              Payments <ArrowUpRight size={13} />
            </Link>
            <Link to="/dashboard/subscription" className="text-sm text-forest-800 hover:underline flex items-center gap-1">
              Subscription <ArrowUpRight size={13} />
            </Link>
          </div>
        </div>
      )}

      {/* ── Admin quick access ────────────────────────────────────────────── */}
      {isAdmin && (
        <div className="card p-6 space-y-4">
          <h3 className="font-semibold text-gray-800 flex items-center gap-2"><ShieldCheck size={16} /> Admin Quick Access</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {[
              { label: 'Moderation',      to: '/dashboard/moderation',   icon: ShieldCheck },
              { label: 'All Payments',    to: '/dashboard/payments',     icon: CreditCard },
              { label: 'Commissions',     to: '/dashboard/commissions',  icon: Landmark },
              { label: 'Reservations',    to: '/dashboard/reservations', icon: CalendarCheck },
              { label: 'Notifications',   to: '/dashboard/messages',     icon: Bell },
              { label: 'Subscription Plans', to: '/dashboard/subscription', icon: Crown },
            ].map(({ label, to, icon: Icon }) => (
              <Link
                key={label}
                to={to}
                className="flex items-center gap-2 p-3 rounded-xl bg-gray-50 hover:bg-forest-50 text-sm text-gray-700 hover:text-forest-800 transition-colors"
              >
                <Icon size={15} /> {label}
              </Link>
            ))}
          </div>
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
