import { type RouteConfig, index, route } from '@react-router/dev/routes';

export default [
  index('./routes/home.tsx'),
  // This route is only needed for dev server to prevent 404 flash
  route('index.html', './routes/home.tsx', { id: 'index-html' }),
  route('chat/:sessionId/:title', './routes/home.tsx', { id: 'chat' }),
  route('chat/:sessionId/:title/app', './routes/home.tsx', { id: 'chat-app' }),
  route('chat/:sessionId/:title/code', './routes/home.tsx', { id: 'chat-code' }),
  route('chat/:sessionId/:title/data', './routes/home.tsx', { id: 'chat-data' }),
  route('settings', './routes/settings.tsx', { id: 'settings' }),
  route('about', './routes/about.tsx', { id: 'about' }),
  route('auth/callback', './routes/auth-callback.tsx', { id: 'auth-callback' }),
  route('remix/:vibeSlug?', './routes/remix.tsx', { id: 'remix' }),
] satisfies RouteConfig;
