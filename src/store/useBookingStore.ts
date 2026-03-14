import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { ArtistMatch } from './useMatchStore';

export type BookingStep = 'date' | 'details' | 'confirm' | 'success';

export interface BookingSlot {
  date: string; // ISO date string
  time: string; // e.g. "2:00 PM"
  duration: number; // hours
}

export interface BookingDetails {
  placement: string;
  size: string; // 'small' | 'medium' | 'large' | 'sleeve'
  description: string;
  referenceDesignUrl?: string; // attached from forge
  budget: string; // estimated range
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  notes: string;
}

export interface Booking {
  id: string;
  artist: ArtistMatch | null;
  slot: BookingSlot | null;
  details: Partial<BookingDetails>;
  step: BookingStep;
  confirmedAt?: string;
}

interface BookingState {
  booking: Booking;
  history: Booking[];

  setArtist: (artist: ArtistMatch) => void;
  setSlot: (slot: BookingSlot) => void;
  setDetails: (details: Partial<BookingDetails>) => void;
  setStep: (step: BookingStep) => void;
  confirmBooking: () => void;
  resetBooking: () => void;
}

const freshBooking = (): Booking => ({
  id: `booking-${Date.now()}`,
  artist: null,
  slot: null,
  details: {},
  step: 'date',
});

export const useBookingStore = create<BookingState>()(
  persist(
    (set, get) => ({
      booking: freshBooking(),
      history: [],

      setArtist: (artist) =>
        set((s) => ({ booking: { ...s.booking, artist } })),

      setSlot: (slot) =>
        set((s) => ({ booking: { ...s.booking, slot, step: 'details' } })),

      setDetails: (details) =>
        set((s) => ({
          booking: { ...s.booking, details: { ...s.booking.details, ...details } },
        })),

      setStep: (step) =>
        set((s) => ({ booking: { ...s.booking, step } })),

      confirmBooking: () => {
        const { booking, history } = get();
        const confirmed: Booking = {
          ...booking,
          step: 'success',
          confirmedAt: new Date().toISOString(),
        };
        set({ booking: confirmed, history: [confirmed, ...history.slice(0, 9)] });
      },

      resetBooking: () =>
        set({ booking: freshBooking() }),
    }),
    {
      name: 'tatt-booking',
      storage: createJSONStorage(() =>
        typeof window !== 'undefined' ? localStorage : { getItem: () => null, setItem: () => {}, removeItem: () => {} }
      ),
    }
  )
);
