import dynamic from 'next/dynamic';

const GenerateContent = dynamic(() => import('../components/GenerateContent'), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-ducks-green border-t-transparent rounded-full animate-spin" />
    </div>
  ),
});

export default function GeneratePage() {
  return <GenerateContent />;
}
