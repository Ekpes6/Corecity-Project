import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Search, Home, CreditCard, CheckCircle, FileText, Upload,
  Users, Star, TrendingUp, Shield, ArrowRight, Award,
  Smartphone, Bell, Key, Handshake, BarChart3, Wallet,
  MapPin, Camera, ClipboardList, BadgeCheck, Zap, Lock,
  ChevronRight, Play, UserPlus, Building2, Eye,
} from 'lucide-react';

/* ─────────────────────────── tiny SVG illustrations ─────────────────────── */

function BuyerIllustration() {
  return (
    <svg viewBox="0 0 340 220" className="w-full max-w-sm mx-auto" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* sky bg */}
      <rect width="340" height="220" rx="16" fill="#EEF6EE"/>
      {/* clouds */}
      <ellipse cx="60" cy="40" rx="30" ry="14" fill="white" opacity=".8"/>
      <ellipse cx="80" cy="34" rx="22" ry="12" fill="white" opacity=".8"/>
      <ellipse cx="260" cy="55" rx="25" ry="12" fill="white" opacity=".7"/>
      <ellipse cx="280" cy="48" rx="18" ry="10" fill="white" opacity=".7"/>
      {/* ground */}
      <rect x="0" y="160" width="340" height="60" rx="0" fill="#7CB342" opacity=".25"/>
      {/* house body */}
      <rect x="110" y="110" width="120" height="90" rx="4" fill="#fff" stroke="#7CB342" strokeWidth="2"/>
      {/* roof */}
      <polygon points="100,112 170,60 240,112" fill="#2D5016" opacity=".85"/>
      {/* door */}
      <rect x="155" y="155" width="30" height="45" rx="3" fill="#E8824A"/>
      <circle cx="181" cy="178" r="3" fill="#fff"/>
      {/* windows */}
      <rect x="120" y="125" width="30" height="25" rx="2" fill="#BAE6FD" stroke="#7CB342" strokeWidth="1.5"/>
      <line x1="135" y1="125" x2="135" y2="150" stroke="#7CB342" strokeWidth="1"/>
      <line x1="120" y1="137" x2="150" y2="137" stroke="#7CB342" strokeWidth="1"/>
      <rect x="190" y="125" width="30" height="25" rx="2" fill="#BAE6FD" stroke="#7CB342" strokeWidth="1.5"/>
      <line x1="205" y1="125" x2="205" y2="150" stroke="#7CB342" strokeWidth="1"/>
      <line x1="190" y1="137" x2="220" y2="137" stroke="#7CB342" strokeWidth="1"/>
      {/* buyer figure */}
      <circle cx="54" cy="135" r="14" fill="#F5A623"/>
      <rect x="44" y="150" width="20" height="28" rx="4" fill="#2D5016"/>
      <line x1="44" y1="158" x2="34" y2="170" stroke="#2D5016" strokeWidth="3" strokeLinecap="round"/>
      <line x1="64" y1="158" x2="74" y2="170" stroke="#2D5016" strokeWidth="3" strokeLinecap="round"/>
      <line x1="47" y1="178" x2="43" y2="200" stroke="#2D5016" strokeWidth="3" strokeLinecap="round"/>
      <line x1="57" y1="178" x2="61" y2="200" stroke="#2D5016" strokeWidth="3" strokeLinecap="round"/>
      {/* speech bubble */}
      <rect x="72" y="108" width="80" height="34" rx="10" fill="white" stroke="#7CB342" strokeWidth="1.5"/>
      <polygon points="72,125 62,130 75,132" fill="white"/>
      <polygon points="72,125 62,130 75,132" stroke="#7CB342" strokeWidth="1" fill="white"/>
      <text x="112" y="128" textAnchor="middle" fontSize="11" fill="#2D5016" fontFamily="sans-serif">🔍 Find Home</text>
      {/* search icon badge */}
      <circle cx="290" cy="130" r="26" fill="#7CB342" opacity=".15"/>
      <circle cx="290" cy="130" r="18" fill="#7CB342"/>
      <circle cx="288" cy="128" r="7" fill="none" stroke="white" strokeWidth="2.5"/>
      <line x1="293" y1="133" x2="299" y2="139" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
      {/* keys */}
      <circle cx="295" cy="188" r="10" fill="#E8824A" opacity=".9"/>
      <rect x="300" y="185" width="14" height="6" rx="2" fill="#E8824A" opacity=".9"/>
      <rect x="309" y="187" width="4" height="4" rx="1" fill="white"/>
      <rect x="303" y="187" width="4" height="4" rx="1" fill="white"/>
      <circle cx="295" cy="188" r="4" fill="white"/>
      <circle cx="295" cy="188" r="1.5" fill="#E8824A"/>
    </svg>
  );
}

