const express = require('express');
const router  = express.Router();
const db      = require('../db');
require('dotenv').config();

function getRoom(req) { return req.body?.room || req.query.room || req.session.roomId || 'a'; }

router.post('/admin-login', (req, res) => {
  const { password, room } = req.body;
  const roomId = room || getRoom(req);
  if (password !== process.env.ADMIN_PASSWORD)
    return res.json({ success: false, message: 'Invalid admin password' });
  req.session.role   = 'admin';
  req.session.teamId = null;
  req.session.roomId = roomId;
  req.session.save(() => res.json({ success: true, role: 'admin', roomId }));
});

router.post('/team-login', (req, res) => {
  const { teamId, password, room } = req.body;
  const roomId = room || getRoom(req);
  const team   = db.getTeamById(roomId, teamId);
  if (!team) return res.json({ success: false, message: 'Team not found' });
  if (team.password !== password) return res.json({ success: false, message: 'Invalid password' });
  req.session.role   = 'team';
  req.session.teamId = team.id;
  req.session.roomId = roomId;
  req.session.save(() => res.json({
    success: true, role: 'team',
    teamId: team.id, teamName: team.name, color: team.color, roomId,
  }));
});

router.get('/me', (req, res) => {
  const role = req.session.role;
  if (role === 'admin') return res.json({ role: 'admin', roomId: req.session.roomId || 'a' });
  if (role === 'team' && req.session.teamId) {
    const roomId = req.session.roomId || 'a';
    const team   = db.getTeamById(roomId, req.session.teamId);
    if (!team) return res.json({ role: 'guest' });
    return res.json({ role: 'team', teamId: team.id, teamName: team.name, color: team.color, budget: team.budget, roomId });
  }
  res.json({ role: 'guest' });
});

router.post('/logout', (req, res) => {
  req.session.destroy(() => res.json({ success: true }));
});

module.exports = router;
