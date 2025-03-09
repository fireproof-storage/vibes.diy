import { type RouteConfig, index, route } from '@react-router/dev/routes';

export default [
  index('./routes/home.tsx'),
  route('session/:sessionId/:title?', './routes/session.tsx'),
] satisfies RouteConfig;
