import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { LayoutGrid, List, SlidersHorizontal, ChevronLeft, ChevronRight } from 'lucide-react';
import { propertyAPI } from '../services/api';
import { searchDemoProperties } from '../services/demoProperties';
import PropertyCard from '../components/property/PropertyCard';
import SearchBar from '../components/property/SearchBar';

const SORT_OPTIONS = [
  { value: 'createdAt,desc',  label: 'Newest First' },
  { value: 'createdAt,asc',   label: 'Oldest First' },
  { value: 'price,asc',       label: 'Price: Low → High' },
  { value: 'price,desc',      label: 'Price: High → Low' },
  { value: 'viewsCount,desc', label: 'Most Viewed' },
];

export default function PropertiesPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [properties, setProperties] = useState([]);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('grid');
  const [sort, setSort] = useState('createdAt,desc');

  const page = parseInt(searchParams.get('page') || '0');

  const buildFilters = useCallback(() => ({
    keyword:      searchParams.get('keyword')      || undefined,
    listingType:  searchParams.get('listingType')  || undefined,
    propertyType: searchParams.get('propertyType') || undefined,
    stateId:      searchParams.get('stateId')      || undefined,
    lgaId:        searchParams.get('lgaId')        || undefined,
    minPrice:     searchParams.get('minPrice')     || undefined,
    maxPrice:     searchParams.get('maxPrice')     || undefined,
    bedrooms:     searchParams.get('bedrooms')     || undefined,
    page,
    size: 12,
    sortBy:  sort.split(',')[0],
    sortDir: sort.split(',')[1],
  }), [searchParams, page, sort]);

  const fetchProperties = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await propertyAPI.search(buildFilters());
      setProperties(data.content || []);
      setTotalPages(data.totalPages || 0);
      setTotalElements(data.totalElements || 0);
    } catch {
      const data = searchDemoProperties(buildFilters());
      setProperties(data.content);
      setTotalPages(data.totalPages);
      setTotalElements(data.totalElements);
    } finally {
      setLoading(false);
    }
  }, [buildFilters]);

  useEffect(() => { fetchProperties(); }, [fetchProperties]);

  const handleSearch = (filters) => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([k, v]) => { if (v) params.set(k, v); });
    params.set('page', '0');
    setSearchParams(params);
  };

  const goToPage = (p) => {
    const params = new URLSearchParams(searchParams);
    params.set('page', p);
    setSearchParams(params);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const initialValues = {
    keyword:      searchParams.get('keyword')      || '',
    listingType:  searchParams.get('listingType')  || '',
    propertyType: searchParams.get('propertyType') || '',
    bedrooms:     searchParams.get('bedrooms')     || '',
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 page-enter">
      {/* Search bar */}
      <div className="mb-8">
        <SearchBar initialValues={initialValues} onSearch={handleSearch} />
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <p className="text-sm text-gray-500">
          {loading ? 'Searching…' : (
            <><span className="font-semibold text-gray-800">{totalElements.toLocaleString()}</span> properties found</>
          )}
        </p>

        <div className="flex items-center gap-3">
          {/* Sort */}
          <select value={sort} onChange={(e) => setSort(e.target.value)}
            className="input-field py-2 text-sm w-48">
            {SORT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>

          {/* View toggle */}
          <div className="flex border border-gray-200 rounded-xl overflow-hidden">
            <button onClick={() => setViewMode('grid')}
              className={`p-2.5 transition-colors ${viewMode === 'grid' ? 'bg-forest-800 text-white' : 'text-gray-400 hover:text-gray-600'}`}>
              <LayoutGrid size={17} />
            </button>
            <button onClick={() => setViewMode('list')}
              className={`p-2.5 transition-colors ${viewMode === 'list' ? 'bg-forest-800 text-white' : 'text-gray-400 hover:text-gray-600'}`}>
              <List size={17} />
            </button>
          </div>
        </div>
      </div>

      {/* Results */}
      {loading ? (
        <div className={viewMode === 'grid'
          ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6'
          : 'space-y-4'}>
          {[...Array(12)].map((_, i) => (
            <div key={i} className="card animate-pulse">
              <div className="bg-gray-100" style={{ height: 200 }} />
              <div className="p-4 space-y-3">
                <div className="h-4 bg-gray-100 rounded w-2/3" />
                <div className="h-3 bg-gray-100 rounded w-full" />
                <div className="h-3 bg-gray-100 rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
      ) : properties.length === 0 ? (
        <div className="text-center py-24">
          <div className="text-6xl mb-4">🏚️</div>
          <h3 className="font-display text-2xl font-bold text-gray-700 mb-2">No properties found</h3>
          <p className="text-gray-400 mb-6">Try adjusting your search filters or clearing them entirely</p>
          <button onClick={() => setSearchParams(new URLSearchParams())} className="btn-secondary">
            Clear all filters
          </button>
        </div>
      ) : (
        <div className={viewMode === 'grid'
          ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6'
          : 'space-y-4'}>
          {properties.map((p) => <PropertyCard key={p.id} property={p} />)}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-12">
          <button onClick={() => goToPage(page - 1)} disabled={page === 0}
            className="p-2 rounded-xl border border-gray-200 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed">
            <ChevronLeft size={18} />
          </button>

          {[...Array(Math.min(totalPages, 7))].map((_, i) => {
            const pg = Math.max(0, Math.min(page - 3 + i, totalPages - 7 + i));
            return (
              <button key={pg} onClick={() => goToPage(pg)}
                className={`w-10 h-10 rounded-xl text-sm font-medium transition-colors ${
                  pg === page ? 'bg-forest-800 text-white' : 'border border-gray-200 hover:bg-gray-50 text-gray-600'
                }`}>
                {pg + 1}
              </button>
            );
          })}

          <button onClick={() => goToPage(page + 1)} disabled={page >= totalPages - 1}
            className="p-2 rounded-xl border border-gray-200 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed">
            <ChevronRight size={18} />
          </button>
        </div>
      )}
    </div>
  );
}
