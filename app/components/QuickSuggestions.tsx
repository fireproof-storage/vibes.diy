import { useEffect, useState } from 'react';
import { quickSuggestions } from '../data/quick-suggestions-data';

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
      <div className="flex flex-wrap gap-2">
        {randomSuggestions.map((suggestion: Suggestion, index: number) => (
          <button
            key={index}
            type="button"
            onClick={() => onSelectSuggestion(suggestion.text)}
            className="bg-light-background-01 dark:bg-dark-background-01 text-light-primary dark:text-dark-primary hover:bg-light-decorative-01 dark:hover:bg-dark-decorative-01 cursor-pointer rounded-lg px-3 py-1.5 text-sm font-medium transition-colors"
          >
            {suggestion.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export default QuickSuggestions;
