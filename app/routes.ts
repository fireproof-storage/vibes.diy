import { type RouteConfig, index, route } from '@react-router/dev/routes';

export default [
  index('./routes/home.tsx'),
  route('chat/:sessionId/:title?', './routes/home.tsx', { id: 'chat' }),
] satisfies RouteConfig;
