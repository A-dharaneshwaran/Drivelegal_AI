const aiService = require('../services/aiService');
const User = require('../models/User');
const complianceEngine = require('../services/complianceEngine');

/**
 * Handles incoming chat messages from the compliance hub client.
 * Validates payloads, handles fallback transitions, and returns standard success responses.
 * On a successful AI response the user's trafficAssistantChatsCount is atomically incremented
 * and the Awareness Score is recalculated — failed AI calls do NOT increment the counter.
 */
const chat = async (req, res, next) => {
  try {
    const { message, prompt, history } = req.body;
    
    // Support both 'message' and 'prompt' keys to cover client variations
    const queryText = prompt || message;
    
    if (!queryText) {
      return res.status(400).json({ 
        success: false, 
        message: 'A text prompt or message is required.' 
      });
    }

    // Process chat query through upgraded AI service (gemini-2.5-flash with pro fallback).
    // NOTE: increment happens AFTER this resolves so failed AI calls never mutate state.
    const text = await aiService.chat(queryText, history || []);

    // ── Atomic increment: only reached when AI call succeeded and user is authenticated ────────────────
    if (req.userId) {
      // $inc is atomic in MongoDB — safe under concurrent requests, no double-count risk.
      await User.findByIdAndUpdate(
        req.userId,
        { $inc: { trafficAssistantChatsCount: 1 } },
        { new: false } // we don't need the updated doc here
      );

      // Recalculate Awareness Score so the dashboard reflects the new chat milestone.
      // Run asynchronously (no await) so we don't slow down the chat response.
      complianceEngine.recalculateUserComplianceScores(req.userId).catch(err => {
        console.error('[AI CHAT] Awareness score recalculation failed (non-fatal):', err.message);
      });
    }

    res.json({
      success: true,
      response: text
    });
  } catch (error) {
    // AI service failure reaches here — trafficAssistantChatsCount was NOT incremented.
    next(error);
  }
};

module.exports = {
  chat
};
