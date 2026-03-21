const ItemReaction = require('../models/ItemReaction');
const { successResponse, errorResponse } = require('../../../utils/helpers');

// @desc    Toggle reaction on an itinerary item
// @route   POST /api/reactions
exports.toggleReaction = async (req, res, next) => {
  try {
    const { item_id, reaction } = req.body;
    const user_id = req.user.id;

    // Check if user already reacted to this item
    const existing = await ItemReaction.findOne({ where: { user_id, item_id } });

    if (existing) {
      if (existing.reaction === reaction) {
        // Same reaction – remove it (toggle off)
        await existing.destroy();
        return res.status(200).json(successResponse(null, 'Reaction removed'));
      }
      // Different reaction – update it
      existing.reaction = reaction;
      await existing.save();
      return res.status(200).json(successResponse(existing, 'Reaction updated'));
    }

    // Create new reaction
    const newReaction = await ItemReaction.create({ user_id, item_id, reaction });
    res.status(201).json(successResponse(newReaction, 'Reaction added'));
  } catch (error) { next(error); }
};

// @desc    Get reactions for a specific item
// @route   GET /api/reactions/item/:itemId
exports.getByItem = async (req, res, next) => {
  try {
    const reactions = await ItemReaction.findAll({
      where: { item_id: req.params.itemId },
    });
    const likes = reactions.filter(r => r.reaction === 'LIKE').length;
    const dislikes = reactions.filter(r => r.reaction === 'DISLIKE').length;
    res.status(200).json(successResponse({ likes, dislikes, reactions }, 'Reactions fetched'));
  } catch (error) { next(error); }
};

// @desc    Get user's reaction for an item
// @route   GET /api/reactions/item/:itemId/me
exports.getMyReaction = async (req, res, next) => {
  try {
    const reaction = await ItemReaction.findOne({
      where: { item_id: req.params.itemId, user_id: req.user.id },
    });
    res.status(200).json(successResponse(reaction, 'User reaction fetched'));
  } catch (error) { next(error); }
};
