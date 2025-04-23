import { useEffect, useState } from 'react';
import { quickSuggestions } from '../data/quick-suggestions-data';
import FeaturedVibes from './FeaturedVibes';

interface QuickSuggestionsProps {
  onSelectSuggestion: (suggestion: string) => void;
}

interface Suggestion {
  label: string;
  text: string;
}

function QuickSuggestions({ onSelectSuggestion }: QuickSuggestionsProps) {
  const [randomSuggestions, setRandomSuggestions] = useState<Suggestion[]>([]);

  useEffect(() => {
    const shuffled = [...quickSuggestions].sort(() => 0.5 - Math.random());
    setRandomSuggestions(shuffled.slice(0, 8));
  }, []);

  return (
    <div className="px-4 py-1">
      <h3 className="text-accent-01 mb-2 text-center text-sm font-medium">Remix a featured vibe</h3>
      <div className="mx-auto w-full max-w-2xl">
        <FeaturedVibes count={3} />
      </div>
      <h3 className="text-accent-01 mb-2 pt-4 text-center text-sm font-medium">
        or create custom vibes from a prompt
      </h3>
      <div className="flex flex-wrap gap-2">
        {randomSuggestions.map((suggestion: Suggestion, index: number) => (
          <button
            key={index}
            type="button"
            onClick={() => onSelectSuggestion(suggestion.text)}
            className="bg-light-background-01 dark:bg-dark-background-01 text-light-primary dark:text-dark-primary hover:bg-light-decorative-01 dark:hover:bg-dark-decorative-01 cursor-pointer rounded-md px-3 py-1.5 text-sm font-medium transition-colors"
          >
            {suggestion.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export default QuickSuggestions;
