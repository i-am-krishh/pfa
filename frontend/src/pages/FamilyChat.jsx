import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import {
    Send, Paperclip, FileText, Image as ImageIcon, Video, Trash2, Smile,
    Settings, Download, Clock, Search
} from 'lucide-react';

const FamilyChat = ({ familyId }) => {
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [sending, setSending] = useState(false);
    const [currentUser, setCurrentUser] = useState(null);
    const [showSettings, setShowSettings] = useState(false);
    const [disappearTime, setDisappearTime] = useState(null);
    const [selectedMedia, setSelectedMedia] = useState(null);
    const [mediaPreview, setMediaPreview] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [showSearch, setShowSearch] = useState(false);
    const [page, setPage] = useState(1);
    const fileInputRef = useRef(null);
    const messagesEndRef = useRef(null);
    const messagesContainerRef = useRef(null);

    const DISAPPEAR_OPTIONS = [
        { label: 'Never', value: null },
        { label: '5 minutes', value: 5 * 60 * 1000 },
        { label: '15 minutes', value: 15 * 60 * 1000 },
        { label: '1 hour', value: 60 * 60 * 1000 },
        { label: '8 hours', value: 8 * 60 * 60 * 1000 },
        { label: '1 day', value: 24 * 60 * 60 * 1000 },
        { label: '7 days', value: 7 * 24 * 60 * 60 * 1000 }
    ];

    // Fetch current user
    useEffect(() => {
        const fetchCurrentUser = async () => {
            try {
                const token = localStorage.getItem('token');
                const res = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/auth/me`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setCurrentUser(res.data.data);
            } catch (err) {
                console.error('Error fetching current user:', err);
            }
        };
        fetchCurrentUser();
    }, []);

    // Fetch messages
    const fetchMessages = async (pageNum = 1) => {
        try {
            setLoading(true);
            const token = localStorage.getItem('token');
            const res = await axios.get(
                `${import.meta.env.VITE_API_BASE_URL}/family/chat/messages/${familyId}`,
                {
                    params: { page: pageNum, limit: 50 },
                    headers: { Authorization: `Bearer ${token}` }
                }
            );
            if (pageNum === 1) {
                setMessages(res.data.data);
            } else {
                setMessages([...res.data.data, ...messages]);
            }
            setError('');
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to fetch messages');
        } finally {
            setLoading(false);
        }
    };

    // Fetch chat settings
    const fetchChatSettings = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get(
                `${import.meta.env.VITE_API_BASE_URL}/family/chat/settings/${familyId}`,
                { headers: { Authorization: `Bearer ${token}` } }
            );
            setDisappearTime(res.data.data?.defaultDisappearTime || null);
        } catch (err) {
            console.error('Error fetching chat settings:', err);
        }
    };

    useEffect(() => {
        fetchMessages();
        fetchChatSettings();
    }, [familyId]);

    // Auto-scroll to bottom
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // Send text message
    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (!newMessage.trim() && !selectedMedia) return;

        try {
            setSending(true);
            const token = localStorage.getItem('token');

            if (selectedMedia) {
                // Send media message
                const reader = new FileReader();
                reader.onload = async (event) => {
                    const base64Data = event.target.result;
                    const res = await axios.post(
                        `${import.meta.env.VITE_API_BASE_URL}/family/chat/send-media`,
                        {
                            familyId,
                            base64Data,
                            fileName: selectedMedia.name,
                            mimeType: selectedMedia.type,
                            fileType: getFileType(selectedMedia.type),
                            disappearAfter: disappearTime
                        },
                        { headers: { Authorization: `Bearer ${token}` } }
                    );
                    setMessages([...messages, res.data.data]);
                    setSelectedMedia(null);
                    setMediaPreview(null);
                    setNewMessage('');
                    setSending(false);
                };
                reader.readAsDataURL(selectedMedia);
            } else {
                // Send text message
                const res = await axios.post(
                    `${import.meta.env.VITE_API_BASE_URL}/family/chat/send`,
                    {
                        familyId,
                        content: newMessage,
                        disappearAfter: disappearTime
                    },
                    { headers: { Authorization: `Bearer ${token}` } }
                );
                setMessages([...messages, res.data.data]);
                setNewMessage('');
            }
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to send message');
        } finally {
            setSending(false);
        }
    };

    // Delete message
    const handleDeleteMessage = async (messageId) => {
        if (!window.confirm('Delete this message?')) return;

        try {
            const token = localStorage.getItem('token');
            await axios.delete(
                `${import.meta.env.VITE_API_BASE_URL}/family/chat/message/${messageId}`,
                { headers: { Authorization: `Bearer ${token}` } }
            );
            setMessages(messages.map(m => m._id === messageId ? { ...m, isDeleted: true } : m));
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to delete message');
        }
    };

    // Update chat settings
    const handleUpdateSettings = async () => {
        try {
            const token = localStorage.getItem('token');
            await axios.patch(
                `${import.meta.env.VITE_API_BASE_URL}/family/chat/settings`,
                {
                    familyId,
                    defaultDisappearTime: disappearTime
                },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            setShowSettings(false);
            setError('');
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to update settings');
        }
    };

    // Handle file selection
    const handleFileSelect = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Check file size (limit to 50MB)
        if (file.size > 50 * 1024 * 1024) {
            setError('File size exceeds 50MB limit');
            return;
        }

        setSelectedMedia(file);

        // Create preview for images and videos
        if (file.type.startsWith('image/') || file.type.startsWith('video/')) {
            const reader = new FileReader();
            reader.onload = (e) => setMediaPreview(e.target.result);
            reader.readAsDataURL(file);
        } else {
            setMediaPreview(null);
        }
    };

    // Get file type from mime type
    const getFileType = (mimeType) => {
        if (mimeType.startsWith('image')) return 'image';
        if (mimeType.startsWith('video')) return 'video';
        if (mimeType.includes('pdf')) return 'pdf';
        if (mimeType.includes('document') || mimeType.includes('word') || mimeType.includes('sheet')) return 'document';
        if (mimeType.startsWith('audio')) return 'audio';
        return 'other';
    };

    // Download media file
    const handleDownloadMedia = (message) => {
        if (!message.mediaFile?.base64Data) return;

        const link = document.createElement('a');
        link.href = message.mediaFile.base64Data;
        link.download = message.mediaFile.originalName;
        link.click();
    };

    // Render media based on type
    const renderMedia = (message) => {
        if (!message.mediaFile) return null;

        const { fileType, base64Data, originalName, mimeType } = message.mediaFile;

        return (
            <div className="mt-2 max-w-xs">
                {fileType === 'image' && (
                    <img
                        src={base64Data}
                        alt={originalName}
                        className="max-w-xs rounded-lg max-h-64 object-cover"
                    />
                )}
                {fileType === 'video' && (
                    <video
                        src={base64Data}
                        controls
                        className="max-w-xs rounded-lg max-h-64"
                    />
                )}
                {['pdf', 'document', 'audio'].includes(fileType) && (
                    <div className="bg-gray-100 rounded-lg p-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            {fileType === 'pdf' && <FileText className="text-red-500" size={24} />}
                            {fileType === 'document' && <FileText className="text-blue-500" size={24} />}
                            {fileType === 'audio' && <ImageIcon className="text-green-500" size={24} />}
                            <div>
                                <p className="text-sm font-semibold text-gray-800">{originalName}</p>
                                <p className="text-xs text-gray-600">{getFileSize(message.mediaFile.fileSize)}</p>
                            </div>
                        </div>
                        <button
                            onClick={() => handleDownloadMedia(message)}
                            className="p-2 hover:bg-gray-200 rounded-lg"
                            title="Download"
                        >
                            <Download size={18} className="text-gray-600" />
                        </button>
                    </div>
                )}
            </div>
        );
    };

    // Format file size
    const getFileSize = (bytes) => {
        if (!bytes) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
    };

    // Format timestamp
    const formatTime = (timestamp) => {
        const date = new Date(timestamp);
        const now = new Date();
        const diffMinutes = Math.floor((now - date) / 60000);

        if (diffMinutes < 1) return 'now';
        if (diffMinutes < 60) return `${diffMinutes}m ago`;
        if (diffMinutes < 1440) return `${Math.floor(diffMinutes / 60)}h ago`;
        
        return date.toLocaleDateString(undefined, {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center py-20">
                <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    return (
        <div className="flex flex-col bg-gray-50 rounded-lg overflow-hidden border border-gray-200" style={{ height: 'calc(100vh - 300px)' }}>
            {/* Header */}
            <div className="bg-white border-b border-gray-200 px-4 py-4 flex justify-between items-center shadow-sm">
                <h2 className="text-xl font-bold text-gray-800">Family Chat</h2>
                <button
                    onClick={() => setShowSettings(!showSettings)}
                    className="p-2 hover:bg-gray-100 rounded-lg"
                    title="Chat Settings"
                >
                    <Settings size={20} className="text-gray-600" />
                </button>
            </div>

            {/* Settings Modal */}
            {showSettings && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-xl shadow-xl p-6 max-w-md w-full mx-4">
                        <h3 className="text-lg font-bold text-gray-800 mb-4">Chat Settings</h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">
                                    Message Disappear Time
                                </label>
                                <select
                                    value={disappearTime || ''}
                                    onChange={(e) => setDisappearTime(e.target.value ? parseInt(e.target.value) : null)}
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                >
                                    {DISAPPEAR_OPTIONS.map(option => (
                                        <option key={option.label} value={option.value || ''}>
                                            {option.label}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <p className="text-xs text-gray-600">
                                Messages will automatically disappear after the selected time.
                            </p>
                        </div>
                        <div className="flex gap-3 mt-6">
                            <button
                                onClick={() => setShowSettings(false)}
                                className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-semibold"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleUpdateSettings}
                                className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-semibold"
                            >
                                Save
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Messages Area */}
            <div
                ref={messagesContainerRef}
                className="flex-1 overflow-y-auto px-4 py-6 space-y-4"
            >
                {error && (
                    <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm">{error}</div>
                )}

                {messages.length === 0 ? (
                    <div className="text-center text-gray-500 py-8">
                        <p>No messages yet. Start the conversation!</p>
                    </div>
                ) : (
                    messages.map((msg, idx) => {
                        if (msg.isDeleted) {
                            return (
                                <div key={msg._id} className="text-center text-gray-400 text-xs py-1">
                                    Message deleted
                                </div>
                            );
                        }

                        const isOwn = currentUser?._id === msg.senderId?._id || currentUser?._id === msg.senderId;
                        return (
                            <div
                                key={msg._id}
                                className={`flex ${isOwn ? 'justify-end' : 'justify-start'} gap-2`}
                            >
                                {!isOwn && msg.senderProfileImage && (
                                    <img
                                        src={msg.senderProfileImage}
                                        alt={msg.senderName}
                                        className="w-8 h-8 rounded-full"
                                    />
                                )}

                                <div className={`max-w-xs ${isOwn ? 'items-end' : 'items-start'} flex flex-col`}>
                                    {!isOwn && (
                                        <p className="text-xs text-gray-500 mb-1">{msg.senderName}</p>
                                    )}

                                    <div
                                        className={`px-4 py-2 rounded-lg ${
                                            isOwn
                                                ? 'bg-indigo-600 text-white rounded-br-none'
                                                : 'bg-gray-200 text-gray-800 rounded-bl-none'
                                        }`}
                                    >
                                        {msg.messageType === 'text' ? (
                                            <p className="text-sm break-words">{msg.content}</p>
                                        ) : (
                                            renderMedia(msg)
                                        )}
                                    </div>

                                    <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                                        <span>{formatTime(msg.createdAt)}</span>
                                        {isOwn && (
                                            <button
                                                onClick={() => handleDeleteMessage(msg._id)}
                                                className="p-1 hover:bg-red-50 rounded"
                                                title="Delete"
                                            >
                                                <Trash2 size={14} className="text-red-500" />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Media Preview */}
            {selectedMedia && (
                <div className="px-4 py-3 bg-gray-100 border-t border-gray-300 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        {mediaPreview ? (
                            <img src={mediaPreview} alt="Preview" className="h-12 w-12 object-cover rounded" />
                        ) : (
                            <FileText size={24} className="text-gray-600" />
                        )}
                        <div>
                            <p className="text-sm font-semibold text-gray-800">{selectedMedia.name}</p>
                            <p className="text-xs text-gray-600">{getFileSize(selectedMedia.size)}</p>
                        </div>
                    </div>
                    <button
                        onClick={() => {
                            setSelectedMedia(null);
                            setMediaPreview(null);
                        }}
                        className="text-gray-600 hover:text-gray-800"
                    >
                        ✕
                    </button>
                </div>
            )}

            {/* Input Area */}
            <div className="bg-white border-t border-gray-200 px-4 py-4">
                <form onSubmit={handleSendMessage} className="flex gap-2">
                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileSelect}
                        className="hidden"
                        accept="image/*,video/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,audio/*"
                    />

                    <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="p-2 hover:bg-gray-100 rounded-lg"
                        title="Attach file"
                        disabled={sending}
                    >
                        <Paperclip size={20} className="text-gray-600" />
                    </button>

                    <input
                        type="text"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder="Type a message..."
                        className="flex-1 border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        disabled={sending}
                    />

                    <button
                        type="submit"
                        disabled={sending || (!newMessage.trim() && !selectedMedia)}
                        className="p-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                        title="Send"
                    >
                        <Send size={20} />
                    </button>
                </form>
            </div>
        </div>
    );
};

export default FamilyChat;