function SellerIllustration() {
  return (
    <svg viewBox="0 0 340 220" className="w-full max-w-sm mx-auto" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="340" height="220" rx="16" fill="#FFF7ED"/>
      {/* For Sale board */}
      <rect x="200" y="100" width="90" height="55" rx="6" fill="#E8824A"/>
      <rect x="200" y="100" width="90" height="55" rx="6" stroke="#C0621A" strokeWidth="2"/>
      <text x="245" y="122" textAnchor="middle" fontSize="11" fontWeight="bold" fill="white" fontFamily="sans-serif">FOR</text>
      <text x="245" y="138" textAnchor="middle" fontSize="11" fontWeight="bold" fill="white" fontFamily="sans-serif">SALE</text>
      <text x="245" y="150" textAnchor="middle" fontSize="9" fill="#FFD7A8" fontFamily="sans-serif">₦ 45,000,000</text>
      <line x1="245" y1="155" x2="245" y2="185" stroke="#C0621A" strokeWidth="3"/>
      {/* house */}
      <rect x="80" y="105" width="110" height="85" rx="4" fill="white" stroke="#E8824A" strokeWidth="2"/>
      <polygon points="68,107 135,58 202,107" fill="#C0621A" opacity=".8"/>
      <rect x="118" y="150" width="34" height="40" rx="3" fill="#7CB342"/>
      <circle cx="148" cy="171" r="3" fill="white"/>
      <rect x="88" y="118" width="26" height="22" rx="2" fill="#BAE6FD" stroke="#E8824A" strokeWidth="1.5"/>
      <rect x="152" y="118" width="26" height="22" rx="2" fill="#BAE6FD" stroke="#E8824A" strokeWidth="1.5"/>
      {/* seller figure */}
      <circle cx="44" cy="130" r="14" fill="#F5A623"/>
      <rect x="34" y="145" width="20" height="30" rx="4" fill="#E8824A"/>
      <line x1="34" y1="152" x2="24" y2="164" stroke="#E8824A" strokeWidth="3" strokeLinecap="round"/>
      {/* hand holding sign */}
      <line x1="54" y1="152" x2="67" y2="145" stroke="#E8824A" strokeWidth="3" strokeLinecap="round"/>
      <rect x="60" y="130" width="28" height="18" rx="3" fill="#7CB342"/>
      <text x="74" y="143" textAnchor="middle" fontSize="7" fill="white" fontFamily="sans-serif">LIST</text>
      <line x1="37" y1="175" x2="33" y2="198" stroke="#E8824A" strokeWidth="3" strokeLinecap="round"/>
      <line x1="47" y1="175" x2="51" y2="198" stroke="#E8824A" strokeWidth="3" strokeLinecap="round"/>
      {/* naira coins */}
      <circle cx="302" cy="145" r="16" fill="#F5A623"/>
      <text x="302" y="150" textAnchor="middle" fontSize="14" fontWeight="bold" fill="white" fontFamily="sans-serif">₦</text>
      <circle cx="280" cy="170" r="10" fill="#F5A623" opacity=".7"/>
      <circle cx="320" cy="170" r="10" fill="#F5A623" opacity=".7"/>
      <text x="280" y="175" textAnchor="middle" fontSize="10" fill="white" fontFamily="sans-serif">₦</text>
      <text x="320" y="175" textAnchor="middle" fontSize="10" fill="white" fontFamily="sans-serif">₦</text>
      {/* chart bars */}
      <rect x="275" y="95" width="12" height="35" rx="2" fill="#E8824A" opacity=".6"/>
      <rect x="292" y="80" width="12" height="50" rx="2" fill="#E8824A" opacity=".8"/>
      <rect x="309" y="65" width="12" height="65" rx="2" fill="#E8824A"/>
    </svg>
  );
}

function AgentIllustration() {
  return (
    <svg viewBox="0 0 340 220" className="w-full max-w-sm mx-auto" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="340" height="220" rx="16" fill="#F0F9FF"/>
      {/* badge */}
      <rect x="240" y="50" width="80" height="100" rx="10" fill="white" stroke="#2D5016" strokeWidth="2"/>
      <polygon points="280,55 280,48 270,58 280,68 290,58 280,48" fill="#7CB342"/>
      <circle cx="280" cy="85" r="18" fill="#7CB342" opacity=".15"/>
      <circle cx="280" cy="85" r="12" fill="#7CB342"/>
      <text x="280" y="90" textAnchor="middle" fontSize="14" fill="white" fontFamily="sans-serif">A</text>
      <text x="280" y="114" textAnchor="middle" fontSize="9" fill="#2D5016" fontFamily="sans-serif" fontWeight="bold">VERIFIED</text>
      <text x="280" y="126" textAnchor="middle" fontSize="8" fill="#666" fontFamily="sans-serif">AGENT</text>
      {/* properties grid */}
      <rect x="30" y="58" width="50" height="40" rx="4" fill="#fff" stroke="#7CB342" strokeWidth="1.5"/>
      <polygon points="28,60 55,40 82,60" fill="#2D5016" opacity=".7"/>
      <rect x="43" y="78" width="14" height="20" rx="2" fill="#E8824A"/>
      <rect x="90" y="68" width="50" height="40" rx="4" fill="#fff" stroke="#7CB342" strokeWidth="1.5"/>
      <polygon points="88,70 115,50 142,70" fill="#2D5016" opacity=".7"/>
      <rect x="103" y="88" width="14" height="20" rx="2" fill="#E8824A"/>
      {/* connecting lines to agent */}
      <line x1="80" y1="80" x2="140" y2="120" stroke="#7CB342" strokeWidth="1.5" strokeDasharray="4,3"/>
      <line x1="140" y1="90" x2="160" y2="120" stroke="#7CB342" strokeWidth="1.5" strokeDasharray="4,3"/>
      {/* agent figure */}
      <circle cx="155" cy="128" r="16" fill="#F5A623"/>
      <rect x="143" y="145" width="24" height="35" rx="5" fill="#2D5016"/>
      {/* briefcase */}
      <rect x="168" y="155" width="22" height="16" rx="3" fill="#E8824A"/>
      <rect x="172" y="152" width="14" height="5" rx="2" fill="#E8824A"/>
      <line x1="168" y1="163" x2="190" y2="163" stroke="white" strokeWidth="1"/>
      <line x1="179" y1="155" x2="179" y2="171" stroke="white" strokeWidth="1"/>
      <line x1="143" y1="153" x2="133" y2="164" stroke="#2D5016" strokeWidth="3" strokeLinecap="round"/>
      <line x1="167" y1="153" x2="168" y2="155" stroke="#2D5016" strokeWidth="3" strokeLinecap="round"/>
      <line x1="146" y1="180" x2="142" y2="200" stroke="#2D5016" strokeWidth="3" strokeLinecap="round"/>
      <line x1="160" y1="180" x2="164" y2="200" stroke="#2D5016" strokeWidth="3" strokeLinecap="round"/>
      {/* star rating */}
      {[0,1,2,3,4].map((i) => (
        <text key={i} x={70 + i*18} y="168" fontSize="13" fill="#F5A623" fontFamily="sans-serif">★</text>
      ))}
      <text x="105" y="182" textAnchor="middle" fontSize="9" fill="#666" fontFamily="sans-serif">Reputation: 94/100</text>
      {/* commission pill */}
      <rect x="202" y="170" width="120" height="28" rx="14" fill="#7CB342"/>
      <text x="262" y="188" textAnchor="middle" fontSize="11" fill="white" fontFamily="sans-serif">7% Commission</text>
    </svg>
  );
}

