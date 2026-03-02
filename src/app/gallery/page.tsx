import { Metadata } from 'next';
import { GalleryClient } from './GalleryClient';

export const metadata: Metadata = {
  title: 'Community Gallery — TatT AI Tattoo Studio',
  description:
    'Browse thousands of AI-generated tattoo designs created by the TatT community. Find inspiration for your next tattoo.',
  openGraph: {
    title: 'Community Gallery — TatT',
    description: 'Browse AI-generated tattoo designs. Geometric, Japanese, Blackwork, Watercolor, and more.',
    type: 'website',
  },
};

export default function GalleryPage() {
  return <GalleryClient />;
}
