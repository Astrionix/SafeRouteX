'use client';

import { useState, useRef, useEffect } from 'react';
import { Bot, X, Send, Loader2, MapPin, Shield, AlertTriangle, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';

interface Message {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

export default function AIChatbot() {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // Add welcome message when opened
    useEffect(() => {
        if (isOpen && messages.length === 0) {
            setMessages([{
                id: '1',
                role: 'assistant',
                content: `👋 **Hello! I'm your SafeRouteX AI Assistant**

I'm powered by Gemini AI and can help you with:
• 🗺️ **Safe Routes** - Find the safest path to your destination
• 🌙 **Night Travel** - Tips for traveling after dark
• 📍 **Area Safety** - Check if a location is safe
• 🆘 **Emergency** - How to use SOS features
• 📊 **Crime Insights** - Understand local patterns

What would you like to know?`,
                timestamp: new Date()
            }]);
        }
    }, [isOpen, messages.length]);

    const handleSend = async () => {
        if (!input.trim() || isLoading) return;

        const userMessage: Message = {
            id: Date.now().toString(),
            role: 'user',
            content: input.trim(),
            timestamp: new Date()
        };

        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setIsLoading(true);

        try {
            const response = await axios.post(`${API_URL}/ai/chat`, {
                message: userMessage.content,
                context: { timestamp: new Date().toISOString() }
            });

            const aiResponse: Message = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: response.data.response,
                timestamp: new Date()
            };
            setMessages(prev => [...prev, aiResponse]);
        } catch (error) {
            console.error('AI chat error:', error);
            const errorMessage: Message = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: '❌ Sorry, I encountered an error. Please try again or check your connection.',
                timestamp: new Date()
            };
            setMessages(prev => [...prev, errorMessage]);
        } finally {
            setIsLoading(false);
        }
    };

    const suggestedQuestions = [
        { icon: MapPin, text: "Is it safe to walk at night?" },
        { icon: Shield, text: "Find me a safe route" },
        { icon: AlertTriangle, text: "Show crime hotspots" },
    ];

    return (
        <>
            {/* Floating Button */}
            <motion.button
                onClick={() => setIsOpen(true)}
                className={`fixed bottom-36 right-6 z-40 w-14 h-14 rounded-full 
          bg-gradient-to-br from-purple-500 to-indigo-600 text-white shadow-lg
          flex items-center justify-center hover:scale-110 transition-transform
          ${isOpen ? 'hidden' : ''}`}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                title="AI Safety Assistant"
            >
                <Sparkles className="w-6 h-6" />
            </motion.button>

            {/* Chat Window */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 20, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 20, scale: 0.95 }}
                        className="fixed bottom-6 right-6 z-50 w-96 max-w-[calc(100vw-3rem)] h-[32rem] 
              bg-dark-200 border border-white/10 rounded-2xl shadow-2xl flex flex-col overflow-hidden"
                    >
                        {/* Header */}
                        <div className="p-4 border-b border-white/10 bg-gradient-to-r from-purple-500/20 to-indigo-500/20">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 
                    flex items-center justify-center">
                                        <Bot className="w-5 h-5 text-white" />
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-white">Safety Assistant</h3>
                                        <p className="text-xs text-gray-400">Powered by Gemini AI ✨</p>
                                    </div>
                                </div>
                                <button onClick={() => setIsOpen(false)} className="text-gray-400 hover:text-white p-1">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                        </div>

                        {/* Messages */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-4">
                            {messages.map((msg) => (
                                <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                    <div className={`max-w-[85%] p-3 rounded-2xl ${msg.role === 'user'
                                        ? 'bg-primary-500 text-white rounded-br-sm'
                                        : 'bg-dark-100 text-gray-200 rounded-bl-sm'
                                        }`}>
                                        <p className="text-sm whitespace-pre-line">{msg.content}</p>
                                    </div>
                                </div>
                            ))}

                            {isLoading && (
                                <div className="flex justify-start">
                                    <div className="bg-dark-100 p-3 rounded-2xl rounded-bl-sm">
                                        <div className="flex items-center gap-2">
                                            <Loader2 className="w-4 h-4 animate-spin text-purple-400" />
                                            <span className="text-sm text-gray-400">Thinking...</span>
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div ref={messagesEndRef} />
                        </div>

                        {/* Suggestions */}
                        {messages.length <= 1 && (
                            <div className="px-4 pb-2">
                                <p className="text-xs text-gray-500 mb-2">Try asking:</p>
                                <div className="flex flex-wrap gap-2">
                                    {suggestedQuestions.map((q, i) => (
                                        <button
                                            key={i}
                                            onClick={() => setInput(q.text)}
                                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-dark-100 
                        text-gray-300 rounded-full hover:bg-dark-300 transition-colors"
                                        >
                                            <q.icon className="w-3 h-3" />
                                            {q.text}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Input */}
                        <div className="p-4 border-t border-white/10">
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                                    placeholder="Ask about safety..."
                                    className="flex-1 px-4 py-2.5 bg-dark-100 border border-white/10 rounded-xl 
                    text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
                                />
                                <button
                                    onClick={handleSend}
                                    disabled={!input.trim() || isLoading}
                                    className="p-2.5 bg-gradient-to-r from-purple-500 to-indigo-600 rounded-xl
                    text-white disabled:opacity-50 hover:opacity-90 transition-opacity"
                                >
                                    <Send className="w-5 h-5" />
                                </button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}
