import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center p-6 overflow-hidden bg-background">
      {/* Background ambience */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-ducks-green/15 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-ducks-yellow/10 rounded-full blur-[100px]" />
      </div>

      <div className="max-w-xl w-full text-center space-y-6 z-10">
        {/* Glitch number */}
        <p className="text-[8rem] md:text-[10rem] font-display font-black leading-none tracking-tighter text-transparent bg-clip-text bg-gradient-to-br from-ducks-green via-white to-ducks-yellow select-none">
          404
        </p>

        <div className="inline-block px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-white/50 text-xs font-mono tracking-widest uppercase backdrop-blur-md">
          Page not found
        </div>

        <h1 className="text-3xl md:text-4xl font-display font-bold text-white">
          This canvas is blank.
        </h1>
        <p className="text-gray-400 text-lg">
          The page you're looking for doesn't exist — or hasn't been inked yet.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
          <Link
            href="/"
            className="flex items-center gap-2 px-6 py-3 bg-ducks-green hover:bg-ducks-green/90 text-white rounded-xl font-medium transition-all"
          >
            Back to Home
          </Link>
          <Link
            href="/generate"
            className="px-6 py-3 bg-white/10 hover:bg-white/20 text-white border border-white/10 rounded-xl font-medium transition-all backdrop-blur-md"
          >
            Open the Forge
          </Link>
        </div>
      </div>
    </div>
  );
}
