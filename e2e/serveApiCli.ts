import { startE2eApiServer } from "./apiServer.js";

const port = Number(process.env.E2E_API_PORT);
if (!Number.isInteger(port)) {
  throw new Error("E2E_API_PORT must be an integer");
}

startE2eApiServer(port)
  .then(() => {
    console.log(`E2E API fixture listening on http://127.0.0.1:${port}`);
  })
  .catch((err: unknown) => {
    console.error("❌ E2E API fixture failed to start:", err);
    process.exit(1);
  });
