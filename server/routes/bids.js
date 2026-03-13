const express = require('express');
const router  = express.Router();
const db      = require('../db');
function room(req) { return req.session.roomId || req.query.room || 'a'; }
router.get('/', (req, res) => res.json(db.getRecentBids(room(req))));
router.get('/:itemId', (req, res) => res.json(db.getBidsByItem(room(req), parseInt(req.params.itemId))));
module.exports = router;
