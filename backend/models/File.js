import mongoose from 'mongoose';

const fileSchema = new mongoose.Schema({
  filename: {
    type: String,
    required: true,
    unique: true, // GCS filename with UUID prefix
  },
  originalName: {
    type: String,
    required: true,
  },
  size: {
    type: Number,
    required: true,
  },
  mimetype: {
    type: String,
    required: true,
  },
  description: {
    type: String,
    default: '',
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  isPublic: {
    type: Boolean,
    default: false,
  },
  sharedWith: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    permission: {
      type: String,
      enum: ['read', 'write'],
      default: 'read',
    },
    sharedAt: {
      type: Date,
      default: Date.now,
    },
  }],
  tags: [{
    type: String,
    trim: true,
  }],
  downloadCount: {
    type: Number,
    default: 0,
  },
  lastAccessed: {
    type: Date,
    default: null,
  },
  isDeleted: {
    type: Boolean,
    default: false,
  },
  deletedAt: {
    type: Date,
    default: null,
  },
}, {
  timestamps: true,
});

// Indexes
fileSchema.index({ owner: 1 });
fileSchema.index({ filename: 1 });
fileSchema.index({ 'sharedWith.user': 1 });
fileSchema.index({ tags: 1 });
fileSchema.index({ isDeleted: 1 });
fileSchema.index({ createdAt: -1 });

// Methods
fileSchema.methods.incrementDownloadCount = function() {
  this.downloadCount += 1;
  this.lastAccessed = new Date();
};

fileSchema.methods.shareWith = function(userId, permission = 'read') {
  // Remove existing share with this user
  this.sharedWith = this.sharedWith.filter(share => 
    !share.user.equals(userId)
  );
  
  // Add new share
  this.sharedWith.push({
    user: userId,
    permission,
    sharedAt: new Date(),
  });
};

fileSchema.methods.unshareWith = function(userId) {
  this.sharedWith = this.sharedWith.filter(share => 
    !share.user.equals(userId)
  );
};

fileSchema.methods.softDelete = function() {
  this.isDeleted = true;
  this.deletedAt = new Date();
};

fileSchema.methods.restore = function() {
  this.isDeleted = false;
  this.deletedAt = null;
};

// Check if user has access to file
fileSchema.methods.hasAccess = function(userId, requiredPermission = 'read') {
  // Owner has full access
  if (this.owner.equals(userId)) {
    return true;
  }
  
  // Check if file is public for read access
  if (this.isPublic && requiredPermission === 'read') {
    return true;
  }
  
  // Check shared permissions
  const share = this.sharedWith.find(share => share.user.equals(userId));
  if (!share) return false;
  
  if (requiredPermission === 'read') {
    return ['read', 'write'].includes(share.permission);
  }
  
  if (requiredPermission === 'write') {
    return share.permission === 'write';
  }
  
  return false;
};

// Static methods
fileSchema.statics.findUserFiles = function(userId, includeShared = true) {
  const query = {
    isDeleted: false,
    $or: [
      { owner: userId },
    ],
  };
  
  if (includeShared) {
    query.$or.push({ 'sharedWith.user': userId });
  }
  
  return this.find(query)
    .populate('owner', 'name email avatar')
    .populate('sharedWith.user', 'name email avatar')
    .sort({ createdAt: -1 });
};

fileSchema.statics.findPublicFiles = function() {
  return this.find({ isPublic: true, isDeleted: false })
    .populate('owner', 'name email avatar')
    .sort({ createdAt: -1 });
};

const File = mongoose.model('File', fileSchema);

export default File;