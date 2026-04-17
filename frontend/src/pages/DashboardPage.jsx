import React, { useState, useEffect, useCallback } from 'react';
import { Link, Routes, Route, NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Home, PlusSquare, CreditCard, Bell, Settings,
  TrendingUp, Eye, MessageSquare, Star, ChevronRight, LogOut,
  CheckCircle, XCircle, Clock, RefreshCw, Search, Filter,
  Bed, Bath, MapPin, Building2, AlertCircle, ShieldCheck,
  Crown, BookMarked, BadgeCheck, Landmark, Zap, ArrowUpRight,
  CalendarCheck, Lock, Unlock, RotateCcw,
} from 'lucide-react';
import { propertyAPI, transactionAPI, subscriptionAPI, reservationAPI, reputationAPI, commissionAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import PropertyCard from '../components/property/PropertyCard';
import ListPropertyPage from './ListPropertyPage';
import { formatNaira, timeAgo, listingLabel, listingBadgeClass, propertyTypeLabel } from '../utils/nigeria';
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

  const activeSub   = mySubs.find((s) => s.status === 'ACTIVE');
  const activeLoan  = myLoans.find((l) => l.status === 'ACTIVE');
  const pendingLoans = myLoans.filter((l) => l.status === 'PENDING');
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
        window.location.href = data.authorizationUrl;
      } else {
        toast.success('Subscription activated!');
        load();
      }
    } catch (err) {
      const status = err.response?.status;
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
      const { data } = await subscriptionAPI.repayLoan(loanId, {});
      if (data.authorizationUrl) {
        window.location.href = data.authorizationUrl;
      } else {
        toast.success('Loan repayment initiated');
        load();
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
  const [loading, setLoading]     = useState(true);
  const [subscribing, setSubscribing] = useState(null);
  const [repaying, setRepaying]   = useState(null);
  const [customAmount, setCustomAmount] = useState('');

  const load = useCallback(async () => {
    try {
      const [p, s, l] = await Promise.all([
        subscriptionAPI.listPlans().catch(() => ({ data: [] })),
        subscriptionAPI.getMine().catch(() => ({ data: [] })),
        subscriptionAPI.getMyLoans().catch(() => ({ data: [] })),
      ]);
      setPlans(p.data);
      setMySubs(s.data);
      setMyLoans(l.data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const activeSub = mySubs.find((s) => s.status === 'ACTIVE');
  const activeLoans = myLoans.filter((l) => l.status === 'ACTIVE');

  const handleSubscribe = async (planName, useLoan = false) => {
    setSubscribing(planName + (useLoan ? '_loan' : ''));
    try {
      const payload = { plan: planName, useLoan };
      if (planName === 'EXECUTIVE' && user?.executiveAgent && customAmount) {
        payload.customAmount = parseFloat(customAmount);
      }
      const { data } = await subscriptionAPI.subscribe(payload);
      if (data.authorizationUrl) {
        window.location.href = data.authorizationUrl;
      } else {
        toast.success('Subscription activated!');
        load();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Subscription failed');
    } finally {
      setSubscribing(null);
    }
  };

  const handleRepay = async (loanId) => {
    setRepaying(loanId);
    try {
      const { data } = await subscriptionAPI.repayLoan(loanId, {});
      if (data.authorizationUrl) {
        window.location.href = data.authorizationUrl;
      } else {
        toast.success('Loan repayment initiated');
        load();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Repayment failed');
    } finally {
      setRepaying(null);
    }
  };

  if (loading) return <div className="animate-pulse space-y-4">{[...Array(4)].map((_, i) => <div key={i} className="h-36 bg-gray-100 rounded-2xl" />)}</div>;

  return (
    <div className="space-y-8">
      <div>
        <h2 className="font-display text-2xl font-bold text-forest-900">Agent Subscription</h2>
        <p className="text-gray-500 text-sm mt-1">Subscribe to a plan to list properties and grow your business</p>
      </div>

      {/* Active subscription banner */}
      {activeSub && (
        <div className="card p-5 bg-forest-50 border border-forest-200 flex items-center gap-4">
          <div className="w-12 h-12 bg-forest-800 rounded-xl flex items-center justify-center text-white shrink-0">
            <Crown size={22} />
          </div>
          <div className="flex-1">
            <p className="font-semibold text-forest-900">Active: {activeSub.plan} Plan</p>
            <p className="text-sm text-forest-700">
              {activeSub.endDate ? `Renews ${new Date(activeSub.endDate).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })}` : 'No expiry set'}
              {activeSub.loan && <span className="ml-3 text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full">Loan-funded</span>}
            </p>
          </div>
          <span className="text-xs bg-green-100 text-green-700 px-3 py-1 rounded-full font-semibold">ACTIVE</span>
        </div>
      )}

      {/* Active loans */}
      {activeLoans.length > 0 && (
        <div>
          <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2"><Landmark size={16} /> Outstanding Loans</h3>
          <div className="space-y-3">
            {activeLoans.map((loan) => (
              <div key={loan.id} className="card p-4 flex items-center justify-between gap-4">
                <div>
                  <p className="font-medium text-gray-800">{loan.plan} Plan Loan</p>
                  <p className="text-xs text-gray-400">
                    Borrowed: <span className="naira">{formatNaira(loan.loanAmount)}</span>
                    {' · '}Repaid: <span className="naira">{formatNaira(loan.amountRepaid)}</span>
                    {' · '}Due: {new Date(loan.dueDate).toLocaleDateString('en-NG')}
                  </p>
                </div>
                <button
                  onClick={() => handleRepay(loan.id)}
                  disabled={repaying === loan.id}
                  className="btn-primary text-sm flex items-center gap-2 shrink-0"
                >
                  {repaying === loan.id ? <RefreshCw size={14} className="animate-spin" /> : <RotateCcw size={14} />}
                  Repay Now
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Plan cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        {plans.map((plan) => {
          const meta = PLAN_META[plan.name] || {};
          const isCurrent = activeSub?.plan === plan.name && activeSub?.status === 'ACTIVE';
          const isExec = plan.name === 'EXECUTIVE';
          const busy = (key) => subscribing === key;

          return (
            <div key={plan.name} className={`card p-6 flex flex-col gap-5 ${isCurrent ? 'ring-2 ring-forest-800' : ''}`}>
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-2xl">{meta.icon}</span>
                  <h3 className="font-display text-xl font-bold text-gray-800 mt-1">{meta.label}</h3>
                  <p className="text-xs text-gray-400">{meta.desc}</p>
                </div>
                {isCurrent && <span className="text-xs bg-forest-100 text-forest-800 px-2 py-1 rounded-full font-bold">Current</span>}
              </div>

              <div>
                <p className="naira text-2xl font-bold text-forest-900">
                  {isExec && user?.executiveAgent ? 'Custom ≥ ₦10,000' : formatNaira(plan.monthlyFee)}
                </p>
                <p className="text-xs text-gray-400">per month</p>
              </div>

              <ul className="text-sm text-gray-600 space-y-1.5">
                <li className="flex items-center gap-2"><CheckCircle size={13} className="text-green-500 shrink-0" /> Up to <strong>{plan.maxListings}</strong> active listings</li>
                <li className="flex items-center gap-2">
                  {plan.loanEligible
                    ? <><Unlock size={13} className="text-blue-500 shrink-0" /> Interest-free loan available</>
                    : <><Lock size={13} className="text-gray-300 shrink-0" /><span className="text-gray-300">No loan option</span></>
                  }
                </li>
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
                  disabled={isCurrent || !!subscribing}
                  className={`btn-primary text-sm flex items-center justify-center gap-2 ${isCurrent ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {busy(plan.name) ? <RefreshCw size={14} className="animate-spin" /> : <ArrowUpRight size={14} />}
                  {isCurrent ? 'Current Plan' : 'Subscribe & Pay'}
                </button>
                {plan.loanEligible && !isCurrent && (
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
                    s.status === 'ACTIVE'   ? 'bg-green-50 text-green-700' :
                    s.status === 'EXPIRED'  ? 'bg-gray-100 text-gray-500'  :
                    s.status === 'CANCELLED'? 'bg-red-50 text-red-600'     :
                    'bg-yellow-50 text-yellow-700'
                  }`}>{s.status}</span>
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
function ReservationsPage() {
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading]           = useState(true);

  useEffect(() => {
    reservationAPI.getMine()
      .then((r) => setReservations(r.data))
      .catch(() => toast.error('Failed to load reservations'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="animate-pulse space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="h-24 bg-gray-100 rounded-2xl" />)}</div>;

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
        <div className="card divide-y divide-gray-50">
          {reservations.map((r) => (
            <div key={r.id} className="flex items-center justify-between px-5 py-4">
              <div>
                <p className="text-sm font-medium text-gray-800">Property #{r.propertyId}</p>
                <p className="text-xs text-gray-400">
                  Ref: {r.paymentReference} · {timeAgo(r.createdAt)}
                  {r.expiresAt && ` · Expires ${new Date(r.expiresAt).toLocaleDateString('en-NG')}`}
                </p>
              </div>
              <div className="text-right flex flex-col items-end gap-1">
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                  r.status === 'ACTIVE'          ? 'bg-green-50 text-green-700'   :
                  r.status === 'PENDING_PAYMENT' ? 'bg-yellow-50 text-yellow-700' :
                  r.status === 'COMPLETED'       ? 'bg-blue-50 text-blue-700'     :
                  'bg-gray-100 text-gray-500'
                }`}>{r.status.replace('_', ' ')}</span>
                {r.status === 'PENDING_PAYMENT' && r.authorizationUrl && (
                  <a href={r.authorizationUrl} className="text-xs text-forest-800 hover:underline flex items-center gap-1">
                    Complete Payment <ArrowUpRight size={11} />
                  </a>
                )}
              </div>
            </div>
          ))}
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
    { to: '/dashboard/reservations',  label: 'Reservations',   icon: CalendarCheck },
    { to: '/dashboard/subscription',  label: 'Subscription',   icon: Crown,       agentOnly: true },
    { to: '/dashboard/reputation',    label: 'Reputation',     icon: BadgeCheck,  agentOnly: true },
    { to: '/dashboard/messages',      label: 'Messages',       icon: MessageSquare },
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
            {navItems.map(({ to, label, icon: Icon, end, sellerOnly, adminOnly, agentOnly }) => {
              if (sellerOnly && !isSeller) return null;
              if (adminOnly && !isAdmin) return null;
              if (agentOnly && !isAgent) return null;
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
            {navItems.map(({ to, label, icon: Icon, end, sellerOnly, adminOnly, agentOnly }) => {
              if (sellerOnly && !isSeller) return null;
              if (adminOnly && !isAdmin) return null;
              if (agentOnly && !isAgent) return null;
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
            <Route path="reservations" element={<ReservationsPage />} />
            <Route path="subscription" element={<SubscriptionPage />} />
            <Route path="reputation"   element={<ReputationPage />} />
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
