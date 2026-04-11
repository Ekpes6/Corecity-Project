const DEMO_PROPERTIES = [
  {
    id: 8001,
    title: '4 Bedroom Duplex with BQ in Lekki Phase 1',
    description: 'Contemporary family duplex with fitted kitchen, cinema room, solar backup, and secure estate access.',
    propertyType: 'DUPLEX',
    listingType: 'FOR_SALE',
    price: 285000000,
    pricePeriod: 'OUTRIGHT',
    bedrooms: 4,
    bathrooms: 4,
    toilets: 5,
    sizeSqm: 340,
    address: 'Admiralty Way, Lekki Phase 1, Lagos',
    stateId: 25,
    lgaId: null,
    latitude: 6.4474,
    longitude: 3.4729,
    ownerId: 9001,
    status: 'ACTIVE',
    negotiable: true,
    amenities: ['BOREHOLE', 'SECURITY', 'PARKING'],
    imageUrls: [
      'https://images.unsplash.com/photo-1600585154526-990dced4db0d?w=1200&q=80',
      'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=1200&q=80',
    ],
    primaryImageUrl: 'https://images.unsplash.com/photo-1600585154526-990dced4db0d?w=1200&q=80',
    viewsCount: 148,
    createdAt: '2026-04-07T10:00:00Z',
  },
  {
    id: 8002,
    title: 'Serviced 3 Bedroom Apartment in Wuse 2',
    description: 'Move-in ready apartment with elevator access, gym, and 24-hour power in a central Abuja location.',
    propertyType: 'APARTMENT',
    listingType: 'FOR_RENT',
    price: 18500000,
    pricePeriod: 'PER_YEAR',
    bedrooms: 3,
    bathrooms: 3,
    toilets: 4,
    sizeSqm: 185,
    address: 'Wuse 2, Abuja',
    stateId: 15,
    lgaId: null,
    latitude: 9.0765,
    longitude: 7.3986,
    ownerId: 9001,
    status: 'ACTIVE',
    negotiable: false,
    amenities: ['GYM', 'SECURITY'],
    imageUrls: ['https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=1200&q=80'],
    primaryImageUrl: 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=1200&q=80',
    viewsCount: 93,
    createdAt: '2026-04-04T10:00:00Z',
  },
  {
    id: 8003,
    title: 'Luxury Waterfront Short Let in Old GRA',
    description: 'Premium furnished short-let apartment with smart access, poolside lounge, and fast internet for executives.',
    propertyType: 'APARTMENT',
    listingType: 'SHORT_LET',
    price: 240000,
    pricePeriod: 'PER_NIGHT',
    bedrooms: 2,
    bathrooms: 2,
    toilets: 3,
    sizeSqm: 128,
    address: 'Old GRA, Port Harcourt, Rivers',
    stateId: 33,
    lgaId: null,
    latitude: 4.8156,
    longitude: 7.0498,
    ownerId: 9001,
    status: 'ACTIVE',
    negotiable: true,
    amenities: ['INTERNET', 'SECURITY'],
    imageUrls: ['https://images.unsplash.com/photo-1494526585095-c41746248156?w=1200&q=80'],
    primaryImageUrl: 'https://images.unsplash.com/photo-1494526585095-c41746248156?w=1200&q=80',
    viewsCount: 211,
    createdAt: '2026-04-01T10:00:00Z',
  },
  {
    id: 8004,
    title: 'Commercial Corner Plot on Freedom Way',
    description: 'High-visibility commercial land suitable for offices, retail, or mixed-use development in a prime corridor.',
    propertyType: 'COMMERCIAL',
    listingType: 'FOR_SALE',
    price: 420000000,
    pricePeriod: 'OUTRIGHT',
    bedrooms: 0,
    bathrooms: 0,
    toilets: 0,
    sizeSqm: 920,
    address: 'Freedom Way, Lekki, Lagos',
    stateId: 25,
    lgaId: null,
    latitude: 6.435,
    longitude: 3.4521,
    ownerId: 9001,
    status: 'ACTIVE',
    negotiable: true,
    amenities: ['SECURITY'],
    imageUrls: ['https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=1200&q=80'],
    primaryImageUrl: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=1200&q=80',
    viewsCount: 64,
    createdAt: '2026-03-30T10:00:00Z',
  },
];

function matchesKeyword(property, keyword) {
  if (!keyword) return true;
  const query = keyword.toLowerCase();
  return property.title.toLowerCase().includes(query) || property.address.toLowerCase().includes(query);
}

export function getDemoFeaturedProperties() {
  return DEMO_PROPERTIES.slice(0, 4);
}

export function searchDemoProperties(filters = {}) {
  const filtered = DEMO_PROPERTIES.filter((property) => {
    if (filters.listingType && property.listingType !== filters.listingType) return false;
    if (filters.propertyType && property.propertyType !== filters.propertyType) return false;
    if (filters.stateId && String(property.stateId) !== String(filters.stateId)) return false;
    if (filters.bedrooms && Number(property.bedrooms) < Number(filters.bedrooms)) return false;
    if (filters.minPrice && Number(property.price) < Number(filters.minPrice)) return false;
    if (filters.maxPrice && Number(property.price) > Number(filters.maxPrice)) return false;
    return matchesKeyword(property, filters.keyword);
  });

  return {
    content: filtered,
    totalPages: filtered.length > 0 ? 1 : 0,
    totalElements: filtered.length,
  };
}

export function getDemoProperty(propertyId) {
  return DEMO_PROPERTIES.find((property) => String(property.id) === String(propertyId)) ?? null;
}