/* ─────────────────────── flow step connector ─────────────────────────────── */
function StepConnector({ color = '#7CB342' }) {
  return (
    <div className="hidden md:flex flex-col items-center justify-center py-2">
      <div className="w-px flex-1" style={{ background: `${color}40` }} />
      <ChevronRight size={20} style={{ color }} className="rotate-90 my-1" />
      <div className="w-px flex-1" style={{ background: `${color}40` }} />
    </div>
  );
}

/* ─────────────────────── single journey step card ──────────────────────── */
function StepCard({ step, icon: Icon, title, desc, color, accent, badge }) {
  return (
    <div className="relative flex flex-col items-center text-center group">
      {/* step number */}
      <div
        className="absolute -top-4 left-1/2 -translate-x-1/2 w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold shadow-md z-10"
        style={{ background: color }}
      >
        {step}
      </div>
      <div
        className="w-full rounded-2xl p-6 pt-8 shadow-sm border transition-all duration-300 group-hover:shadow-lg group-hover:-translate-y-1"
        style={{ borderColor: `${color}30`, background: `${accent}` }}
      >
        <div
          className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-sm"
          style={{ background: color }}
        >
          <Icon size={26} color="white" />
        </div>
        {badge && (
          <span className="inline-block mb-2 px-2 py-0.5 rounded-full text-xs font-semibold"
            style={{ background: `${color}20`, color }}>
            {badge}
          </span>
        )}
        <h4 className="font-bold text-gray-800 mb-2 text-base">{title}</h4>
        <p className="text-gray-500 text-sm leading-relaxed">{desc}</p>
      </div>
    </div>
  );
}

/* ─────────────────────── journey diagram (inline SVG) ───────────────────── */
function BuyerJourneyDiagram() {
  const steps = [
    { x: 50, label: 'Register', icon: '👤' },
    { x: 190, label: 'Search', icon: '🔍' },
    { x: 330, label: 'Enquire', icon: '💬' },
    { x: 470, label: 'Reserve', icon: '🔒' },
    { x: 610, label: 'Pay', icon: '💳' },
    { x: 750, label: 'Move In', icon: '🏠' },
  ];
  return (
    <svg viewBox="0 0 820 100" className="w-full" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* track */}
      <rect x="50" y="46" width="720" height="8" rx="4" fill="#7CB34220"/>
      <rect x="50" y="46" width="720" height="8" rx="4" fill="url(#buyerGrad)"/>
      <defs>
        <linearGradient id="buyerGrad" x1="50" y1="0" x2="770" y2="0" gradientUnits="userSpaceOnUse">
          <stop stopColor="#BAE6FD"/>
          <stop offset="1" stopColor="#7CB342"/>
        </linearGradient>
      </defs>
      {steps.map(({ x, label, icon }, i) => (
        <g key={i}>
          <circle cx={x} cy="50" r="22" fill="#7CB342" opacity={0.15 + i * 0.14}/>
          <circle cx={x} cy="50" r="16" fill="#7CB342"/>
          <text x={x} y="55" textAnchor="middle" fontSize="14" fontFamily="sans-serif">{icon}</text>
          <text x={x} y="88" textAnchor="middle" fontSize="10" fill="#2D5016" fontFamily="sans-serif" fontWeight="600">{label}</text>
        </g>
      ))}
    </svg>
  );
}

function SellerJourneyDiagram() {
  const steps = [
    { x: 50, label: 'Sign Up', icon: '✍️' },
    { x: 190, label: 'List', icon: '📋' },
    { x: 330, label: 'Upload', icon: '📷' },
    { x: 470, label: 'Verify', icon: '✅' },
    { x: 610, label: 'Negotiate', icon: '🤝' },
    { x: 750, label: 'Get Paid', icon: '💰' },
  ];
  return (
    <svg viewBox="0 0 820 100" className="w-full" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="50" y="46" width="720" height="8" rx="4" fill="url(#sellerGrad)"/>
      <defs>
        <linearGradient id="sellerGrad" x1="50" y1="0" x2="770" y2="0" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FDE68A"/>
          <stop offset="1" stopColor="#E8824A"/>
        </linearGradient>
      </defs>
      {steps.map(({ x, label, icon }, i) => (
        <g key={i}>
          <circle cx={x} cy="50" r="22" fill="#E8824A" opacity={0.12 + i * 0.14}/>
          <circle cx={x} cy="50" r="16" fill="#E8824A"/>
          <text x={x} y="55" textAnchor="middle" fontSize="14" fontFamily="sans-serif">{icon}</text>
          <text x={x} y="88" textAnchor="middle" fontSize="10" fill="#C0621A" fontFamily="sans-serif" fontWeight="600">{label}</text>
        </g>
      ))}
    </svg>
  );
}

