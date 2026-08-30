import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div className="max-w-xl mx-auto px-5 py-32 text-center">
      <svg width="64" height="64" viewBox="0 0 24 24" fill="none" className="mx-auto mb-6 animate-flicker">
        <path d="M12 3c2 3.4-2.4 4.4-2.4 7.8a2.4 2.4 0 0 0 4.8 0c0-2.4-1.5-3.4-.5-5.4 1 1.5 2.5 2.9 2.5 5.4a4.4 4.4 0 0 1-8.8 0C7.6 6.1 10.1 5.5 12 3Z" fill="#C9A66B" />
      </svg>
      <p className="font-serif-display text-6xl text-espressoDark mb-3">404</p>
      <h1 className="font-serif-display text-2xl text-espressoDark mb-3">This candle has burned out</h1>
      <p className="text-espresso/55 text-sm mb-8">The page you're looking for doesn't exist, or has moved.</p>
      <Link to="/" className="inline-block px-8 py-3.5 rounded-full bg-espressoDark text-ivory text-sm uppercase tracking-wide hover:bg-espresso transition-colors">
        Back to Home
      </Link>
    </div>
  );
}
