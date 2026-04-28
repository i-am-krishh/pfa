# Family Finance Chat Feature Implementation

## Overview
The chat feature enables all family group members to communicate in real-time with support for:
- Text messages
- Media files (images, videos, PDFs, documents, audio)
- Message disappearing feature (like WhatsApp)
- Message search functionality
- Message reactions and replies

## Backend Implementation

### 1. Message Model (`backend/models/Message.js`)
The Message model stores chat data with the following fields:
- **familyId**: Reference to the FamilyGroup
- **senderId**: Reference to the User who sent the message
- **content**: Text message content
- **mediaFile**: Object containing file details
  - `originalName`: File name
  - `fileType`: Type (image, video, pdf, document, audio, other)
  - `base64Data`: Base64 encoded file content
  - `mimeType`: File MIME type
  - `fileSize`: Size of the file
- **messageType**: Either 'text' or 'media'
- **disappearAfter**: Time in milliseconds after which the message disappears
- **disappearTime**: Calculated timestamp when message will be deleted
- **isDeleted**: Soft delete flag
- **reactions**: Array of emoji reactions
- **replyTo**: Reference to original message for threaded conversations

**TTL Index**: MongoDB automatically deletes messages after disappearTime (TTL Index at 0 seconds).

### 2. Chat Controller (`backend/controllers/chatController.js`)
Implements the following endpoints:

#### `sendMessage()`
- Sends text-only messages
- Parameters: `familyId`, `content`, `disappearAfter`, `replyTo`
- Validates user is an approved family member

#### `sendMediaMessage()`
- Sends messages with media files
- Accepts base64-encoded files (supports up to 50MB)
- Auto-detects file type from MIME type
- Parameters: `familyId`, `base64Data`, `fileName`, `mimeType`, `fileType`, `disappearAfter`

#### `getMessages()`
- Fetches messages with pagination
- Parameters: `page`, `limit` (default 50)
- Returns chronologically sorted messages with user population

#### `deleteMessage()`
- Soft deletes messages (marks as deleted)
- Only the sender or family admin can delete messages

#### `updateChatSettings()`
- Sets default message disappear time for the family
- Only admin can update these settings

#### `getChatSettings()`
- Retrieves chat settings for a family

#### `addReaction()`
- Adds/removes emoji reactions to messages
- Parameters: `messageId`, `emoji`

#### `searchMessages()`
- Searches messages by text or file name
- Limits results to 50 most recent matches

### 3. Chat Routes (`backend/routes/chatRoutes.js`)
- `POST /api/family/chat/send` - Send text message
- `POST /api/family/chat/send-media` - Send media message
- `GET /api/family/chat/messages/:familyId` - Get messages with pagination
- `DELETE /api/family/chat/message/:messageId` - Delete message
- `POST /api/family/chat/message/:messageId/reaction` - Add reaction
- `GET /api/family/chat/settings/:familyId` - Get chat settings
- `PATCH /api/family/chat/settings` - Update chat settings
- `GET /api/family/chat/search` - Search messages

### 4. Server Integration
- Import added: `import chatRoutes from './routes/chatRoutes.js';`
- Route mounted: `app.use('/api/family/chat', chatRoutes);`
- FamilyGroup model updated with `chatSettings` field

## Frontend Implementation

### 1. FamilyChat Component (`frontend/src/pages/FamilyChat.jsx`)
A comprehensive chat interface with:

**Features:**
- Real-time message display
- Auto-scroll to latest message
- File upload with preview
- Message deletion
- Media download
- Chat settings modal

**Key Functions:**
- `fetchMessages()` - Loads messages with pagination
- `handleSendMessage()` - Sends text or media messages
- `handleDeleteMessage()` - Deletes a message
- `handleUpdateSettings()` - Updates chat settings
- `handleFileSelect()` - Handles file selection and preview
- `renderMedia()` - Renders media based on file type
- `formatTime()` - Formats message timestamps

**Supported Media:**
- Images (JPEG, PNG, GIF, WebP)
- Videos (MP4, WebM, etc.)
- PDFs
- Documents (DOC, DOCX, XLS, XLSX, PPT, PPTX)
- Audio files

**Disappear Options:**
- Never
- 5 minutes
- 15 minutes
- 1 hour
- 8 hours
- 1 day
- 7 days

### 2. FamilyAccessPage Update
- Imported `FamilyChat` component
- Added "💬 Chat" tab button
- Integrated chat view in main content area

## How to Use

### Sending Messages

