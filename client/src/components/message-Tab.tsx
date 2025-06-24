import React, { useState, useEffect, useRef } from 'react';
import { Send, Phone, MessageCircle, Filter, ArrowLeft, Check, CheckCheck, X, Clock } from 'lucide-react';
import { API } from "@/utils/const";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";

interface TwilioNumber {
  phoneNumber: string;
  friendlyName: string;
}

interface Message {
  id: string;
  to: string;
  from: string;
  body: string;
  timestamp: string;
  direction: 'inbound' | 'outbound';
  status: 'queued' | 'sent' | 'delivered' | 'failed' | 'received';
  errorMessage?: string;
}

interface Conversation {
  phoneNumber: string;
  lastMessage: Message;
  unreadCount: number;
  lastActivity: string;
}

type FilterStatus = 'all' | 'replied' | 'unreplied';

const MessagesTab: React.FC = () => {
  // State management
  const [availableNumbers, setAvailableNumbers] = useState<TwilioNumber[]>([]);
  const [selectedNumber, setSelectedNumber] = useState<string>('');
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversation, setCurrentConversation] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [loading, setLoading] = useState<boolean>(false);
  const [sendingMessage, setSendingMessage] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // FAB & Dialog state
  const [showNewMessage, setShowNewMessage] = useState(false);
  const [newTo, setNewTo] = useState("");
  const [newBody, setNewBody] = useState("");
  const [sendingNew, setSendingNew] = useState(false);

  // Utility functions
  const addToast = (type: 'success' | 'error', message: string) => {
    console.log(`${type.toUpperCase()}: ${message}`);
  };

  const getAuthHeaders = () => {
    const token = localStorage.getItem('jwt');
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const formatPhoneNumber = (number: string) => {
    const cleaned = number.replace(/\D/g, '');
    if (cleaned.length === 11 && cleaned.startsWith('1')) {
      return `+${cleaned}`;
    } else if (cleaned.length === 10) {
      return `+1${cleaned}`;
    }
    return number;
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
    
    if (diffInHours < 24) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (diffInHours < 168) { // 7 days
      return date.toLocaleDateString([], { weekday: 'short', hour: '2-digit', minute: '2-digit' });
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'queued':
        return <Clock className="w-3 h-3 text-gray-400" />;
      case 'sent':
        return <Check className="w-3 h-3 text-gray-400" />;
      case 'delivered':
        return <CheckCheck className="w-3 h-3 text-blue-500" />;
      case 'failed':
        return <X className="w-3 h-3 text-red-500" />;
      default:
        return null;
    }
  };

  // Updated normalization function to handle Twilio API response
  const normalizeMessage = (msg: any): Message => ({
    id: msg.sid || msg.id || msg._id || `${msg.from}-${msg.to}-${msg.dateSent || msg.dateCreated || msg.dateUpdated || Math.random()}`,
    to: msg.to,
    from: msg.from,
    body: msg.body,
    timestamp: msg.dateSent || msg.timestamp || msg.dateCreated || msg.dateUpdated || new Date().toISOString(),
    direction: msg.direction === 'inbound' || msg.direction === 'inbound-api' ? 'inbound' : 'outbound',
    status: msg.status === 'delivered' ? 'delivered' : (msg.status === 'failed' ? 'failed' : (msg.status === 'queued' ? 'queued' : 'sent')),
    errorMessage: msg.errorMessage || undefined
  });

  // New function to group messages into conversations
  const groupMessagesIntoConversations = (messages: any[]): Conversation[] => {
    if (!Array.isArray(messages)) return [];
    
    const normalizedMessages = messages.map(normalizeMessage);
    const conversationMap = new Map<string, Conversation>();

    normalizedMessages.forEach(message => {
      // Determine the other party's phone number
      const otherParty = message.direction === 'outbound' ? message.to : message.from;
      
      if (!conversationMap.has(otherParty)) {
        conversationMap.set(otherParty, {
          phoneNumber: otherParty,
          lastMessage: message,
          unreadCount: message.direction === 'inbound' ? 1 : 0,
          lastActivity: message.timestamp
        });
      } else {
        const existing = conversationMap.get(otherParty)!;
        // Update if this message is more recent
        if (new Date(message.timestamp) > new Date(existing.lastActivity)) {
          conversationMap.set(otherParty, {
            ...existing,
            lastMessage: message,
            lastActivity: message.timestamp,
            unreadCount: message.direction === 'inbound' ? existing.unreadCount + 1 : existing.unreadCount
          });
        }
      }
    });

    // Convert map to array and sort by last activity
    return Array.from(conversationMap.values()).sort((a, b) => 
      new Date(b.lastActivity).getTime() - new Date(a.lastActivity).getTime()
    );
  };

  // API calls
  const fetchNumbers = async () => {
    try {
      const response = await fetch(API.GET_NUMBERS, {
        headers: getAuthHeaders()
      });
      
      if (!response.ok) throw new Error('Failed to fetch numbers');
      
      const data = await response.json();
      setAvailableNumbers(data);
      
      if (data.length > 0 && !selectedNumber) {
        setSelectedNumber(data[0].phoneNumber);
      }
    } catch (err) {
      console.error('Error fetching numbers:', err);
      addToast('error', 'Failed to load Twilio numbers');
      setError('Failed to load Twilio numbers');
    }
  };

  const fetchConversations = async () => {
    if (!selectedNumber) return;
    
    setLoading(true);
    try {
      const url = filterStatus === 'all' ? API.MESSAGES.ALL : API.MESSAGES.FILTER(filterStatus);
      const response = await fetch(url, {
        headers: getAuthHeaders()
      });
      
      if (!response.ok) throw new Error('Failed to fetch conversations');
      
      const data = await response.json();
      
      // Handle the case where API returns raw messages instead of conversations
      let processedConversations: Conversation[];
      
      if (Array.isArray(data) && data.length > 0) {
        // Check if first item looks like a Twilio message
        if (data[0].sid || data[0].direction) {
          // Raw messages - group them into conversations
          processedConversations = groupMessagesIntoConversations(data);
        } else {
          // Already grouped conversations
          processedConversations = data.map((conv: any) => ({
            ...conv,
            lastMessage: conv.lastMessage ? normalizeMessage(conv.lastMessage) : undefined
          }));
        }
      } else {
        processedConversations = [];
      }
      
      setConversations(processedConversations);
      setError(null);
    } catch (err) {
      console.error('Error fetching conversations:', err);
      addToast('error', 'Failed to load conversations');
      setError('Failed to load conversations');
    } finally {
      setLoading(false);
    }
  };

  const fetchConversationHistory = async (phoneNumber: string) => {
    if (!selectedNumber) return;
    
    setLoading(true);
    try {
      const response = await fetch(API.MESSAGES.CONVERSATION(phoneNumber, selectedNumber), {
        headers: getAuthHeaders()
      });
      
      if (!response.ok) throw new Error('Failed to fetch conversation history');
      
      const data = await response.json();
      const normalized = Array.isArray(data) ? data.map(normalizeMessage) : [];
      setMessages(normalized);
      setCurrentConversation(phoneNumber);
      setError(null);
      
      // Mark as read
      const updatedConversations = conversations.map(conv => 
        conv.phoneNumber === phoneNumber 
          ? { ...conv, unreadCount: 0 }
          : conv
      );
      setConversations(updatedConversations);
      
      setTimeout(scrollToBottom, 100);
    } catch (err) {
      console.error('Error fetching conversation history:', err);
      addToast('error', 'Failed to load conversation history');
      setError('Failed to load conversation history');
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !currentConversation || !selectedNumber) return;
    
    setSendingMessage(true);
    const messageBody = newMessage.trim();
    setNewMessage('');
    
    try {
      const response = await fetch(API.MESSAGES.SEND, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          to: currentConversation,
          from: selectedNumber,
          body: messageBody
        })
      });
      
      if (!response.ok) throw new Error('Failed to send message');
      
      const sentMessage = await response.json();
      
      // Add message to conversation immediately
      const optimisticMessage: Message = {
        id: sentMessage.sid || sentMessage.id || Date.now().toString(),
        to: currentConversation,
        from: selectedNumber,
        body: messageBody,
        timestamp: new Date().toISOString(),
        direction: 'outbound',
        status: 'queued'
      };
      
      setMessages(prev => [...prev, optimisticMessage]);
      
      // Update conversation list
      const updatedConversations = conversations.map(conv => 
        conv.phoneNumber === currentConversation 
          ? { 
              ...conv, 
              lastMessage: optimisticMessage,
              lastActivity: new Date().toISOString()
            }
          : conv
      );
      setConversations(updatedConversations);
      
      addToast('success', 'Message sent successfully');
      setTimeout(scrollToBottom, 100);
      
    } catch (err) {
      console.error('Error sending message:', err);
      addToast('error', 'Failed to send message');
      setNewMessage(messageBody); // Restore message on error
    } finally {
      setSendingMessage(false);
    }
  };

  const sendNewMessage = async () => {
    if (!newTo.trim() || !newBody.trim() || !selectedNumber) return;
    setSendingNew(true);
    try {
      const response = await fetch(API.MESSAGES.SEND, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          to: newTo.trim(),
          from: selectedNumber,
          body: newBody.trim(),
        }),
      });
      if (!response.ok) throw new Error("Failed to send message");
      addToast("success", "Message sent successfully");
      setShowNewMessage(false);
      setNewTo("");
      setNewBody("");
      
      // Optimistically add or update conversation
      const now = new Date().toISOString();
      const optimisticMsg: Message = {
        id: now,
        to: newTo.trim(),
        from: selectedNumber,
        body: newBody.trim(),
        timestamp: now,
        direction: "outbound",
        status: "queued"
      };
      
      setConversations(prev => {
        const idx = prev.findIndex(c => c.phoneNumber === newTo.trim());
        if (idx === -1) {
          // Add new conversation
          return [
            {
              phoneNumber: newTo.trim(),
              lastMessage: optimisticMsg,
              unreadCount: 0,
              lastActivity: now
            },
            ...prev
          ];
        } else {
          // Update existing
          return prev.map((c, i) =>
            i === idx
              ? { ...c, lastMessage: optimisticMsg, lastActivity: now }
              : c
          );
        }
      });
      
      fetchConversations();
    } catch (err) {
      addToast("error", "Failed to send message");
    } finally {
      setSendingNew(false);
    }
  };

  const startPolling = () => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
    }
    
    pollIntervalRef.current = setInterval(() => {
      if (currentConversation && selectedNumber) {
        fetchConversationHistory(currentConversation);
      } else {
        fetchConversations();
      }
    }, 5000);
  };

  const stopPolling = () => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
  };

  // Effects
  useEffect(() => {
    fetchNumbers();
    return () => stopPolling();
  }, []);

  useEffect(() => {
    if (selectedNumber) {
      fetchConversations();
    }
  }, [selectedNumber, filterStatus]);

  useEffect(() => {
    startPolling();
    return () => stopPolling();
  }, [currentConversation, selectedNumber]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Event handlers
  const handleNumberSelect = (number: string) => {
    setSelectedNumber(number);
    setCurrentConversation(null);
    setMessages([]);
  };

  const handleConversationSelect = (phoneNumber: string) => {
    fetchConversationHistory(phoneNumber);
  };

  const handleBackToConversations = () => {
    setCurrentConversation(null);
    setMessages([]);
    fetchConversations();
  };

  const handleSendMessage = () => {
    sendMessage();
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleDialogKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendNewMessage();
    }
  };

  // Render conversation list
  const renderConversationList = () => (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="bg-gray-900 border-b border-gray-800 p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-white flex items-center">
            <MessageCircle className="w-5 h-5 mr-2" />
            Messages
          </h2>
          <div className="flex items-center space-x-2">
            <Phone className="w-4 h-4 text-gray-400" />
            <select 
              value={selectedNumber} 
              onChange={(e) => handleNumberSelect(e.target.value)}
              className="text-sm border border-gray-700 bg-gray-800 text-gray-200 rounded-md px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select Number</option>
              {availableNumbers.map((number) => (
                <option key={number.phoneNumber} value={number.phoneNumber}>
                  {number.friendlyName || number.phoneNumber}
                </option>
              ))}
            </select>
          </div>
        </div>
        {/* Filter tabs */}
        <div className="flex space-x-1 bg-gray-800 rounded-lg p-1">
          {(['all', 'replied', 'unreplied'] as FilterStatus[]).map((status) => (
            <button
              key={status}
              onClick={() => setFilterStatus(status)}
              className={`flex-1 py-2 px-3 text-sm font-medium rounded-md transition-colors ${
                filterStatus === status
                  ? 'bg-gray-900 text-blue-400 shadow-sm'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </button>
          ))}
        </div>
      </div>
      {/* Conversations */}
      <div className="flex-1 overflow-y-auto bg-gray-900">
        {loading && conversations.length === 0 ? (
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          </div>
        ) : error ? (
          <div className="p-4 text-center text-red-400">
            <p>{error}</p>
            <button 
              onClick={fetchConversations}
              className="mt-2 text-blue-400 hover:text-blue-600 text-sm"
            >
              Try again
            </button>
          </div>
        ) : conversations.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <MessageCircle className="w-12 h-12 mx-auto mb-4 text-gray-700" />
            <p>No conversations found</p>
            <p className="text-sm mt-1">Send a message to start a conversation</p>
          </div>
        ) : (
          conversations.map((conversation) => {
            const hasLastMessage = !!conversation.lastMessage;
            const conversationKey = `conversation-${conversation.phoneNumber}`;
            
            return (
              <div
                key={conversationKey}
                onClick={() => handleConversationSelect(conversation.phoneNumber)}
                className="p-4 border-b border-gray-800 hover:bg-gray-800 cursor-pointer transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <p className="font-medium text-gray-100 truncate">
                        {conversation.phoneNumber}
                      </p>
                      <span className="text-xs text-gray-400">
                        {formatTime(conversation.lastActivity)}
                      </span>
                    </div>
                    <p className="text-sm text-gray-400 truncate">
                      {hasLastMessage && conversation.lastMessage.direction === 'outbound' ? 'You: ' : ''}
                      {hasLastMessage ? (
                        conversation.lastMessage.body
                      ) : (
                        <span className="italic text-gray-600">No messages yet</span>
                      )}
                    </p>
                  </div>
                  <div className="flex items-center space-x-2 ml-3">
                    {hasLastMessage && conversation.lastMessage.direction === 'outbound' && (
                      <div className="flex items-center">
                        {getStatusIcon(conversation.lastMessage.status)}
                      </div>
                    )}
                    {conversation.unreadCount > 0 && (
                      <div className="bg-blue-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                        {conversation.unreadCount}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
      {/* FAB */}
      <button
        onClick={() => setShowNewMessage(true)}
        className="fixed bottom-6 right-6 z-50 bg-blue-500 hover:bg-blue-600 text-white rounded-full shadow-lg p-4 flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-blue-400"
        aria-label="New Message"
      >
        <Send className="w-6 h-6" />
      </button>
      {/* New Message Dialog */}
      <Dialog open={showNewMessage} onOpenChange={setShowNewMessage}>
        <DialogContent className="bg-gray-900 border-gray-700 text-gray-100">
          <DialogHeader>
            <DialogTitle>New Message</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={e => {
              e.preventDefault();
              sendNewMessage();
            }}
            className="space-y-4"
          >
            <div>
              <label className="block text-sm mb-1 text-gray-300">To</label>
              <Input
                className="bg-gray-800 border-gray-600 text-gray-100 focus:ring-blue-500"
                placeholder="Customer phone number"
                value={newTo}
                onChange={e => setNewTo(e.target.value)}
                autoFocus
                required
                type="tel"
              />
            </div>
            <div>
              <label className="block text-sm mb-1 text-gray-300">Message</label>
              <textarea
                className="w-full bg-gray-800 border border-gray-600 text-gray-100 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                placeholder="Type your message..."
                value={newBody}
                onChange={e => setNewBody(e.target.value)}
                rows={3}
                onKeyDown={handleDialogKey}
                required
              />
            </div>
            <DialogFooter>
              <Button
                type="submit"
                className="bg-blue-500 hover:bg-blue-600 text-white rounded-md shadow"
                disabled={sendingNew}
              >
                {sendingNew ? (
                  <span className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></span>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-1" /> Send
                  </>
                )}
              </Button>
              <DialogClose asChild>
                <Button variant="ghost" type="button" className="text-gray-400 hover:text-gray-200">Cancel</Button>
              </DialogClose>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );

  // Render conversation view
  const renderConversationView = () => (
    <div className="flex flex-col h-full bg-gray-900">
      {/* Header */}
      <div className="bg-gray-900 border-b border-gray-800 p-4">
        <div className="flex items-center">
          <button
            onClick={handleBackToConversations}
            className="mr-3 p-1 hover:bg-gray-800 rounded-full transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-300" />
          </button>
          <div className="flex-1">
            <h3 className="font-medium text-gray-100">{currentConversation}</h3>
            <p className="text-sm text-gray-400">
              From: {selectedNumber}
            </p>
          </div>
        </div>
      </div>
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {loading && messages.length === 0 ? (
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center text-gray-500 py-8">
            <p>No messages yet</p>
            <p className="text-sm mt-1">Start the conversation!</p>
          </div>
        ) : (
          messages.map((message) => (
            <div
              key={`message-${message.id}`}
              className={`flex ${message.direction === 'outbound' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                  message.direction === 'outbound'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-800 text-gray-200'
                }`}
              >
                <p className="text-sm">{message.body}</p>
                <div className={`flex items-center justify-between mt-1 ${
                  message.direction === 'outbound' ? 'text-blue-100' : 'text-gray-400'
                }`}>
                  <span className="text-xs">{formatTime(message.timestamp)}</span>
                  {message.direction === 'outbound' && (
                    <div className="ml-2">
                      {getStatusIcon(message.status)}
                    </div>
                  )}
                </div>
                {message.status === 'failed' && message.errorMessage && (
                  <p className="text-xs text-red-300 mt-1">{message.errorMessage}</p>
                )}
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>
      {/* Message input */}
      <div className="bg-gray-900 border-t border-gray-800 p-4">
        <div className="flex items-end space-x-2">
          <div className="flex-1">
            <textarea
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type a message..."
              className="w-full px-3 py-2 border border-gray-700 bg-gray-800 text-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              rows={1}
              style={{ minHeight: '40px', maxHeight: '120px' }}
              disabled={sendingMessage}
            />
          </div>
          <button
            onClick={handleSendMessage}
            disabled={!newMessage.trim() || sendingMessage}
            className="p-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow"
          >
            {sendingMessage ? (
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
            ) : (
              <Send className="w-5 h-5" />
            )}
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="h-screen bg-gray-900 flex flex-col text-gray-100">
      {currentConversation ? renderConversationView() : renderConversationList()}
    </div>
  );
};

export default MessagesTab;