import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema({
    familyId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'FamilyGroup',
        required: true
    },
    senderId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    senderName: {
        type: String,
        required: true
    },
    senderProfileImage: {
        type: String,
        default: null
    },
    content: {
        type: String,
        default: null
    },
    mediaFile: {
        originalName: String,
        fileType: {
            type: String,
            enum: ['image', 'video', 'pdf', 'document', 'audio', 'other'],
            default: 'other'
        },
        fileSize: Number,
        base64Data: String, // Base64 encoded file data
        mimeType: String,
        url: String // Optional: for cloud storage URLs
    },
    messageType: {
        type: String,
        enum: ['text', 'media'],
        default: 'text'
    },
    disappearAfter: {
        type: Number,
        default: null // in milliseconds, null means message doesn't disappear
    },
    disappearTime: {
        type: Date,
        default: null // When the message will disappear
    },
    isDeleted: {
        type: Boolean,
        default: false
    },
    deletedAt: {
        type: Date,
        default: null
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    reactions: [{
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        emoji: String,
        _id: false
    }],
    replyTo: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Message',
        default: null
    }
});

// Index for efficient queries
messageSchema.index({ familyId: 1, createdAt: -1 });
messageSchema.index({ disappearTime: 1 }, { sparse: true });

// TTL Index for automatic deletion of expired messages
messageSchema.index({ disappearTime: 1 }, { 
    expireAfterSeconds: 0,
    sparse: true,
    partialFilterExpression: { disappearTime: { $exists: true, $ne: null } }
});

// Middleware to handle message expiry
messageSchema.pre('save', function(next) {
    if (this.disappearAfter && !this.disappearTime) {
        this.disappearTime = new Date(Date.now() + this.disappearAfter);
    }
    next();
});

export default mongoose.model('Message', messageSchema);
