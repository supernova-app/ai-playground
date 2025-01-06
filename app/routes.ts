import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  route("/api/ai/chat", "routes/api/ai/chat.ts"),
  route("/api/auth/*", "routes/api/auth.ts"),
] satisfies RouteConfig;
