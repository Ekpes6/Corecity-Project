import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  Bed, Bath, Maximize2, MapPin, Phone, Mail, Heart, Share2,
  ChevronLeft, ChevronRight, Shield, Eye, Calendar, CheckCircle2,
  BookMarked, Star
} from 'lucide-react';
import { propertyAPI, transactionAPI, reservationAPI, reputationAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
  formatPricePeriod, listingLabel, listingBadgeClass, propertyTypeLabel,
  AMENITY_LABELS, timeAgo
} from '../utils/nigeria';
import { getDemoProperty } from '../services/demoProperties';
import toast from 'react-hot-toast';

const PLACEHOLDER = 'https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=800&q=80';

export default function PropertyDetailPage() {
  const { id }       = useParams();
  const { user, isAuthenticated } = useAuth();
  const navigate     = useNavigate();
  const [property, setProperty]   = useState(null);
  const [loading, setLoading]     = useState(true);
  const [imgIdx, setImgIdx]       = useState(0);
  const [initiatingPay, setInitiatingPay] = useState(false);
  const [reserving, setReserving] = useState(false);
  const [agentRep, setAgentRep]   = useState(null);

  useEffect(() => {
    propertyAPI.getOne(id)
      .then((r) => {
        setProperty(r.data);
        // Load agent reputation if property has an owner
        if (r.data?.ownerId) {
          reputationAPI.getAgentReputation(r.data.ownerId)
            .then((rep) => setAgentRep(rep.data))
            .catch(() => {});
        }
      })
      .catch(() => {
        const demoProperty = getDemoProperty(id);
        if (demoProperty) {
          setProperty(demoProperty);
          return;
        }
        toast.error('Property not found');
      })
      .finally(() => setLoading(false));
  }, [id]);

  const images = property?.imageUrls?.length ? property.imageUrls : [PLACEHOLDER];

  const prevImg = () => setImgIdx((i) => (i - 1 + images.length) % images.length);
  const nextImg = () => setImgIdx((i) => (i + 1) % images.length);

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    toast.success('Link copied to clipboard!');
  };

  const handlePay = async () => {
    if (!isAuthenticated) { navigate('/login'); return; }
    setInitiatingPay(true);
    try {
      const { data } = await transactionAPI.initiate({
        propertyId: property.id,
        sellerId:   property.ownerId,
        buyerEmail: user.email,
        amount:     property.price,
        type:       property.listingType === 'FOR_SALE' ? 'PURCHASE' : 'RENT',
      });
      // Redirect to Paystack checkout
      window.location.href = data.authorizationUrl;
    } catch (err) {
      toast.error(err.response?.data?.message || 'Payment initiation failed');
    } finally {
      setInitiatingPay(false);
    }
  };

  const handleReserve = async () => {
    if (!isAuthenticated) { navigate('/login'); return; }
    setReserving(true);
    try {
      const { data } = await reservationAPI.reserve(property.id);
      if (data.authorizationUrl) {
        window.location.href = data.authorizationUrl;
      } else {
        toast.success('Property reserved!');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Reservation failed');
    } finally {
      setReserving(false);
    }
  };

  if (loading) return (
    <div className="max-w-6xl mx-auto px-6 py-12">
      <div className="animate-pulse space-y-6">
        <div className="bg-gray-100 rounded-2xl" style={{ height: 480 }} />
        <div className="grid grid-cols-3 gap-6">
          <div className="col-span-2 space-y-4">
            <div className="h-6 bg-gray-100 rounded w-3/4" />
            <div className="h-4 bg-gray-100 rounded w-full" />
            <div className="h-4 bg-gray-100 rounded w-2/3" />
          </div>
        </div>
      </div>
    </div>
  );

  if (!property) return (
    <div className="text-center py-24">
      <p className="text-gray-400 text-lg">Property not found</p>
      <Link to="/properties" className="btn-primary mt-4 inline-block">Back to listings</Link>
    </div>
  );

  const amenities = property.amenities || [];

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 page-enter">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-gray-400 mb-6">
        <Link to="/" className="hover:text-forest-800">Home</Link>
        <span>/</span>
        <Link to="/properties" className="hover:text-forest-800">Properties</Link>
        <span>/</span>
        <span className="text-gray-600 truncate max-w-48">{property.title}</span>
      </nav>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left: images + details */}
        <div className="lg:col-span-2 space-y-8">
          {/* Image gallery */}
          <div className="relative rounded-2xl overflow-hidden bg-gray-100" style={{ height: 460 }}>
            <img src={images[imgIdx]} alt={property.title}
              className="w-full h-full object-cover"
              onError={(e) => { e.target.src = PLACEHOLDER; }} />

            {images.length > 1 && (
              <>
                <button onClick={prevImg}
                  className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/80 rounded-full flex items-center justify-center shadow hover:bg-white transition-colors">
                  <ChevronLeft size={20} />
                </button>
                <button onClick={nextImg}
                  className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/80 rounded-full flex items-center justify-center shadow hover:bg-white transition-colors">
                  <ChevronRight size={20} />
                </button>
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5">
                  {images.map((_, i) => (
                    <button key={i} onClick={() => setImgIdx(i)}
                      className={`w-2 h-2 rounded-full transition-all ${i === imgIdx ? 'bg-white w-5' : 'bg-white/50'}`} />
                  ))}
                </div>
              </>
            )}

            <div className="absolute top-4 left-4 flex gap-2">
              <span className={listingBadgeClass(property.listingType)}>{listingLabel(property.listingType)}</span>
            </div>

            <div className="absolute top-4 right-4 flex gap-2">
              <button onClick={handleShare}
                className="w-9 h-9 bg-white/80 rounded-full flex items-center justify-center hover:bg-white transition-colors">
                <Share2 size={16} />
              </button>
            </div>

            {images.length > 1 && (
              <div className="absolute bottom-4 right-4 bg-black/50 text-white text-xs px-2.5 py-1 rounded-full">
                {imgIdx + 1} / {images.length}
              </div>
            )}
          </div>

          {/* Thumbnails */}
          {images.length > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-2">
              {images.map((img, i) => (
                <button key={i} onClick={() => setImgIdx(i)}
                  className={`shrink-0 w-20 h-16 rounded-xl overflow-hidden border-2 transition-colors ${
                    i === imgIdx ? 'border-forest-800' : 'border-transparent'
                  }`}>
                  <img src={img} alt="" className="w-full h-full object-cover"
                    onError={(e) => { e.target.src = PLACEHOLDER; }} />
                </button>
              ))}
            </div>
          )}

          {/* Property info */}
          <div className="card p-6 space-y-6">
            <div>
              <div className="flex items-start justify-between gap-4">
                <h1 className="font-display text-2xl font-bold text-forest-900 leading-tight">{property.title}</h1>
                <div className="flex items-center gap-1 text-xs text-gray-400 shrink-0">
                  <Eye size={13} /> {property.viewsCount}
                </div>
              </div>
              <div className="flex items-center gap-2 mt-2 text-gray-500 text-sm">
                <MapPin size={14} className="text-clay-500 shrink-0" />
                {property.address}
              </div>
            </div>

            {/* Key stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {property.bedrooms > 0 && (
                <div className="bg-forest-50 rounded-xl p-3 text-center">
                  <Bed size={20} className="text-forest-800 mx-auto mb-1" />
                  <p className="font-bold text-gray-800">{property.bedrooms}</p>
                  <p className="text-xs text-gray-500">Bedrooms</p>
                </div>
              )}
              {property.bathrooms > 0 && (
                <div className="bg-forest-50 rounded-xl p-3 text-center">
                  <Bath size={20} className="text-forest-800 mx-auto mb-1" />
                  <p className="font-bold text-gray-800">{property.bathrooms}</p>
                  <p className="text-xs text-gray-500">Bathrooms</p>
                </div>
              )}
              {property.toilets > 0 && (
                <div className="bg-forest-50 rounded-xl p-3 text-center">
                  <span className="text-xl block mb-1">🚽</span>
                  <p className="font-bold text-gray-800">{property.toilets}</p>
                  <p className="text-xs text-gray-500">Toilets</p>
                </div>
              )}
              {property.sizeSqm && (
                <div className="bg-forest-50 rounded-xl p-3 text-center">
                  <Maximize2 size={20} className="text-forest-800 mx-auto mb-1" />
                  <p className="font-bold text-gray-800">{property.sizeSqm}</p>
                  <p className="text-xs text-gray-500">sq metres</p>
                </div>
              )}
            </div>

            {/* Description */}
            {property.description && (
              <div>
                <h2 className="font-semibold text-gray-800 mb-2">About This Property</h2>
                <p className="text-gray-500 text-sm leading-relaxed whitespace-pre-line">{property.description}</p>
              </div>
            )}

            {/* Amenities */}
            {amenities.length > 0 && (
              <div>
                <h2 className="font-semibold text-gray-800 mb-3">Amenities & Features</h2>
                <div className="flex flex-wrap gap-2">
                  {amenities.map((a) => (
                    <span key={a} className="inline-flex items-center gap-1 bg-forest-50 text-forest-800 text-xs font-medium px-3 py-1.5 rounded-full">
                      <CheckCircle2 size={12} />
                      {AMENITY_LABELS[a] || a}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Meta */}
            <div className="pt-4 border-t border-gray-50 flex items-center gap-4 text-xs text-gray-400">
              <span className="flex items-center gap-1"><Calendar size={12} /> Listed {timeAgo(property.createdAt)}</span>
              <span>Type: {propertyTypeLabel(property.propertyType)}</span>
              {property.negotiable && <span className="text-forest-700 font-medium">✓ Price Negotiable</span>}
            </div>
          </div>
        </div>

        {/* Right: price + CTA */}
        <div className="space-y-5">
          {/* Price card */}
          <div className="card p-6 sticky top-24">
            <div className="mb-4">
              <p className="naira text-3xl font-bold text-forest-900">
                {formatPricePeriod(property.price, property.pricePeriod, property.listingType)}
              </p>
              {property.negotiable && (
                <p className="text-xs text-forest-700 mt-1">💬 Price is negotiable</p>
              )}
            </div>

            {user?.id !== property.ownerId && (
              <>
                <button onClick={handlePay} disabled={initiatingPay || reserving}
                  className="btn-primary w-full mb-2">
                  {initiatingPay ? 'Redirecting to Paystack…' :
                    property.listingType === 'FOR_SALE' ? 'Initiate Purchase' :
                    property.listingType === 'SHORT_LET' ? 'Book Now' : 'Pay Rent Now'}
                </button>
                {/* Reserve button – lock in the property for 24 h with a reservation fee */}
                {(property.status === 'ACTIVE' || property.status === 'ON_NEGOTIATION') && (
                  <button onClick={handleReserve} disabled={reserving || initiatingPay}
                    className="btn-secondary w-full flex items-center justify-center gap-2 mb-3">
                    {reserving ? 'Reserving…' : <><BookMarked size={15} /> Reserve Property</>}
                  </button>
                )}
              </>
            )}

            <div className="space-y-2 mt-4 pt-4 border-t border-gray-50">
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl text-sm text-gray-600 hover:bg-gray-100 cursor-pointer transition-colors">
                <Phone size={16} className="text-forest-800" />
                <span>Call Agent / Owner</span>
              </div>
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl text-sm text-gray-600 hover:bg-gray-100 cursor-pointer transition-colors">
                <Mail size={16} className="text-forest-800" />
                <span>Send Enquiry</span>
              </div>
            </div>

            <div className="mt-4 p-3 bg-forest-50 rounded-xl flex items-start gap-2">
              <Shield size={15} className="text-forest-800 mt-0.5 shrink-0" />
              <p className="text-xs text-forest-800">Payments are secured by Paystack. Your money is protected.</p>
            </div>
          </div>

          {/* Property summary */}
          <div className="card p-5 text-sm space-y-3">
            <h3 className="font-semibold text-gray-700">Property Details</h3>
            {[
              ['Type',    propertyTypeLabel(property.propertyType)],
              ['Status',  property.status],
              ['Listed',  timeAgo(property.createdAt)],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between text-xs">
                <span className="text-gray-400">{k}</span>
                <span className="font-medium text-gray-700">{v}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
