const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Journal = require('../models/journal');
const Resource = require('../models/Resource');
const Mood = require('../models/Mood');
const jwt = require('jsonwebtoken');

// Middleware to check authentication and admin role
const authenticateAdmin = (req, res, next) => {
  const token = req.session.token || req.headers.authorization?.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, process.env.JWT_SECRET || 'mental-health-secret', (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    if (user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }
    req.user = user;
    next();
  });
};

// Get all users
router.get('/users', authenticateAdmin, async (req, res) => {
  try {
    const { limit = 50, offset = 0, role, search } = req.query;
    
    const query = {};
    if (role) query.role = role;
    if (search) {
      query.$or = [
        { username: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } }
      ];
    }

    const users = await User.find(query)
      .select('-password')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(offset));

    const total = await User.countDocuments(query);

    res.json({
      users,
      total,
      hasMore: parseInt(offset) + parseInt(limit) < total
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Get platform statistics
router.get('/stats', authenticateAdmin, async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const totalStudents = await User.countDocuments({ role: 'student' });
    const totalCounselors = await User.countDocuments({ role: 'counselor' });
    const totalAdmins = await User.countDocuments({ role: 'admin' });
    const activeUsers = await User.countDocuments({ isActive: true });
    
    const totalJournalEntries = await Journal.countDocuments();
    const publicEntries = await Journal.countDocuments({ isPublic: true });
    const flaggedEntries = await Journal.countDocuments({ 'flags.0': { $exists: true } });
    
    const totalResources = await Resource.countDocuments();
    const publishedResources = await Resource.countDocuments({ isPublished: true });
    
    const totalMoodEntries = await Mood.countDocuments();
    
    const recentUsers = await User.find()
      .sort({ createdAt: -1 })
      .limit(10)
      .select('username email role createdAt');

    res.json({
      users: {
        total: totalUsers,
        students: totalStudents,
        counselors: totalCounselors,
        admins: totalAdmins,
        active: activeUsers,
        recent: recentUsers
      },
      journal: {
        total: totalJournalEntries,
        public: publicEntries,
        flagged: flaggedEntries
      },
      resources: {
        total: totalResources,
        published: publishedResources
      },
      mood: {
        totalEntries: totalMoodEntries
      }
    });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
});

// Get flagged entries
router.get('/flagged-entries', authenticateAdmin, async (req, res) => {
  try {
    const { limit = 20, offset = 0 } = req.query;

    const entries = await Journal.find({
      'flags.0': { $exists: true },
      moderationStatus: { $ne: 'approved' }
    })
      .populate('userId', 'username email')
      .populate('flags.userId', 'username')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(offset));

    const total = await Journal.countDocuments({
      'flags.0': { $exists: true },
      moderationStatus: { $ne: 'approved' }
    });

    res.json({
      entries,
      total,
      hasMore: parseInt(offset) + parseInt(limit) < total
    });
  } catch (error) {
    console.error('Get flagged entries error:', error);
    res.status(500).json({ error: 'Failed to fetch flagged entries' });
  }
});

// Moderate flagged entry
router.put('/moderate-entry/:id', authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { action, reason } = req.body;

    if (!['approved', 'rejected', 'hidden'].includes(action)) {
      return res.status(400).json({ error: 'Invalid moderation action' });
    }

    const entry = await Journal.findById(id);
    if (!entry) {
      return res.status(404).json({ error: 'Journal entry not found' });
    }

    entry.moderationStatus = action;
    entry.isModerated = true;

    if (action === 'rejected' || action === 'hidden') {
      entry.isPublic = false;
    }

    await entry.save();

    res.json({
      message: `Entry ${action} successfully`,
      entry
    });
  } catch (error) {
    console.error('Moderate entry error:', error);
    res.status(500).json({ error: 'Failed to moderate entry' });
  }
});

// Update user status
router.put('/users/:id/status', authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { isActive } = req.body;

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    user.isActive = isActive !== undefined ? isActive : user.isActive;
    await user.save();

    res.json({
      message: 'User status updated successfully',
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        isActive: user.isActive
      }
    });
  } catch (error) {
    console.error('Update user status error:', error);
    res.status(500).json({ error: 'Failed to update user status' });
  }
});

module.exports = router;

