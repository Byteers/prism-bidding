/**
 * socket/index.js — Room-aware connection router
 * URL pattern: /?room=a  or  /?room=b
 * Session stores: role, teamId, roomId
 */
const { getFullState } = require('../state');

module.exports = function setupSockets(io) {
  io.on('connection', (socket) => {
    const session = socket.request.session;
    const role    = session?.role   || 'guest';
    const teamId  = session?.teamId || null;
    const roomId  = session?.roomId || 'a';

    socket.join(`room:${roomId}`);
    console.log(`[WS] +${socket.id} | role=${role} | room=${roomId}${teamId ? ' | team='+teamId : ''}`);

    socket.emit('state:full', getFullState(roomId));

    if (role === 'admin') {
      require('./adminHandlers')(io, socket, roomId);
    }

    if (role === 'team' && teamId) {
      require('./teamHandlers')(io, socket, roomId, teamId);
    }

    socket.on('display:join', () => {
      console.log(`[WS] Display ${socket.id} → room:${roomId}`);
      socket.emit('state:full', getFullState(roomId));
    });

    socket.on('state:request', () => socket.emit('state:full', getFullState(roomId)));
    socket.on('disconnect', (r) => console.log(`[WS] -${socket.id} | ${r}`));
  });
  return io;
};
