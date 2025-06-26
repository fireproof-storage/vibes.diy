import { Link } from 'react-router-dom';
import VibesDIYLogo from '../components/VibesDIYLogo';

export function meta() {
  return [
    { title: 'Page Not Found - Vibes DIY' },
    { name: 'description', content: 'The page you are looking for could not be found.' },
  ];
}

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center" style={{
      background: 'linear-gradient(135deg, #1a1a1a 0%, #2a2a2a 50%, #1a1a1a 100%)',
      backgroundImage: `
        radial-gradient(circle at 20% 80%, rgba(120, 119, 198, 0.1) 0%, transparent 50%),
        radial-gradient(circle at 80% 20%, rgba(255, 119, 198, 0.1) 0%, transparent 50%),
        repeating-linear-gradient(
          90deg,
          transparent,
          transparent 2px,
          rgba(255, 255, 255, 0.02) 2px,
          rgba(255, 255, 255, 0.02) 4px
        )
      `
    }}>
      {/* Film strip holes */}
      <div className="absolute left-4 top-0 bottom-0 w-6 flex flex-col justify-center space-y-4">
        {Array.from({ length: 20 }).map((_, i) => (
          <div key={i} className="w-4 h-4 bg-black rounded-sm border border-gray-600"></div>
        ))}
      </div>
      <div className="absolute right-4 top-0 bottom-0 w-6 flex flex-col justify-center space-y-4">
        {Array.from({ length: 20 }).map((_, i) => (
          <div key={i} className="w-4 h-4 bg-black rounded-sm border border-gray-600"></div>
        ))}
      </div>
      
      {/* Main content */}
      <div className="text-center">
        <div className="mb-12">
          <VibesDIYLogo height={60} />
        </div>
        
        {/* Film frame style container */}
        <div className="relative p-12 mx-8" style={{
          background: 'linear-gradient(145deg, #2a2a2a, #1a1a1a)',
          border: '3px solid #444',
          borderRadius: '8px',
          boxShadow: `
            inset 0 2px 4px rgba(255, 255, 255, 0.1),
            inset 0 -2px 4px rgba(0, 0, 0, 0.3),
            0 8px 32px rgba(0, 0, 0, 0.5)
          `
        }}>
          {/* Corner markers */}
          <div className="absolute top-2 left-2 w-3 h-3 border-l-2 border-t-2 border-gray-400"></div>
          <div className="absolute top-2 right-2 w-3 h-3 border-r-2 border-t-2 border-gray-400"></div>
          <div className="absolute bottom-2 left-2 w-3 h-3 border-l-2 border-b-2 border-gray-400"></div>
          <div className="absolute bottom-2 right-2 w-3 h-3 border-r-2 border-b-2 border-gray-400"></div>
          
          <div className="space-y-6">
            <h1 className="text-6xl font-black tracking-wider text-white" style={{
              textShadow: '2px 2px 4px rgba(0, 0, 0, 0.8)',
              fontFamily: 'Impact, Arial Black, sans-serif',
              letterSpacing: '0.1em'
            }}>
              PAGE
            </h1>
            <h2 className="text-6xl font-black tracking-wider text-white" style={{
              textShadow: '2px 2px 4px rgba(0, 0, 0, 0.8)',
              fontFamily: 'Impact, Arial Black, sans-serif',
              letterSpacing: '0.1em'
            }}>
              MISSING
            </h2>
            <div className="text-2xl font-bold text-gray-300" style={{
              fontFamily: 'Courier New, monospace',
              letterSpacing: '0.2em'
            }}>
              404
            </div>
          </div>
        </div>

        <div className="mt-12">
          <Link
            to="/"
            className="text-gray-300 hover:text-white transition-colors duration-300 text-lg tracking-wide"
            style={{
              fontFamily: 'Courier New, monospace',
              textShadow: '1px 1px 2px rgba(0, 0, 0, 0.5)'
            }}
          >
            → HOME
          </Link>
        </div>
      </div>
    </div>
  );
}