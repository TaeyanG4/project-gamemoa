import { index, route, type RouteConfig } from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  route("games", "routes/games.tsx"),
  route("games/:slug", "routes/game-slug.tsx"),
  route("ranking", "routes/ranking.tsx"),
  route("profile", "routes/profile.tsx"),
  route("discord", "routes/discordHub.tsx"),
  route("discord/link", "routes/discordLink.tsx"),
  route("discord/servers", "routes/discordServers.tsx"),
  route("discord/servers/:slug", "routes/discordServerSlug.tsx"),
  route("discord/servers/:slug/manage", "routes/discordServerManage.tsx"),
] satisfies RouteConfig;
