const mongoose = require('mongoose');

const moodSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  mood: {
    type: String,
    required: true,
    enum: ['very-happy', 'happy', 'neutral', 'sad', 'very-sad', 'anxious', 'stressed', 'angry', 'calm', 'excited']
  },
  intensity: {
    type: Number,
    min: 1,
    max: 10,
    default: 5
  },
  notes: {
    type: String,
    maxlength: 1000,
    trim: true
  },
  tags: [{
    type: String,
    trim: true
  }],
  activities: [{
    type: String,
    trim: true
  }],
  date: {
    type: Date,
    required: true,
    default: Date.now
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Index for efficient queries
moodSchema.index({ userId: 1, date: -1 });
moodSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model('Mood', moodSchema);

