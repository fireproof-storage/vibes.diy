import { type RouteConfig, index, route } from '@react-router/dev/routes';

export default [
  index('./routes/home.tsx'),
  route('chat/:sessionId/:title', './routes/home.tsx', { id: 'chat' }),
  route('chat/:sessionId/:title/app', './routes/home.tsx', { id: 'chat-app' }),
  route('chat/:sessionId/:title/code', './routes/home.tsx', { id: 'chat-code' }),
  route('chat/:sessionId/:title/data', './routes/home.tsx', { id: 'chat-data' }),
] satisfies RouteConfig;