function AgentJourneyDiagram() {
  const steps = [
    { x: 50, label: 'Register', icon: '👔' },
    { x: 190, label: 'Subscribe', icon: '🎫' },
    { x: 330, label: 'List Props', icon: '🏘️' },
    { x: 470, label: 'Get Leads', icon: '📈' },
    { x: 610, label: 'Close Deal', icon: '🔑' },
    { x: 750, label: 'Earn 7%', icon: '💎' },
  ];
  return (
    <svg viewBox="0 0 820 100" className="w-full" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="50" y="46" width="720" height="8" rx="4" fill="url(#agentGrad)"/>
      <defs>
        <linearGradient id="agentGrad" x1="50" y1="0" x2="770" y2="0" gradientUnits="userSpaceOnUse">
          <stop stopColor="#BAE6FD"/>
          <stop offset="1" stopColor="#2D5016"/>
        </linearGradient>
      </defs>
      {steps.map(({ x, label, icon }, i) => (
        <g key={i}>
          <circle cx={x} cy="50" r="22" fill="#2D5016" opacity={0.10 + i * 0.14}/>
          <circle cx={x} cy="50" r="16" fill="#2D5016"/>
          <text x={x} y="55" textAnchor="middle" fontSize="14" fontFamily="sans-serif">{icon}</text>
          <text x={x} y="88" textAnchor="middle" fontSize="10" fill="#2D5016" fontFamily="sans-serif" fontWeight="600">{label}</text>
        </g>
      ))}
    </svg>
  );
}

/* ─────────────────────── payment flow diagram ───────────────────────────── */
function PaymentFlowDiagram() {
  return (
    <svg viewBox="0 0 680 180" className="w-full max-w-2xl mx-auto" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* nodes */}
      {[
        { x: 60, y: 90, label: 'Buyer', sub: 'Initiates', color: '#7CB342', icon: '👤' },
        { x: 220, y: 90, label: 'Paystack', sub: 'Processes', color: '#00C3F0', icon: '💳' },
        { x: 380, y: 90, label: 'CoreCity', sub: 'Escrow', color: '#2D5016', icon: '🏛️' },
        { x: 540, y: 50, label: 'Agent', sub: '7% fee', color: '#E8824A', icon: '👔' },
        { x: 540, y: 140, label: 'Seller', sub: '93% payout', color: '#7CB342', icon: '🏠' },
      ].map(({ x, y, label, sub, color, icon }) => (
        <g key={label}>
          <circle cx={x} cy={y} r="36" fill={color} opacity=".12"/>
          <circle cx={x} cy={y} r="28" fill={color}/>
          <text x={x} y={y + 2} textAnchor="middle" fontSize="18" fontFamily="sans-serif">{icon}</text>
          <text x={x} y={y + 46} textAnchor="middle" fontSize="11" fill={color} fontFamily="sans-serif" fontWeight="700">{label}</text>
          <text x={x} y={y + 58} textAnchor="middle" fontSize="9" fill="#666" fontFamily="sans-serif">{sub}</text>
        </g>
      ))}
      {/* arrows */}
      <defs>
        <marker id="arr" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
          <path d="M0,0 L0,6 L8,3 z" fill="#7CB34280"/>
        </marker>
        <marker id="arr2" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
          <path d="M0,0 L0,6 L8,3 z" fill="#E8824A80"/>
        </marker>
      </defs>
      <line x1="92" y1="90" x2="185" y2="90" stroke="#7CB342" strokeWidth="2" markerEnd="url(#arr)" strokeDasharray="5,3"/>
      <line x1="252" y1="90" x2="345" y2="90" stroke="#7CB342" strokeWidth="2" markerEnd="url(#arr)" strokeDasharray="5,3"/>
      <line x1="408" y1="78" x2="510" y2="58" stroke="#E8824A" strokeWidth="2" markerEnd="url(#arr2)"/>
      <line x1="408" y1="100" x2="510" y2="138" stroke="#7CB342" strokeWidth="2" markerEnd="url(#arr)"/>
      {/* labels on arrows */}
      <text x="138" y="82" textAnchor="middle" fontSize="8" fill="#666" fontFamily="sans-serif">Pay ₦</text>
      <text x="298" y="82" textAnchor="middle" fontSize="8" fill="#666" fontFamily="sans-serif">Confirm</text>
    </svg>
  );
}

/* ─────────────────────── subscription plan cards ────────────────────────── */
const PLANS = [
  { name: 'Basic',     price: '₦10,000',    listings: 30,  color: '#7CB342', badge: null },
  { name: 'Standard', price: '₦30,000',    listings: 60,  color: '#E8824A', badge: 'Popular' },
  { name: 'Premium',  price: '₦100,000',   listings: 150, color: '#2D5016', badge: null },
  { name: 'Executive',price: '₦2,000,000', listings: 500, color: '#7B3FA0', badge: '🏆 Elite' },
];

/* ─────────────────────── tab config ─────────────────────────────────────── */
const TABS = [
  { key: 'buyer',  label: '🏠 I\'m a Buyer',  color: '#7CB342', accent: '#F0FDF0' },
  { key: 'seller', label: '🏗️ I\'m a Seller', color: '#E8824A', accent: '#FFF7ED' },
  { key: 'agent',  label: '🤝 I\'m an Agent',  color: '#2D5016', accent: '#F0F9F0' },
];

/* ─────────────────────── buyer steps ────────────────────────────────────── */
const BUYER_STEPS = [
  { step: 1, icon: UserPlus,      title: 'Create Free Account',    desc: 'Sign up with email & phone. Your identity is secured — no NIN/BVN required for buyers.', badge: 'Free', color: '#7CB342', accent: '#F0FDF0' },
  { step: 2, icon: Search,        title: 'Search Properties',       desc: 'Filter by state, LGA, type (buy/rent/short-let), price range, bedrooms, and amenities.', badge: null, color: '#7CB342', accent: '#F0FDF0' },
  { step: 3, icon: Eye,           title: 'View & Compare',          desc: 'Browse high-res photos, floor plans, virtual tours, and neighbourhood maps.', badge: null, color: '#7CB342', accent: '#F0FDF0' },
  { step: 4, icon: Bell,          title: 'Send Enquiry',            desc: 'Message the agent or owner directly from the listing page. Get fast responses.', badge: null, color: '#7CB342', accent: '#F0FDF0' },
  { step: 5, icon: Lock,          title: 'Reserve a Property',      desc: 'Pay ₦1,000 to lock a 5-day exclusive negotiation window — fully refundable.', badge: '₦1,000', color: '#7CB342', accent: '#F0FDF0' },
  { step: 6, icon: CreditCard,    title: 'Pay Securely via Paystack', desc: 'Complete purchase or rent payment with card, bank transfer, USSD, or QR code.', badge: 'Secure', color: '#7CB342', accent: '#F0FDF0' },
  { step: 7, icon: Key,           title: 'Get Your Keys',           desc: 'Receive digital transaction proof, and arrange physical handover with the seller.', badge: '🎉 Done!', color: '#7CB342', accent: '#F0FDF0' },
];

