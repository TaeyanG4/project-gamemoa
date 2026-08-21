import http from "node:http";
import { E2E_PUBLIC_GAME_BY_SLUG, E2E_PUBLIC_GAMES } from "./publicGameFixture.js";

const WEB_ORIGIN = "http://127.0.0.1:4311";

function writeJson(res: http.ServerResponse, status: number, body: unknown): void {
  res.writeHead(status, {
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Origin": WEB_ORIGIN,
    "Access-Control-Allow-Credentials": "true",
    "Cache-Control": "no-store",
    "Content-Type": "application/json; charset=utf-8",
  });
  res.end(JSON.stringify(body));
}

/** One central API fixture for the local browser suite. It intentionally implements only the
 * generic public reads that the synthetic GameHost needs; no Playwright spec owns a route mock. */
export function startE2eApiServer(port: number): Promise<http.Server> {
  const server = http.createServer((req, res) => {
    try {
      const url = new URL(req.url ?? "/", "http://127.0.0.1");
      if (req.method === "OPTIONS") {
        writeJson(res, 204, null);
        return;
      }
      if (req.method !== "GET") {
        writeJson(res, 405, { error: "Method Not Allowed" });
        return;
      }

      if (url.pathname === "/api/games") {
        writeJson(res, 200, { games: E2E_PUBLIC_GAMES });
        return;
      }
      if (url.pathname === "/api/games/availability") {
        writeJson(res, 200, { disabledGameIds: [] });
        return;
      }
      const detailPrefix = "/api/games/";
      if (url.pathname.startsWith(detailPrefix)) {
        const slug = decodeURIComponent(url.pathname.slice(detailPrefix.length));
        const game = E2E_PUBLIC_GAME_BY_SLUG.get(slug);
        if (game) {
          writeJson(res, 200, game);
          return;
        }
        writeJson(res, 404, { error: { code: "GAME_NOT_FOUND", message: "Not Found" } });
        return;
      }

      writeJson(res, 404, { error: "Not Found" });
    } catch (err) {
      writeJson(res, 500, { error: String(err) });
    }
  });

  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, "127.0.0.1", () => resolve(server));
  });
}
