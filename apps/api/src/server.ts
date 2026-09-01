import { app, shutdown } from "./app";
import { env } from "./config/env";

const server = app.listen(env.PORT, () => {
  console.log(`🚀 SecureBank API listening on http://localhost:${env.PORT} (${env.NODE_ENV})`);
});

const shutdownSignals: NodeJS.Signals[] = ["SIGINT", "SIGTERM"];

for (const signal of shutdownSignals) {
  process.on(signal, () => {
    server.close(() => shutdown(signal));
  });
}

process.on("unhandledRejection", (reason) => {
  console.error("Unhandled rejection:", reason);
});
