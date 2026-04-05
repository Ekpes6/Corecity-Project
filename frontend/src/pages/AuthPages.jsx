import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { Eye, EyeOff, Home } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { normalizePhone } from '../utils/nigeria';
import toast from 'react-hot-toast';

// ─── Login ────────────────────────────────────────────────────
export function LoginPage() {
  const { login, loading } = useAuth();
  const navigate = useNavigate();
  const [showPw, setShowPw] = useState(false);
  const { register, handleSubmit, formState: { errors } } = useForm();

  const onSubmit = async (data) => {
    const result = await login(data);
    if (result.success) {
      toast.success(`Welcome back! 🏠`);
      navigate(result.user.role === 'ADMIN' ? '/admin' : '/dashboard');
    } else {
      toast.error(result.error);
    }
  };

  return (
    <div className="min-h-screen bg-cream flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2 mb-6">
            <div className="w-10 h-10 bg-forest-800 rounded-xl flex items-center justify-center">
              <Home size={20} className="text-white" />
            </div>
            <span className="font-display font-bold text-2xl text-forest-900">
              Core<span className="text-clay-500">City</span>
            </span>
          </Link>
          <h1 className="font-display text-3xl font-bold text-forest-900">Welcome back</h1>
          <p className="text-gray-500 mt-2">Sign in to your account</p>
        </div>

        <div className="card p-8">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Email or Phone</label>
              <input type="text" {...register('emailOrPhone', { required: 'Required' })}
                placeholder="email@example.com or +2348012345678"
                className="input-field" />
              {errors.emailOrPhone && <p className="text-red-500 text-xs mt-1">{errors.emailOrPhone.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Password</label>
              <div className="relative">
                <input type={showPw ? 'text' : 'password'}
                  {...register('password', { required: 'Required' })}
                  placeholder="Your password"
                  className="input-field pr-10" />
                <button type="button" onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password.message}</p>}
            </div>

            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading ? 'Signing in…' : 'Sign In'}
            </button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-6">
            Don't have an account?{' '}
            <Link to="/register" className="text-forest-800 font-semibold hover:underline">Sign up</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── Register ─────────────────────────────────────────────────
export function RegisterPage() {
  const { register: authRegister, loading } = useAuth();
  const navigate    = useNavigate();
  const [searchParams] = useSearchParams();
  const [showPw, setShowPw] = useState(false);
  const defaultRole = searchParams.get('role') || 'BUYER';

  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm({
    defaultValues: { role: defaultRole }
  });

  const onSubmit = async (data) => {
    const payload = { ...data, phone: normalizePhone(data.phone) };
    const result = await authRegister(payload);
    if (result.success) {
      toast.success('Account created! Welcome to corecity 🏠');
      navigate('/dashboard');
    } else {
      toast.error(result.error);
    }
  };

  const ROLES = [
    { value: 'BUYER',  label: '🔍 Buyer',  desc: 'I want to find a home' },
    { value: 'SELLER', label: '🏠 Seller', desc: 'I want to sell/rent my property' },
    { value: 'AGENT',  label: '💼 Agent',  desc: 'I am a licensed property agent' },
  ];

  const role = watch('role');

  return (
    <div className="min-h-screen bg-cream flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2 mb-6">
            <div className="w-10 h-10 bg-forest-800 rounded-xl flex items-center justify-center">
              <Home size={20} className="text-white" />
            </div>
            <span className="font-display font-bold text-2xl text-forest-900">
              House<span className="text-clay-500">Link</span>
            </span>
          </Link>
          <h1 className="font-display text-3xl font-bold text-forest-900">Create your account</h1>
          <p className="text-gray-500 mt-2">Join thousands of Nigerians on corecity</p>
        </div>

        <div className="card p-8">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            {/* Role selector */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">I am a…</label>
              <div className="grid grid-cols-3 gap-2">
                {ROLES.map(({ value, label, desc }) => (
                  <button key={value} type="button" onClick={() => setValue('role', value)}
                    className={`p-3 rounded-xl border-2 text-left transition-all ${
                      role === value
                        ? 'border-forest-800 bg-forest-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}>
                    <div className="text-sm font-semibold">{label}</div>
                    <div className="text-xs text-gray-400 mt-0.5 leading-snug">{desc}</div>
                  </button>
                ))}
              </div>
              <input type="hidden" {...register('role')} />
            </div>

            {/* Name */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">First Name</label>
                <input {...register('firstName', { required: 'Required' })}
                  placeholder="Emeka" className="input-field" />
                {errors.firstName && <p className="text-red-500 text-xs mt-1">{errors.firstName.message}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Last Name</label>
                <input {...register('lastName', { required: 'Required' })}
                  placeholder="Obi" className="input-field" />
                {errors.lastName && <p className="text-red-500 text-xs mt-1">{errors.lastName.message}</p>}
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Email Address</label>
              <input type="email" {...register('email', { required: 'Required', pattern: { value: /\S+@\S+\.\S+/, message: 'Invalid email' } })}
                placeholder="emeka@example.com" className="input-field" />
              {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>}
            </div>

            {/* Phone */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Phone Number</label>
              <input type="tel" {...register('phone', { required: 'Required' })}
                placeholder="08012345678 or +2348012345678" className="input-field" />
              <p className="text-xs text-gray-400 mt-1">Nigerian numbers: 080, 081, 090, 070, etc.</p>
              {errors.phone && <p className="text-red-500 text-xs mt-1">{errors.phone.message}</p>}
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Password</label>
              <div className="relative">
                <input type={showPw ? 'text' : 'password'}
                  {...register('password', { required: 'Required', minLength: { value: 8, message: 'Min 8 characters' } })}
                  placeholder="At least 8 characters"
                  className="input-field pr-10" />
                <button type="button" onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password.message}</p>}
            </div>

            <p className="text-xs text-gray-400">
              By registering you agree to our{' '}
              <Link to="/terms" className="text-forest-700 underline">Terms</Link> and{' '}
              <Link to="/privacy" className="text-forest-700 underline">Privacy Policy</Link>.
            </p>

            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading ? 'Creating account…' : 'Create Account'}
            </button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-6">
            Already have an account?{' '}
            <Link to="/login" className="text-forest-800 font-semibold hover:underline">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
