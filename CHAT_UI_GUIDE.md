# Chat UI Guide - Visual Reference

## Chat Tab Interface

### Header Section
```
┌─────────────────────────────────────────┬──────────┐
│  Family Chat                            │ ⚙️       │
│                                         │ Settings │
└─────────────────────────────────────────┴──────────┘
```

**Header Elements:**
- **Title**: "Family Chat"
- **⚙️ Button**: Click to open chat settings modal

---

## Messages Area

### Your Message (Right Side)
```
┌────────────────────────────────────────┐
│                            ┌─────────┐ │
│                            │ Hello!  │ │
│                            └─────────┘ │
│                         now    🗑️      │
└────────────────────────────────────────┘
```

**Elements:**
- Blue bubble with white text
- Timestamp on left ("now", "5m ago", etc.)
- 🗑️ Trash icon for delete (hover over message)

### Other's Message (Left Side)
```
┌────────────────────────────────────────┐
│ 👤 Jane Doe                            │
│ ┌─────────────────┐                    │
│ │ Hey there! 👋  │                    │
│ └─────────────────┘                    │
│ 3m ago                                 │
└────────────────────────────────────────┘
```

**Elements:**
- Sender's avatar (👤) or profile picture
- Sender's name above message
- Gray bubble with dark text
- Timestamp

---

## Media Messages

### Image Message
```
┌────────────────────────────────────────┐
│ ┌──────────────────┐                   │
│ │ 🖼️               │                   │
│ │  [Image Preview] │                   │
│ │  (rounded)       │                   │
│ └──────────────────┘                   │
│ 2m ago                                 │
└────────────────────────────────────────┘
```

### Video Message
```
┌────────────────────────────────────────┐
│ ┌──────────────────┐                   │
│ │ ▶️               │                   │
│ │  [Video Preview] │                   │
│ │  with controls   │                   │
│ └──────────────────┘                   │
│ 1m ago                                 │
└────────────────────────────────────────┘
```

### PDF/Document Message
```
┌────────────────────────────────────────┐
│ ┌──────────────────────────────┐        │
│ │ 📄 document.pdf              │        │
│ │ 2.5 MB              ⬇️       │        │
│ └──────────────────────────────┘        │
│ 5m ago                                  │
└────────────────────────────────────────┘
```

**Download Button (⬇️):**
- Click to download the file
- File saved with original name
- Works for all media types

---

## Input Section (Bottom)

### Text Message Input
```
┌─────────────────────────────────────────┐
│ 📎  │ Type a message... │ 📤        │
│     └─────────────────┘               │
└─────────────────────────────────────────┘
```

**Elements:**
- **📎 Paperclip**: Click to attach files
- **Text Input**: Type your message here
- **📤 Send Button**: Click or press Enter to send

### With Media Selected
```
┌─────────────────────────────────────────┐
│ ┌─────────────────────────────┐         │
│ │ 🖼️ photo.jpg      2.5 MB  ✕│         │
│ └─────────────────────────────┘         │
├─────────────────────────────────────────┤
│ 📎  │ [Optional caption] │ 📤        │
└─────────────────────────────────────────┘
```

**Elements:**
- File preview bar
- File icon and name
- File size
- ✕ Button to remove selection
- Caption input remains active

---

## Settings Modal

### Modal Window
```
┌──────────────────────────────────────┐
│  Chat Settings                    ✕  │
├──────────────────────────────────────┤
│                                      │
│  Message Disappear Time              │
│  ┌──────────────────────────────┐   │
│  │ 5 minutes                  ▼ │   │
│  └──────────────────────────────┘   │
│                                      │
│  Messages will automatically          │
│  disappear after the selected time.  │
│                                      │
│  ┌─────────────┐  ┌─────────────┐  │
│  │   Cancel    │  │    Save     │  │
│  └─────────────┘  └─────────────┘  │
└──────────────────────────────────────┘
```

### Disappear Time Options
```
Dropdown Options:
✓ Never
  5 minutes
  15 minutes
  1 hour
  8 hours
  1 day
  7 days
```

**Note:** 
- Changes apply to new messages only
- Existing messages keep their own settings
- Admin sets the default for family

---

## Deleted Message Display

```
┌────────────────────────────────────┐
│      Message deleted               │
└────────────────────────────────────┘
```

