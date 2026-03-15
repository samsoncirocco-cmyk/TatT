'use client';

import { motion } from 'framer-motion';
import { Check, ArrowLeft, Calendar, Clock, MapPin, Ruler, DollarSign } from 'lucide-react';
import Link from 'next/link';
import { Suspense, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { useBookingStore } from '@/store/useBookingStore';

const DEPOSIT_BY_SIZE: Record<string, number> = {
  small: 75,
  medium: 150,
  large: 300,
  sleeve: 500,
};

function titleCase(value: string) {
  if (!value) return '';
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function BookingSuccessContent() {
  const searchParams = useSearchParams();
  const { booking, depositAmount } = useBookingStore();

  const artistName = searchParams.get('artist') || booking.artist?.artistName || 'Your artist';
  const size = searchParams.get('size') || booking.details.size || 'medium';
  const placement = searchParams.get('placement') || booking.details.placement || 'TBD';
  const date = searchParams.get('date') || booking.slot?.date || 'To be confirmed';
  const time = searchParams.get('time') || booking.slot?.time || 'To be confirmed';
  const stripeSessionId = searchParams.get('session_id');

  const paidDeposit =
    Number(searchParams.get('deposit')) ||
    depositAmount ||
    DEPOSIT_BY_SIZE[size.toLowerCase()] ||
    DEPOSIT_BY_SIZE.medium;

  const prettyDate =
    date !== 'To be confirmed'
      ? new Date(date).toLocaleDateString('en-US', {
          weekday: 'long',
          month: 'long',
          day: 'numeric',
        })
      : date;

  const shareLink = useMemo(() => {
    const text = 'Just booked my tattoo consultation on @TatTapp! 🖊️';
    const url =
      typeof window !== 'undefined' ? `${window.location.origin}/artists` : 'https://tatt.app';
    return `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`;
  }, []);

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
        <div className="absolute top-[-12%] left-[-10%] w-[60%] h-[50%] bg-orange-500/15 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-8%] w-[50%] h-[45%] bg-amber-400/15 rounded-full blur-[120px]" />
      </div>

      <main className="max-w-lg mx-auto px-4 py-10 pb-20 space-y-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center space-y-4"
        >
          <motion.div
            initial={{ scale: 0.7, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.35, ease: 'easeOut' }}
            className="w-24 h-24 rounded-full bg-amber-500/20 border border-amber-400/50 flex items-center justify-center mx-auto shadow-xl shadow-amber-500/20"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: 'spring', stiffness: 280, damping: 18 }}
              className="w-12 h-12 rounded-full bg-amber-400 text-black flex items-center justify-center"
            >
              <Check className="w-7 h-7" />
            </motion.div>
          </motion.div>

          <h1 className="text-3xl font-black text-white">Booking Confirmed! 🎉</h1>
          <p className="text-white/70">
            Your consultation slot is secured and your artist has received your request.
          </p>
        </motion.div>

        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08 }}
          className="p-5 rounded-2xl border border-white/10 bg-white/5 space-y-3"
        >
          <div className="text-xs uppercase tracking-wider text-amber-300 font-semibold">
            Booking Summary
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-white/50 flex items-center gap-2"><MapPin className="w-4 h-4" /> Artist</span>
            <span className="font-medium">{artistName}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-white/50 flex items-center gap-2"><Calendar className="w-4 h-4" /> Date</span>
            <span className="font-medium">{prettyDate}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-white/50 flex items-center gap-2"><Clock className="w-4 h-4" /> Time</span>
            <span className="font-medium">{time}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-white/50 flex items-center gap-2"><Ruler className="w-4 h-4" /> Tattoo</span>
            <span className="font-medium">{titleCase(size)} on {placement}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-white/50 flex items-center gap-2"><DollarSign className="w-4 h-4" /> Deposit paid</span>
            <span className="font-semibold text-amber-300">${paidDeposit}</span>
          </div>
          <div className="text-sm text-white/70 pt-2 border-t border-white/10">
            Remaining balance due at consultation.
          </div>
          {stripeSessionId && (
            <div className="text-xs text-white/40 break-all">
              Stripe session: {stripeSessionId}
            </div>
          )}
        </motion.section>

        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.14 }}
          className="p-5 rounded-2xl border border-amber-300/30 bg-amber-500/10"
        >
          <div className="text-sm uppercase tracking-wider text-amber-300 font-semibold mb-2">
            What&apos;s next
          </div>
          <ul className="space-y-2 text-sm text-white/80">
            <li>You&apos;ll receive a confirmation email within 24 hours.</li>
            <li>Bring reference images to your consultation.</li>
            <li>AI design preview available in your TatT app.</li>
          </ul>
        </motion.section>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="space-y-3"
        >
          <a
            href={shareLink}
            target="_blank"
            rel="noreferrer"
            className="w-full py-4 rounded-2xl bg-amber-400 text-black font-bold flex items-center justify-center hover:bg-amber-300 transition-all"
          >
            Share your TatT booking
          </a>
          <Link
            href="/"
            className="w-full py-4 rounded-2xl border border-white/15 bg-white/5 text-white/80 font-semibold flex items-center justify-center gap-2 hover:bg-white/10 transition-all"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to discover
          </Link>
        </motion.div>
      </main>
    </div>
  );
}

export default function BookingSuccessPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-black" />}>
      <BookingSuccessContent />
    </Suspense>
  );
}
