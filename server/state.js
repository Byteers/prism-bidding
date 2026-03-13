/**
 * state.js — In-memory state, one isolated instance per room
 */
const db = require('./db');

const roomStates = {};

function createRoomState() {
  return {
    auction:     { status: 'idle', currentItemId: null, currentItem: null },
    timer:       { value: 0, max: 60, running: false },
    teams:       [],
    items:       [],
    leaderboard: [],
    activityLog: [],
  };
}

function getRoomState(roomId) {
  if (!roomStates[roomId]) roomStates[roomId] = createRoomState();
  return roomStates[roomId];
}

function buildLeaderboard(teams, items) {
  const wonCounts = {};
  items.filter(i => i.status === 'sold').forEach(i => {
    if (i.winner_id) wonCounts[i.winner_id] = (wonCounts[i.winner_id] || 0) + 1;
  });
  return [...teams]
    .sort((a, b) => b.total_spent - a.total_spent)
    .map((t, idx) => ({
      rank: idx + 1, id: t.id, name: t.name, color: t.color,
      totalSpent: t.total_spent, budget: t.budget,
      remaining: t.budget - t.total_spent,
      itemsWon: wonCounts[t.id] || 0,
    }));
}

function loadFromDB(roomId) {
  const s     = getRoomState(roomId);
  const dbSt  = db.getState(roomId);
  const teams = db.getTeams(roomId);
  const items = db.getItems(roomId);
  s.teams       = teams;
  s.items       = items;
  s.leaderboard = buildLeaderboard(teams, items);
  if (dbSt) {
    s.auction.status        = dbSt.status;
    s.auction.currentItemId = dbSt.current_item_id;
    s.auction.currentItem   = items.find(i => i.id === dbSt.current_item_id) || null;
    s.timer.value           = dbSt.timer_value;
    s.timer.max             = dbSt.timer_max;
    s.timer.running         = false;
  }
  console.log(`[State:${roomId}] Loaded: ${teams.length} teams, ${items.length} items`);
}

function getFullState(roomId) {
  const s = getRoomState(roomId);
  return {
    roomId,
    auction:     s.auction,
    timer:       s.timer,
    teams:       s.teams,
    items:       s.items,
    leaderboard: s.leaderboard,
    activityLog: s.activityLog.slice(0, 20),
  };
}

function refreshTeams(roomId) {
  const s = getRoomState(roomId);
  s.teams = db.getTeams(roomId);
  s.leaderboard = buildLeaderboard(s.teams, s.items);
}

function refreshItems(roomId) {
  const s = getRoomState(roomId);
  s.items = db.getItems(roomId);
  s.auction.currentItem = s.items.find(i => i.id === s.auction.currentItemId) || null;
  s.leaderboard = buildLeaderboard(s.teams, s.items);
}

function setAuctionStatus(roomId, status) {
  getRoomState(roomId).auction.status = status;
  db.patchStatus(roomId, status);
}

function setCurrentItem(roomId, item) {
  const s = getRoomState(roomId);
  s.auction.currentItemId = item ? item.id : null;
  s.auction.currentItem   = item || null;
}

function setTimer(roomId, value, max, running) {
  const s = getRoomState(roomId);
  s.timer.value   = value;
  if (max !== undefined) s.timer.max = max;
  s.timer.running = running;
  db.patchTimer(roomId, value, running ? 1 : 0, s.timer.max);
}

function tickTimer(roomId) {
  const s = getRoomState(roomId);
  if (s.timer.value > 0) s.timer.value--;
  if (s.timer.value === 0) s.timer.running = false;
  return s.timer.value;
}

function addActivity(roomId, emoji, html, teamId = null) {
  const s = getRoomState(roomId);
  const entry = {
    id: Date.now(), emoji, html, teamId,
    time: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
  };
  s.activityLog.unshift(entry);
  if (s.activityLog.length > 30) s.activityLog.pop();
  return entry;
}

module.exports = {
  getRoomState, loadFromDB, getFullState,
  refreshTeams, refreshItems, setAuctionStatus,
  setCurrentItem, setTimer, tickTimer, addActivity, buildLeaderboard,
};
