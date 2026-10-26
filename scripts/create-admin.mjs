import "dotenv/config";
import { createInterface } from "node:readline/promises";
import { randomUUID } from "node:crypto";
import bcrypt from "bcryptjs";
import { createStore } from "../backend/store.js";
const rl = createInterface({ input: process.stdin, output: process.stdout });
const name = (await rl.question("Administrator name: ")).trim(),
  email = (await rl.question("Administrator email: ")).trim().toLowerCase();
rl.close();
// Read a password without echoing it to the terminal.
process.stdout.write("New project password (10+ characters): ");
const password = await new Promise((resolve) => {
  let value = "";
  process.stdin.setRawMode(true);
  process.stdin.resume();
  process.stdin.setEncoding("utf8");
  const onData = (chunk) => {
    for (const c of chunk) {
      if (c === "\u0003") process.exit(130);
      if (c === "\r" || c === "\n") {
        process.stdin.off("data", onData);
        process.stdin.setRawMode(false);
        process.stdin.pause();
        process.stdout.write("\n");
        resolve(value);
        return;
      }
      if (c === "\u007f") value = value.slice(0, -1);
      else value += c;
    }
  };
  process.stdin.on("data", onData);
});
if (
  name.length < 2 ||
  !/^\S+@\S+\.\S+$/.test(email) ||
  password.length < 10 ||
  password.length > 128
)
  throw new Error("Invalid name, email or password length.");
const hash = await bcrypt.hash(password, 12),
  store = createStore();
await store.init();
try {
  await store.transact((s) => {
    if (s.users.some((u) => u.tenant === "main" && u.email === email))
      throw new Error("Account exists. No account was changed.");
    s.users.push({
      id: randomUUID(),
      tenant: "main",
      role: "admin",
      name,
      email,
      hash,
      createdAt: new Date().toISOString(),
    });
  });
  console.log("Administrator created.");
} finally {
  await store.close();
}
