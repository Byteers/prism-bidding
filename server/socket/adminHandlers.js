const db = require('../db');
const { getRoomState, getFullState, refreshTeams, refreshItems,
        setAuctionStatus, setCurrentItem, setTimer, addActivity } = require('../state');
const timer = require('../timer');

module.exports = function adminHandlers(io, socket, roomId) {
  const room      = () => `room:${roomId}`;
  const broadcast = (ev, data) => io.to(room()).emit(ev, data);
  const bcastState= () => broadcast('state:full', getFullState(roomId));
  const s         = () => getRoomState(roomId);

  socket.on('admin:start-auction', () => {
    setAuctionStatus(roomId, 'active');
    addActivity(roomId, '🚀', '<strong>Auction started</strong>');
    broadcast('auction:started', {});
    bcastState();
  });

  socket.on('admin:pause-auction', () => {
    timer.stop(roomId);
    setAuctionStatus(roomId, 'paused');
    addActivity(roomId, '⏸️', '<strong>Auction paused</strong>');
    broadcast('auction:paused', {});
    bcastState();
  });

  socket.on('admin:resume-auction', () => {
    setAuctionStatus(roomId, 'active');
    addActivity(roomId, '▶️', '<strong>Auction resumed</strong>');
    broadcast('auction:resumed', {});
    bcastState();
  });

  socket.on('admin:end-auction', () => {
    timer.stop(roomId);
    setAuctionStatus(roomId, 'ended');
    addActivity(roomId, '🏁', '<strong>Auction ended</strong>');
    broadcast('auction:ended', {});
    bcastState();
  });

  socket.on('admin:activate-item', ({ itemId }) => {
    const id   = parseInt(itemId);
    const prev = s().items.find(i => i.id === s().auction.currentItemId);
    if (prev && prev.status === 'live') db.setItemLive(roomId, 'upcoming', prev.id);

    const item = db.getItemById(roomId, id);
    if (!item) return socket.emit('admin:error', { message: 'Item not found' });

    db.setItemLive(roomId, 'live', id);
    timer.stop(roomId);
    setTimer(roomId, 0, 60, false);
    refreshItems(roomId);

    const liveItem = s().items.find(i => i.id === id);
    setCurrentItem(roomId, liveItem);
    addActivity(roomId, '🎯', `<strong>Now bidding:</strong> ${item.name} — Base ₹${Number(item.base_price).toLocaleString('en-IN')}`);
    broadcast('item:activated', { item: liveItem });
    bcastState();
  });

  socket.on('admin:next-item', () => {
    const next = s().items.find(i => i.status === 'upcoming');
    if (!next) return socket.emit('admin:error', { message: 'No more upcoming items' });
    socket.emit('admin:activate-item', { itemId: next.id });
  });

  socket.on('admin:set-bid', ({ amount, teamId }) => {
    const item = s().auction.currentItem;
    if (!item) return socket.emit('admin:error', { message: 'No active item' });
    const team = s().teams.find(t => t.id === teamId);
    if (!team) return socket.emit('admin:error', { message: 'Team not found' });
    db.updateItemBid(roomId, amount, teamId, item.id);
    db.insertBid(roomId, item.id, teamId, amount);
    refreshItems(roomId);
    const updated = s().items.find(i => i.id === item.id);
    addActivity(roomId, '🔧', `<strong>Admin bid:</strong> ${team.name} → ₹${Number(amount).toLocaleString('en-IN')}`, teamId);
    broadcast('bid:updated', { item: updated });
    bcastState();
  });

  socket.on('admin:award-item', () => {
    const item = s().auction.currentItem;
    if (!item) return socket.emit('admin:error', { message: 'No active item' });
    if (!item.current_leader) return socket.emit('admin:error', { message: 'No bids placed yet' });
    const winnerId  = item.current_leader;
    const winAmount = item.current_bid;
    const team      = s().teams.find(t => t.id === winnerId);
    db.updateItemStatus(roomId, 'sold', winnerId, winAmount, item.id);
    db.updateTeamSpent(roomId, winAmount, winnerId);
    timer.stop(roomId);
    refreshItems(roomId);
    refreshTeams(roomId);
    setCurrentItem(roomId, null);
    const soldItem = s().items.find(i => i.id === item.id);
    addActivity(roomId, '🏆', `<strong>${team?.name}</strong> wins <em>${item.name}</em> for ₹${Number(winAmount).toLocaleString('en-IN')}!`, winnerId);
    broadcast('item:sold',       { item: soldItem, team, amount: winAmount });
    broadcast('winner:announce', { team, item: soldItem, amount: winAmount });
    broadcast('leaderboard:update', { leaderboard: s().leaderboard });
    bcastState();
  });

  socket.on('admin:start-timer', ({ seconds }) => {
    timer.start(roomId, parseInt(seconds) || 60);
    bcastState();
  });
  socket.on('admin:stop-timer',   () => { timer.stop(roomId);   bcastState(); });
  socket.on('admin:reset-timer',  ({ seconds }) => { timer.reset(roomId, parseInt(seconds) || 60); bcastState(); });
  socket.on('admin:extend-timer', ({ seconds }) => {
    timer.extend(roomId, parseInt(seconds) || 15);
    addActivity(roomId, '⏱️', `<strong>Timer extended</strong> +${seconds}s`);
    bcastState();
  });

  socket.on('admin:reset-item', ({ itemId }) => {
    db.resetItem(roomId, parseInt(itemId));
    refreshItems(roomId);
    if (s().auction.currentItemId === parseInt(itemId)) {
      setCurrentItem(roomId, null);
      timer.stop(roomId);
    }
    bcastState();
  });

  socket.on('admin:add-item', ({ name, description, icon, base_price }) => {
    db.insertItem(roomId, name, description || '', icon || '📦', parseInt(base_price), s().items.length + 1);
    refreshItems(roomId);
    addActivity(roomId, '➕', `<strong>Item added:</strong> ${name}`);
    bcastState();
  });

  socket.on('admin:delete-item', ({ itemId }) => {
    db.deleteItem(roomId, parseInt(itemId));
    refreshItems(roomId);
    bcastState();
  });

  socket.on('admin:update-budget', ({ teamId, budget }) => {
    const t = s().teams.find(t => t.id === teamId);
    if (!t) return;
    db.updateTeam(roomId, t.name, t.color, parseInt(budget), teamId);
    refreshTeams(roomId);
    bcastState();
  });

  socket.on('admin:reset-all', () => {
    timer.stop(roomId);
    db.exec(roomId, `
      DELETE FROM bids;
      UPDATE items SET status='upcoming', current_bid=NULL, current_leader=NULL, winner_id=NULL, final_price=NULL;
      UPDATE teams SET total_spent=0;
      UPDATE auction_state SET status='idle', current_item_id=NULL, timer_value=0, timer_running=0;
    `);
    refreshTeams(roomId);
    refreshItems(roomId);
    setCurrentItem(roomId, null);
    setAuctionStatus(roomId, 'idle');
    setTimer(roomId, 0, 60, false);
    getRoomState(roomId).activityLog = [];
    addActivity(roomId, '🔄', '<strong>Full session reset</strong>');
    broadcast('auction:reset', {});
    bcastState();
  });
};
