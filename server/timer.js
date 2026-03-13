/**
 * timer.js — Per-room countdown engine
 */
const { setTimer, tickTimer, getRoomState } = require('./state');

let _io = null;
const intervals = {};

function init(io) { _io = io; }

function roomNsp(roomId) { return _io.to(`room:${roomId}`); }

function start(roomId, seconds, max) {
  stop(roomId);
  const timerMax = max || seconds;
  setTimer(roomId, seconds, timerMax, true);
  roomNsp(roomId).emit('timer:started', { value: seconds, max: timerMax, running: true });

  intervals[roomId] = setInterval(() => {
    const remaining = tickTimer(roomId);
    roomNsp(roomId).emit('timer:tick', {
      value: remaining, max: getRoomState(roomId).timer.max, running: remaining > 0,
    });
    if (remaining === 0) {
      clearInterval(intervals[roomId]);
      delete intervals[roomId];
      roomNsp(roomId).emit('timer:ended', { message: 'Time is up!' });
      console.log(`[Timer:${roomId}] Ended`);
    }
  }, 1000);
  console.log(`[Timer:${roomId}] Started ${seconds}s`);
}

function stop(roomId) {
  if (intervals[roomId]) {
    clearInterval(intervals[roomId]);
    delete intervals[roomId];
  }
  const s = getRoomState(roomId);
  if (s.timer.running) {
    setTimer(roomId, s.timer.value, s.timer.max, false);
    roomNsp(roomId).emit('timer:tick', { value: s.timer.value, max: s.timer.max, running: false });
  }
}

function reset(roomId, seconds) {
  stop(roomId);
  const s   = getRoomState(roomId);
  const val = seconds || s.timer.max || 60;
  setTimer(roomId, val, val, false);
  roomNsp(roomId).emit('timer:reset', { value: val, max: val, running: false });
}

function extend(roomId, seconds) {
  const s      = getRoomState(roomId);
  const newVal = s.timer.value + seconds;
  const newMax = Math.max(s.timer.max, newVal);
  setTimer(roomId, newVal, newMax, s.timer.running);
  roomNsp(roomId).emit('timer:tick', { value: newVal, max: newMax, running: s.timer.running });
}

module.exports = { init, start, stop, reset, extend };
