// MongoDB initialization script for CloudStorage
// This script runs when the MongoDB container starts for the first time

// Switch to the cloudstorage database
db = db.getSiblingDB('cloudstorage');

// Create application user with read/write permissions
db.createUser({
  user: 'cloudstorage_user',
  pwd: 'cloudstorage_pass',
  roles: [
    {
      role: 'readWrite',
      db: 'cloudstorage'
    }
  ]
});

// Create collections with validation
db.createCollection('users', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['email', 'name'],
      properties: {
        email: {
          bsonType: 'string',
          description: 'Email address is required and must be a string'
        },
        name: {
          bsonType: 'string',
          description: 'Name is required and must be a string'
        },
        role: {
          bsonType: 'string',
          enum: ['user', 'admin'],
          description: 'Role must be either user or admin'
        }
      }
    }
  }
});

db.createCollection('files', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['filename', 'originalName', 'owner'],
      properties: {
        filename: {
          bsonType: 'string',
          description: 'Filename is required and must be a string'
        },
        originalName: {
          bsonType: 'string',
          description: 'Original name is required and must be a string'
        },
        owner: {
          bsonType: 'objectId',
          description: 'Owner is required and must be an ObjectId'
        }
      }
    }
  }
});

// Create indexes for better performance
db.users.createIndex({ email: 1 }, { unique: true });
db.users.createIndex({ googleId: 1 }, { sparse: true, unique: true });
db.users.createIndex({ emailVerificationToken: 1 }, { sparse: true });
db.users.createIndex({ passwordResetToken: 1 }, { sparse: true });

db.files.createIndex({ owner: 1 });
db.files.createIndex({ filename: 1 }, { unique: true });
db.files.createIndex({ 'sharedWith.user': 1 });
db.files.createIndex({ tags: 1 });
db.files.createIndex({ isDeleted: 1 });
db.files.createIndex({ createdAt: -1 });

print('CloudStorage database initialized successfully');
print('Created user: cloudstorage_user');
print('Created collections: users, files');
print('Created indexes for optimal performance');