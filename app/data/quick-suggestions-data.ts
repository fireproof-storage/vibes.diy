// Static export of the quick suggestions data
// This avoids issues with YAML parsing in test environments

export interface Suggestion {
  label: string;
  text: string;
}

export const quickSuggestions: Suggestion[] = [
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
    label: 'Canvas',
    text: 'Create a canvas drawing app where users can sketch, blur, effect, save and load images.',
  },
  {
    label: 'Autodraw',
    text: 'Text to simple SVG, sketch with a rich color palette. Show the stream as it arrives and save the results for browsing.',
  },
  {
    label: 'Schedule',
    text: 'Two text areas, paste the availability for each person, and AI finds the best time to meet.',
  },
  {
    label: 'Web Art',
    text: 'Page mutator that automatically sends document.body.innerHTML to callAI with model "openrouter/quasar-alpha" to make it more interesting web art, then extracts the HTML result, updates the body, and uses DOM (not ReactDOM) functions to insert a toggleable open control panel that lists the iteration history and shows the most recent 5 lines of the current mutation stream in a fixed size area. After each response, count 10 seconds and recursively send HTML to AI again. The page should start with the technicolor transition from Wizard of Oz, "we\'re not in Kansas anymore."',
  },
  {
    label: 'Guitar',
    text: "Create Hendrix-like guitar solos with Web Audio API: Set up oscillators (ctx.createOscillator()) with 'sawtooth' waveforms for guitar-like harmonics, use modulator.connect(modulationGain).connect(carrier.frequency) for expressive bends and feedback effects, create signature wah-wah with BiquadFilter (filter.frequency.setValueAtTime() + automated sweeps), simulate feedback using high modulationGain.gain values, achieve dramatic dives with carrier.frequency.exponentialRampToValueAtTime(), implement string bending/vibrato by modulating pitch with LFOs, create percussive attacks with gainNode.gain.linearRampToValueAtTime() for fast attack/sustain, and simulate whammy bar techniques with rapid frequency wobbles. Add distortion via WaveShaperNode with custom curves for that iconic fuzz tone, and schedule phrases with setTimeout()/Math.random() for human-like timing variations in pentatonic patterns. Average carrier wave around 1kHz, note density: rests are rare.",
  },
  {
    label: 'Timer',
    text: 'Create a pomodoro timer app with multiple timers work/break intervals and session tracking.',
  },
  {
    label: 'Poetry',
    text: 'Write a short non-rhyming poem about a butterfly and then use it to have Al make an SVG drawing and when the drawing is complete do another poem. Keep going one at a time.',
  },
  {
    label: 'Galaxy Blaster',
    text: 'Space invaders clone for mobile, with high scores, and sound effects via create oscillator.',
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
