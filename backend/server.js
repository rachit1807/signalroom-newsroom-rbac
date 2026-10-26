import "dotenv/config";
import { createStore } from "./store.js";
import { createApp } from "./app.js";
const production = process.env.NODE_ENV === "production";
if (production && !process.env.DATABASE_URL)
  throw new Error("Production requires a dedicated DATABASE_URL.");
const store = createStore();
await store.init();
const app = createApp(store, { secret: process.env.JWT_SECRET, production });
const server = app.listen(process.env.PORT || 3020, "0.0.0.0", () =>
  console.log("SignalRoom is ready on port " + (process.env.PORT || 3020)),
);
for (const sig of ["SIGTERM", "SIGINT"])
  process.on(sig, () => {
    server.close(async () => {
      await store.close();
      process.exit(0);
    });
    setTimeout(() => process.exit(1), 10000).unref();
  });
