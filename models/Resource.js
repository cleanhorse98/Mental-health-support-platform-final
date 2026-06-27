const mongoose = require('mongoose');

const resourceSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  description: {
    type: String,
    required: true,
    maxlength: 1000,
    trim: true
  },
  content: {
    type: String,
    required: true,
    maxlength: 10000,
    trim: true
  },
  type: {
    type: String,
    required: true,
    enum: ['article', 'video', 'guide', 'tool', 'app', 'book', 'podcast', 'other']
  },
  category: {
    type: String,
    required: true,
    enum: ['anxiety', 'depression', 'stress', 'academic', 'relationships', 'self-care', 'mindfulness', 'crisis', 'general']
  },
  url: {
    type: String,
    trim: true
  },
  thumbnail: {
    type: String,
    trim: true
  },
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  isPublished: {
    type: Boolean,
    default: false
  },
  likes: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  views: {
    type: Number,
    default: 0
  },
  tags: [{
    type: String,
    trim: true
  }],
  featured: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Indexes for efficient queries
resourceSchema.index({ isPublished: 1, createdAt: -1 });
resourceSchema.index({ category: 1, isPublished: 1 });
resourceSchema.index({ featured: 1, isPublished: 1 });

// Update updatedAt timestamp
resourceSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Resource', resourceSchema);

