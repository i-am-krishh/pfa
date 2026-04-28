# Chat Feature - Quick Start Guide

## Setup Instructions

### 1. Backend Setup
The backend is already configured. The new routes are available at:
```
POST   /api/family/chat/send           - Send text message
POST   /api/family/chat/send-media     - Send media file
GET    /api/family/chat/messages/:id   - Get messages
DELETE /api/family/chat/message/:id    - Delete message
POST   /api/family/chat/message/:id/reaction - Add reaction
GET    /api/family/chat/settings/:id   - Get chat settings
PATCH  /api/family/chat/settings       - Update chat settings
GET    /api/family/chat/search         - Search messages
```

### 2. Frontend Setup
The chat tab is already integrated in the Family Dashboard. No additional setup needed.

## Testing the Feature

### Prerequisites
- Create or join a family group
- Get your family ID from the URL or dashboard
- Ensure you're an "Approved" member

### Test Scenario 1: Send Text Message
1. Navigate to Family Dashboard → Chat tab
2. Type a message in the input field
3. Click Send or press Enter
4. Message appears in the chat window

### Test Scenario 2: Send Media
1. Click the paperclip icon (attach file)
2. Select an image, video, PDF, or document
3. Preview appears above input
4. Click Send
5. Media appears with download option

### Test Scenario 3: Set Message Disappear Time
1. Click the Settings (gear) icon in chat header
2. Select disappear time (e.g., "5 minutes", "1 hour")
3. Click Save
4. New messages sent after this will automatically disappear
5. Wait the specified time (or check TTL Index if instant testing needed)

### Test Scenario 4: Delete a Message
1. Send a message
2. Hover over your message
3. Click the trash icon
4. Confirm deletion
5. Message shows as "Message deleted"

### Test Scenario 5: Multiple Users
1. Create or join a family with multiple members
2. Have different users send messages
3. Messages display with sender name and avatar
4. Each user can only delete their own messages (unless admin)

## Supported File Types

### Media Files
| Type | Extensions |
|------|-----------|
| Images | .jpg, .jpeg, .png, .gif, .webp |
| Videos | .mp4, .webm, .mov, .avi, .flv |
| Documents | .pdf, .doc, .docx, .xls, .xlsx, .ppt, .pptx |
| Audio | .mp3, .wav, .m4a, .flac, .aac |

**Max File Size: 50MB**

## Message Disappear Times

| Option | Duration |
|--------|----------|
| Never | Permanent |
| 5 minutes | 5 minutes |
| 15 minutes | 15 minutes |
| 1 hour | 60 minutes |
| 8 hours | 480 minutes |
| 1 day | 24 hours |
| 7 days | 168 hours |

## Database Notes

### MongoDB Collections
- **messages** - Stores chat messages with TTL Index
- **familygroups** - Updated with `chatSettings` field

### TTL Index
Messages with `disappearTime` set will be automatically deleted by MongoDB.
This happens at the database level, not in the application.

### Storage Consideration
Files are stored as base64 in MongoDB. For production:
- Consider AWS S3 or Cloudinary integration
- Or implement chunked file storage
- Current limit is 50MB (can be increased based on server memory)

## Troubleshooting

### Issue: "You are not an approved member"
**Solution**: Ask family admin to approve your membership

### Issue: File upload fails
**Solution**: 
- Check file is under 50MB
- Verify supported file type
- Try a different file

### Issue: Messages not disappearing
**Solution**:
- MongoDB TTL Index may need time to run (up to 1 minute)
- Check server logs for errors
- Verify `disappearAfter` is set (not null)

### Issue: Can't delete message
**Solution**:
- Only message sender or family admin can delete
- Only own messages can be deleted by regular members

### Issue: Pagination not working
**Solution**:
- Page number must be integer starting from 1
- Default limit is 50 messages per page
- Total pages calculated from total count

## API Testing with cURL

### Send Text Message
```bash
curl -X POST http://localhost:5000/api/family/chat/send \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "familyId": "FAMILY_ID",
    "content": "Hello family!",
    "disappearAfter": null
  }'
```

### Get Messages
```bash
curl -X GET "http://localhost:5000/api/family/chat/messages/FAMILY_ID?page=1&limit=50" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Delete Message
```bash
curl -X DELETE http://localhost:5000/api/family/chat/message/MESSAGE_ID \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Update Chat Settings
```bash
curl -X PATCH http://localhost:5000/api/family/chat/settings \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "familyId": "FAMILY_ID",
    "defaultDisappearTime": 300000
  }'
```

## Performance Tips

1. **For Large Message Counts**
   - Load messages in batches using pagination
   - Archive old messages regularly
   - Use search for specific conversations

2. **For Large Files**
   - Compress images before sending
   - Use shorter video clips
   - Split large files into smaller chunks

3. **For Better UX**
   - Messages auto-load as you scroll
   - Disable auto-refresh during holidays
   - Clear browser cache periodically

## Security Best Practices

1. Only approved members can access chat
2. Messages are validated on backend
3. File uploads are size-limited
4. Admin has override privileges
5. Soft deletes preserve audit trail
6. All operations require authentication

## Next Steps

1. Test all features with your family members
2. Provide feedback on UX
3. Report any bugs or issues
4. Plan for production deployment
5. Consider cloud storage integration if handling large files

## Support Resources

- See `CHAT_FEATURE_DOCUMENTATION.md` for detailed technical docs
- Check `backend/controllers/chatController.js` for implementation
- Review `frontend/src/pages/FamilyChat.jsx` for UI components

