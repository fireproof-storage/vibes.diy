interface QuickSuggestionsProps {
  onSelectSuggestion: (suggestion: string) => void;
}

function QuickSuggestions({ onSelectSuggestion }: QuickSuggestionsProps) {
  const suggestions = [
    {
      label: 'Todo App',
      text: 'Create a todo app with due dates and the ability to mark tasks as complete',
    },
    {
      label: 'Pomodoro',
      text: 'Create a pomodoro timer app with multiple timers work/break intervals and session tracking',
    },
    {
      label: 'Drawing App',
      text: 'Create a simple drawing app with a canvas where users can draw with different colors and save their drawings',
    },
    {
      label: 'Calculator',
      text: 'Create a calculator app with basic arithmetic operations',
    },
    {
      label: 'Photo Gallery',
      text: 'Create a photo gallery app with a grid of images and a modal for each image',
    },
    {
      label: 'Quiz App',
      text: 'Create a quiz app with a timer and score tracking',
    },
    {
      label: 'Wildcard',
      text: "Generate a wildcard app, something I wouldn't expect.",
    },
    {
      label: 'Music',
      text: 'Make a fan app where I can rate my favorite pop music lyrics',
    },
  ];

  return (
    <div className="px-4 py-3">
      <div className="flex flex-wrap gap-2">
        {suggestions.map((suggestion, index) => (
          <button
            key={index}
            type="button"
            onClick={() => onSelectSuggestion(suggestion.text)}
            className="bg-light-background-00 dark:bg-dark-background-00 text-light-primary dark:text-dark-primary hover:bg-light-decorative-01 dark:hover:bg-dark-decorative-01 cursor-pointer rounded-lg px-3 py-1.5 text-sm font-medium transition-colors"
          >
            {suggestion.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export default QuickSuggestions;
