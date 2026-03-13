const db = require('../db');
const { getRoomState, getFullState, refreshItems, addActivity } = require('../state');

module.exports = function teamHandlers(io, socket, roomId, teamId) {
  const broadcast = (ev, data) => io.to(`room:${roomId}`).emit(ev, data);

  socket.on('team:bid', ({ amount }, callback) => {
    const cb = typeof callback === 'function' ? callback : () => {};
    const s  = getRoomState(roomId);

    if (s.auction.status !== 'active')
      return cb({ success: false, message: 'Auction is not active' });

    const item = s.auction.currentItem;
    if (!item || item.status !== 'live')
      return cb({ success: false, message: 'No active item to bid on' });

    if (!s.timer.running)
      return cb({ success: false, message: 'Timer is not running yet' });

    const minBid = (item.current_bid || item.base_price) + 100;
    if (!amount || Number(amount) < minBid)
      return cb({ success: false, message: `Minimum bid is ₹${Number(minBid).toLocaleString('en-IN')}` });

    if (item.current_leader === teamId)
      return cb({ success: false, message: 'You are already the highest bidder!' });

    const team = s.teams.find(t => t.id === teamId);
    if (!team) return cb({ success: false, message: 'Team not found' });

    const remaining = team.budget - team.total_spent;
    if (Number(amount) > remaining)
      return cb({ success: false, message: `Insufficient budget. ₹${Number(remaining).toLocaleString('en-IN')} left` });

    db.updateItemBid(roomId, Number(amount), teamId, item.id);
    db.insertBid(roomId, item.id, teamId, Number(amount));
    refreshItems(roomId);

    const updatedItem = s.items.find(i => i.id === item.id);
    addActivity(roomId, '💰', `<strong>${team.name}</strong> bids ₹${Number(amount).toLocaleString('en-IN')} on <em>${item.name}</em>`, teamId);

    broadcast('bid:new', {
      teamId, teamName: team.name, teamColor: team.color,
      amount: Number(amount), itemName: item.name, item: updatedItem,
    });
    broadcast('bid:updated', { item: updatedItem });
    broadcast('state:full', getFullState(roomId));

    cb({ success: true, amount: Number(amount) });
    console.log(`[Bid:${roomId}] ${team.name}: ₹${amount} on ${item.name}`);
  });
};
