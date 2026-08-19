import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { resolveBundleContentType } from "@owogg/core";

export interface StaticServerOptions {
  /** Absolute path. Nothing outside this directory is ever served. */
  rootDir: string;
  port: number;
  /** Serves `rootDir/index.html` for any request that doesn't match a real file — the standard
   * history-API SPA fallback (the same thing a production static-asset host does for a
   * client-routed app), used for apps/web's own build/client output. Left off for the game-origin
   * server, which has no client-side router of its own and should 404 on an unknown path exactly
   * like the real gameServing.ts worker route does. */
  spaFallback?: boolean;
}

/** Minimal file server for the E2E harness only — reuses resolveBundleContentType (the same
 * extension -> MIME mapping gameServing.ts's real production route uses) so a served .js/.css/.html
 * file gets the same Content-Type a browser needs to actually execute/apply it, without
 * reimplementing that mapping a second time. Deliberately does not attempt to replicate
 * gameServing.ts's CSP/CORS/cache headers — this suite only needs the DOM-level invariants listed
 * in its own task scope (iframe exists, sandbox attribute, src, height), none of which depend on
 * response headers this server doesn't set. */
export function startStaticServer(options: StaticServerOptions): Promise<http.Server> {
  const { rootDir, port, spaFallback = false } = options;

  const server = http.createServer((req, res) => {
    try {
      const url = new URL(req.url ?? "/", "http://localhost");
      const decodedPath = decodeURIComponent(url.pathname);
      const requestedPath = path.join(rootDir, decodedPath);

      // Never allow escaping rootDir (a defensive floor, not a real threat model here — this
      // server only ever runs locally, bound to 127.0.0.1, for the duration of one E2E run).
      if (!requestedPath.startsWith(rootDir)) {
        res.writeHead(403);
        res.end();
        return;
      }

      let filePath = requestedPath;
      const exists = fs.existsSync(filePath) && fs.statSync(filePath).isFile();
      if (!exists) {
        if (spaFallback) {
          filePath = path.join(rootDir, "index.html");
        }
      }

      if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
        res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
        res.end("Not Found");
        return;
      }

      const relativePath = path.relative(rootDir, filePath).split(path.sep).join("/");
      const { contentType, contentEncoding } = resolveBundleContentType(relativePath);
      const headers: http.OutgoingHttpHeaders = {
        "Content-Type": contentType,
        // Public, unauthenticated fixture bytes served only to localhost during a test run — the
        // same "no confidentiality boundary here" reasoning gameServing.ts's own ACAO comment
        // gives for the real route this stands in for.
        "Access-Control-Allow-Origin": "*",
      };
      if (contentEncoding) headers["Content-Encoding"] = contentEncoding;

      res.writeHead(200, headers);
      fs.createReadStream(filePath).pipe(res);
    } catch (err) {
      res.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
      res.end(String(err));
    }
  });

  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, "127.0.0.1", () => resolve(server));
  });
}
