import React from 'react';
import { Link } from 'react-router-dom';
import { Bed, Bath, Maximize2, MapPin, Heart, Eye } from 'lucide-react';
import { formatNaira, formatPricePeriod, listingLabel, listingBadgeClass, propertyTypeLabel, timeAgo } from '../../utils/nigeria';

const PLACEHOLDER = 'https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=600&q=80';

export default function PropertyCard({ property, onSave, saved = false }) {
  const {
    id, title, address, price, pricePeriod, listingType, propertyType,
    bedrooms, bathrooms, sizeSqm, primaryImageUrl, imageUrls, viewsCount, createdAt,
  } = property;

  const image = primaryImageUrl || imageUrls?.[0] || PLACEHOLDER;

  return (
    <div className="card group hover:shadow-lift transition-all duration-200">
      {/* Image */}
      <Link to={`/properties/${id}`} className="block relative overflow-hidden" style={{ height: 220 }}>
        <img src={image} alt={title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          onError={(e) => { e.target.src = PLACEHOLDER; }} />

        {/* Badges */}
        <div className="absolute top-3 left-3 flex gap-2">
          <span className={listingBadgeClass(listingType)}>{listingLabel(listingType)}</span>
        </div>

        {/* Save button */}
        {onSave && (
          <button onClick={(e) => { e.preventDefault(); onSave(id); }}
            className={`absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center transition-colors shadow-sm
              ${saved ? 'bg-red-500 text-white' : 'bg-white/80 text-gray-500 hover:bg-white hover:text-red-500'}`}>
            <Heart size={15} fill={saved ? 'currentColor' : 'none'} />
          </button>
        )}

        {/* View count */}
        <div className="absolute bottom-3 right-3 flex items-center gap-1 bg-black/40 text-white rounded-full px-2 py-0.5 text-xs">
          <Eye size={11} /> {viewsCount ?? 0}
        </div>
      </Link>

      {/* Body */}
      <div className="p-4">
        {/* Price */}
        <div className="flex items-baseline justify-between mb-2">
          <p className="naira text-lg font-bold text-forest-900">
            {formatPricePeriod(price, pricePeriod, listingType)}
          </p>
          <span className="text-xs text-gray-400">{propertyTypeLabel(propertyType)}</span>
        </div>

        {/* Title */}
        <Link to={`/properties/${id}`}>
          <h3 className="font-semibold text-gray-800 text-sm leading-snug hover:text-forest-800 transition-colors line-clamp-2 mb-2">
            {title}
          </h3>
        </Link>

        {/* Location */}
        <div className="flex items-center gap-1 text-xs text-gray-400 mb-3">
          <MapPin size={11} className="shrink-0" />
          <span className="truncate">{address}</span>
        </div>

        {/* Stats */}
        <div className="flex items-center gap-4 pt-3 border-t border-gray-50 text-xs text-gray-500">
          {bedrooms > 0 && (
            <div className="flex items-center gap-1">
              <Bed size={13} className="text-forest-600" />
              <span>{bedrooms} {bedrooms === 1 ? 'Bed' : 'Beds'}</span>
            </div>
          )}
          {bathrooms > 0 && (
            <div className="flex items-center gap-1">
              <Bath size={13} className="text-forest-600" />
              <span>{bathrooms} {bathrooms === 1 ? 'Bath' : 'Baths'}</span>
            </div>
          )}
          {sizeSqm && (
            <div className="flex items-center gap-1">
              <Maximize2 size={12} className="text-forest-600" />
              <span>{sizeSqm}m²</span>
            </div>
          )}
          {createdAt && (
            <span className="ml-auto text-gray-300">{timeAgo(createdAt)}</span>
          )}
        </div>
      </div>
    </div>
  );
}
