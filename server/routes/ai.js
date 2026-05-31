const express = require('express');
const router = express.Router();
const aiController = require('../controllers/aiController');
const optionalAuth = require('../middleware/optionalAuth');

// Redirect AI Chat prompts to the centralized AI controller (optional auth to support guest chats)
router.post('/chat', optionalAuth, aiController.chat);

module.exports = router;
