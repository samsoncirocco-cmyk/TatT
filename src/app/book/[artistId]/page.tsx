'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Calendar,
  Clock,
  ChevronRight,
  ChevronLeft,
  MapPin,
  Star,
  CheckCircle,
  Ruler,
  DollarSign,
  User,
  Mail,
  Phone,
  FileText,
  Sparkles,
  ArrowRight,
  Zap,
} from 'lucide-react';
import { useBookingStore } from '@/store/useBookingStore';
import { useMatchStore } from '@/store/useMatchStore';

// ─── Demo Data ─────────────────────────────────────────────────────────────
const DEMO_TIMES = ['10:00 AM', '11:30 AM', '1:00 PM', '2:30 PM', '4:00 PM', '5:30 PM'];
const SIZES = [
  { id: 'small', label: 'Small', desc: 'Under 2"', price: '$150–$300' },
  { id: 'medium', label: 'Medium', desc: '2"–4"', price: '$300–$600' },
  { id: 'large', label: 'Large', desc: '4"–8"', price: '$600–$1,200' },
  { id: 'sleeve', label: 'Sleeve', desc: 'Full arm', price: '$2,000+' },
];
const PLACEMENTS = [
  'Forearm', 'Upper Arm', 'Shoulder', 'Back', 'Chest',
  'Ribcage', 'Thigh', 'Calf', 'Ankle', 'Neck', 'Hand', 'Other',
];

function generateAvailability() {
  const today = new Date();
  const days: { date: Date; slots: string[] }[] = [];
  for (let i = 1; i <= 21; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    if (d.getDay() === 0) continue; // skip Sundays
    if (Math.random() > 0.35) {
      const availTimes = DEMO_TIMES.filter(() => Math.random() > 0.4);
      if (availTimes.length) days.push({ date: d, slots: availTimes });
    }
  }
  return days.slice(0, 12);
}

