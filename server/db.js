/**
 * db.js — Multi-room SQLite via sql.js
 * Each room gets its own DB file: prism_room_a.db, prism_room_b.db
 */
const path = require('path');
const fs   = require('fs');
require('dotenv').config();

const initSqlJs = require('sql.js');

// Map of roomId → { db, autosaveInterval }
const rooms = {};

function dbPath(roomId) {
  const base = process.env.DB_DIR || '.';
  return path.resolve(base, `prism_${roomId}.db`);
}

function saveToDisk(roomId) {
  const r = rooms[roomId];
  if (!r || !r.db) return;
  const data = r.db.export();
  fs.writeFileSync(dbPath(roomId), Buffer.from(data));
}

async function initRoom(roomId) {
  if (rooms[roomId]) return rooms[roomId].db;

  const SQL  = await initSqlJs();
  const file = dbPath(roomId);
  let db;

  if (fs.existsSync(file)) {
    db = new SQL.Database(fs.readFileSync(file));
    console.log(`[DB:${roomId}] Loaded from disk`);
  } else {
    db = new SQL.Database();
    console.log(`[DB:${roomId}] Created new`);
  }

  db.run(`
    CREATE TABLE IF NOT EXISTS teams (
      id          TEXT PRIMARY KEY,
      name        TEXT NOT NULL,
      password    TEXT NOT NULL,
      color       TEXT DEFAULT '#3b82f6',
      budget      INTEGER DEFAULT 50000,
      total_spent INTEGER DEFAULT 0,
      created_at  TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS items (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      name            TEXT NOT NULL,
      description     TEXT DEFAULT '',
      icon            TEXT DEFAULT '📦',
      base_price      INTEGER NOT NULL,
      current_bid     INTEGER,
      current_leader  TEXT,
      status          TEXT DEFAULT 'upcoming',
      winner_id       TEXT,
      final_price     INTEGER,
      sort_order      INTEGER DEFAULT 0,
      created_at      TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS bids (
      id        INTEGER PRIMARY KEY AUTOINCREMENT,
      item_id   INTEGER,
      team_id   TEXT,
      amount    INTEGER NOT NULL,
      timestamp TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS auction_state (
      id              INTEGER PRIMARY KEY DEFAULT 1,
      status          TEXT DEFAULT 'idle',
      current_item_id INTEGER,
      timer_value     INTEGER DEFAULT 0,
      timer_running   INTEGER DEFAULT 0,
      timer_max       INTEGER DEFAULT 60,
      updated_at      TEXT DEFAULT (datetime('now'))
    );
    INSERT OR IGNORE INTO auction_state (id, status) VALUES (1, 'idle');
  `);

  saveToDisk(roomId);

  const interval = setInterval(() => saveToDisk(roomId), 5000);
  rooms[roomId] = { db, interval };
  console.log(`[DB:${roomId}] Schema ready`);
  return db;
}

// ── Per-room helpers ──
function getDB(roomId) {
  if (!rooms[roomId]) throw new Error(`Room "${roomId}" not initialised`);
  return rooms[roomId].db;
}

function all(roomId, sql, params = []) {
  try {
    const db   = getDB(roomId);
    const stmt = db.prepare(sql);
    const rows = [];
    stmt.bind(params);
    while (stmt.step()) rows.push(stmt.getAsObject());
    stmt.free();
    return rows;
  } catch (e) { console.error(`[DB:${roomId}] Query error:`, e.message); return []; }
}

function get(roomId, sql, params = []) { return all(roomId, sql, params)[0] || null; }

function run(roomId, sql, params = []) {
  try { getDB(roomId).run(sql, params); }
  catch (e) { console.error(`[DB:${roomId}] Run error:`, e.message); throw e; }
}

function runGetId(roomId, sql, params = []) {
  run(roomId, sql, params);
  return get(roomId, 'SELECT last_insert_rowid() as id')?.id || null;
}

function exec(roomId, sql) { getDB(roomId).run(sql); }