/* ─────────────────────── seller steps ──────────────────────────────────── */
const SELLER_STEPS = [
  { step: 1, icon: UserPlus,      title: 'Register as Seller',      desc: 'Create an account and choose the Seller role. Provide your NIN/BVN for verification.', badge: 'Verified', color: '#E8824A', accent: '#FFF7ED' },
  { step: 2, icon: FileText,      title: 'Create Your Listing',     desc: 'Fill in property details: type, price, bedrooms, address, LGA, amenities, and description.', badge: null, color: '#E8824A', accent: '#FFF7ED' },
  { step: 3, icon: Camera,        title: 'Upload Photos & Docs',    desc: 'Add up to 20 high-resolution images, videos, or virtual-tour links for your property.', badge: null, color: '#E8824A', accent: '#FFF7ED' },
  { step: 4, icon: BadgeCheck,    title: 'Pass Verification',       desc: 'Our team reviews your listing within 24 hrs. Once approved it goes ACTIVE immediately.', badge: '24h', color: '#E8824A', accent: '#FFF7ED' },
  { step: 5, icon: Handshake,     title: 'Negotiate with Buyers',   desc: 'Respond to enquiries and negotiate via the platform. Mark as "On Negotiation" to signal activity.', badge: null, color: '#E8824A', accent: '#FFF7ED' },
  { step: 6, icon: Wallet,        title: 'Receive Payment to Wallet', desc: 'Once the deal closes, 90%+ of the agreed amount is credited to your CoreCity wallet.', badge: '90%+', color: '#E8824A', accent: '#FFF7ED' },
  { step: 7, icon: Building2,     title: 'Request Withdrawal',      desc: 'Withdraw to any Nigerian bank account. Processing within 1–3 business days.', badge: '1-3 Days', color: '#E8824A', accent: '#FFF7ED' },
];

/* ─────────────────────── agent steps ───────────────────────────────────── */
const AGENT_STEPS = [
  { step: 1, icon: UserPlus,      title: 'Register as Agent',        desc: 'Sign up with the Agent role. Complete BVN/NIN verification to unlock full agent features.', badge: 'KYC', color: '#2D5016', accent: '#F0F9F0' },
  { step: 2, icon: Award,         title: 'Choose a Subscription',    desc: 'Pick Basic, Standard, Premium, or Executive. Plans unlock listing slots and boost visibility.', badge: 'Plans', color: '#2D5016', accent: '#F0F9F0' },
  { step: 3, icon: ClipboardList, title: 'List Client Properties',   desc: 'Add properties on behalf of owners. Manage all listings from your agent dashboard.', badge: null, color: '#2D5016', accent: '#F0F9F0' },
  { step: 4, icon: Users,         title: 'Receive Buyer Leads',      desc: 'Buyers send enquiries directly to you. Respond promptly to maintain your reputation score.', badge: null, color: '#2D5016', accent: '#F0F9F0' },
  { step: 5, icon: BarChart3,     title: 'Grow Your Reputation',     desc: 'Every successful deal earns reputation points. Hit 500 points to become an Executive Agent.', badge: '⭐ Score', color: '#2D5016', accent: '#F0F9F0' },
  { step: 6, icon: TrendingUp,    title: 'Close the Deal',           desc: 'Facilitate the transaction on-platform. Your 7% commission is automatically calculated.', badge: '7%', color: '#2D5016', accent: '#F0F9F0' },
  { step: 7, icon: Zap,           title: 'Access Agent Loans',       desc: 'Use our interest-free loan program to fund subscriptions — repaid from future commissions.', badge: '0% Interest', color: '#2D5016', accent: '#F0F9F0' },
];

/* ─────────────────────── feature compare table ──────────────────────────── */
const COMPARE = [
  { feature: 'Property Search',   buyer: true,  seller: false, agent: true  },
  { feature: 'List Properties',   buyer: false, seller: true,  agent: true  },
  { feature: 'Paystack Payments', buyer: true,  seller: true,  agent: true  },
  { feature: 'Wallet & Withdraw', buyer: false, seller: true,  agent: true  },
  { feature: 'Enquiry Messaging', buyer: true,  seller: true,  agent: true  },
  { feature: 'Commission (7%)',   buyer: false, seller: false, agent: true  },
  { feature: 'Loan Program',      buyer: false, seller: false, agent: true  },
  { feature: 'Reputation Score',  buyer: false, seller: false, agent: true  },
  { feature: 'Save Favourites',   buyer: true,  seller: false, agent: false },
  { feature: 'Reserve Property',  buyer: true,  seller: false, agent: false },
];

