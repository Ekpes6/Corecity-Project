import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Shield, Star, TrendingUp, Users, Building2, MapPin } from 'lucide-react';
import { propertyAPI } from '../services/api';
import { getDemoFeaturedProperties } from '../services/demoProperties';
import PropertyCard from '../components/property/PropertyCard';
import SearchBar from '../components/property/SearchBar';
import { formatNaira } from '../utils/nigeria';

const HERO_STATS = [
  { icon: Building2, label: 'Properties Listed', value: '12,400+' },
  { icon: Users,     label: 'Happy Customers',   value: '8,200+'  },
  { icon: MapPin,    label: 'States Covered',     value: '37'      },
  { icon: Shield,    label: 'Verified Agents',    value: '1,800+'  },
];

const FEATURED_CITIES = [
  { name: 'Lagos',         stateId: 25, img: 'https://images.unsplash.com/photo-1577613108672-f73ee6a0ddb4?w=400&q=70', count: '4,200+' },
  { name: 'Abuja',         stateId: 15, img: 'https://images.unsplash.com/photo-1580294647781-e9e0b7d5c1ab?w=400&q=70', count: '2,100+' },
  { name: 'Port Harcourt', stateId: 33, img: 'https://images.unsplash.com/photo-1596436889106-be35e843f974?w=400&q=70', count: '1,400+' },
  { name: 'Kano',          stateId: 20, img: 'https://images.unsplash.com/photo-1613482297741-c3a2eeb16286?w=400&q=70', count: '900+'   },
];

