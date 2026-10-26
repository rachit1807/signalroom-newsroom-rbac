import { spawn } from "node:child_process";
const children = [
  spawn(process.execPath, ["--watch", "backend/server.js"], {
    stdio: "inherit",
  }),
  spawn(process.execPath, ["node_modules/vite/bin/vite.js"], {
    stdio: "inherit",
  }),
];
for (const s of ["SIGINT", "SIGTERM"])
  process.on(s, () => {
    children.forEach((c) => c.kill(s));
    process.exit(0);
  });
