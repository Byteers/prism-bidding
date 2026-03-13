const express = require('express');
const router  = express.Router();
const db      = require('../db');
const { refreshTeams } = require('../state');

function requireAdmin(req, res, next) {
  if (req.session.role !== 'admin')
    return res.status(403).json({ success: false, message: 'Admin access required' });
  next();
}
function room(req) { return req.session.roomId || req.query.room || 'a'; }

router.get('/', (req, res) => res.json(db.getTeams(room(req))));

router.post('/', requireAdmin, (req, res) => {
  const r = room(req);
  const { id, name, password, color, budget } = req.body;
  if (!id || !name || !password)
    return res.json({ success: false, message: 'id, name and password are required' });
  if (!/^[a-z0-9_-]+$/i.test(id))
    return res.json({ success: false, message: 'Team ID: letters, numbers, hyphens only' });
  if (db.getTeamById(r, id))
    return res.json({ success: false, message: `Team ID "${id}" already exists` });
  try {
    db.insertTeam(r, id.toLowerCase(), name, password, color || '#3b82f6', parseInt(budget) || 50000);
    refreshTeams(r);
    res.json({ success: true, team: db.getTeamById(r, id.toLowerCase()) });
  } catch (e) { res.json({ success: false, message: e.message }); }
});

router.put('/:id', requireAdmin, (req, res) => {
  const r    = room(req);
  const team = db.getTeamById(r, req.params.id);
  if (!team) return res.json({ success: false, message: 'Team not found' });
  const { name, password, color, budget } = req.body;
  db.updateTeamFull(r,
    name     !== undefined ? name     : team.name,
    password !== undefined ? password : team.password,
    color    !== undefined ? color    : team.color,
    budget   !== undefined ? parseInt(budget) : team.budget,
    req.params.id
  );
  refreshTeams(r);
  res.json({ success: true, team: db.getTeamById(r, req.params.id) });
});

router.patch('/:id/budget', requireAdmin, (req, res) => {
  const r    = room(req);
  const team = db.getTeamById(r, req.params.id);
  if (!team) return res.json({ success: false, message: 'Team not found' });
  const { amount, mode } = req.body;
  if (amount === undefined) return res.json({ success: false, message: 'amount required' });
  const newBudget = mode === 'add' ? team.budget + parseInt(amount) : parseInt(amount);
  if (newBudget < 0) return res.json({ success: false, message: 'Budget cannot be negative' });
  db.updateTeamFull(r, team.name, team.password, team.color, newBudget, req.params.id);
  refreshTeams(r);
  res.json({ success: true, team: db.getTeamById(r, req.params.id) });
});

router.delete('/:id', requireAdmin, (req, res) => {
  const r = room(req);
  db.deleteTeam(r, req.params.id);
  refreshTeams(r);
  res.json({ success: true });
});

module.exports = router;