#### Text Messages:
1. Click on the Chat tab
2. Type message in the input field
3. Click Send button or press Enter

#### Media Messages:
1. Click the paperclip icon to attach a file
2. Select a file (supports images, videos, PDFs, documents, audio)
3. File preview will appear above input
4. Type optional caption and click Send

### Message Disappear Settings

#### For Admin:
1. Click the Settings icon (gear) in chat header
2. Select disappear time from dropdown:
   - Never (default)
   - 5 minutes
   - 15 minutes
   - 1 hour
   - 8 hours
   - 1 day
   - 7 days
3. Click Save

#### How It Works:
- When a message is sent, if `disappearAfter` is set, a `disappearTime` is calculated
- MongoDB's TTL Index automatically deletes the document at that time
- On the frontend, soft-deleted messages show as "Message deleted"

### File Upload Limits
- **Maximum file size**: 50MB
- **Supported formats**:
  - Images: jpg, jpeg, png, gif, webp
  - Videos: mp4, webm, mov, avi
  - Documents: pdf, doc, docx, xls, xlsx, ppt, pptx
  - Audio: mp3, wav, m4a, flac
  - Any file up to 50MB

### Deleting Messages
1. Hover over your message
2. Click the trash icon
3. Confirm deletion
4. Message will be marked as deleted for all users

### Downloading Media
1. Click the download icon on media messages
2. File will be downloaded as base64 encoded data

## Technical Details

### Base64 Encoding
Files are converted to base64 for storage in MongoDB. This approach:
- Works with MongoDB's document size limit (16MB)
- For larger files, consider integrating cloud storage (Cloudinary, AWS S3)
- Currently supports up to 50MB (mostly limited by server)

### Message Pagination
- Messages loaded in batches of 50
- Older messages loaded by increasing page number
- Messages displayed in chronological order

### Security Features
- Only approved family members can access chat
- Only message sender or admin can delete messages
- Users can only see messages from their family group
- Authentication required for all chat operations

## Database Schema Updates

### FamilyGroup Model Addition:
```javascript
chatSettings: {
    defaultDisappearTime: {
        type: Number,
        default: null
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
}
```

## API Response Examples

### Send Message Response:
```json
{
    "success": true,
    "message": "Message sent successfully",
    "data": {
        "_id": "...",
        "familyId": "...",
        "senderId": {...},
        "senderName": "John Doe",
        "content": "Hello family!",
        "messageType": "text",
        "createdAt": "2024-04-28T10:30:00Z",
        "disappearTime": "2024-04-28T10:35:00Z"
    }
}
```

### Send Media Response:
```json
{
    "success": true,
    "message": "Media message sent successfully",
    "data": {
        "_id": "...",
        "familyId": "...",
        "senderId": {...},
        "senderName": "Jane Doe",
        "messageType": "media",
        "mediaFile": {
            "originalName": "family_photo.jpg",
            "fileType": "image",
            "mimeType": "image/jpeg",
            "fileSize": 2097152,
            "base64Data": "..."
        },
        "createdAt": "2024-04-28T10:30:00Z"
    }
}
```

## Future Enhancements

1. **Cloud Storage Integration**
   - Move from base64 to AWS S3 or Cloudinary
   - Reduces database size
   - Faster media delivery
   - Automatic backup

2. **Real-time Updates with WebSockets**
   - Socket.io integration for instant message delivery
   - Real-time typing indicators
   - Online/offline status

3. **Message Search**
   - Full-text search across messages
   - Filter by sender, date, media type

4. **Typing Indicators**
   - Show when others are typing

5. **Read Receipts**
   - Track when messages are read

6. **Message Editing**
   - Edit sent messages (show "edited" indicator)

7. **Group Voice/Video Calls**
   - Integrate Jitsi or similar service

8. **Stickers and Emojis**
   - Rich emoji picker
   - Sticker packs

9. **Message Encryption**
   - End-to-end encryption for sensitive communications

10. **Chat Backup**
    - Export chat history
    - Backup to file

## Troubleshooting

### Messages not appearing
- Verify user is an approved family member
- Check browser console for errors
- Ensure family ID is correct

### File upload fails
- Check file size (max 50MB)
- Verify file format is supported
- Check available disk space

### Messages not disappearing
- Verify MongoDB TTL index is created
- Check disappearAfter value is set
- Ensure server time is synchronized

### Performance issues with large message count
- Consider archiving old messages
- Implement pagination for better loading
- Add database indexes for frequently searched fields