/* ═══════════════════════════════ PAGE ══════════════════════════════════════ */
export default function HowItWorksPage() {
  const [activeTab, setActiveTab] = useState('buyer');
  const tab = TABS.find((t) => t.key === activeTab);

  const steps =
    activeTab === 'buyer'  ? BUYER_STEPS  :
    activeTab === 'seller' ? SELLER_STEPS :
    AGENT_STEPS;

  const Diagram =
    activeTab === 'buyer'  ? BuyerJourneyDiagram  :
    activeTab === 'seller' ? SellerJourneyDiagram :
    AgentJourneyDiagram;

  const Illustration =
    activeTab === 'buyer'  ? BuyerIllustration  :
    activeTab === 'seller' ? SellerIllustration :
    AgentIllustration;

  return (
    <div className="page-enter">

      {/* ── HERO ─────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-forest-900 text-white py-24">
        <div className="absolute inset-0 opacity-10"
          style={{ backgroundImage: 'radial-gradient(circle at 15% 60%, #7CB342 0%, transparent 55%), radial-gradient(circle at 85% 20%, #E8824A 0%, transparent 45%)' }}/>
        {/* decorative dots grid */}
        <div className="absolute inset-0 opacity-5"
          style={{ backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)', backgroundSize: '28px 28px' }}/>

        <div className="relative max-w-5xl mx-auto px-6 text-center">
          <div className="inline-flex items-center gap-2 bg-white/10 border border-white/20 rounded-full px-4 py-1.5 text-sm mb-6">
            <Play size={14} className="text-green-400"/>
            Interactive Onboarding Guide
          </div>
          <h1 className="font-display text-4xl md:text-6xl font-bold leading-tight mb-6">
            How CoreCity Works
          </h1>
          <p className="text-white/70 text-lg md:text-xl max-w-2xl mx-auto mb-10">
            Nigeria's smartest property marketplace — whether you're buying your dream home,
            selling land, or growing your agency business.
          </p>

          {/* quick role pills */}
          <div className="flex flex-wrap justify-center gap-3">
            {TABS.map((t) => (
              <button key={t.key}
                onClick={() => setActiveTab(t.key)}
                className="px-5 py-2.5 rounded-full font-semibold text-sm transition-all duration-200"
                style={activeTab === t.key
                  ? { background: t.color, color: '#fff', boxShadow: `0 4px 20px ${t.color}60` }
                  : { background: 'rgba(255,255,255,0.1)', color: '#ffffffaa', border: '1px solid rgba(255,255,255,0.15)' }
                }
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ── ROLE OVERVIEW CARDS ──────────────────────────────────────────── */}
      <section className="max-w-6xl mx-auto px-6 py-16">
        <div className="text-center mb-12">
          <p className="text-clay-500 font-semibold text-sm uppercase tracking-wide mb-2">Who is CoreCity For?</p>
          <h2 className="section-title">Three Ways to Use the Platform</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Buyer card */}
          <div
            className="group rounded-3xl overflow-hidden shadow-card hover:shadow-lift transition-all duration-300 hover:-translate-y-1 cursor-pointer border"
            style={{ borderColor: activeTab === 'buyer' ? '#7CB342' : 'transparent' }}
            onClick={() => setActiveTab('buyer')}
          >
            <div className="bg-forest-50 p-6">
              <BuyerIllustration />
            </div>
            <div className="p-6 bg-white">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: '#7CB342' }}>
                  <Home size={18} color="white"/>
                </div>
                <h3 className="font-display font-bold text-xl text-forest-900">Buyers</h3>
              </div>
              <p className="text-gray-500 text-sm leading-relaxed mb-4">
                Search over <strong>12,000+</strong> verified properties across all 36 Nigerian states.
                Pay securely via Paystack and move in with confidence.
              </p>
              <ul className="space-y-1.5 text-sm text-gray-600">
                {['Browse for free — no subscription','Reserve with just ₦1,000','Paystack-secured payments','Save & compare favourites'].map((f) => (
                  <li key={f} className="flex items-center gap-2">
                    <CheckCircle size={14} className="text-forest-800 shrink-0"/>
                    {f}
                  </li>
                ))}
              </ul>
              <button onClick={() => setActiveTab('buyer')}
                className="mt-5 w-full py-2.5 rounded-xl font-semibold text-sm text-white transition-all"
                style={{ background: '#7CB342' }}>
                See Buyer Journey <ArrowRight size={14} className="inline ml-1"/>
              </button>
            </div>
          </div>

          {/* Seller card */}
          <div
            className="group rounded-3xl overflow-hidden shadow-card hover:shadow-lift transition-all duration-300 hover:-translate-y-1 cursor-pointer border"
            style={{ borderColor: activeTab === 'seller' ? '#E8824A' : 'transparent' }}
            onClick={() => setActiveTab('seller')}
          >
            <div className="p-6" style={{ background: '#FFF7ED' }}>
              <SellerIllustration />
            </div>
            <div className="p-6 bg-white">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: '#E8824A' }}>
                  <Upload size={18} color="white"/>
                </div>
                <h3 className="font-display font-bold text-xl text-forest-900">Sellers</h3>
              </div>
              <p className="text-gray-500 text-sm leading-relaxed mb-4">
                List your property and reach <strong>8,000+</strong> active buyers.
                Get verified, negotiate, and receive payment directly to your wallet.
              </p>
              <ul className="space-y-1.5 text-sm text-gray-600">
                {['List in under 10 minutes','Verified listings get 5× more views','Negotiate on-platform','Bank withdrawal in 1–3 days'].map((f) => (
                  <li key={f} className="flex items-center gap-2">
                    <CheckCircle size={14} style={{ color: '#E8824A' }} className="shrink-0"/>
                    {f}
                  </li>
                ))}
              </ul>
              <button onClick={() => setActiveTab('seller')}
                className="mt-5 w-full py-2.5 rounded-xl font-semibold text-sm text-white transition-all"
                style={{ background: '#E8824A' }}>
                See Seller Journey <ArrowRight size={14} className="inline ml-1"/>
              </button>
            </div>
          </div>

          {/* Agent card */}
          <div
            className="group rounded-3xl overflow-hidden shadow-card hover:shadow-lift transition-all duration-300 hover:-translate-y-1 cursor-pointer border"
            style={{ borderColor: activeTab === 'agent' ? '#2D5016' : 'transparent' }}
            onClick={() => setActiveTab('agent')}
          >
            <div className="p-6" style={{ background: '#F0F9F0' }}>
              <AgentIllustration />
            </div>
            <div className="p-6 bg-white">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: '#2D5016' }}>
                  <Star size={18} color="white"/>
                </div>
                <h3 className="font-display font-bold text-xl text-forest-900">Agents</h3>
              </div>
              <p className="text-gray-500 text-sm leading-relaxed mb-4">
                Grow your real-estate business with <strong>1,800+</strong> verified agents already on the platform.
                Earn 7% commission and access interest-free loans.
              </p>
              <ul className="space-y-1.5 text-sm text-gray-600">
                {['7% commission per deal','Flexible subscription plans','0% interest loan program','Executive Agent status rewards'].map((f) => (
                  <li key={f} className="flex items-center gap-2">
                    <CheckCircle size={14} style={{ color: '#2D5016' }} className="shrink-0"/>
                    {f}
                  </li>
                ))}
              </ul>
              <button onClick={() => setActiveTab('agent')}
                className="mt-5 w-full py-2.5 rounded-xl font-semibold text-sm text-white transition-all"
                style={{ background: '#2D5016' }}>
                See Agent Journey <ArrowRight size={14} className="inline ml-1"/>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ── STEP-BY-STEP JOURNEY ─────────────────────────────────────────── */}
      <section className="py-20" style={{ background: tab.accent }}>
        <div className="max-w-6xl mx-auto px-6">
          {/* tab switcher */}
          <div className="flex justify-center mb-10">
            <div className="inline-flex bg-white rounded-2xl p-1.5 shadow-sm gap-1">
              {TABS.map((t) => (
                <button key={t.key}
                  onClick={() => setActiveTab(t.key)}
                  className="px-5 py-2.5 rounded-xl font-semibold text-sm transition-all duration-200"
                  style={activeTab === t.key
                    ? { background: t.color, color: '#fff' }
                    : { color: '#6b7280' }
                  }
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <div className="text-center mb-12">
            <h2 className="font-display text-3xl md:text-4xl font-bold text-forest-900 mb-4">
              {activeTab === 'buyer'  ? '🏠 Your Path to Finding a Home'  :
               activeTab === 'seller' ? '🏗️ Your Path to Selling a Property' :
               '🤝 Your Path to Building an Agency'}
            </h2>
            <p className="text-gray-500 max-w-xl mx-auto">
              Follow these simple steps to get started on CoreCity.
            </p>
          </div>

          {/* journey diagram */}
          <div className="bg-white rounded-2xl p-6 shadow-sm mb-12 overflow-x-auto">
            <Diagram />
          </div>

          {/* illustration */}
          <div className="mb-12 max-w-md mx-auto">
            <Illustration />
          </div>

          {/* step cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 mt-4">
            {steps.map((s) => (
              <StepCard key={s.step} {...s} />
            ))}
          </div>
        </div>
      </section>

      {/* ── PAYMENT FLOW DIAGRAM ─────────────────────────────────────────── */}
      <section className="max-w-6xl mx-auto px-6 py-20">
        <div className="text-center mb-10">
          <p className="text-clay-500 font-semibold text-sm uppercase tracking-wide mb-2">Transparent & Secure</p>
          <h2 className="section-title">How Your Money Moves</h2>
          <p className="text-gray-500 max-w-xl mx-auto mt-2">
            Every payment flows through Paystack — Nigeria's most trusted payment gateway.
            CoreCity acts as an escrow before disbursing to seller and agent.
          </p>
        </div>

        <div className="bg-white rounded-3xl shadow-card p-8 border border-gray-100">
          <PaymentFlowDiagram />

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-10 pt-8 border-t border-gray-100">
            {[
              { icon: Shield,   color: '#7CB342', title: 'Paystack Security',  desc: 'PCI-DSS Level 1 certified. Your card data is never stored on CoreCity servers.' },
              { icon: Wallet,   color: '#E8824A', title: 'Instant Settlement', desc: 'Seller wallet credited within seconds of a successful transaction confirmation.' },
              { icon: TrendingUp,color: '#2D5016',title: 'Auto Commission',   desc: '7% agent + 3% CoreCity fee auto-calculated and split on every completed deal.' },
            ].map(({ icon: Icon, color, title, desc }) => (
              <div key={title} className="flex gap-4">
                <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${color}15` }}>
                  <Icon size={20} style={{ color }}/>
                </div>
                <div>
                  <h4 className="font-semibold text-forest-900 mb-1 text-sm">{title}</h4>
                  <p className="text-gray-500 text-xs leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── AGENT SUBSCRIPTION PLANS ─────────────────────────────────────── */}
      <section className="bg-forest-900 text-white py-20">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-12">
            <p className="text-clay-400 font-semibold text-sm uppercase tracking-wide mb-2">For Agents</p>
            <h2 className="font-display text-3xl md:text-4xl font-bold mb-4">Agent Subscription Plans</h2>
            <p className="text-white/60 max-w-xl mx-auto">
              Choose a plan that matches your business scale. All plans include access to the
              loan program — upgrade seamlessly as you grow.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {PLANS.map(({ name, price, listings, color, badge }) => (
              <div key={name}
                className="relative rounded-2xl p-6 border transition-all duration-300 hover:-translate-y-1"
                style={{ background: 'rgba(255,255,255,0.06)', borderColor: `${color}50` }}>
                {badge && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-xs font-bold text-white"
                    style={{ background: color }}>
                    {badge}
                  </div>
                )}
                <div className="w-12 h-12 rounded-xl mb-4 flex items-center justify-center" style={{ background: `${color}25` }}>
                  <Award size={22} style={{ color }}/>
                </div>
                <h3 className="font-display font-bold text-xl mb-1">{name}</h3>
                <p className="text-2xl font-bold mb-1" style={{ color }}>{price}</p>
                <p className="text-white/50 text-xs mb-4">per month</p>
                <div className="border-t border-white/10 pt-4 space-y-2">
                  <div className="flex items-center gap-2 text-sm text-white/70">
                    <CheckCircle size={13} style={{ color }}/>
                    {listings === 999 ? 'Unlimited' : `${listings} listings`}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-white/70">
                    <CheckCircle size={13} style={{ color }}/>
                    7% commission per deal
                  </div>
                  <div className="flex items-center gap-2 text-sm text-white/70">
                    <CheckCircle size={13} style={{ color }}/>
                    {name === 'Executive' ? 'VIP support + badge' : 'Loan program access'}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* loan program explainer */}
          <div className="mt-14 bg-white/5 border border-white/10 rounded-2xl p-8">
            <div className="flex flex-col md:flex-row gap-8 items-start">
              <div className="shrink-0">
                <svg viewBox="0 0 160 120" className="w-40" fill="none" xmlns="http://www.w3.org/2000/svg">
                  {/* loan progression ladder */}
                  {[
                    { y: 90, w: 120, label: 'BASIC', color: '#7CB342' },
                    { y: 62, w: 100, label: 'STANDARD', color: '#E8824A' },
                    { y: 34, w: 80, label: 'PREMIUM', color: '#2D5016' },
                  ].map(({ y, w, label, color }) => (
                    <g key={label}>
                      <rect x={(160 - w) / 2} y={y} width={w} height="22" rx="5" fill={color}/>
                      <text x="80" y={y + 15} textAnchor="middle" fontSize="9" fill="white" fontWeight="bold" fontFamily="sans-serif">{label}</text>
                    </g>
                  ))}
                  <text x="80" y="14" textAnchor="middle" fontSize="8" fill="#7CB342" fontFamily="sans-serif">13 Repayment Trials</text>
                  <text x="80" y="26" textAnchor="middle" fontSize="8" fill="white" opacity=".5" fontFamily="sans-serif">Interest-Free Progression</text>
                </svg>
              </div>
              <div>
                <h3 className="font-display font-bold text-xl mb-3 text-white">🏦 Interest-Free Loan Program</h3>
                <p className="text-white/60 text-sm leading-relaxed mb-4">
                  New agents can access an interest-free loan to fund their first subscription.
                  Progress through <strong className="text-white">Basic → Standard → Premium</strong> with up to 13 repayment
                  trials per level — paid from your commission earnings. Executive plan is self-funded only.
                </p>
                <div className="flex flex-wrap gap-3">
                  {['0% Interest', '13 Trials/Level', 'Commission-Backed', 'Auto-Progression'].map((tag) => (
                    <span key={tag} className="px-3 py-1 rounded-full text-xs font-semibold bg-white/10 text-white/80">{tag}</span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── FEATURE COMPARISON ───────────────────────────────────────────── */}
      <section className="max-w-5xl mx-auto px-6 py-20">
        <div className="text-center mb-10">
          <p className="text-clay-500 font-semibold text-sm uppercase tracking-wide mb-2">At a Glance</p>
          <h2 className="section-title">Feature Comparison</h2>
        </div>

        <div className="bg-white rounded-2xl shadow-card border border-gray-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left p-5 text-gray-500 font-semibold w-2/5">Feature</th>
                <th className="p-5 text-center" style={{ color: '#7CB342' }}>
                  <Home size={16} className="inline mb-1"/> Buyer
                </th>
                <th className="p-5 text-center" style={{ color: '#E8824A' }}>
                  <Upload size={16} className="inline mb-1"/> Seller
                </th>
                <th className="p-5 text-center" style={{ color: '#2D5016' }}>
                  <Star size={16} className="inline mb-1"/> Agent
                </th>
              </tr>
            </thead>
            <tbody>
              {COMPARE.map(({ feature, buyer, seller, agent }, i) => (
                <tr key={feature} className={`border-b border-gray-50 ${i % 2 === 0 ? 'bg-gray-50/30' : ''}`}>
                  <td className="p-5 text-gray-700 font-medium">{feature}</td>
                  <td className="p-5 text-center">
                    {buyer  ? <CheckCircle size={18} style={{ color: '#7CB342' }} className="mx-auto"/> : <span className="text-gray-200">—</span>}
                  </td>
                  <td className="p-5 text-center">
                    {seller ? <CheckCircle size={18} style={{ color: '#E8824A' }} className="mx-auto"/> : <span className="text-gray-200">—</span>}
                  </td>
                  <td className="p-5 text-center">
                    {agent  ? <CheckCircle size={18} style={{ color: '#2D5016' }} className="mx-auto"/> : <span className="text-gray-200">—</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* ── TRUST SIGNALS ────────────────────────────────────────────────── */}
      <section className="bg-forest-50 py-16">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-10">
            <h2 className="section-title">Built for Trust</h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[
              { icon: Shield,      color: '#7CB342', stat: 'BVN + NIN',     label: 'Identity Verified' },
              { icon: Lock,        color: '#E8824A', stat: 'Paystack',       label: 'PCI-DSS Payments'  },
              { icon: BadgeCheck,  color: '#2D5016', stat: '< 24h',          label: 'Listing Review'    },
              { icon: Smartphone,  color: '#7B3FA0', stat: 'In-App + Email', label: 'Real-Time Alerts'  },
            ].map(({ icon: Icon, color, stat, label }) => (
              <div key={label} className="bg-white rounded-2xl p-6 text-center shadow-sm border border-gray-100">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-3" style={{ background: `${color}15` }}>
                  <Icon size={26} style={{ color }}/>
                </div>
                <p className="font-bold text-lg text-forest-900">{stat}</p>
                <p className="text-gray-500 text-xs">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────────────────────── */}
      <section className="py-20 bg-white">
        <div className="max-w-3xl mx-auto text-center px-6">
          <h2 className="font-display text-4xl font-bold text-forest-900 mb-4">Ready to Get Started?</h2>
          <p className="text-gray-500 mb-10 text-lg">
            Join thousands of Nigerians who buy, sell, and let property through CoreCity every day.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/register?role=BUYER"  className="btn-primary px-8">Find a Property 🏠</Link>
            <Link to="/register?role=SELLER" className="btn-secondary px-8">List My Property 🏗️</Link>
            <Link to="/register?role=AGENT"  className="btn-clay px-8">Become an Agent 🤝</Link>
          </div>
          <p className="text-gray-400 text-xs mt-6">
            Registration is free. No credit card required to browse.
          </p>
        </div>
      </section>
    </div>
  );
}