// ── TEAMS ──
const getTeams        = (r) => all(r, 'SELECT * FROM teams ORDER BY total_spent DESC');
const getTeamById     = (r, id) => get(r, 'SELECT * FROM teams WHERE id=?', [id]);
const insertTeam      = (r, id, name, password, color, budget) =>
  run(r, 'INSERT OR REPLACE INTO teams (id,name,password,color,budget) VALUES (?,?,?,?,?)', [id,name,password,color,budget]);
const updateTeam      = (r, name, color, budget, id) =>
  run(r, 'UPDATE teams SET name=?,color=?,budget=? WHERE id=?', [name,color,budget,id]);
const updateTeamFull  = (r, name, password, color, budget, id) =>
  run(r, 'UPDATE teams SET name=?,password=?,color=?,budget=? WHERE id=?', [name,password,color,budget,id]);
const updateTeamSpent = (r, amount, id) =>
  run(r, 'UPDATE teams SET total_spent=total_spent+? WHERE id=?', [amount,id]);
const deleteTeam      = (r, id) => run(r, 'DELETE FROM teams WHERE id=?', [id]);
const resetTeamSpent  = (r, id) => run(r, 'UPDATE teams SET total_spent=0 WHERE id=?', [id]);

// ── ITEMS ──
const getItems        = (r) => all(r, 'SELECT * FROM items ORDER BY sort_order ASC, id ASC');
const getItemById     = (r, id) => get(r, 'SELECT * FROM items WHERE id=?', [id]);
const insertItem      = (r, name, desc, icon, price, sort) =>
  runGetId(r, 'INSERT INTO items (name,description,icon,base_price,sort_order) VALUES (?,?,?,?,?)', [name,desc,icon,price,sort]);
const updateItem      = (r, name, desc, icon, price, id) =>
  run(r, 'UPDATE items SET name=?,description=?,icon=?,base_price=? WHERE id=?', [name,desc,icon,price,id]);
const updateItemBid   = (r, bid, leader, id) =>
  run(r, 'UPDATE items SET current_bid=?,current_leader=? WHERE id=?', [bid,leader,id]);
const updateItemStatus= (r, status, winner, price, id) =>
  run(r, 'UPDATE items SET status=?,winner_id=?,final_price=? WHERE id=?', [status,winner,price,id]);
const setItemLive     = (r, status, id) => run(r, 'UPDATE items SET status=? WHERE id=?', [status,id]);
const deleteItem      = (r, id) => run(r, 'DELETE FROM items WHERE id=?', [id]);
const resetItem       = (r, id) =>
  run(r, `UPDATE items SET status='upcoming',current_bid=NULL,current_leader=NULL,winner_id=NULL,final_price=NULL WHERE id=?`, [id]);

// ── BIDS ──
const insertBid     = (r, item_id, team_id, amount) =>
  run(r, 'INSERT INTO bids (item_id,team_id,amount) VALUES (?,?,?)', [item_id,team_id,amount]);
const getBidsByItem = (r, itemId) =>
  all(r, `SELECT b.*,t.name as team_name,t.color as team_color FROM bids b JOIN teams t ON b.team_id=t.id WHERE b.item_id=? ORDER BY b.timestamp DESC LIMIT 30`, [itemId]);
const getRecentBids = (r) =>
  all(r, `SELECT b.*,t.name as team_name,i.name as item_name FROM bids b JOIN teams t ON b.team_id=t.id JOIN items i ON b.item_id=i.id ORDER BY b.timestamp DESC LIMIT 30`);

// ── AUCTION STATE ──
const getState    = (r) => get(r, 'SELECT * FROM auction_state WHERE id=1');
const patchStatus = (r, status) => run(r, `UPDATE auction_state SET status=?,updated_at=datetime('now') WHERE id=1`, [status]);
const patchTimer  = (r, value, running, max) => run(r, 'UPDATE auction_state SET timer_value=?,timer_running=?,timer_max=? WHERE id=1', [value,running,max]);

module.exports = {
  initRoom, saveToDisk, exec,
  getTeams, getTeamById, insertTeam, updateTeam, updateTeamFull, updateTeamSpent, deleteTeam, resetTeamSpent,
  getItems, getItemById, insertItem, updateItem, updateItemBid,
  updateItemStatus, setItemLive, deleteItem, resetItem,
  insertBid, getBidsByItem, getRecentBids,
  getState, patchStatus, patchTimer,
};
