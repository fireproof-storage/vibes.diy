import { useVibes } from '../hooks/useVibes';
import { VibeCardData } from './VibeCardData';

export default function RecentVibes() {
  const { vibes } = useVibes();
  const recent = vibes.slice(0, 5);

  if (recent.length === 0) {
    return null;
  }

  return (
    <div className="px-4 py-4">
      <h3 className="text-accent-01 mb-2 text-center text-sm font-medium">Recent Vibes</h3>
      <div className="grid grid-cols-1 gap-4">
        {recent.map((vibe) => (
          <VibeCardData key={vibe.id} vibeId={vibe.id} />
        ))}
      </div>
    </div>
  );
}
