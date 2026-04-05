import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import Navbar from './components/common/Navbar';
import Footer from './components/common/Footer';
import HomePage          from './pages/HomePage';
import PropertiesPage    from './pages/PropertiesPage';
import PropertyDetailPage from './pages/PropertyDetailPage';
import { LoginPage, RegisterPage } from './pages/AuthPages';
import DashboardPage     from './pages/DashboardPage';
import PaymentVerifyPage from './pages/PaymentVerifyPage';

// Protected route wrapper
function ProtectedRoute({ children }) {
  const { isAuthenticated } = useAuth();
  const location = useLocation();
  if (!isAuthenticated) return <Navigate to={`/login?from=${encodeURIComponent(location.pathname)}`} replace />;
  return children;
}

// Layout with nav + footer
function Layout({ children, noFooter = false }) {
  return (
    <>
      <Navbar />
      <main>{children}</main>
      {!noFooter && <Footer />}
    </>
  );
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={
        <Layout><HomePage /></Layout>
      } />

      <Route path="/properties" element={
        <Layout><PropertiesPage /></Layout>
      } />

      <Route path="/properties/:id" element={
        <Layout><PropertyDetailPage /></Layout>
      } />

      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />

      <Route path="/payment/verify" element={
        <Layout noFooter><PaymentVerifyPage /></Layout>
      } />

      <Route path="/dashboard/*" element={
        <ProtectedRoute>
          <Layout><DashboardPage /></Layout>
        </ProtectedRoute>
      } />

      {/* Catch-all */}
      <Route path="*" element={
        <Layout>
          <div className="min-h-screen flex items-center justify-center text-center px-4">
            <div>
              <p className="text-8xl mb-6">🏚️</p>
              <h1 className="font-display text-4xl font-bold text-forest-900 mb-3">Page Not Found</h1>
              <p className="text-gray-400 mb-6">This page doesn't exist or has been moved.</p>
              <a href="/" className="btn-primary inline-block">Back to Home</a>
            </div>
          </div>
        </Layout>
      } />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              borderRadius: '12px',
              fontFamily: 'DM Sans, sans-serif',
              fontSize: '14px',
            },
            success: { iconTheme: { primary: '#2E7D32', secondary: '#fff' } },
          }}
        />
      </AuthProvider>
    </BrowserRouter>
  );
}
