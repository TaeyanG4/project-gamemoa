import fs from "node:fs";
import path from "node:path";

// Prepare build directories for React Router v7 SPA mode on Cloudflare Workers
const serverDir = path.join(process.cwd(), "apps", "web", "build", "server");
fs.mkdirSync(serverDir, { recursive: true });

const dummyServerIndex = path.join(serverDir, "index.js");
if (!fs.existsSync(dummyServerIndex)) {
  fs.writeFileSync(dummyServerIndex, "export default {};\n", "utf-8");
}
