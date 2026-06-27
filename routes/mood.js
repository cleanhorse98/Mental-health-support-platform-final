const express = require('express');
const router = express.Router();
const Mood = require('../models/Mood');
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

// Log new mood entry
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { mood, intensity, notes, tags, activities } = req.body;

    if (!mood) {
      return res.status(400).json({ error: 'Mood is required' });
    }

    const moodEntry = new Mood({
      userId: req.user.userId,
      mood,
      intensity: intensity || 5,
      notes,
      tags: tags || [],
      activities: activities || [],
      date: new Date()
    });

    await moodEntry.save();

    res.status(201).json({
      message: 'Mood logged successfully',
      moodEntry
    });
  } catch (error) {
    console.error('Log mood error:', error);
    res.status(500).json({ error: 'Failed to log mood' });
  }
});

// Get mood history
router.get('/history', authenticateToken, async (req, res) => {
  try {
    const { limit = 30, offset = 0, startDate, endDate } = req.query;
    
    const query = { userId: req.user.userId };
    
    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate) query.date.$lte = new Date(endDate);
    }

    const moods = await Mood.find(query)
      .sort({ date: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(offset));

    const total = await Mood.countDocuments(query);

    res.json({
      moods,
      total,
      hasMore: parseInt(offset) + parseInt(limit) < total
    });
  } catch (error) {
    console.error('Get mood history error:', error);
    res.status(500).json({ error: 'Failed to fetch mood history' });
  }
});

// Get mood statistics
router.get('/stats', authenticateToken, async (req, res) => {
  try {
    const { days = 30 } = req.query;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));

    const moods = await Mood.find({
      userId: req.user.userId,
      date: { $gte: startDate }
    }).sort({ date: 1 });

    // Calculate statistics
    const moodCounts = {};
    const moodByDay = {};
    let totalIntensity = 0;
    let count = 0;

    moods.forEach(mood => {
      // Count mood types
      moodCounts[mood.mood] = (moodCounts[mood.mood] || 0) + 1;
      
      // Group by day
      const day = mood.date.toISOString().split('T')[0];
      if (!moodByDay[day]) {
        moodByDay[day] = [];
      }
      moodByDay[day].push(mood);
      
      // Calculate average intensity
      totalIntensity += mood.intensity;
      count++;
    });

    const averageIntensity = count > 0 ? (totalIntensity / count).toFixed(2) : 0;
    const mostCommonMood = Object.keys(moodCounts).reduce((a, b) => 
      moodCounts[a] > moodCounts[b] ? a : b, 'neutral'
    );

    res.json({
      totalEntries: moods.length,
      averageIntensity: parseFloat(averageIntensity),
      mostCommonMood,
      moodDistribution: moodCounts,
      moodByDay,
      trends: {
        days: parseInt(days),
        startDate,
        endDate: new Date()
      }
    });
  } catch (error) {
    console.error('Get mood stats error:', error);
    res.status(500).json({ error: 'Failed to fetch mood statistics' });
  }
});

// Get today's mood
router.get('/today', authenticateToken, async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const mood = await Mood.findOne({
      userId: req.user.userId,
      date: {
        $gte: today,
        $lt: tomorrow
      }
    }).sort({ createdAt: -1 });

    if (!mood) {
      return res.status(404).json({ error: 'No mood entry found for today' });
    }

    res.json({ mood });
  } catch (error) {
    console.error('Get today mood error:', error);
    res.status(500).json({ error: 'Failed to fetch today\'s mood' });
  }
});

module.exports = router;