export default function HomePage() {
  const [featured, setFeatured] = useState([]);
  const [loadingFeatured, setLoadingFeatured] = useState(true);

  useEffect(() => {
    propertyAPI.featured()
      .then((r) => setFeatured(r.data))
      .catch(() => setFeatured(getDemoFeaturedProperties()))
      .finally(() => setLoadingFeatured(false));
  }, []);

  return (
    <div className="page-enter">
      {/* ── Hero ──────────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-forest-900 text-white">
        {/* Background pattern */}
        <div className="absolute inset-0 opacity-10"
          style={{ backgroundImage: 'radial-gradient(circle at 20% 50%, #7CB342 0%, transparent 50%), radial-gradient(circle at 80% 20%, #E8824A 0%, transparent 40%)' }} />

        <div className="relative max-w-7xl mx-auto px-6 py-24 md:py-32">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 bg-white/10 border border-white/20 rounded-full px-4 py-1.5 text-sm mb-6">
              <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
              Nigeria's #1 Real Estate Platform
            </div>

            <h1 className="font-display text-4xl md:text-6xl font-bold leading-tight mb-6">
              Find Your Perfect
              <span className="text-clay-500 block">Home in Nigeria</span>
            </h1>

            <p className="text-white/70 text-lg mb-10 max-w-xl">
              Browse thousands of verified properties for sale, rent, and short let
              across all 36 states. Secure payments via Paystack.
            </p>

            <div className="max-w-2xl">
              <SearchBar />
            </div>

            <div className="flex flex-wrap gap-2 mt-4 text-sm text-white/50">
              <span>Popular:</span>
              {['Lagos Island', 'Lekki Phase 1', 'Maitama Abuja', 'GRA Port Harcourt', 'Asokoro'].map((k) => (
                <Link key={k} to={`/properties?keyword=${encodeURIComponent(k)}`}
                  className="text-white/70 hover:text-white underline underline-offset-2 transition-colors">
                  {k}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Stats ────────────────────────────────────────────── */}
      <section className="bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-6 py-10">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {HERO_STATS.map(({ icon: Icon, label, value }) => (
              <div key={label} className="flex items-center gap-4">
                <div className="w-12 h-12 bg-forest-50 rounded-xl flex items-center justify-center shrink-0">
                  <Icon size={22} className="text-forest-800" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-forest-900">{value}</p>
                  <p className="text-xs text-gray-500">{label}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Featured Properties ───────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-6 py-20">
        <div className="flex items-end justify-between mb-10">
          <div>
            <p className="text-clay-500 font-semibold text-sm uppercase tracking-wide mb-2">Fresh Listings</p>
            <h2 className="section-title">Featured Properties</h2>
          </div>
          <Link to="/properties" className="hidden md:flex items-center gap-1.5 text-forest-800 font-semibold hover:gap-3 transition-all text-sm">
            View all <ArrowRight size={16} />
          </Link>
        </div>

        {loadingFeatured ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="card animate-pulse">
                <div className="bg-gray-100" style={{ height: 220 }} />
                <div className="p-4 space-y-3">
                  <div className="h-4 bg-gray-100 rounded w-2/3" />
                  <div className="h-3 bg-gray-100 rounded w-full" />
                  <div className="h-3 bg-gray-100 rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {featured.map((p) => <PropertyCard key={p.id} property={p} />)}
          </div>
        )}

        <div className="text-center mt-10">
          <Link to="/properties" className="btn-secondary inline-flex items-center gap-2">
            Browse All Properties <ArrowRight size={16} />
          </Link>
        </div>
      </section>

      {/* ── Popular Cities ────────────────────────────────────── */}
      <section className="bg-forest-50 py-20">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-10">
            <p className="text-clay-500 font-semibold text-sm uppercase tracking-wide mb-2">Nationwide Coverage</p>
            <h2 className="section-title">Browse by City</h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
            {FEATURED_CITIES.map(({ name, stateId, img, count }) => (
              <Link key={stateId} to={`/properties?stateId=${stateId}`}
                className="group relative overflow-hidden rounded-xl2 shadow-card hover:shadow-lift transition-all duration-200">
                <img src={img} alt={name}
                  className="w-full object-cover group-hover:scale-110 transition-transform duration-500"
                  style={{ height: 200 }} />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                <div className="absolute bottom-0 left-0 p-4 text-white">
                  <h3 className="font-display font-bold text-lg">{name}</h3>
                  <p className="text-white/70 text-sm">{count} listings</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── Why Corecity ────────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-6 py-20">
        <div className="text-center mb-12">
          <h2 className="section-title mb-4">Why Choose Corecity?</h2>
          <p className="text-gray-500 max-w-xl mx-auto">Built specifically for Nigeria's property market with local payment methods and nationwide coverage.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            { icon: Shield, title: 'Verified Listings', desc: 'Every listing is verified by our team before going live. No ghost listings, no scams.' },
            { icon: TrendingUp, title: 'Paystack Payments', desc: 'Pay with card, bank transfer, USSD, or QR. All transactions in Nigerian Naira (₦).' },
            { icon: Star, title: 'Trusted Agents', desc: 'Work with licensed agents and verified property owners. BVN & NIN verified.' },
          ].map(({ icon: Icon, title, desc }) => (
            <div key={title} className="card p-8 hover:shadow-lift transition-shadow">
              <div className="w-14 h-14 bg-forest-50 rounded-2xl flex items-center justify-center mb-5">
                <Icon size={26} className="text-forest-800" />
              </div>
              <h3 className="font-display font-bold text-xl text-forest-900 mb-3">{title}</h3>
              <p className="text-gray-500 text-sm leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────────── */}
      <section className="bg-forest-800 text-white py-20">
        <div className="max-w-3xl mx-auto text-center px-6">
          <h2 className="font-display text-4xl font-bold mb-4">
            Ready to List Your Property?
          </h2>
          <p className="text-white/70 mb-8 text-lg">
            Join thousands of landlords, developers, and agents who trust Corecity
            to reach serious buyers and tenants across Nigeria.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/register?role=SELLER" className="btn-clay px-8">List My Property</Link>
            <Link to="/register?role=AGENT"  className="btn-secondary border-white text-white hover:bg-white/10 px-8">Become an Agent</Link>
          </div>
        </div>
      </section>
    </div>
  );
}