**When shown:**
- Original message deleted by sender
- Or deleted by admin
- Takes up minimal space
- Gray text, centered

---

## Error Messages

### Error Banner
```
┌────────────────────────────────────────┐
│ ❌ Failed to send message              │
│    File size exceeds 50MB limit        │
└────────────────────────────────────────┘
```

**Common Errors:**
- "Failed to send message"
- "File size exceeds 50MB limit"
- "You are not an approved member"
- "Failed to delete message"
- "Failed to update settings"

---

## Empty State

### No Messages Yet
```
┌────────────────────────────────────────┐
│                                        │
│                                        │
│      No messages yet.                  │
│   Start the conversation!              │
│                                        │
│                                        │
└────────────────────────────────────────┘
```

---

## Loading State

### During Load
```
┌────────────────────────────────────────┐
│           ⏳ Loading...                 │
│         (spinning circle)              │
└────────────────────────────────────────┘
```

---

## Message Features

### Message Reactions (Future)
```
┌──────────────────┐
│   Your message   │ ❤️ 😂 👍
└──────────────────┘
```

**Supported Emojis:**
- ❤️ Love
- 😂 Laugh
- 👍 Like
- 🤔 Thinking
- 😢 Sad
- 😡 Angry

(Click emoji to toggle on/off)

---

## Timeline Example

```
Sender: John
└─ 10:00 AM: "Hi everyone!"
   10:02 AM: [Attaches family photo.jpg]
   
Sender: Jane
└─ 10:05 AM: "Great photo! 😄"
   
Sender: Admin
└─ 10:10 AM: "Let me update chat settings"
   (Opens settings, sets 8-hour disappear)
   10:12 AM: "All new messages will disappear in 8 hours"
   
Sender: John
└─ 10:15 AM: "Got it!" ← This will disappear at 6:15 PM
```

---

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| Enter | Send message |
| Shift+Enter | New line |
| Ctrl+V | Paste file/image |
| Escape | Close settings modal |

---

## Responsive Design

### Desktop (> 768px)
- Full-width chat panel
- Side-by-side messages
- Hover effects visible
- Settings modal centered

### Tablet (768px - 1024px)
- 80% width chat panel
- Messages stack properly
- Touch-friendly buttons
- Scrollable keyboard support

### Mobile (< 768px)
- Full-width (minus padding)
- Stacked layout
- Larger touch targets
- Optimized file upload
- No hover effects (use tap)

---

## Accessibility Features

✅ **Keyboard Navigation**
- Tab through buttons
- Enter to send message
- Delete key on selected message

✅ **Screen Reader Support**
- Alt text on images
- Button labels clear
- Message structure logical

✅ **Visual Indicators**
- Timestamps
- Sender names
- Status colors (error = red)
- High contrast text

✅ **Color Blind Friendly**
- Not relying on color alone
- Icons with labels
- Clear text labels

---

## Color Scheme

| Element | Color | Use |
|---------|-------|-----|
| Own Messages | Indigo (#4F46E5) | Primary action |
| Others Messages | Gray (#E5E7EB) | Secondary |
| Buttons | Indigo (#4F46E5) | Call to action |
| Error | Red (#EF4444) | Warnings |
| Delete | Red (#EF4444) | Destructive |
| Success | Green (implied) | Confirmations |
| Text | Gray (#1F2937) | Main content |

---

## Status Indicators

| State | Indicator | Meaning |
|-------|-----------|---------|
| Sending | ⏳ | Message being uploaded |
| Sent | ✓ | Message delivered |
| Deleted | ✕ | Message removed |
| Error | ❌ | Failed to send |
| Loading | 🔄 | Data fetching |

---

## Pro Tips

💡 **Quick Commands**
- Copy/paste images directly
- Drag and drop files
- Long-press for context menu
- Swipe left to delete (mobile)

💡 **File Management**
- Compress large videos before sending
- Use PNG for diagrams, JPG for photos
- Split large PDFs into sections
- Name files descriptively

💡 **Best Practices**
- Use disappear for sensitive info
- Mention people using @username (future)
- React with emoji for quick responses
- Pin important messages (future)

---

## Need Help?

- **Settings not saving?** → Check admin role
- **File not uploading?** → Verify size under 50MB
- **Message disappeared early?** → Check disappear settings
- **Can't see messages?** → Ensure approved status

**Questions?** See CHAT_QUICK_START.md

