import dynamic from 'next/dynamic';

const VisualizeContent = dynamic(() => import('../components/VisualizeContent'), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-ducks-green border-t-transparent rounded-full animate-spin" />
    </div>
  ),
});

export default function VisualizePage() {
  return <VisualizeContent />;
}
