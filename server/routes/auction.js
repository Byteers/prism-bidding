const express = require('express');
const router  = express.Router();
const { getFullState } = require('../state');
function room(req) { return req.session.roomId || req.query.room || 'a'; }
router.get('/state', (req, res) => res.json(getFullState(room(req))));
module.exports = router;
