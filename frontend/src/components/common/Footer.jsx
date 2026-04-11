import React from 'react';
import { Link } from 'react-router-dom';
import { Home, Phone, Mail, MapPin, Facebook, Twitter, Instagram, Youtube } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-forest-900 text-white mt-24">
      <div className="max-w-7xl mx-auto px-6 py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12">

          {/* Brand */}
          <div className="md:col-span-1">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-9 h-9 bg-white/10 rounded-xl flex items-center justify-center">
                <Home size={18} className="text-white" />
              </div>
              <span className="font-display font-bold text-xl">
                Core<span className="text-clay-500">City</span>
              </span>
            </div>
            <p className="text-white/60 text-sm leading-relaxed mb-6">
              Nigeria's most trusted real estate platform. Find your dream home, 
              list your property, and transact securely.
            </p>
            <div className="flex gap-3">
              {[Facebook, Twitter, Instagram, Youtube].map((Icon, i) => (
                <a key={i} href="#"
                  className="w-9 h-9 bg-white/10 rounded-lg flex items-center justify-center hover:bg-white/20 transition-colors">
                  <Icon size={16} />
                </a>
              ))}
            </div>
          </div>

          {/* Quick links */}
          <div>
            <h4 className="font-semibold mb-4 text-white/90">Explore</h4>
            <ul className="space-y-2.5">
              {[
                ['Browse Properties', '/properties'],
                ['For Sale',          '/properties?listingType=FOR_SALE'],
                ['For Rent',          '/properties?listingType=FOR_RENT'],
                ['Short Let',         '/properties?listingType=SHORT_LET'],
                ['New Developments',  '/properties?sortBy=createdAt'],
              ].map(([label, to]) => (
                <li key={to}>
                  <Link to={to} className="text-white/60 hover:text-white text-sm transition-colors">
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Popular cities */}
          <div>
            <h4 className="font-semibold mb-4 text-white/90">Popular Cities</h4>
            <ul className="space-y-2.5">
              {[
                ['Lagos',         25],
                ['Abuja (FCT)',   15],
                ['Port Harcourt', 33],
                ['Kano',          20],
                ['Ibadan',        31],
                ['Benin City',    12],
              ].map(([city, stateId]) => (
                <li key={stateId}>
                  <Link to={`/properties?stateId=${stateId}`}
                    className="text-white/60 hover:text-white text-sm transition-colors">
                    {city}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="font-semibold mb-4 text-white/90">Contact Us</h4>
            <ul className="space-y-3">
              <li className="flex items-start gap-3 text-sm text-white/60">
                <MapPin size={16} className="mt-0.5 shrink-0 text-clay-500" />
                12 Marina Road, Lagos Island, Lagos State
              </li>
              <li className="flex items-center gap-3 text-sm text-white/60">
                <Phone size={16} className="shrink-0 text-clay-500" />
                +234 800 Corecity
              </li>
              <li className="flex items-center gap-3 text-sm text-white/60">
                <Mail size={16} className="shrink-0 text-clay-500" />
                support@corecity.com.ng
              </li>
            </ul>

            <div className="mt-6 p-3 bg-white/5 rounded-xl border border-white/10">
              <p className="text-xs text-white/40 uppercase tracking-wide mb-1">Business Hours</p>
              <p className="text-sm text-white/70">Mon – Fri: 8am – 6pm WAT</p>
              <p className="text-sm text-white/70">Sat: 9am – 3pm WAT</p>
            </div>
          </div>
        </div>

        <div className="border-t border-white/10 mt-12 pt-6 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-white/40 text-sm">
            © {new Date().getFullYear()} Corecity Nigeria Ltd. All rights reserved.
          </p>
          <div className="flex gap-6">
            {['Privacy Policy', 'Terms of Use', 'Cookie Policy'].map((t) => (
              <Link key={t} to="#" className="text-white/40 hover:text-white/70 text-xs transition-colors">
                {t}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
