import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import {
    Send, Paperclip, FileText, Image as ImageIcon, Video, Trash2, Smile,
    Settings, Download, Clock, Search, Mic, Square, X
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
    const [isRecording, setIsRecording] = useState(false);
    const [recordingTime, setRecordingTime] = useState(0);
    const fileInputRef = useRef(null);
    const messagesEndRef = useRef(null);
    const messagesContainerRef = useRef(null);
    const mediaRecorderRef = useRef(null);
    const audioChunksRef = useRef([]);
    const timerRef = useRef(null);

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

    // Voice Recording Logic
    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const recorder = new MediaRecorder(stream);
            mediaRecorderRef.current = recorder;
            audioChunksRef.current = [];

            recorder.ondataavailable = (e) => {
                if (e.data.size > 0) {
                    audioChunksRef.current.push(e.data);
                }
            };

            recorder.onstop = async () => {
                const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                await handleSendAudio(audioBlob);
                stream.getTracks().forEach(track => track.stop());
            };

            recorder.start();
            setIsRecording(true);
            setRecordingTime(0);
            timerRef.current = setInterval(() => {
                setRecordingTime(prev => prev + 1);
            }, 1000);
        } catch (err) {
            console.error('Error starting recording:', err);
            setError('Could not access microphone');
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
            clearInterval(timerRef.current);
        }
    };

    const cancelRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            mediaRecorderRef.current.onstop = null; // Prevent sending
            setIsRecording(false);
            clearInterval(timerRef.current);
            audioChunksRef.current = [];
            const stream = mediaRecorderRef.current.stream;
            stream.getTracks().forEach(track => track.stop());
        }
    };

    const formatRecordingTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const handleSendAudio = async (audioBlob) => {
        try {
            setSending(true);
            const token = localStorage.getItem('token');
            const reader = new FileReader();
            
            reader.onload = async (event) => {
                const base64Data = event.target.result;
                const fileName = `voice_message_${Date.now()}.webm`;
                
                const res = await axios.post(
                    `${import.meta.env.VITE_API_BASE_URL}/family/chat/send-media`,
                    {
                        familyId,
                        base64Data,
                        fileName,
                        mimeType: 'audio/webm',
                        fileType: 'audio',
                        disappearAfter: disappearTime
                    },
                    { headers: { Authorization: `Bearer ${token}` } }
                );
                setMessages(prev => [...prev, res.data.data]);
            };
            reader.readAsDataURL(audioBlob);
        } catch (err) {
            setError('Failed to send voice message');
        } finally {
            setSending(false);
        }
    };

    // Auto-scroll to bottom
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    useEffect(() => {
        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, []);

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
                            fileType: getFileType(selectedMedia.type, selectedMedia.name),
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
    const getFileType = (mimeType, fileName) => {
        if (mimeType.startsWith('image')) return 'image';
        if (mimeType.startsWith('video')) return 'video';
        if (mimeType.includes('pdf') || fileName?.toLowerCase().endsWith('.pdf')) return 'pdf';
        if (mimeType.includes('document') || mimeType.includes('word') || mimeType.includes('sheet') || 
            fileName?.match(/\.(doc|docx|xls|xlsx|ppt|pptx)$/i)) return 'document';
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

    // Open media file in new tab (primarily for PDF)
    const handleViewMedia = (message) => {
        if (!message.mediaFile?.base64Data) return;

        try {
            const base64Parts = message.mediaFile.base64Data.split(',');
            if (base64Parts.length < 2) return;
            
            const byteCharacters = atob(base64Parts[1]);
            const byteNumbers = new Array(byteCharacters.length);
            for (let i = 0; i < byteCharacters.length; i++) {
                byteNumbers[i] = byteCharacters.charCodeAt(i);
            }
            const byteArray = new Uint8Array(byteNumbers);
            const blob = new Blob([byteArray], { type: message.mediaFile.mimeType });
            const url = URL.createObjectURL(blob);
            window.open(url, '_blank');
        } catch (err) {
            console.error('Error viewing media:', err);
            handleDownloadMedia(message); // Fallback to download
        }
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
                {fileType === 'audio' && (
                    <div className="flex flex-col gap-2">
                        <audio
                            src={base64Data}
                            controls
                            className="w-full h-10"
                        />
                        <p className="text-xs text-gray-500 px-1">{originalName}</p>
                    </div>
                )}
                {['pdf', 'document'].includes(fileType) && (
                    <div className="bg-gray-100/80 rounded-xl p-4 flex flex-col gap-3 border border-gray-200/50 hover:bg-gray-100 transition-all shadow-sm">
                        <div className="flex items-center gap-3">
                            <div className={`${fileType === 'pdf' ? 'bg-red-100' : 'bg-blue-100'} p-2.5 rounded-xl`}>
                                <FileText className={fileType === 'pdf' ? 'text-red-500' : 'text-blue-500'} size={24} />
                            </div>
                            <div className="overflow-hidden flex-1">
                                <p className="text-sm font-bold text-gray-800 truncate">{originalName}</p>
                                <p className="text-[10px] text-gray-500 uppercase font-bold tracking-tight">{getFileSize(message.mediaFile.fileSize)}</p>
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={() => handleViewMedia(message)}
                                className="flex-1 flex items-center justify-center gap-2 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-bold text-gray-700 hover:bg-gray-50 transition-colors"
                            >
                                <Eye size={14} /> View
                            </button>
                            <button
                                onClick={() => handleDownloadMedia(message)}
                                className="p-1.5 bg-white border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors"
                                title="Download"
                            >
                                <Download size={14} />
                            </button>
                        </div>
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
        <div className="flex flex-col bg-white rounded-2xl overflow-hidden border border-gray-200 shadow-2xl" style={{ height: 'calc(100vh - 100px)', minHeight: '650px' }}>
            {/* Header */}
            <div className="bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700 px-4 py-4 flex justify-between items-center shadow-sm flex-shrink-0">
                <h2 className="text-xl font-bold text-gray-800 dark:text-white">Family Chat</h2>
                <button
                    onClick={() => setShowSettings(!showSettings)}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg"
                    title="Chat Settings"
                >
                    <Settings size={20} className="text-gray-600 dark:text-slate-300" />
                </button>
            </div>

            {/* Settings Modal */}
            {showSettings && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-md flex items-center justify-center z-50">
                    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl p-6 max-w-md w-full mx-4 border border-gray-100 dark:border-slate-700">
                        <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-4">Chat Settings</h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-2">
                                    Message Disappear Time
                                </label>
                                <select
                                    value={disappearTime || ''}
                                    onChange={(e) => setDisappearTime(e.target.value ? parseInt(e.target.value) : null)}
                                    className="w-full border border-gray-300 dark:border-slate-600 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-slate-700 text-gray-800 dark:text-white"
                                >
                                    {DISAPPEAR_OPTIONS.map(option => (
                                        <option key={option.label} value={option.value || ''}>
                                            {option.label}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <p className="text-xs text-gray-500 dark:text-slate-400">
                                Messages will automatically disappear after the selected time.
                            </p>
                        </div>
                        <div className="flex gap-3 mt-6">
                            <button
                                onClick={() => setShowSettings(false)}
                                className="flex-1 px-4 py-2 bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-slate-200 rounded-lg hover:bg-gray-200 dark:hover:bg-slate-600 font-semibold transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleUpdateSettings}
                                className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-semibold transition-colors"
                            >
                                Save
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Messages Area - flex-1 + min-h-0 allows it to shrink and scroll within flex parent */}
            <div
                ref={messagesContainerRef}
                className="flex-1 min-h-0 overflow-y-auto px-4 py-6 space-y-4 scroll-smooth"
            >
                {error && (
                    <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm">{error}</div>
                )}

                {messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-gray-400 space-y-4">
                        <div className="bg-indigo-50 p-6 rounded-full">
                             <Smile size={48} className="text-indigo-200" />
                        </div>
                        <p className="text-lg font-medium">No messages yet</p>
                        <p className="text-sm">Start the conversation with your family!</p>
                    </div>
                ) : (
                    messages.map((msg, idx) => {
                        if (msg.isDeleted) {
                            return (
                                <div key={msg._id} className="text-center text-gray-400 text-xs py-2 italic">
                                    Message deleted
                                </div>
                            );
                        }

                        const isOwn = currentUser?._id === msg.senderId?._id || currentUser?._id === msg.senderId;
                        return (
                            <div
                                key={msg._id}
                                className={`flex ${isOwn ? 'justify-end' : 'justify-start'} gap-3 items-end mb-2`}
                            >
                                {!isOwn && (
                                    <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-xs flex-shrink-0">
                                        {msg.senderProfileImage ? (
                                            <img
                                                src={msg.senderProfileImage}
                                                alt={msg.senderName}
                                                className="w-8 h-8 rounded-full"
                                            />
                                        ) : (
                                            msg.senderName.charAt(0).toUpperCase()
                                        )}
                                    </div>
                                )}

                                <div className={`max-w-[75%] ${isOwn ? 'items-end' : 'items-start'} flex flex-col group`}>
                                    {!isOwn && (
                                        <p className="text-[10px] font-bold text-indigo-600 mb-1 ml-1">{msg.senderName}</p>
                                    )}

                                    <div
                                        className={`px-4 py-2.5 rounded-2xl shadow-sm ${
                                            isOwn
                                                ? 'bg-indigo-600 text-white rounded-br-none'
                                                : 'bg-white border border-gray-100 text-gray-800 rounded-bl-none'
                                        }`}
                                    >
                                        {msg.messageType === 'text' ? (
                                            <p className="text-[14px] leading-relaxed break-words">{msg.content}</p>
                                        ) : (
                                            renderMedia(msg)
                                        )}
                                    </div>

                                    <div className={`flex items-center gap-2 mt-1 opacity-0 group-hover:opacity-100 transition-opacity ${isOwn ? 'flex-row-reverse' : ''}`}>
                                        <span className="text-[10px] text-gray-400 font-medium">{formatTime(msg.createdAt)}</span>
                                        {isOwn && (
                                            <button
                                                onClick={() => handleDeleteMessage(msg._id)}
                                                className="p-1 hover:bg-red-50 rounded-full transition-colors"
                                                title="Delete"
                                            >
                                                <Trash2 size={12} className="text-red-400" />
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
                <div className="px-4 py-3 bg-gray-100 dark:bg-slate-700 border-t border-gray-300 dark:border-slate-600 flex items-center justify-between flex-shrink-0">
                    <div className="flex items-center gap-3">
                        {mediaPreview ? (
                            <img src={mediaPreview} alt="Preview" className="h-12 w-12 object-cover rounded" />
                        ) : (
                            <FileText size={24} className="text-gray-600 dark:text-slate-300" />
                        )}
                        <div>
                            <p className="text-sm font-semibold text-gray-800 dark:text-white">{selectedMedia.name}</p>
                            <p className="text-xs text-gray-600 dark:text-slate-400">{getFileSize(selectedMedia.size)}</p>
                        </div>
                    </div>
                    <button
                        onClick={() => {
                            setSelectedMedia(null);
                            setMediaPreview(null);
                        }}
                        className="text-gray-600 dark:text-slate-400 hover:text-gray-800 dark:hover:text-white"
                    >
                        ✕
                    </button>
                </div>
            )}

            {/* Input Area */}
            <div className="bg-white border-t border-gray-100 px-4 py-4">
                <form onSubmit={handleSendMessage} className="flex items-center gap-3">
                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileSelect}
                        className="hidden"
                        accept="image/*,video/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,audio/*"
                    />

                    {!isRecording ? (
                        <>
                            <button
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                className="p-2.5 hover:bg-gray-50 rounded-full transition-colors flex-shrink-0"
                                title="Attach file"
                                disabled={sending}
                            >
                                <Paperclip size={22} className="text-gray-500" />
                            </button>

                            <div className="flex-1 relative flex items-center">
                                <input
                                    type="text"
                                    value={newMessage}
                                    onChange={(e) => setNewMessage(e.target.value)}
                                    placeholder="Type a message..."
                                    className="w-full bg-gray-50 border border-transparent rounded-2xl px-5 py-3 pr-12 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:bg-white focus:border-indigo-300 transition-all text-[15px]"
                                    disabled={sending}
                                />
                                <button
                                    type="button"
                                    className="absolute right-3 p-1.5 hover:bg-gray-200 rounded-full text-gray-400"
                                    title="Emojis"
                                >
                                    <Smile size={20} />
                                </button>
                            </div>

                            {newMessage.trim() || selectedMedia ? (
                                <button
                                    type="submit"
                                    disabled={sending}
                                    className="p-3 bg-indigo-600 text-white rounded-full hover:bg-indigo-700 disabled:opacity-50 shadow-md shadow-indigo-200 transition-all transform active:scale-95 flex-shrink-0"
                                    title="Send"
                                >
                                    <Send size={20} />
                                </button>
                            ) : (
                                <button
                                    type="button"
                                    onClick={startRecording}
                                    disabled={sending}
                                    className="p-3 bg-gray-100 text-gray-600 rounded-full hover:bg-gray-200 transition-all flex-shrink-0"
                                    title="Voice Message"
                                >
                                    <Mic size={22} />
                                </button>
                            )}
                        </>
                    ) : (
                        <div className="flex-1 flex items-center justify-between bg-red-50 rounded-2xl px-4 py-2 border border-red-100 animate-pulse">
                            <div className="flex items-center gap-3">
                                <div className="w-2.5 h-2.5 bg-red-500 rounded-full animate-ping"></div>
                                <span className="text-red-600 font-medium text-sm">
                                    Recording: {formatRecordingTime(recordingTime)}
                                </span>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={cancelRecording}
                                    className="p-2 hover:bg-red-100 rounded-full text-red-400"
                                    title="Cancel"
                                >
                                    <X size={20} />
                                </button>
                                <button
                                    type="button"
                                    onClick={stopRecording}
                                    className="p-2.5 bg-red-500 text-white rounded-full hover:bg-red-600 shadow-sm"
                                    title="Stop and Send"
                                >
                                    <Square size={20} fill="white" />
                                </button>
                            </div>
                        </div>
                    )}
                </form>
            </div>
        </div>
    );
};

export default FamilyChat;
