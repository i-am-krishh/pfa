import Message from '../models/Message.js';
import FamilyGroup from '../models/FamilyGroup.js';
import User from '../models/User.js';

// Send a text message
export const sendMessage = async (req, res) => {
    try {
        const { familyId, content, disappearAfter, replyTo } = req.body;
        const userId = req.user.userId;

        // Validate family and user
        const family = await FamilyGroup.findById(familyId);
        if (!family) {
            return res.status(404).json({ success: false, message: 'Family group not found' });
        }

        // Check if user is an approved member
        const isMember = family.members.some(m => m.user.toString() === userId && m.status === 'Approved');
        if (!isMember) {
            return res.status(403).json({ success: false, message: 'You are not an approved member of this family' });
        }

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        const newMessage = new Message({
            familyId,
            senderId: userId,
            senderName: user.fullName,
            senderProfileImage: user.profileImage,
            content,
            messageType: 'text',
            disappearAfter: disappearAfter || null,
            replyTo: replyTo || null
        });

        await newMessage.save();
        const populatedMessage = await newMessage.populate('senderId', 'fullName profileImage email');

        res.status(201).json({
            success: true,
            message: 'Message sent successfully',
            data: populatedMessage
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Send a message with media file
export const sendMediaMessage = async (req, res) => {
    try {
        const { familyId, base64Data, fileName, mimeType, fileType, disappearAfter, replyTo } = req.body;
        const userId = req.user.userId;

        // Validate required fields
        if (!familyId || !base64Data || !fileName || !mimeType) {
            return res.status(400).json({
                success: false,
                message: 'familyId, base64Data, fileName, and mimeType are required'
            });
        }

        // Validate family and user
        const family = await FamilyGroup.findById(familyId);
        if (!family) {
            return res.status(404).json({ success: false, message: 'Family group not found' });
        }

        const isMember = family.members.some(m => m.user.toString() === userId && m.status === 'Approved');
        if (!isMember) {
            return res.status(403).json({ success: false, message: 'You are not an approved member of this family' });
        }

        // Check file size (limit to 50MB)
        const base64Size = base64Data.length * 0.75; // Approximate size of base64 data
        if (base64Size > 50 * 1024 * 1024) {
            return res.status(413).json({
                success: false,
                message: 'File size exceeds 50MB limit'
            });
        }

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        // Determine file type if not provided
        let detectedFileType = fileType || 'other';
        if (!detectedFileType || detectedFileType === 'other') {
            if (mimeType.startsWith('image')) detectedFileType = 'image';
            else if (mimeType.startsWith('video')) detectedFileType = 'video';
            else if (mimeType.includes('pdf')) detectedFileType = 'pdf';
            else if (mimeType.includes('document') || mimeType.includes('word') || mimeType.includes('sheet')) detectedFileType = 'document';
            else if (mimeType.startsWith('audio')) detectedFileType = 'audio';
        }

        const newMessage = new Message({
            familyId,
            senderId: userId,
            senderName: user.fullName,
            senderProfileImage: user.profileImage,
            messageType: 'media',
            mediaFile: {
                originalName: fileName,
                fileType: detectedFileType,
                base64Data,
                mimeType,
                fileSize: base64Size
            },
            disappearAfter: disappearAfter || null,
            replyTo: replyTo || null
        });

        await newMessage.save();
        const populatedMessage = await newMessage.populate('senderId', 'fullName profileImage email');

        res.status(201).json({
            success: true,
            message: 'Media message sent successfully',
            data: populatedMessage
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Get messages for a family (with pagination)
export const getMessages = async (req, res) => {
    try {
        const { familyId } = req.params;
        const { page = 1, limit = 50 } = req.query;
        const userId = req.user.userId;

        // Validate family exists and user is a member
        const family = await FamilyGroup.findById(familyId);
        if (!family) {
            return res.status(404).json({ success: false, message: 'Family group not found' });
        }

        const isMember = family.members.some(m => m.user.toString() === userId);
        if (!isMember) {
            return res.status(403).json({ success: false, message: 'You are not a member of this family' });
        }

        const skip = (page - 1) * limit;

        const messages = await Message.find({ familyId, isDeleted: false })
            .populate('senderId', 'fullName profileImage email')
            .populate('replyTo')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(parseInt(limit))
            .lean();

        const totalCount = await Message.countDocuments({ familyId, isDeleted: false });

        res.status(200).json({
            success: true,
            data: messages.reverse(), // Reverse to show chronological order
            pagination: {
                currentPage: parseInt(page),
                totalPages: Math.ceil(totalCount / limit),
                totalMessages: totalCount,
                limit: parseInt(limit)
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Delete a message (soft delete)
export const deleteMessage = async (req, res) => {
    try {
        const { messageId } = req.params;
        const userId = req.user.userId;

        const message = await Message.findById(messageId);
        if (!message) {
            return res.status(404).json({ success: false, message: 'Message not found' });
        }

        // Check if user is the sender or family admin
        const family = await FamilyGroup.findById(message.familyId);
        const isAdmin = family.admin.toString() === userId;

        if (message.senderId.toString() !== userId && !isAdmin) {
            return res.status(403).json({ success: false, message: 'You can only delete your own messages' });
        }

        message.isDeleted = true;
        message.deletedAt = new Date();
        await message.save();

        res.status(200).json({
            success: true,
            message: 'Message deleted successfully'
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Set message disappear settings for family
export const updateChatSettings = async (req, res) => {
    try {
        const { familyId, defaultDisappearTime } = req.body;
        const userId = req.user.userId;

        const family = await FamilyGroup.findById(familyId);
        if (!family) {
            return res.status(404).json({ success: false, message: 'Family group not found' });
        }

        // Only admin can update settings
        if (family.admin.toString() !== userId) {
            return res.status(403).json({ success: false, message: 'Only admin can update chat settings' });
        }

        // Add chat settings to family if not exists
        if (!family.chatSettings) {
            family.chatSettings = {};
        }

        family.chatSettings.defaultDisappearTime = defaultDisappearTime;
        family.chatSettings.updatedAt = new Date();

        await family.save();

        res.status(200).json({
            success: true,
            message: 'Chat settings updated successfully',
            data: family.chatSettings
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Get chat settings for a family
export const getChatSettings = async (req, res) => {
    try {
        const { familyId } = req.params;
        const userId = req.user.userId;

        const family = await FamilyGroup.findById(familyId);
        if (!family) {
            return res.status(404).json({ success: false, message: 'Family group not found' });
        }

        const isMember = family.members.some(m => m.user.toString() === userId);
        if (!isMember) {
            return res.status(403).json({ success: false, message: 'You are not a member of this family' });
        }

        res.status(200).json({
            success: true,
            data: family.chatSettings || {
                defaultDisappearTime: null
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Add reaction to a message
export const addReaction = async (req, res) => {
    try {
        const { messageId } = req.params;
        const { emoji } = req.body;
        const userId = req.user.userId;

        if (!emoji) {
            return res.status(400).json({ success: false, message: 'Emoji is required' });
        }

        const message = await Message.findById(messageId);
        if (!message) {
            return res.status(404).json({ success: false, message: 'Message not found' });
        }

        // Check if user already reacted with this emoji
        const existingReaction = message.reactions.find(r => r.userId.toString() === userId && r.emoji === emoji);

        if (existingReaction) {
            // Remove reaction if it exists
            message.reactions = message.reactions.filter(r => !(r.userId.toString() === userId && r.emoji === emoji));
        } else {
            // Add reaction
            message.reactions.push({ userId, emoji });
        }

        await message.save();
        const updatedMessage = await message.populate('senderId', 'fullName profileImage email');

        res.status(200).json({
            success: true,
            message: 'Reaction updated',
            data: updatedMessage
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Search messages
export const searchMessages = async (req, res) => {
    try {
        const { familyId, query } = req.query;
        const userId = req.user.userId;

        if (!familyId || !query) {
            return res.status(400).json({
                success: false,
                message: 'familyId and query are required'
            });
        }

        // Validate user is a member
        const family = await FamilyGroup.findById(familyId);
        if (!family) {
            return res.status(404).json({ success: false, message: 'Family group not found' });
        }

        const isMember = family.members.some(m => m.user.toString() === userId);
        if (!isMember) {
            return res.status(403).json({ success: false, message: 'You are not a member of this family' });
        }

        const messages = await Message.find({
            familyId,
            isDeleted: false,
            $or: [
                { content: { $regex: query, $options: 'i' } },
                { 'mediaFile.originalName': { $regex: query, $options: 'i' } }
            ]
        })
            .populate('senderId', 'fullName profileImage email')
            .sort({ createdAt: -1 })
            .limit(50);

        res.status(200).json({
            success: true,
            data: messages
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
