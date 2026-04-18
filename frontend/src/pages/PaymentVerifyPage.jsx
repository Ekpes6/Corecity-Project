import React, { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { transactionAPI, reservationAPI } from '../services/api';
import { formatNaira } from '../utils/nigeria';

export default function PaymentVerifyPage() {
  const [searchParams] = useSearchParams();
  const reference = searchParams.get('reference') || searchParams.get('trxref');
  const [status, setStatus]         = useState('loading'); // loading | success | failed
  const [transaction, setTransaction] = useState(null);
  const [reservation, setReservation] = useState(null);

  const isReservation = reference?.startsWith('RSV-');

  useEffect(() => {
    if (!reference) { setStatus('failed'); return; }

    if (isReservation) {
      reservationAPI.getByReference(reference)
        .then(({ data }) => {
          setReservation(data);
          setStatus(data.status === 'ACTIVE' ? 'success' : 'failed');
        })
        .catch(() => setStatus('failed'));
    } else {
      transactionAPI.verify(reference)
        .then(({ data }) => {
          setTransaction(data);
          setStatus(data.status === 'SUCCESS' ? 'success' : 'failed');
        })
        .catch(() => setStatus('failed'));
    }
  }, [reference, isReservation]);

  if (status === 'loading') return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <Loader2 size={48} className="animate-spin text-forest-800 mx-auto mb-4" />
        <p className="text-gray-500">Verifying your payment…</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-cream flex items-center justify-center px-4">
      <div className="card max-w-md w-full p-10 text-center">
        {status === 'success' ? (
          <>
            <CheckCircle2 size={56} className="text-green-500 mx-auto mb-5" />
            <h1 className="font-display text-2xl font-bold text-forest-900 mb-2">Payment Successful!</h1>
            <p className="text-gray-500 mb-6">
              {isReservation
                ? 'Your reservation is now active. The property owner has been notified.'
                : 'Your payment has been confirmed and the property owner has been notified.'}
            </p>
            {!isReservation && transaction && (
              <div className="bg-forest-50 rounded-xl p-4 text-left text-sm space-y-2 mb-6">
                <div className="flex justify-between">
                  <span className="text-gray-500">Amount</span>
                  <span className="font-bold text-forest-900 naira">{formatNaira(transaction.amount)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Reference</span>
                  <span className="font-mono text-xs text-gray-700">{transaction.reference}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Channel</span>
                  <span className="capitalize">{transaction.paymentChannel || 'Card'}</span>
                </div>
              </div>
            )}
          </>
        ) : (
          <>
            <XCircle size={56} className="text-red-400 mx-auto mb-5" />
            <h1 className="font-display text-2xl font-bold text-gray-800 mb-2">Payment Failed</h1>
            <p className="text-gray-500 mb-6">
              Your payment could not be completed. No money has been charged.
            </p>
            {isReservation && (
              <p className="text-gray-400 text-sm -mt-3 mb-6">
                You can try reserving the property again from the property page.
              </p>
            )}
          </>
        )}
        <div className="flex flex-col gap-3">
          {isReservation && status === 'failed' && reservation?.propertyId && (
            <Link to={`/properties/${reservation.propertyId}`} className="btn-primary">
              Try Again
            </Link>
          )}
          <Link to="/dashboard" className={isReservation && status === 'failed' && reservation?.propertyId ? 'btn-secondary' : 'btn-primary'}>
            Go to Dashboard
          </Link>
          <Link to="/properties" className="btn-secondary">Browse Properties</Link>
        </div>
      </div>
    </div>
  );
}
