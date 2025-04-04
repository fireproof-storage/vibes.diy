interface QuickSuggestionsProps {
  onSelectSuggestion: (suggestion: string) => void;
}

function QuickSuggestions({ onSelectSuggestion }: QuickSuggestionsProps) {
  const suggestions = [
    {
      label: 'Tasks',
      text: 'Create a task tracker with freeform textarea entry, that sends the text to AI to create task list items using json, and tag them into the selected list.',
    },
    {
      label: 'Photos',
      text: "Image auto-tagger app that automatically saves, analyzes, tags, and describes images, displaying them in a list view as soon as they're dropped on the page, adding tags and descriptions as they come back.",
    },
    {
      label: 'Chat',
      text: 'Chat with legends, results are streamed and then saved by legend_id.',
    },
    {
      label: 'Playlist',
      text: 'I send messages and AI responds with a playlist for me, with YouTube search links for each song.',
    },
    {
      label: 'Math',
      text: 'Create a calculator app with basic arithmetic operations.',
    },
    {
      label: 'Texture',
      text: 'Create a texture design app users can sketch, blur, effect, save and load textures.',
    },
    {
      label: 'Autodraw',
      text: 'Text to SVG, sketch with a rich color palette. Show the stream as it arrives.',
    },
    {
      label: 'Schedule',
      text: 'Two text areas, paste the availability for each person, and AI finds the best time to meet.',
    },
    {
      label: 'Timer',
      text: 'Create a pomodoro timer app with multiple timers work/break intervals and session tracking.',
    },
    {
      label: 'Music',
      text: 'A music loop composition tool that uses createOscillator to make an 8-step sequencer with distinct tones for each instrument.',
    },
    {
      label: 'Quiz',
      text: 'Trivia show that lets me pick a topic, and uses AI to make questions and judge answers.',
    },
    {
      label: 'Blocks',
      text: 'A full screen paddle-and-ball game where a horizontal paddle at the bottom of the screen follows the mouse or jumps to touch locations, and the goal is to bounce a ball upward. Use createOscillator for sound effects. The ball breaks a wall of bricks at the top, and the goal is to clear all bricks without letting the ball fall. Start slow and speed up each level.Power-ups drop from some bricks, adding effects like multiple balls, lasers, or a wider paddle.',
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