// ─── Step Indicators ───────────────────────────────────────────────────────
function StepBar({ step }: { step: number }) {
  const steps = ['Pick a Date', 'Your Design', 'Confirm'];
  return (
    <div className="flex items-center gap-0 mb-8">
      {steps.map((label, i) => (
        <div key={i} className="flex items-center">
          <div className="flex flex-col items-center">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                i < step
                  ? 'bg-ducks-green text-white'
                  : i === step
                  ? 'bg-white text-black ring-2 ring-ducks-green'
                  : 'bg-white/10 text-white/40'
              }`}
            >
              {i < step ? <CheckCircle className="w-4 h-4" /> : i + 1}
            </div>
            <span
              className={`text-xs mt-1 font-medium ${
                i === step ? 'text-white' : 'text-white/40'
              }`}
            >
              {label}
            </span>
          </div>
          {i < steps.length - 1 && (
            <div
              className={`w-16 h-px mx-2 mb-5 transition-all ${
                i < step ? 'bg-ducks-green' : 'bg-white/15'
              }`}
            />
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Step 1: Date & Time ──────────────────────────────────────────────────
function StepDate({
  artist,
  onNext,
}: {
  artist: { artistName: string; location?: string; styles?: string[]; imageUrl?: string };
  onNext: (slot: { date: string; time: string; duration: number }) => void;
}) {
  const [availability] = useState(generateAvailability);
  const [selectedDay, setSelectedDay] = useState<{ date: Date; slots: string[] } | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [duration, setDuration] = useState(2);

  const fmt = (d: Date) =>
    d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

  return (
    <motion.div
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -40 }}
      className="space-y-6"
    >
      {/* Artist Card */}
      <div className="flex items-center gap-4 p-4 rounded-2xl bg-white/5 border border-white/10">
        <div className="w-14 h-14 rounded-xl flex-shrink-0 overflow-hidden">
          {artist.imageUrl ? (
            <img src={artist.imageUrl} alt={artist.artistName} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-ducks-green to-ducks-yellow/60 flex items-center justify-center text-white font-black text-2xl">
              {artist.artistName[0]}
            </div>
          )}
        </div>
        <div>
          <div className="font-bold text-white text-lg">{artist.artistName}</div>
          {artist.location && (
            <div className="flex items-center gap-1 text-white/50 text-sm">
              <MapPin className="w-3 h-3" /> {artist.location}
            </div>
          )}
          {artist.styles && (
            <div className="flex gap-1 mt-1">
              {artist.styles.slice(0, 3).map((s) => (
                <span key={s} className="px-2 py-0.5 text-xs rounded-full bg-ducks-green/20 text-ducks-green font-medium">
                  {s}
                </span>
              ))}
            </div>
          )}
        </div>
        <div className="ml-auto flex items-center gap-1 text-ducks-yellow text-sm font-bold">
          <Star className="w-4 h-4 fill-ducks-yellow" /> 4.9
        </div>
      </div>

      {/* Available Dates */}
      <div>
        <div className="text-sm text-white/60 font-medium mb-3 flex items-center gap-2">
          <Calendar className="w-4 h-4" /> Available Dates
        </div>
        <div className="grid grid-cols-3 gap-2">
          {availability.map(({ date, slots }) => (
            <button
              key={date.toISOString()}
              onClick={() => { setSelectedDay({ date, slots }); setSelectedTime(null); }}
              className={`p-3 rounded-xl border text-center transition-all ${
                selectedDay?.date.toDateString() === date.toDateString()
                  ? 'bg-ducks-green border-ducks-green text-white shadow-lg shadow-ducks-green/20'
                  : 'bg-white/5 border-white/10 text-white/70 hover:bg-white/10'
              }`}
            >
              <div className="text-xs font-medium opacity-70">
                {date.toLocaleDateString('en-US', { weekday: 'short' })}
              </div>
              <div className="text-lg font-bold">{date.getDate()}</div>
              <div className="text-xs opacity-60">
                {date.toLocaleDateString('en-US', { month: 'short' })}
              </div>
              <div className="text-xs mt-1 text-ducks-yellow/80">{slots.length} open</div>
            </button>
          ))}
        </div>
      </div>

      {/* Time Slots */}
      <AnimatePresence>
        {selectedDay && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
            <div className="text-sm text-white/60 font-medium mb-3 flex items-center gap-2">
              <Clock className="w-4 h-4" /> Times on {fmt(selectedDay.date)}
            </div>
            <div className="grid grid-cols-3 gap-2">
              {selectedDay.slots.map((time) => (
                <button
                  key={time}
                  onClick={() => setSelectedTime(time)}
                  className={`py-2 px-3 rounded-xl border text-sm font-medium transition-all ${
                    selectedTime === time
                      ? 'bg-ducks-yellow text-black border-ducks-yellow font-bold shadow-lg'
                      : 'bg-white/5 border-white/10 text-white/70 hover:bg-white/10'
                  }`}
                >
                  {time}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Duration */}
      <AnimatePresence>
        {selectedTime && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
            <div className="text-sm text-white/60 font-medium mb-3 flex items-center gap-2">
              <Clock className="w-4 h-4" /> Session Length
            </div>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5, 6].map((h) => (
                <button
                  key={h}
                  onClick={() => setDuration(h)}
                  className={`flex-1 py-2 rounded-xl border text-sm font-medium transition-all ${
                    duration === h
                      ? 'bg-white text-black border-white font-bold'
                      : 'bg-white/5 border-white/10 text-white/60 hover:bg-white/10'
                  }`}
                >
                  {h}h
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Next */}
      <button
        disabled={!selectedDay || !selectedTime}
        onClick={() =>
          selectedDay && selectedTime &&
          onNext({ date: selectedDay.date.toISOString(), time: selectedTime, duration })
        }
        className="w-full py-4 rounded-2xl font-bold text-base flex items-center justify-center gap-2 transition-all disabled:opacity-30 disabled:cursor-not-allowed bg-ducks-green hover:bg-ducks-green/90 text-white shadow-lg shadow-ducks-green/20"
      >
        Next: Your Design <ChevronRight className="w-5 h-5" />
      </button>
    </motion.div>
  );
}

// ─── Step 2: Design Details ────────────────────────────────────────────────
function StepDetails({
  onNext,
  onBack,
}: {
  onNext: (details: Record<string, string>) => void;
  onBack: () => void;
}) {
  const [size, setSize] = useState('');
  const [placement, setPlacement] = useState('');
  const [description, setDescription] = useState('');
  const [budget, setBudget] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');

  const valid = size && placement && description.length > 10 && firstName && email;

  return (
    <motion.div
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -40 }}
      className="space-y-6"
    >
      {/* AI Design Attached */}
      <div className="p-4 rounded-2xl border border-ducks-green/40 bg-ducks-green/10 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-ducks-green/20 flex items-center justify-center">
          <Sparkles className="w-5 h-5 text-ducks-green" />
        </div>
        <div>
          <div className="text-sm font-bold text-white">AI Design Attached</div>
          <div className="text-xs text-white/50">Your forge creation will be shared with the artist</div>
        </div>
        <CheckCircle className="w-5 h-5 text-ducks-green ml-auto" />
      </div>

      {/* Size */}
      <div>
        <div className="text-sm text-white/60 font-medium mb-3 flex items-center gap-2">
          <Ruler className="w-4 h-4" /> Tattoo Size
        </div>
        <div className="grid grid-cols-2 gap-2">
          {SIZES.map((s) => (
            <button
              key={s.id}
              onClick={() => setSize(s.id)}
              className={`p-3 rounded-xl border text-left transition-all ${
                size === s.id
                  ? 'bg-ducks-green/20 border-ducks-green text-white'
                  : 'bg-white/5 border-white/10 text-white/70 hover:bg-white/10'
              }`}
            >
              <div className="font-bold text-sm">{s.label}</div>
              <div className="text-xs text-white/50">{s.desc}</div>
              <div className="text-xs text-ducks-yellow/80 font-medium mt-1">{s.price}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Placement */}
      <div>
        <div className="text-sm text-white/60 font-medium mb-3 flex items-center gap-2">
          <MapPin className="w-4 h-4" /> Placement
        </div>
        <div className="flex flex-wrap gap-2">
          {PLACEMENTS.map((p) => (
            <button
              key={p}
              onClick={() => setPlacement(p)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                placement === p
                  ? 'bg-white text-black border-white'
                  : 'bg-white/5 border-white/10 text-white/60 hover:bg-white/10'
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* Description */}
      <div>
        <div className="text-sm text-white/60 font-medium mb-2 flex items-center gap-2">
          <FileText className="w-4 h-4" /> Describe Your Vision
        </div>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Tell the artist what you're going for — style, mood, references, anything that matters to you..."
          rows={3}
          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white/90 placeholder-white/30 text-sm focus:outline-none focus:border-ducks-green/50 resize-none"
        />
        <div className="text-right text-xs text-white/30 mt-1">{description.length}/500</div>
      </div>

      {/* Budget */}
      <div>
        <div className="text-sm text-white/60 font-medium mb-2 flex items-center gap-2">
          <DollarSign className="w-4 h-4" /> Budget Range
        </div>
        <select
          value={budget}
          onChange={(e) => setBudget(e.target.value)}
          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white/90 text-sm focus:outline-none focus:border-ducks-green/50 appearance-none"
        >
          <option value="" className="bg-gray-900">Select a range</option>
          <option value="under-300" className="bg-gray-900">Under $300</option>
          <option value="300-600" className="bg-gray-900">$300 – $600</option>
          <option value="600-1200" className="bg-gray-900">$600 – $1,200</option>
          <option value="1200-2500" className="bg-gray-900">$1,200 – $2,500</option>
          <option value="2500+" className="bg-gray-900">$2,500+</option>
          <option value="flexible" className="bg-gray-900">Flexible / Let the artist quote</option>
        </select>
      </div>

      {/* Contact */}
      <div className="space-y-3">
        <div className="text-sm text-white/60 font-medium flex items-center gap-2">
          <User className="w-4 h-4" /> Your Info
        </div>
        <div className="grid grid-cols-2 gap-3">
          <input
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            placeholder="First name"
            className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white/90 placeholder-white/30 text-sm focus:outline-none focus:border-ducks-green/50"
          />
          <input
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            placeholder="Last name"
            className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white/90 placeholder-white/30 text-sm focus:outline-none focus:border-ducks-green/50"
          />
        </div>
        <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-4 py-3">
          <Mail className="w-4 h-4 text-white/30" />
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email address"
            type="email"
            className="bg-transparent text-white/90 placeholder-white/30 text-sm flex-1 focus:outline-none"
          />
        </div>
        <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-4 py-3">
          <Phone className="w-4 h-4 text-white/30" />
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="Phone (optional)"
            type="tel"
            className="bg-transparent text-white/90 placeholder-white/30 text-sm flex-1 focus:outline-none"
          />
        </div>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Anything else the artist should know? (allergies, accessibility needs, etc.)"
          rows={2}
          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white/90 placeholder-white/30 text-sm focus:outline-none focus:border-ducks-green/50 resize-none"
        />
      </div>

      {/* Buttons */}
      <div className="flex gap-3">
        <button
          onClick={onBack}
          className="flex-none py-4 px-5 rounded-2xl bg-white/5 border border-white/10 text-white/60 hover:bg-white/10 transition-all flex items-center gap-2"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <button
          disabled={!valid}
          onClick={() =>
            onNext({ size, placement, description, budget, firstName, lastName, email, phone, notes })
          }
          className="flex-1 py-4 rounded-2xl font-bold text-base flex items-center justify-center gap-2 transition-all disabled:opacity-30 disabled:cursor-not-allowed bg-ducks-green hover:bg-ducks-green/90 text-white shadow-lg shadow-ducks-green/20"
        >
          Review Booking <ChevronRight className="w-5 h-5" />
        </button>
      </div>
    </motion.div>
  );
}

// ─── Step 3: Confirm ───────────────────────────────────────────────────────
function StepConfirm({
  booking,
  onConfirm,
  onBack,
  loading,
}: {
  booking: ReturnType<typeof useBookingStore>['booking'];
  onConfirm: () => void;
  onBack: () => void;
  loading: boolean;
}) {
  const slot = booking.slot;
  const details = booking.details;
  const artist = booking.artist;

  const fmtDate = (iso: string) =>
    new Date(iso).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

  return (
    <motion.div
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -40 }}
      className="space-y-5"
    >
      <div className="p-5 rounded-2xl bg-white/5 border border-white/10 space-y-4">
        <div className="text-sm font-bold text-white/50 uppercase tracking-wider">Booking Summary</div>

        <div className="flex items-center gap-3 pb-4 border-b border-white/10">
          <div className="w-12 h-12 rounded-xl overflow-hidden flex-shrink-0">
            {artist?.imageUrl ? (
              <img src={artist.imageUrl} alt={artist.artistName} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-ducks-green to-ducks-yellow/60 flex items-center justify-center text-white font-black text-xl">
                {artist?.artistName[0]}
              </div>
            )}
          </div>
          <div>
            <div className="font-bold text-white">{artist?.artistName}</div>
            <div className="text-sm text-white/50">{artist?.location}</div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <div className="text-white/40">Date</div>
            <div className="text-white font-medium mt-0.5">{slot ? fmtDate(slot.date) : '—'}</div>
          </div>
          <div>
            <div className="text-white/40">Time</div>
            <div className="text-white font-medium mt-0.5">{slot?.time} ({slot?.duration}h)</div>
          </div>
          <div>
            <div className="text-white/40">Size</div>
            <div className="text-white font-medium capitalize mt-0.5">{details.size || '—'}</div>
          </div>
          <div>
            <div className="text-white/40">Placement</div>
            <div className="text-white font-medium mt-0.5">{details.placement || '—'}</div>
          </div>
          <div>
            <div className="text-white/40">Budget</div>
            <div className="text-white font-medium mt-0.5">{details.budget?.replace('-', '–') || '—'}</div>
          </div>
          <div>
            <div className="text-white/40">Contact</div>
            <div className="text-white font-medium mt-0.5">{details.firstName} {details.lastName}</div>
          </div>
        </div>

        {details.description && (
          <div className="pt-3 border-t border-white/10">
            <div className="text-white/40 text-sm mb-1">Vision</div>
            <div className="text-white/80 text-sm leading-relaxed">&ldquo;{details.description}&rdquo;</div>
          </div>
        )}
      </div>

      <div className="p-4 rounded-2xl border border-ducks-green/30 bg-ducks-green/5 flex items-center gap-3">
        <Sparkles className="w-5 h-5 text-ducks-green flex-shrink-0" />
        <div className="text-sm text-white/70">
          Your AI-generated design from The Forge will be attached to this request for the artist to review.
        </div>
      </div>

      <div className="text-xs text-white/30 text-center">
        This sends a consultation request — the artist will confirm availability within 24 hours.
        No payment required yet.
      </div>

      <div className="flex gap-3">
        <button
          onClick={onBack}
          className="flex-none py-4 px-5 rounded-2xl bg-white/5 border border-white/10 text-white/60 hover:bg-white/10 transition-all flex items-center gap-2"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <button
          onClick={onConfirm}
          disabled={loading}
          className="flex-1 py-4 rounded-2xl font-bold text-base flex items-center justify-center gap-2 transition-all disabled:opacity-50 bg-ducks-yellow text-black hover:bg-ducks-yellow/90 shadow-lg shadow-ducks-yellow/20"
        >
          {loading ? (
            <div className="w-5 h-5 border-2 border-black/20 border-t-black rounded-full animate-spin" />
          ) : (
            <>
              <Zap className="w-5 h-5" />
              Send Booking Request
            </>
          )}
        </button>
      </div>
    </motion.div>
  );
}

// ─── Step 4: Success ───────────────────────────────────────────────────────
function StepSuccess({
  booking,
  onDone,
}: {
  booking: ReturnType<typeof useBookingStore>['booking'];
  onDone: () => void;
}) {
  const slot = booking.slot;
  const fmtDate = (iso: string) =>
    new Date(iso).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="text-center space-y-6 py-4"
    >
      {/* Confetti-ish animation */}
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 200, delay: 0.1 }}
        className="w-24 h-24 rounded-full bg-ducks-green/20 border-2 border-ducks-green flex items-center justify-center mx-auto shadow-xl shadow-ducks-green/20"
      >
        <CheckCircle className="w-12 h-12 text-ducks-green" />
      </motion.div>

      <div>
        <h2 className="text-2xl font-black text-white mb-2">Request Sent! 🎉</h2>
        <p className="text-white/60 leading-relaxed max-w-xs mx-auto">
          {booking.artist?.artistName} has received your consultation request and will confirm within 24 hours.
        </p>
      </div>

      <div className="p-4 rounded-2xl bg-white/5 border border-white/10 text-left space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-white/40">Requested Date</span>
          <span className="text-white font-medium">{slot ? fmtDate(slot.date) : '—'}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-white/40">Time</span>
          <span className="text-white font-medium">{slot?.time} ({slot?.duration}h)</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-white/40">Artist</span>
          <span className="text-white font-medium">{booking.artist?.artistName}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-white/40">Confirmation to</span>
          <span className="text-white font-medium">{booking.details.email}</span>
        </div>
      </div>

      <div className="space-y-3">
        <button
          onClick={onDone}
          className="w-full py-4 rounded-2xl font-bold bg-ducks-green text-white flex items-center justify-center gap-2 hover:bg-ducks-green/90 transition-all shadow-lg shadow-ducks-green/20"
        >
          Back to Design Studio <ArrowRight className="w-5 h-5" />
        </button>
        <button
          onClick={() => {
            if (navigator.share) {
              navigator.share({ title: 'Check out my TatT design!', url: window.location.origin + '/generate' });
            }
          }}
          className="w-full py-4 rounded-2xl font-bold bg-white/5 border border-white/10 text-white/70 hover:bg-white/10 transition-all"
        >
          Share My Design ↗
        </button>
      </div>
    </motion.div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────
export default function BookArtistPage() {
  const params = useParams();
  const router = useRouter();
  const artistId = params.artistId as string;

  const { booking, setArtist, setSlot, setDetails, confirmBooking, resetBooking } =
    useBookingStore();
  const { matches } = useMatchStore();

  const [loading, setLoading] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);

  // Resolve artist from store or create demo artist
  useEffect(() => {
    resetBooking();
    const found = matches.find((m) => m.artistId === artistId);
    if (found) {
      setArtist(found);
    } else {
      // Demo fallback — artist from URL
      setArtist({
        artistId,
        artistName: 'Alex Rivera',
        matchScore: 0.94,
        tags: ['neo-traditional', 'geometric', 'blackwork'],
        styles: ['Neo-Traditional', 'Geometric', 'Blackwork'],
        location: 'Portland, OR',
        bio: 'Specializing in bold lines and intricate geometry. 12 years of experience.',
        availability: 'Booking 3–4 weeks out',
        distance: 2.4,
      });
    }
  }, [artistId]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSlot = (slot: { date: string; time: string; duration: number }) => {
    setSlot(slot);
    setStepIndex(1);
  };

  const handleDetails = (details: Record<string, string>) => {
    setDetails(details);
    setStepIndex(2);
  };

  const handleConfirm = async () => {
    setLoading(true);
    await new Promise((r) => setTimeout(r, 1400)); // simulate API call
    confirmBooking();
    setStepIndex(3);
    setLoading(false);
  };

  const artist = booking.artist;

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Background glow */}
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-ducks-green/15 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-5%] w-[40%] h-[40%] bg-ducks-yellow/8 rounded-full blur-[100px]" />
      </div>

      <div className="max-w-lg mx-auto px-4 py-8 pb-24">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={() => router.back()}
            className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-all"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl font-black text-white">
              {stepIndex === 3 ? 'Booking Confirmed' : 'Book a Session'}
            </h1>
            <p className="text-white/40 text-sm">
              {artist?.artistName ?? 'Loading…'}
            </p>
          </div>
        </div>

        {/* Step Bar (hide on success) */}
        {stepIndex < 3 && <StepBar step={stepIndex} />}

        {/* Steps */}
        <AnimatePresence mode="wait">
          {stepIndex === 0 && artist && (
            <StepDate key="date" artist={artist} onNext={handleSlot} />
          )}
          {stepIndex === 1 && (
            <StepDetails key="details" onNext={handleDetails} onBack={() => setStepIndex(0)} />
          )}
          {stepIndex === 2 && (
            <StepConfirm
              key="confirm"
              booking={booking}
              onConfirm={handleConfirm}
              onBack={() => setStepIndex(1)}
              loading={loading}
            />
          )}
          {stepIndex === 3 && (
            <StepSuccess
              key="success"
              booking={booking}
              onDone={() => router.push('/generate')}
            />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
