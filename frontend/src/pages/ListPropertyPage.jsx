import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useDropzone } from 'react-dropzone';
import { Upload, X, CheckCircle2, ArrowRight, MapPin, Loader2 } from 'lucide-react';
import { propertyAPI, fileAPI, locationAPI } from '../services/api';
import { PROPERTY_TYPES, LISTING_TYPES, PRICE_PERIODS, ALL_AMENITIES, AMENITY_LABELS } from '../utils/nigeria';
import toast from 'react-hot-toast';

export default function ListPropertyPage() {
  const navigate  = useNavigate();
  const [step, setStep]           = useState(1);
  const [images, setImages]       = useState([]);      // File[] from dropzone
  const [previews, setPreviews]   = useState([]);      // data URLs
  const [amenities, setAmenities] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [states, setStates] = useState([]);
  const [lgas, setLgas] = useState([]);
  const [geocoding, setGeocoding] = useState(false);
  const [coordsAutoFilled, setCoordsAutoFilled] = useState(false);
  const geocodeTimer = useRef(null);

  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm({
    defaultValues: { listingType: 'FOR_RENT', propertyType: 'APARTMENT', pricePeriod: 'PER_YEAR', negotiable: true }
  });

  const listingType = watch('listingType');
  const selectedStateId = watch('stateId');
  const watchedAddress = watch('address');
  const watchedLgaId = watch('lgaId');

  useEffect(() => {
    const loadStates = async () => {
      try {
        const { data } = await locationAPI.getStates();
        setStates(data);
      } catch {
        toast.error('Could not load states');
      }
    };

    loadStates();
  }, []);

  // ── Auto-geocode when address + state + LGA are filled ──────────────────
  useEffect(() => {
    if (geocodeTimer.current) clearTimeout(geocodeTimer.current);

    const address = watchedAddress?.trim();
    const lgaName = lgas.find((l) => String(l.id) === String(watchedLgaId))?.name;
    const stateName = states.find((s) => String(s.id) === String(selectedStateId))?.name;

    if (!address || !stateName) return;

    // Debounce 800ms so we don't fire on every keystroke
    geocodeTimer.current = setTimeout(async () => {
      const query = [address, lgaName, stateName, 'Nigeria'].filter(Boolean).join(', ');
      setGeocoding(true);
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(query)}`,
          { headers: { 'Accept-Language': 'en' } }
        );
        const results = await res.json();
        if (results.length > 0) {
          const { lat, lon } = results[0];
          setValue('latitude', parseFloat(lat).toFixed(6));
          setValue('longitude', parseFloat(lon).toFixed(6));
          setCoordsAutoFilled(true);
        }
      } catch {
        // Silently ignore geocoding errors — user can still enter manually
      } finally {
        setGeocoding(false);
      }
    }, 800);

    return () => clearTimeout(geocodeTimer.current);
  }, [watchedAddress, watchedLgaId, selectedStateId, lgas, states, setValue]);

  useEffect(() => {
    const stateId = selectedStateId ? parseInt(selectedStateId, 10) : null;
    setValue('lgaId', '');
    setLgas([]);
    setCoordsAutoFilled(false);

    if (!stateId) {
      return;
    }

    const loadLgas = async () => {
      try {
        const { data } = await locationAPI.getLgas(stateId);
        setLgas(data);
      } catch {
        toast.error('Could not load LGAs for the selected state');
      }
    };

    loadLgas();
  }, [selectedStateId, setValue]);

  // ── Dropzone ──────────────────────────────────────────────
  const onDrop = useCallback((accepted) => {
    const newFiles = accepted.slice(0, 10 - images.length);
    setImages((prev) => [...prev, ...newFiles]);
    newFiles.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (e) => setPreviews((prev) => [...prev, e.target.result]);
      reader.readAsDataURL(file);
    });
  }, [images]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': ['.jpg', '.jpeg', '.png', '.webp'] },
    maxFiles: 10,
    maxSize: 10 * 1024 * 1024,
  });

  const removeImage = (idx) => {
    setImages((p) => p.filter((_, i) => i !== idx));
    setPreviews((p) => p.filter((_, i) => i !== idx));
  };

  const toggleAmenity = (a) => setAmenities((prev) =>
    prev.includes(a) ? prev.filter((x) => x !== a) : [...prev, a]
  );

  // ── Submit ─────────────────────────────────────────────────
  const onSubmit = async (data) => {
    setSubmitting(true);
    let createdPropertyId = null;
    try {
      const payload = {
        ...data,
        bedrooms:  parseInt(data.bedrooms)  || 0,
        bathrooms: parseInt(data.bathrooms) || 0,
        toilets:   parseInt(data.toilets)   || 0,
        price:     parseFloat(data.price),
        sizeSqm:   data.sizeSqm ? parseFloat(data.sizeSqm) : null,
        stateId:   data.stateId ? parseInt(data.stateId, 10) : null,
        lgaId:     data.lgaId ? parseInt(data.lgaId, 10) : null,
        latitude:  data.latitude ? parseFloat(data.latitude) : null,
        longitude: data.longitude ? parseFloat(data.longitude) : null,
        amenities,
      };

      const { data: property } = await propertyAPI.create(payload);
      createdPropertyId = property.id;

      // Upload images — if they all fail, delete the property and stop
      if (images.length > 0) {
        const { data: uploadResult } = await fileAPI.uploadBatch(property.id, images);
        const uploadedUrls = (uploadResult.uploaded || []).map((f) => f.fileUrl).filter(Boolean);
        const uploadErrors = uploadResult.errors || [];

        if (uploadedUrls.length === 0) {
          // All uploads failed — roll back by deleting the property
          await propertyAPI.remove(property.id).catch(() => {});
          toast.error(uploadErrors.length > 0
            ? `Image upload failed: ${uploadErrors[0]}. Please try again.`
            : 'Image upload failed. Please check your files and try again.');
          return;
        }

        // At least some images uploaded — register them
        await propertyAPI.registerFiles(property.id, uploadedUrls);

        if (uploadErrors.length > 0) {
          toast(`${uploadedUrls.length} image(s) uploaded; ${uploadErrors.length} failed.`, { icon: '⚠️' });
        }
      }

      // Transition DRAFT → PENDING so the property is visible to admins for review.
      // This only fires if all prior steps succeeded; on any failure the property
      // stays DRAFT (invisible to admin) until cleaned up by the rollback below.
      await propertyAPI.publish(property.id);

      toast.success('Property listed successfully! Pending review.');
      navigate(`/properties/${property.id}`);
    } catch (err) {
      // If the property was already created before the error, roll it back
      if (createdPropertyId) {
        await propertyAPI.remove(createdPropertyId).catch(() => {});
      }
      toast.error(err.response?.data?.message || 'Failed to create listing. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const STEPS = ['Basic Info', 'Location', 'Photos', 'Review'];

  return (
    <div className="max-w-2xl mx-auto page-enter">
      <div className="mb-8">
        <h2 className="font-display text-2xl font-bold text-forest-900">List a Property</h2>
        <p className="text-gray-500 text-sm mt-1">Fill in the details to list your property on Corecity</p>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-2 mb-8">
        {STEPS.map((s, i) => (
          <React.Fragment key={s}>
            <div className={`flex items-center gap-2 cursor-pointer ${i + 1 <= step ? 'text-forest-800' : 'text-gray-300'}`}
              onClick={() => i + 1 < step && setStep(i + 1)}>
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-colors ${
                i + 1 < step  ? 'bg-forest-800 border-forest-800 text-white' :
                i + 1 === step ? 'border-forest-800 text-forest-800' :
                'border-gray-200 text-gray-300'
              }`}>
                {i + 1 < step ? <CheckCircle2 size={14} /> : i + 1}
              </div>
              <span className="text-xs font-medium hidden sm:block">{s}</span>
            </div>
            {i < STEPS.length - 1 && <div className={`flex-1 h-0.5 ${i + 1 < step ? 'bg-forest-800' : 'bg-gray-100'}`} />}
          </React.Fragment>
        ))}
      </div>

      <form onSubmit={handleSubmit(onSubmit)}>
        {/* Step 1: Basic Info */}
        {step === 1 && (
          <div className="card p-6 space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Property Title *</label>
              <input {...register('title', { required: 'Title is required' })}
                placeholder="e.g. Spacious 3-Bedroom Duplex in Lekki Phase 1"
                className="input-field" />
              {errors.title && <p className="text-red-500 text-xs mt-1">{errors.title.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Description</label>
              <textarea {...register('description')} rows={4}
                placeholder="Describe the property — neighbourhood, features, access roads, proximity to landmarks…"
                className="input-field resize-none" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Listing Type *</label>
                <select {...register('listingType')} className="input-field">
                  {LISTING_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Property Type *</label>
                <select {...register('propertyType')} className="input-field">
                  {PROPERTY_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Price (₦) *</label>
                <input type="number" {...register('price', { required: 'Price is required', min: 1 })}
                  placeholder="e.g. 2500000" className="input-field" />
                {errors.price && <p className="text-red-500 text-xs mt-1">{errors.price.message}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Price Period</label>
                <select {...register('pricePeriod')} className="input-field">
                  {PRICE_PERIODS.filter((p) =>
                    listingType === 'FOR_SALE' ? p.value === 'OUTRIGHT' :
                    listingType === 'SHORT_LET' ? ['PER_NIGHT', 'PER_MONTH'].includes(p.value) :
                    ['PER_YEAR', 'PER_MONTH'].includes(p.value)
                  ).map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              {['bedrooms', 'bathrooms', 'toilets'].map((field) => (
                <div key={field}>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5 capitalize">{field}</label>
                  <input type="number" min="0" max="20" {...register(field)}
                    placeholder="0" className="input-field" />
                </div>
              ))}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Size (sq metres)</label>
              <input type="number" {...register('sizeSqm')} placeholder="e.g. 150" className="input-field" />
            </div>

            {/* Amenities */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Amenities & Features</label>
              <div className="flex flex-wrap gap-2">
                {ALL_AMENITIES.map((a) => (
                  <button key={a} type="button" onClick={() => toggleAmenity(a)}
                    className={`text-xs px-3 py-1.5 rounded-full border transition-all ${
                      amenities.includes(a)
                        ? 'bg-forest-800 text-white border-forest-800'
                        : 'border-gray-200 text-gray-600 hover:border-forest-600'
                    }`}>
                    {AMENITY_LABELS[a]}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input type="checkbox" id="negotiable" {...register('negotiable')} className="w-4 h-4 accent-forest-800" />
              <label htmlFor="negotiable" className="text-sm text-gray-700">Price is negotiable</label>
            </div>

            <button type="button" onClick={() => setStep(2)} className="btn-primary w-full flex items-center justify-center gap-2">
              Next: Location <ArrowRight size={16} />
            </button>
          </div>
        )}

        {/* Step 2: Location */}
        {step === 2 && (
          <div className="card p-6 space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Full Address *</label>
              <input {...register('address', { required: 'Address is required' })}
                placeholder="e.g. 15 Admiralty Way, Lekki Phase 1, Lagos"
                className="input-field" />
              {errors.address && <p className="text-red-500 text-xs mt-1">{errors.address.message}</p>}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">State *</label>
                <select {...register('stateId', { required: 'State is required' })} className="input-field">
                  <option value="">Select State</option>
                  {states.map((state) => <option key={state.id} value={state.id}>{state.name}</option>)}
                </select>
                {errors.stateId && <p className="text-red-500 text-xs mt-1">{errors.stateId.message}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">LGA</label>
                <select {...register('lgaId')} className="input-field" disabled={!selectedStateId || lgas.length === 0}>
                  <option value="">Select LGA</option>
                  {lgas.map((lga) => <option key={lga.id} value={lga.id}>{lga.name}</option>)}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5 flex items-center gap-1">
                  Latitude
                  {geocoding && <Loader2 size={12} className="animate-spin text-forest-600" />}
                  {coordsAutoFilled && !geocoding && <MapPin size={12} className="text-forest-600" />}
                </label>
                <input
                  type="number" step="any"
                  {...register('latitude')}
                  placeholder={geocoding ? 'Detecting…' : 'e.g. 6.4281'}
                  className={`input-field ${coordsAutoFilled ? 'bg-forest-50 text-forest-900' : ''}`}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Longitude</label>
                <input
                  type="number" step="any"
                  {...register('longitude')}
                  placeholder={geocoding ? 'Detecting…' : 'e.g. 3.4219'}
                  className={`input-field ${coordsAutoFilled ? 'bg-forest-50 text-forest-900' : ''}`}
                />
              </div>
            </div>
            {coordsAutoFilled && (
              <p className="text-xs text-forest-600 flex items-center gap-1 -mt-2">
                <MapPin size={11} /> Coordinates auto-detected from address. You can edit them if needed.
              </p>
            )}

            <div className="flex gap-3">
              <button type="button" onClick={() => setStep(1)} className="btn-secondary flex-1">Back</button>
              <button type="button" onClick={() => setStep(3)} className="btn-primary flex-1 flex items-center justify-center gap-2">
                Next: Photos <ArrowRight size={16} />
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Photos */}
        {step === 3 && (
          <div className="card p-6 space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Property Photos <span className="text-gray-400 font-normal">(up to 10 images)</span>
              </label>

              <div {...getRootProps()} className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
                isDragActive ? 'border-forest-800 bg-forest-50' : 'border-gray-200 hover:border-forest-600 hover:bg-gray-50'
              }`}>
                <input {...getInputProps()} />
                <Upload size={28} className="mx-auto text-gray-300 mb-3" />
                <p className="text-sm font-medium text-gray-600">
                  {isDragActive ? 'Drop images here…' : 'Drag & drop or click to upload'}
                </p>
                <p className="text-xs text-gray-400 mt-1">JPG, PNG, WebP — max 10MB each</p>
              </div>

              {previews.length > 0 && (
                <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 mt-3">
                  {previews.map((src, i) => (
                    <div key={i} className="relative group rounded-xl overflow-hidden" style={{ aspectRatio: '1' }}>
                      <img src={src} alt="" className="w-full h-full object-cover" />
                      {i === 0 && (
                        <span className="absolute top-1 left-1 bg-forest-800 text-white text-xs px-1.5 py-0.5 rounded-md">Cover</span>
                      )}
                      <button type="button" onClick={() => removeImage(i)}
                        className="absolute top-1 right-1 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex gap-3">
              <button type="button" onClick={() => setStep(2)} className="btn-secondary flex-1">Back</button>
              <button type="button" onClick={() => setStep(4)} className="btn-primary flex-1 flex items-center justify-center gap-2">
                Review <ArrowRight size={16} />
              </button>
            </div>
          </div>
        )}

        {/* Step 4: Submit */}
        {step === 4 && (
          <div className="card p-6 space-y-5">
            <div className="text-center py-4">
              <CheckCircle2 size={48} className="text-forest-800 mx-auto mb-4" />
              <h3 className="font-display text-xl font-bold text-forest-900 mb-2">Ready to Publish!</h3>
              <p className="text-gray-500 text-sm">Your listing will be reviewed by our team and go live within 24 hours.</p>
            </div>

            <div className="bg-forest-50 rounded-xl p-4 text-sm text-forest-800 space-y-1.5">
              <p>✓ {images.length} photo{images.length !== 1 ? 's' : ''} selected</p>
              <p>✓ {amenities.length} amenities selected</p>
              <p>✓ Listing will be reviewed before going live</p>
            </div>

            <div className="flex gap-3">
              <button type="button" onClick={() => setStep(3)} className="btn-secondary flex-1">Back</button>
              <button type="submit" disabled={submitting} className="btn-primary flex-1">
                {submitting ? 'Publishing…' : '🏠 Publish Listing'}
              </button>
            </div>
          </div>
        )}
      </form>
    </div>
  );
}
