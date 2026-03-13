/**
 * prism.js — Shared client utilities
 * Included on every page.
 */

// ── SOCKET CONNECTION ──
window.PRISM = {
  socket: null,
  state:  null,
  teamId: null,
  role:   null,

  connect() {
    const proto = location.protocol === 'https:' ? 'wss' : 'ws';
    this.socket = io({ transports: ['websocket', 'polling'] });

    this.socket.on('connect', () => {
      console.log('[PRISM] Socket connected:', this.socket.id);
      this.setWsStatus('connected');
      this.socket.emit('state:request');
    });

    this.socket.on('disconnect', (reason) => {
      console.warn('[PRISM] Disconnected:', reason);
      this.setWsStatus('disconnected');
    });

    this.socket.on('reconnect', () => {
      console.log('[PRISM] Reconnected');
      this.setWsStatus('connected');
    });

    this.socket.on('state:full', (s) => {
      this.state = s;
      if (window.onStateUpdate) window.onStateUpdate(s);
    });

    this.socket.on('bid:new', (d) => {
      if (window.onBidNew) window.onBidNew(d);
    });

    this.socket.on('bid:updated', (d) => {
      if (window.onBidUpdated) window.onBidUpdated(d);
    });

    this.socket.on('item:activated', (d) => {
      if (window.onItemActivated) window.onItemActivated(d);
    });

    this.socket.on('item:sold', (d) => {
      if (window.onItemSold) window.onItemSold(d);
    });

    this.socket.on('winner:announce', (d) => {
      if (window.onWinnerAnnounce) window.onWinnerAnnounce(d);
    });

    this.socket.on('timer:tick', (d) => {
      if (window.onTimerTick) window.onTimerTick(d);
    });

    this.socket.on('timer:started', (d) => {
      if (window.onTimerTick) window.onTimerTick({ ...d, running: true });
    });

    this.socket.on('timer:reset', (d) => {
      if (window.onTimerTick) window.onTimerTick({ ...d, running: false });
    });

    this.socket.on('timer:ended', () => {
      if (window.onTimerEnded) window.onTimerEnded();
    });

    this.socket.on('auction:started',  () => { if (window.onAuctionEvent) window.onAuctionEvent('started'); });
    this.socket.on('auction:paused',   () => { if (window.onAuctionEvent) window.onAuctionEvent('paused'); });
    this.socket.on('auction:resumed',  () => { if (window.onAuctionEvent) window.onAuctionEvent('resumed'); });
    this.socket.on('auction:ended',    () => { if (window.onAuctionEvent) window.onAuctionEvent('ended'); });
    this.socket.on('auction:reset',    () => { if (window.onAuctionEvent) window.onAuctionEvent('reset'); });

    this.socket.on('leaderboard:update', (d) => {
      if (window.onLeaderboardUpdate) window.onLeaderboardUpdate(d);
    });

    this.socket.on('admin:error', (d) => {
      console.error('[PRISM] Admin error:', d.message);
      PRISM.toast(d.message, 'error');
    });

    return this.socket;
  },

  emit(event, data, cb) {
    if (!this.socket) return;
    if (cb) this.socket.emit(event, data, cb);
    else this.socket.emit(event, data);
  },

  setWsStatus(status) {
    document.querySelectorAll('.ws-dot').forEach(el => {
      el.className = `ws-dot ${status}`;
    });
    document.querySelectorAll('.ws-label').forEach(el => {
      el.textContent = status === 'connected' ? 'LIVE' : 'OFFLINE';
    });
  },

  // ── REST API ──
  async api(method, url, body) {
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    });
    return res.json();
  },
  get(url)       { return this.api('GET',    url); },
  post(url, body){ return this.api('POST',   url, body); },
  put(url, body) { return this.api('PUT',    url, body); },
  del(url)       { return this.api('DELETE', url); },

  // ── UTILITIES ──
  fmt(n) {
    return '₹' + Number(n || 0).toLocaleString('en-IN');
  },

  pct(a, b) {
    return b > 0 ? Math.round((Number(a) / Number(b)) * 100) : 0;
  },

  toast(msg, type = 'info', duration = 2800) {
    const el = document.getElementById('toast');
    if (!el) return;
    el.textContent = msg;
    el.className = `toast show ${type}`;
    clearTimeout(el._t);
    el._t = setTimeout(() => el.classList.remove('show'), duration);
  },

  confetti() {
    const canvas = document.getElementById('confetti');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;
    const colors  = ['#3b82f6','#f59e0b','#22c55e','#ef4444','#a855f7','#ec4899'];
    const parts   = Array.from({ length: 160 }, () => ({
      x: Math.random() * canvas.width, y: -10,
      vx: (Math.random() - .5) * 6, vy: Math.random() * 5 + 2,
      color: colors[Math.floor(Math.random() * colors.length)],
      size: Math.random() * 10 + 4,
      rot: Math.random() * 360, rotV: (Math.random() - .5) * 8,
      alpha: 1,
    }));
    let frame = 0;
    function draw() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      parts.forEach(p => {
        p.x += p.vx; p.y += p.vy; p.rot += p.rotV;
        p.alpha = Math.max(0, 1 - frame / 180);
        ctx.save();
        ctx.globalAlpha = p.alpha;
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot * Math.PI / 180);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
        ctx.restore();
      });
      frame++;
      if (frame < 200) requestAnimationFrame(draw);
      else ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
    draw();
  },
};
