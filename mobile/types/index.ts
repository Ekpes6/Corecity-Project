// ─── Shared TypeScript types for CoreCity Mobile ─────────────────────────────

export interface User {
  id: number;
  email: string;
  phone: string;
  firstName: string;
  lastName: string;
  role: 'BUYER' | 'SELLER' | 'AGENT' | 'ADMIN';
  isVerified: boolean;
  avatarUrl?: string;
  reputationScore: number;
  isExecutiveAgent: boolean;
  accountStatus: 'ACTIVE' | 'SUSPENDED' | 'TERMINATED';
  emailVerified: boolean;
  createdAt: string;
}

export interface PropertyFile {
  id: number;
  propertyId: number;
  fileUrl: string;
  fileType: 'IMAGE' | 'VIDEO' | 'DOCUMENT' | 'VIRTUAL_TOUR';
  isPrimary: boolean;
}

export interface Property {
  id: number;
  title: string;
  description?: string;
  propertyType: string;
  listingType: 'FOR_SALE' | 'FOR_RENT' | 'SHORT_LET';
  price: number;
  pricePeriod: 'OUTRIGHT' | 'PER_YEAR' | 'PER_MONTH' | 'PER_NIGHT';
  bedrooms: number;
  bathrooms: number;
  toilets: number;
  sizeSqm?: number;
  address: string;
  stateId?: number;
  lgaId?: number;
  stateName?: string;
  lgaName?: string;
  latitude?: number;
  longitude?: number;
  ownerId: number;
  agentId?: number;
  ownerName?: string;
  agentName?: string;
  status: 'DRAFT' | 'PENDING' | 'ACTIVE' | 'ON_NEGOTIATION' | 'SOLD' | 'RENTED' | 'INACTIVE' | 'REJECTED';
  isNegotiable: boolean;
  amenities?: string[];
  viewsCount: number;
  files?: PropertyFile[];
  createdAt: string;
  updatedAt: string;
}

export interface SearchParams {
  keyword?: string;
  listingType?: string;
  propertyType?: string;
  stateId?: number | string;
  lgaId?: number | string;
  minPrice?: number | string;
  maxPrice?: number | string;
  bedrooms?: number | string;
  page?: number;
  size?: number;
}

export interface PagedResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
  last: boolean;
}

export interface Wallet {
  id: number;
  userId: number;
  balance: number;
  currency: string;
}

export interface WalletTransaction {
  id: number;
  walletId: number;
  type: 'CREDIT' | 'DEBIT';
  amount: number;
  reference: string;
  description?: string;
  status: 'PENDING' | 'SUCCESSFUL' | 'FAILED';
  createdAt: string;
}

export interface AppNotification {
  id: number;
  userId: number;
  title: string;
  body: string;
  type: string;
  isRead: boolean;
  createdAt: string;
}

export interface Enquiry {
  id: number;
  propertyId: number;
  senderId: number;
  message: string;
  status: 'NEW' | 'READ' | 'REPLIED';
  createdAt: string;
}

export interface State {
  id: number;
  name: string;
}

export interface Lga {
  id: number;
  stateId: number;
  name: string;
}
