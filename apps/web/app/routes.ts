import { index, route, type RouteConfig } from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  route("games", "routes/games.tsx"),
  route("games/:slug", "routes/game-slug.tsx"),
  route("ranking", "routes/ranking.tsx"),
] satisfies RouteConfig;
