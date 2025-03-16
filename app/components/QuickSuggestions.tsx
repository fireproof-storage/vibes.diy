interface QuickSuggestionsProps {
  onSelectSuggestion: (suggestion: string) => void;
}

function QuickSuggestions({ onSelectSuggestion }: QuickSuggestionsProps) {
  const suggestions = [
    {
      label: 'Todos',
      text: 'Create a todo app with freeform textarea entry, that sends the text to AI to create todo list items using json, and tag them into the selected list.',
    },
    {
      label: 'Pomodoro',
      text: 'Create a pomodoro timer app with multiple timers work/break intervals and session tracking.',
    },
    {
      label: 'Sports',
      text: 'Chat with sports legends.',
    },
    {
      label: 'Drawing',
      text: 'Create a simple drawing app with a canvas where users can draw with different colors and save their drawings.',
    },
    {
      label: 'Calculator',
      text: 'Create a calculator app with basic arithmetic operations.',
    },
    {
      label: 'Photos',
      text: 'Create a photo gallery app with a grid of images and a modal for each image.',
    },
    {
      label: 'Quiz',
      text: "Write a trivia app that lets me pick a topic, and uses AI to make the next question while I'm answering the current one. It should make 3 at first. Ai should also judge the answer. It can either be right or wrong and funny.",
    },
    {
      label: 'Music',
      text: 'I send messages and Ai responds with a playlist for me, with YouTube search links for each song.',
    },
    {
      label: 'Similarity',
      text: 'I make a list of 2 or 3 items and then ai expands the list from the example.',
    },
    {
      label: 'Scheduling',
      text: 'Two text areas, paste the availability for each person, and AI finds the best time to meet.',
    },
    {
      label: 'Wildcard',
      text: "Generate a wildcard app, something I wouldn't expect.",
    },
  ];

  return (
    <div className="px-4 py-1">
      <div className="flex flex-wrap gap-2">
        {suggestions.map((suggestion, index) => (
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
