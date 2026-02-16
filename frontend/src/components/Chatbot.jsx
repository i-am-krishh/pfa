import { useState, useRef, useEffect } from "react";
import { MessageCircle, X, Send, Loader2 } from "lucide-react";

import axios from "axios";

// Force localhost in development to avoid hitting production Vercel deployment which lacks the chatbot route
// If running in dev mode (npm run dev), use localhost. Otherwise use env var or fallback.
const isDev = import.meta.env.DEV;
const API_URL = isDev ? 'http://localhost:5000/api' : (import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api');

export default function Chatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    { text: "Hi! I'm your personal finance assistant. How can I help you today?", sender: "bot" }
  ]);
  const [inputText, setInputText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isOpen]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    const userMessage = inputText.trim();
    setMessages((prev) => [...prev, { text: userMessage, sender: "user" }]);
    setInputText("");
    setIsLoading(true);

    try {
      console.log("Using Chatbot API:", `${API_URL}/chatbot/message`);
      
      const response = await axios.post(`${API_URL}/chatbot/message`, {
        message: userMessage
      });

      if (response.data.success) {
        setMessages((prev) => [...prev, { text: response.data.reply, sender: "bot" }]);
      }
    } catch (error) {
      console.error("Error sending message:", error);
      
      // Get a more specific error message if available
      let errorMessage = error.response?.data?.message || "Sorry, I encountered an error. Please try again.";
      
      if (error.response?.data?.details) {
        errorMessage += `\nDetails: ${error.response.data.details}`;
      }

      if (error.code === "ERR_NETWORK") {
        errorMessage = "Cannot connect to the server. Please ensure the backend is running at http://localhost:5000";
      }
      
      setMessages((prev) => [...prev, { text: errorMessage, sender: "bot" }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
      {/* Chat Window */}
      {isOpen && (
        <div className="mb-4 w-[calc(100vw-3rem)] sm:w-96 h-[500px] max-h-[80vh] bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col transition-all duration-300 animate-in slide-in-from-bottom-5 fade-in">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-4 flex justify-between items-center text-white">
            <div className="flex items-center gap-2">
              <div className="bg-white/20 p-1.5 rounded-full">
                <MessageCircle size={18} />
              </div>
              <h3 className="font-semibold">Finance Assistant</h3>
            </div>
            <button 
              onClick={() => setIsOpen(false)}
              className="text-white/80 hover:text-white hover:bg-white/10 p-1 rounded-full transition-colors"
            >
              <X size={18} />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 p-4 overflow-y-auto bg-slate-50 flex flex-col gap-3 min-h-0">
            {messages.map((msg, index) => (
              <div 
                key={index} 
                className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div 
                  className={`max-w-[80%] p-3 rounded-2xl text-sm shadow-sm ${
                    msg.sender === 'user' 
                      ? 'bg-blue-600 text-white rounded-br-none' 
                      : 'bg-white text-slate-700 border border-slate-200 rounded-bl-none'
                  }`}
                >
                  <p className="whitespace-pre-wrap break-words leading-relaxed">{msg.text}</p>
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-white text-slate-700 border border-slate-200 p-3 rounded-2xl rounded-bl-none shadow-sm flex items-center gap-2">
                  <Loader2 size={16} className="animate-spin text-blue-600" />
                  <span className="text-xs text-slate-500">Thinking...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <form onSubmit={handleSendMessage} className="p-3 bg-white border-t border-slate-100 flex gap-2">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Ask about finance..."
              className="flex-1 bg-slate-100 border-0 focus:ring-2 focus:ring-blue-100 rounded-xl px-4 py-2 text-sm text-slate-700 outline-none transition-all placeholder:text-slate-400"
            />
            <button 
              type="submit" 
              disabled={isLoading || !inputText.trim()}
              className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white p-2.5 rounded-xl transition-colors shadow-sm shadow-blue-200"
            >
              <Send size={18} />
            </button>
          </form>
        </div>
      )}

      {/* Toggle Button - Only show when closed */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="group bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-4 rounded-full shadow-lg shadow-blue-300 hover:shadow-blue-400 hover:scale-105 transition-all duration-300 flex items-center justify-center"
        >
          <MessageCircle size={28} className="group-hover:animate-pulse" />
        </button>
      )}
    </div>
  );
}
