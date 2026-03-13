const express = require('express');
const router  = express.Router();
const db      = require('../db');
const { refreshItems } = require('../state');

function requireAdmin(req, res, next) {
  if (req.session.role !== 'admin') return res.status(403).json({ success: false, message: 'Admin only' });
  next();
}
function room(req) { return req.session.roomId || req.query.room || 'a'; }

router.get('/', (req, res) => res.json(db.getItems(room(req))));
router.get('/:id', (req, res) => {
  const item = db.getItemById(room(req), parseInt(req.params.id));
  if (!item) return res.status(404).json({ success: false });
  res.json(item);
});
router.post('/', requireAdmin, (req, res) => {
  const r = room(req);
  const { name, description, icon, base_price, sort_order } = req.body;
  if (!name || !base_price) return res.json({ success: false, message: 'name and base_price required' });
  const id = db.insertItem(r, name, description || '', icon || '📦', base_price, sort_order || 0);
  refreshItems(r);
  res.json({ success: true, id });
});
router.put('/:id', requireAdmin, (req, res) => {
  const r = room(req);
  const { name, description, icon, base_price } = req.body;
  db.updateItem(r, name, description || '', icon || '📦', base_price, parseInt(req.params.id));
  refreshItems(r);
  res.json({ success: true });
});
router.delete('/:id', requireAdmin, (req, res) => {
  const r = room(req);
  db.deleteItem(r, parseInt(req.params.id));
  refreshItems(r);
  res.json({ success: true });
});
router.post('/:id/reset', requireAdmin, (req, res) => {
  const r = room(req);
  db.resetItem(r, parseInt(req.params.id));
  refreshItems(r);
  res.json({ success: true });
});
module.exports = router;
