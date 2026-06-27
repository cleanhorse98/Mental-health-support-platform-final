const express = require('express');
const router = express.Router();
const Journal = require('../models/journal');
const User = require('../models/User');
const jwt = require('jsonwebtoken');

// Middleware to check authentication
const authenticateToken = (req, res, next) => {
  const token = req.session.token || req.headers.authorization?.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, process.env.JWT_SECRET || 'mental-health-secret', (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
};

// Get public journal entries
router.get('/public', async (req, res) => {
  try {
    const { limit = 20, offset = 0 } = req.query;

    const entries = await Journal.find({
      isPublic: true,
      moderationStatus: 'approved'
    })
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(offset))
      .populate('userId', 'username firstName lastName')
      .select('content mood tags reactions comments createdAt isAnonymous');

    const total = await Journal.countDocuments({
      isPublic: true,
      moderationStatus: 'approved'
    });

    // Hide user info if anonymous
    const processedEntries = entries.map(entry => {
      const entryObj = entry.toObject();
      if (entry.isAnonymous) {
        entryObj.userId = null;
      }
      return entryObj;
    });

    res.json({
      entries: processedEntries,
      total,
      hasMore: parseInt(offset) + parseInt(limit) < total
    });
  } catch (error) {
    console.error('Get public entries error:', error);
    res.status(500).json({ error: 'Failed to fetch public entries' });
  }
});

// Get user's journal entries
router.get('/my-entries', authenticateToken, async (req, res) => {
  try {
    const { limit = 20, offset = 0 } = req.query;

    const entries = await Journal.find({
      userId: req.user.userId
    })
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(offset));

    const total = await Journal.countDocuments({
      userId: req.user.userId
    });

    res.json({
      entries,
      total,
      hasMore: parseInt(offset) + parseInt(limit) < total
    });
  } catch (error) {
    console.error('Get my entries error:', error);
    res.status(500).json({ error: 'Failed to fetch your entries' });
  }
});

// Create new journal entry
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { content, isAnonymous, isPublic, mood, tags } = req.body;

    if (!content || content.trim().length === 0) {
      return res.status(400).json({ error: 'Content is required' });
    }

    const journalEntry = new Journal({
      userId: req.user.userId,
      content: content.trim(),
      isAnonymous: isAnonymous !== undefined ? isAnonymous : true,
      isPublic: isPublic !== undefined ? isPublic : false,
      mood,
      tags: tags || [],
      moderationStatus: isPublic ? 'pending' : 'approved'
    });

    await journalEntry.save();

    res.status(201).json({
      message: 'Journal entry created successfully',
      entry: journalEntry
    });
  } catch (error) {
    console.error('Create journal entry error:', error);
    res.status(500).json({ error: 'Failed to create journal entry' });
  }
});

// React to journal entry
router.post('/:id/react', authenticateToken, async (req, res) => {
  try {
    const { type } = req.body;
    const { id } = req.params;

    if (!['like', 'love', 'support', 'hug'].includes(type)) {
      return res.status(400).json({ error: 'Invalid reaction type' });
    }

    const entry = await Journal.findById(id);
    if (!entry) {
      return res.status(404).json({ error: 'Journal entry not found' });
    }

    // Remove existing reaction from this user
    entry.reactions = entry.reactions.filter(
      r => r.userId.toString() !== req.user.userId.toString()
    );

    // Add new reaction
    entry.reactions.push({
      type,
      userId: req.user.userId,
      createdAt: new Date()
    });

    await entry.save();

    res.json({
      message: 'Reaction added successfully',
      reactions: entry.reactions
    });
  } catch (error) {
    console.error('React to entry error:', error);
    res.status(500).json({ error: 'Failed to add reaction' });
  }
});

// Comment on journal entry
router.post('/:id/comment', authenticateToken, async (req, res) => {
  try {
    const { content, isAnonymous } = req.body;
    const { id } = req.params;

    if (!content || content.trim().length === 0) {
      return res.status(400).json({ error: 'Comment content is required' });
    }

    const entry = await Journal.findById(id);
    if (!entry) {
      return res.status(404).json({ error: 'Journal entry not found' });
    }

    entry.comments.push({
      content: content.trim(),
      userId: req.user.userId,
      isAnonymous: isAnonymous !== undefined ? isAnonymous : true,
      createdAt: new Date()
    });

    await entry.save();

    res.json({
      message: 'Comment added successfully',
      comment: entry.comments[entry.comments.length - 1]
    });
  } catch (error) {
    console.error('Comment on entry error:', error);
    res.status(500).json({ error: 'Failed to add comment' });
  }
});

// Flag journal entry
router.post('/:id/flag', authenticateToken, async (req, res) => {
  try {
    const { reason, notes } = req.body;
    const { id } = req.params;

    if (!reason) {
      return res.status(400).json({ error: 'Flag reason is required' });
    }

    const entry = await Journal.findById(id);
    if (!entry) {
      return res.status(404).json({ error: 'Journal entry not found' });
    }

    // Check if user already flagged this entry
    const alreadyFlagged = entry.flags.some(
      f => f.userId.toString() === req.user.userId.toString()
    );

    if (alreadyFlagged) {
      return res.status(400).json({ error: 'You have already flagged this entry' });
    }

    entry.flags.push({
      reason,
      userId: req.user.userId,
      notes,
      createdAt: new Date()
    });

    // Auto-moderate if multiple flags
    if (entry.flags.length >= 3) {
      entry.moderationStatus = 'pending';
    }

    await entry.save();

    res.json({
      message: 'Entry flagged successfully',
      flagCount: entry.flags.length
    });
  } catch (error) {
    console.error('Flag entry error:', error);
    res.status(500).json({ error: 'Failed to flag entry' });
  }
});

// Update journal entry (owner only)
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { content, mood, tags, isPublic } = req.body;

    const entry = await Journal.findById(id);
    if (!entry) {
      return res.status(404).json({ error: 'Journal entry not found' });
    }

    // Only owner can update
    if (entry.userId.toString() !== req.user.userId.toString()) {
      return res.status(403).json({ error: 'Not authorized to edit this entry' });
    }

    if (content && content.trim().length > 0) entry.content = content.trim();
    if (mood) entry.mood = mood;
    if (Array.isArray(tags)) entry.tags = tags;
    if (typeof isPublic !== 'undefined') {
      // If making public, set moderation pending
      if (isPublic && !entry.isPublic) entry.moderationStatus = 'pending';
      entry.isPublic = !!isPublic;
    }

    await entry.save();

    res.json({ message: 'Entry updated successfully', entry });
  } catch (error) {
    console.error('Update entry error:', error);
    res.status(500).json({ error: 'Failed to update entry' });
  }
});

module.exports = router;

