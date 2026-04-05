import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, SlidersHorizontal, X } from 'lucide-react';
import { LISTING_TYPES, PROPERTY_TYPES, BEDROOM_OPTIONS } from '../../utils/nigeria';

export default function SearchBar({ initialValues = {}, onSearch, compact = false }) {
  const navigate = useNavigate();
  const [filters, setFilters] = useState({
    keyword: '', listingType: '', propertyType: '', stateId: '', bedrooms: '', ...initialValues,
  });
  const [showAdvanced, setShowAdvanced] = useState(false);

  const set = (key, val) => setFilters((p) => ({ ...p, [key]: val }));

  const handleSubmit = (e) => {
    e?.preventDefault();
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([k, v]) => { if (v !== '' && v != null) params.set(k, v); });
    if (onSearch) { onSearch(filters); }
    else { navigate(`/properties?${params.toString()}`); }
  };

  if (compact) {
    return (
      <form onSubmit={handleSubmit} className="flex gap-2">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={filters.keyword} onChange={(e) => set('keyword', e.target.value)}
            placeholder="Search by location, title…"
            className="input-field pl-9" />
        </div>
        <button type="submit" className="btn-primary px-5 py-2.5 text-sm">Search</button>
      </form>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-lift p-5">
      {/* Primary row */}
      <div className="flex flex-wrap gap-3 items-end">
        {/* Keyword */}
        <div className="flex-1 min-w-48">
          <label className="block text-xs font-medium text-gray-500 mb-1.5">Location / Keyword</label>
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input value={filters.keyword} onChange={(e) => set('keyword', e.target.value)}
              placeholder="Lagos Island, Lekki, duplex…"
              className="input-field pl-9" />
          </div>
        </div>

        {/* Listing type */}
        <div className="min-w-36">
          <label className="block text-xs font-medium text-gray-500 mb-1.5">Type</label>
          <select value={filters.listingType} onChange={(e) => set('listingType', e.target.value)}
            className="input-field">
            <option value="">Any Type</option>
            {LISTING_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </div>

        {/* Property type */}
        <div className="min-w-40">
          <label className="block text-xs font-medium text-gray-500 mb-1.5">Property</label>
          <select value={filters.propertyType} onChange={(e) => set('propertyType', e.target.value)}
            className="input-field">
            <option value="">Any Property</option>
            {PROPERTY_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </div>

        {/* Bedrooms */}
        <div className="min-w-32">
          <label className="block text-xs font-medium text-gray-500 mb-1.5">Bedrooms</label>
          <select value={filters.bedrooms} onChange={(e) => set('bedrooms', e.target.value)}
            className="input-field">
            {BEDROOM_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <button type="button" onClick={() => setShowAdvanced(!showAdvanced)}
            className={`flex items-center gap-1.5 px-4 py-3 rounded-xl border text-sm font-medium transition-colors
              ${showAdvanced ? 'border-forest-800 text-forest-800 bg-forest-50' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}>
            <SlidersHorizontal size={15} />
            Filters
          </button>
          <button type="submit" className="btn-primary flex items-center gap-2">
            <Search size={16} /> Search
          </button>
        </div>
      </div>

      {/* Advanced filters */}
      {showAdvanced && (
        <div className="mt-4 pt-4 border-t border-gray-100 flex flex-wrap gap-3">
          <div className="min-w-40">
            <label className="block text-xs font-medium text-gray-500 mb-1.5">Min Price (₦)</label>
            <input type="number" value={filters.minPrice || ''} onChange={(e) => set('minPrice', e.target.value)}
              placeholder="e.g. 500000" className="input-field" />
          </div>
          <div className="min-w-40">
            <label className="block text-xs font-medium text-gray-500 mb-1.5">Max Price (₦)</label>
            <input type="number" value={filters.maxPrice || ''} onChange={(e) => set('maxPrice', e.target.value)}
              placeholder="e.g. 50000000" className="input-field" />
          </div>
          <div className="flex items-end">
            <button type="button" onClick={() => setFilters({ keyword: '', listingType: '', propertyType: '', stateId: '', bedrooms: '' })}
              className="flex items-center gap-1.5 px-4 py-3 text-sm text-red-500 hover:bg-red-50 rounded-xl border border-red-100 transition-colors">
              <X size={14} /> Clear all
            </button>
          </div>
        </div>
      )}
    </form>
  );
}
