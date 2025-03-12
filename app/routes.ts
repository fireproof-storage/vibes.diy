import { type RouteConfig, index, route } from '@react-router/dev/routes';

export default [
  index('./routes/unified-session.tsx'),
  route('session/:sessionId/:title?', './routes/unified-session.tsx'),
] satisfies RouteConfig;
