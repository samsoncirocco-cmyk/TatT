'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, CheckCircle, Loader2, Calendar, DollarSign, User, Mail, Phone, MessageSquare } from 'lucide-react';

interface BookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  artistId?: string;
  artistName?: string;
  designId?: string;
  designImageUrl?: string;
}

const BUDGET_OPTIONS = [
  'Under $200',
  '$200 – $500',
  '$500 – $1,000',
  '$1,000 – $2,000',
  '$2,000+',
];

type ModalState = 'form' | 'loading' | 'success' | 'error';

export function BookingModal({
  isOpen,
  onClose,
  artistId,
  artistName,
  designId,
  designImageUrl,
}: BookingModalProps) {
  const [state, setState] = useState<ModalState>('form');
  const [bookingId, setBookingId] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const [form, setForm] = useState({
    clientName: '',
    clientEmail: '',
    clientPhone: '',
    description: '',
    preferredDate: '',
    budget: '',
  });

  // Reset on open
  useEffect(() => {
    if (isOpen) {
      setState('form');
      setForm({ clientName: '', clientEmail: '', clientPhone: '', description: '', preferredDate: '', budget: '' });
    }
  }, [isOpen]);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setState('loading');
    try {
      const res = await fetch('/api/v1/book', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, artistId, artistName, designId, designImageUrl }),
      });
      const data = await res.json();
      if (data.success) {
        setBookingId(data.bookingId);
        setState('success');
      } else {
        setErrorMsg(data.error ?? 'Something went wrong. Please try again.');
        setState('error');
      }
    } catch {
      setErrorMsg('Network error. Please check your connection and try again.');
      setState('error');
    }
  };

  const inputClass =
    'w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-colors';
  const labelClass = 'block text-sm font-medium text-gray-300 mb-1.5';

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none"
          >
            <div
              className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto pointer-events-auto shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-gray-800">
                <div>
                  <h2 className="text-xl font-semibold text-white">
                    {artistName ? `Book ${artistName}` : 'Request a Booking'}
                  </h2>
                  {designId && (
                    <p className="text-sm text-purple-400 mt-0.5">✨ With your AI design</p>
                  )}
                </div>
                <button
                  onClick={onClose}
                  className="text-gray-400 hover:text-white transition-colors p-1 rounded-lg hover:bg-gray-800"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Content */}
              <div className="p-6">
                {state === 'form' && (
                  <form onSubmit={handleSubmit} className="space-y-4">
                    {designImageUrl && (
                      <div className="rounded-lg overflow-hidden mb-2 border border-gray-700">
                        <img src={designImageUrl} alt="Your design" className="w-full h-32 object-cover" />
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className={labelClass}>
                          <User size={14} className="inline mr-1.5 opacity-60" />Name
                        </label>
                        <input
                          required
                          className={inputClass}
                          placeholder="Your name"
                          value={form.clientName}
                          onChange={(e) => setForm((f) => ({ ...f, clientName: e.target.value }))}
                        />
                      </div>
                      <div>
                        <label className={labelClass}>
                          <Phone size={14} className="inline mr-1.5 opacity-60" />Phone
                          <span className="text-gray-600 ml-1">(optional)</span>
                        </label>
                        <input
                          className={inputClass}
                          placeholder="+1 (555) 000-0000"
                          type="tel"
                          value={form.clientPhone}
                          onChange={(e) => setForm((f) => ({ ...f, clientPhone: e.target.value }))}
                        />
                      </div>
                    </div>

                    <div>
                      <label className={labelClass}>
                        <Mail size={14} className="inline mr-1.5 opacity-60" />Email
                      </label>
                      <input
                        required
                        type="email"
                        className={inputClass}
                        placeholder="you@example.com"
                        value={form.clientEmail}
                        onChange={(e) => setForm((f) => ({ ...f, clientEmail: e.target.value }))}
                      />
                    </div>

                    <div>
                      <label className={labelClass}>
                        <MessageSquare size={14} className="inline mr-1.5 opacity-60" />Tattoo Description
                      </label>
                      <textarea
                        required
                        rows={3}
                        className={`${inputClass} resize-none`}
                        placeholder="Describe what you want — style, size, placement, any specific details..."
                        value={form.description}
                        onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className={labelClass}>
                          <Calendar size={14} className="inline mr-1.5 opacity-60" />Preferred Date
                        </label>
                        <input
                          type="date"
                          className={inputClass}
                          min={new Date().toISOString().split('T')[0]}
                          value={form.preferredDate}
                          onChange={(e) => setForm((f) => ({ ...f, preferredDate: e.target.value }))}
                        />
                      </div>
                      <div>
                        <label className={labelClass}>
                          <DollarSign size={14} className="inline mr-1.5 opacity-60" />Budget
                        </label>
                        <select
                          required
                          className={inputClass}
                          value={form.budget}
                          onChange={(e) => setForm((f) => ({ ...f, budget: e.target.value }))}
                        >
                          <option value="">Select range</option>
                          {BUDGET_OPTIONS.map((b) => (
                            <option key={b} value={b}>{b}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <button
                      type="submit"
                      className="w-full bg-purple-600 hover:bg-purple-500 text-white font-semibold py-3 px-6 rounded-xl transition-colors mt-2 flex items-center justify-center gap-2"
                    >
                      Send Booking Request
                    </button>

                    <p className="text-xs text-gray-500 text-center">
                      The artist will respond within 24 hours to confirm availability and pricing.
                    </p>
                  </form>
                )}

                {state === 'loading' && (
                  <div className="text-center py-12">
                    <Loader2 className="animate-spin mx-auto mb-4 text-purple-400" size={40} />
                    <p className="text-gray-400">Sending your request...</p>
                  </div>
                )}

                {state === 'success' && (
                  <div className="text-center py-8">
                    <CheckCircle className="mx-auto mb-4 text-green-400" size={48} />
                    <h3 className="text-xl font-semibold text-white mb-2">Booking Request Sent!</h3>
                    <p className="text-gray-400 mb-4">
                      Your confirmation number is{' '}
                      <span className="font-mono text-purple-400 font-semibold">{bookingId}</span>
                    </p>
                    <p className="text-sm text-gray-500 mb-6">
                      {artistName ?? 'The artist'} will contact you within 24 hours to confirm availability, discuss your design, and finalize pricing.
                    </p>
                    <button
                      onClick={onClose}
                      className="bg-purple-600 hover:bg-purple-500 text-white font-semibold py-2.5 px-6 rounded-xl transition-colors"
                    >
                      Done
                    </button>
                  </div>
                )}

                {state === 'error' && (
                  <div className="text-center py-8">
                    <div className="text-4xl mb-4">⚠️</div>
                    <h3 className="text-lg font-semibold text-white mb-2">Something went wrong</h3>
                    <p className="text-gray-400 mb-6">{errorMsg}</p>
                    <div className="flex gap-3 justify-center">
                      <button
                        onClick={() => setState('form')}
                        className="bg-purple-600 hover:bg-purple-500 text-white font-semibold py-2.5 px-6 rounded-xl transition-colors"
                      >
                        Try Again
                      </button>
                      <button
                        onClick={onClose}
                        className="bg-gray-700 hover:bg-gray-600 text-white font-semibold py-2.5 px-6 rounded-xl transition-colors"
                      >
                        Close
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
