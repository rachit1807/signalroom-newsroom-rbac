import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import pg from "pg";
export function createStore({
  url = process.env.DATABASE_URL,
  dir = process.env.DATA_DIR || ".data",
} = {}) {
  let db, pool;
  const empty = () => ({
    users: [],
    sessions: [],
    stories: [],
    events: [],
    tenants: [],
  });
  async function init() {
    if (url) {
      pool = new pg.Pool({
        connectionString: url,
        max: 5,
        connectionTimeoutMillis: 10000,
      });
      await pool.query(
        "CREATE TABLE IF NOT EXISTS signalroom_state (id INTEGER PRIMARY KEY, document JSONB NOT NULL)",
      );
      await pool.query(
        "INSERT INTO signalroom_state(id,document) VALUES(1,$1) ON CONFLICT DO NOTHING",
        [JSON.stringify(empty())],
      );
    } else {
      mkdirSync(dir, { recursive: true });
      db = new DatabaseSync(`${dir}/signalroom.db`);
      db.exec(
        "PRAGMA journal_mode=WAL; CREATE TABLE IF NOT EXISTS newsroom (id INTEGER PRIMARY KEY, document TEXT NOT NULL)",
      );
      db.prepare("INSERT OR IGNORE INTO newsroom VALUES(1,?)").run(
        JSON.stringify(empty()),
      );
    }
  }
  let queue = Promise.resolve();
  function transact(fn) {
    const run = async () => {
      if (pool) {
        const c = await pool.connect();
        try {
          await c.query("BEGIN");
          const { rows } = await c.query(
            "SELECT document FROM signalroom_state WHERE id=1 FOR UPDATE",
          );
          const state = rows[0].document;
          const result = await fn(state);
          await c.query("UPDATE signalroom_state SET document=$1 WHERE id=1", [
            JSON.stringify(state),
          ]);
          await c.query("COMMIT");
          return result;
        } catch (e) {
          await c.query("ROLLBACK");
          throw e;
        } finally {
          c.release();
        }
      }
      db.exec("BEGIN IMMEDIATE");
      try {
        const state = JSON.parse(
          db.prepare("SELECT document FROM newsroom WHERE id=1").get().document,
        );
        const result = await fn(state);
        db.prepare("UPDATE newsroom SET document=? WHERE id=1").run(
          JSON.stringify(state),
        );
        db.exec("COMMIT");
        return result;
      } catch (e) {
        db.exec("ROLLBACK");
        throw e;
      }
    };
    const p = queue.then(run, run);
    queue = p.catch(() => {});
    return p;
  }
  async function read(fn) {
    if (pool) {
      const { rows } = await pool.query(
        "SELECT document FROM signalroom_state WHERE id=1",
      );
      return fn(rows[0].document);
    }
    return fn(
      JSON.parse(
        db.prepare("SELECT document FROM newsroom WHERE id=1").get().document,
      ),
    );
  }
  return {
    init,
    transact,
    read,
    close: async () => {
      await queue;
      if (pool) await pool.end();
      else db?.close();
    },
    health: async () => {
      if (pool) await pool.query("SELECT 1");
      else db.prepare("SELECT 1").get();
    },
  };
}
