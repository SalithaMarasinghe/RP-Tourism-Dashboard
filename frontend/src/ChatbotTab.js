import React, { useState, useEffect } from 'react';
import { Button } from './components/ui/button';
import { MessageCircle, Send, Plus, Trash2, Pencil, History } from 'lucide-react';
import { auth, db } from './firebase';
import { onAuthStateChanged } from 'firebase/auth';
import {
  collection,
  addDoc,
  query,
  orderBy,
  getDocs,
  updateDoc,
  serverTimestamp,
  doc,
  limit,
  setDoc,
  onSnapshot,
  deleteDoc
} from 'firebase/firestore';

// Chat History Sidebar Component
function ChatHistorySidebar({ 
  chats, 
  currentChatId, 
  onSelectChat, 
  onNewChat, 
  onDeleteChat, 
  onRenameChat,
  isOpen,
  onClose
}) {
  const [editingChatId, setEditingChatId] = useState(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [deletingChatId, setDeletingChatId] = useState(null);

  const formatRelativeTime = (timestamp) => {
    if (!timestamp) return '';
    
    try {
      const date = new Date(timestamp.seconds * 1000);
      const now = new Date();
      const diffMs = now - date;
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMins / 60);
      const diffDays = Math.floor(diffHours / 24);

      if (diffMins < 1) return 'Just now';
      if (diffMins < 60) return `${diffMins}m ago`;
      if (diffHours < 24) return `${diffHours}h ago`;
      if (diffDays === 1) return 'Yesterday';
      if (diffDays < 7) return `${diffDays}d ago`;
      
      return date.toLocaleDateString();
    } catch (e) {
      return '';
    }
  };

  const handleDelete = async (chatId) => {
    if (window.confirm('Are you sure you want to delete this chat? This cannot be undone.')) {
      try {
        await onDeleteChat(chatId);
      } catch (error) {
        console.error('Error deleting chat:', error);
      }
    }
  };

  const handleEditStart = (chat) => {
    setEditingChatId(chat.id);
    setEditingTitle(chat.title);
  };

  const handleEditSave = async (chatId) => {
    if (!editingTitle.trim()) {
      setEditingChatId(null);
      return;
    }

    try {
      await onRenameChat(chatId, editingTitle);
      setEditingChatId(null);
    } catch (error) {
      console.error('Error renaming chat:', error);
    }
  };

  const handleEditCancel = () => {
    setEditingChatId(null);
    setEditingTitle('');
  };

  const handleKeyDown = (e, chatId) => {
    if (e.key === 'Enter') {
      handleEditSave(chatId);
    } else if (e.key === 'Escape') {
      handleEditCancel();
    }
  };

  return (
    <>
      {/* Sidebar Backdrop (mobile) */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/30 z-30 md:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <div
        className={`fixed md:static left-0 top-0 w-64 h-full bg-white border-r border-gray-200 flex flex-col z-40 transform transition-transform duration-250 md:transform-none overflow-hidden ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="p-4 border-b border-gray-200">
          <p className="text-xs font-semibold text-gray-600 uppercase mb-3">Chat History</p>
          <Button
            onClick={onNewChat}
            size="sm"
            className="w-full"
            title="Start a new chat"
          >
            <Plus className="h-4 w-4 mr-2" />
            New Chat
          </Button>
        </div>

        {/* Chat List */}
        <div className="flex-1 overflow-y-auto">
          {chats.length === 0 ? (
            <div className="p-4 text-center text-sm text-gray-500">
              No previous chats.
            </div>
          ) : (
            <div className="space-y-1 p-2">
              {chats.map((chat) => (
                <div
                  key={chat.id}
                  className={`group flex flex-col p-3 rounded-md cursor-pointer transition-colors ${
                    currentChatId === chat.id
                      ? 'bg-blue-50'
                      : 'hover:bg-gray-100'
                  }`}
                >
                  {editingChatId === chat.id ? (
                    <input
                      autoFocus
                      type="text"
                      value={editingTitle}
                      onChange={(e) => setEditingTitle(e.target.value)}
                      onKeyDown={(e) => handleKeyDown(e, chat.id)}
                      onBlur={() => handleEditSave(chat.id)}
                      className="w-full px-2 py-1 text-sm border border-blue-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                      onClick={(e) => e.stopPropagation()}
                    />
                  ) : (
                    <>
                      <div
                        className="flex-1 min-w-0 flex items-start justify-between"
                        onClick={() => onSelectChat(chat.id)}
                      >
                        <span
                          className={`text-sm font-medium truncate flex-1 ${
                            currentChatId === chat.id ? 'text-blue-600' : 'text-gray-900'
                          }`}
                          title={chat.title}
                        >
                          {chat.title}
                        </span>
                      </div>
                      <div className="flex items-center justify-between mt-1">
                        <span className="text-xs text-gray-500">
                          {formatRelativeTime(chat.updatedAt)}
                        </span>
                        <div className="flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEditStart(chat);
                            }}
                            className="p-1 hover:bg-gray-200 rounded"
                            title="Rename chat"
                          >
                            <Pencil className="h-3 w-3 text-gray-600" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(chat.id);
                            }}
                            className="p-1 hover:bg-red-100 rounded"
                            title="Delete chat"
                          >
                            <Trash2 className="h-3 w-3 text-red-600" />
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

// Main Chatbot Tab Component
function ChatbotTab() {
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [currentChatId, setCurrentChatId] = useState(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [authWarning, setAuthWarning] = useState(false);
  const [chats, setChats] = useState([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [firstMessageData, setFirstMessageData] = useState(null);

  // Initialize user and set up real-time chat listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      console.log('Auth state changed. User:', user?.uid);
      setCurrentUser(user);

      if (user) {
        setAuthWarning(false);
        
        // Set up real-time listener for chats
        const chatsRef = collection(db, `users/${user.uid}/chats`);
        const chatsQuery = query(chatsRef, orderBy('updatedAt', 'desc'));
        
        const unsubscribeChats = onSnapshot(chatsQuery, async (snapshot) => {
          console.log('Chats update received:', snapshot.docs.length);
          const chatsList = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data()
          }));
          setChats(chatsList);

          // Load the most recent chat if no chat is currently selected
          if (!currentChatId && chatsList.length > 0) {
            const mostRecentChat = chatsList[0];
            await loadChat(user.uid, mostRecentChat.id);
          }
        }, (error) => {
          console.error('Error setting up chats listener:', error);
        });

        setIsInitializing(false);
        return () => unsubscribeChats();
      } else {
        console.log('User not authenticated');
        setAuthWarning(true);
        setMessages([]);
        setCurrentChatId(null);
        setChats([]);
        setIsInitializing(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const loadChat = async (userId, chatId) => {
    try {
      console.log('Loading chat:', chatId);
      setCurrentChatId(chatId);

      const messagesRef = collection(db, `users/${userId}/chats/${chatId}/messages`);
      const messagesQuery = query(messagesRef, orderBy('timestamp', 'asc'));
      const messagesSnapshot = await getDocs(messagesQuery);

      const loadedMessages = messagesSnapshot.docs.map(doc => ({
        id: doc.id,
        text: doc.data().content,
        sender: doc.data().role === 'assistant' ? 'bot' : 'user',
        sources: doc.data().sources || []
      }));

      setMessages(loadedMessages);
      
      // Scroll to bottom
      setTimeout(() => {
        const messagesElement = document.querySelector('[data-messages-container]');
        if (messagesElement) {
          messagesElement.scrollTop = messagesElement.scrollHeight;
        }
      }, 0);
    } catch (error) {
      console.error('Error loading chat:', error);
    }
  };

  // Save user message to Firestore
  const saveMessageToFirestore = async (role, content, sources = [], chatIdOverride = null) => {
    if (!currentUser) {
      console.warn('No user logged in');
      return null;
    }

    try {
      let chatId = chatIdOverride || currentChatId;

      // Create a new chat if this is the first message
      if (!chatId) {
        console.log('Creating new chat...');
        const title = content.length > 60 ? content.substring(0, 60) : content;
        
        // Ensure user document exists
        const userDocRef = doc(db, 'users', currentUser.uid);
        await setDoc(userDocRef, { email: currentUser.email }, { merge: true });
        
        const newChatRef = await addDoc(collection(db, `users/${currentUser.uid}/chats`), {
          title,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
        chatId = newChatRef.id;
        console.log('New chat created with ID:', chatId);
        setCurrentChatId(chatId);

        // Store first message data for later title generation
        if (role === 'user') {
          setFirstMessageData({ userMessage: content, chatId });
        }
      }

      // Save the message
      const messageData = {
        role,
        content,
        timestamp: serverTimestamp(),
        sources: sources || []
      };
      
      console.log('Saving message to', `users/${currentUser.uid}/chats/${chatId}/messages`);
      const messagesRef = collection(db, `users/${currentUser.uid}/chats/${chatId}/messages`);
      await addDoc(messagesRef, messageData);
      console.log('Message saved successfully');

      // Update chat updatedAt
      await updateDoc(doc(db, `users/${currentUser.uid}/chats/${chatId}`), {
        updatedAt: serverTimestamp()
      });
      
      return chatId;
    } catch (error) {
      console.error('Error saving message to Firestore:', error);
      console.error('Error code:', error.code);
      console.error('Error message:', error.message);
      return null;
    }
  };

  const callGeminiAPI = async (message) => {
    const apiKey = process.env.REACT_APP_GEMINI_API_KEY;
    
    if (!apiKey) {
      throw new Error('Gemini API key not configured');
    }

    console.log('Attempting Gemini API call with key:', apiKey.substring(0, 10) + '...');

    try {
      // Gather context from multiple sources
      let contextData = {
        webSearch: '',
        tdmsData: '',
        forecasts: '',
        dailyPredictions: ''
      };

      // 1. Web search for current information
      try {
        const searchResponse = await fetch('http://localhost:8000/api/search/web', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ query: message })
        });
        
        if (searchResponse.ok) {
          const searchData = await searchResponse.json();
          if (searchData.success && searchData.results.length > 0) {
            contextData.webSearch = '\n\nRecent web search results:\n' + 
              searchData.results.map(r => `- ${r.title}: ${r.snippet}`).join('\n');
          }
        }
      } catch (searchError) {
        console.warn('Web search failed, proceeding without it:', searchError);
      }

      // 2. Get TDMS data if user asks about specific sites or dates
      if (message.toLowerCase().includes('site') || message.toLowerCase().includes('location') || 
          message.toLowerCase().includes('place') || message.toLowerCase().includes('vli') ||
          message.toLowerCase().includes('visitors') || message.toLowerCase().includes('capacity')) {
        try {
          // Get available sites
          const sitesResponse = await fetch('http://localhost:8000/api/tdms/sites');
          if (sitesResponse.ok) {
            const sitesData = await sitesResponse.json();
            if (sitesData.sites && sitesData.sites.length > 0) {
              contextData.tdmsData = `\n\nAvailable tourism sites in dataset: ${sitesData.sites.slice(0, 10).join(', ')}...`;
              
              // If user mentions a specific site, get its data
              const mentionedSite = sitesData.sites.find(site => 
                message.toLowerCase().includes(site.toLowerCase())
              );
              if (mentionedSite) {
                const siteResponse = await fetch(`http://localhost:8000/api/tdms/site/${encodeURIComponent(mentionedSite)}`);
                if (siteResponse.ok) {
                  const siteInfo = await siteResponse.json();
                  if (siteInfo.data && siteInfo.data.length > 0) {
                    const latestData = siteInfo.data[siteInfo.data.length - 1];
                    contextData.tdmsData += `\n\nLatest data for ${mentionedSite}:\n- Predicted visitors: ${latestData.predicted_total_visitors}\n- VLI score: ${latestData.vli_score}\n- Statistical capacity: ${latestData.statistical_capacity}\n- Date: ${latestData.date}`;
                  }
                }
              }
            }
          }
        } catch (tdmsError) {
          console.warn('TDMS data fetch failed:', tdmsError);
        }
      }

      // 3. Get forecast data if user asks about predictions
      if (message.toLowerCase().includes('forecast') || message.toLowerCase().includes('prediction') ||
          message.toLowerCase().includes('future') || message.toLowerCase().includes('trend')) {
        try {
          // Get daily predictions
          const dailyResponse = await fetch('http://localhost:8000/api/forecasts/daily');
          if (dailyResponse.ok) {
            const dailyData = await dailyResponse.json();
            if (dailyData.baseline && dailyData.baseline.length > 0) {
              const nextMonth = dailyData.baseline.slice(0, 3);
              contextData.dailyPredictions = '\n\nUpcoming tourism predictions (next 3 months):\n' +
                nextMonth.map(d => `- ${d.date}: ${d.total_forecast} forecasted arrivals`).join('\n');
            }
          }

          // Get forecast scenarios
          const scenariosResponse = await fetch('http://localhost:8000/api/forecasts/scenarios');
          if (scenariosResponse.ok) {
            const scenariosData = await scenariosResponse.json();
            if (scenariosData.baseline && scenariosData.baseline.length > 0) {
              contextData.forecasts = '\n\nForecast scenarios available: baseline, optimistic, pessimistic';
            }
          }
        } catch (forecastError) {
          console.warn('Forecast data fetch failed:', forecastError);
        }
      }

      // Build comprehensive prompt with all context
      const prompt = `You are a helpful AI assistant specializing in tourism analytics and Sri Lanka tourism. You have access to real-time data from the tourism analytics dashboard.

Available data sources:
- Current web search results for latest information
- TDMS (Tourism Destination Management System) data with site-specific visitor predictions and VLI scores
- Tourism forecasts with multiple scenarios (baseline, optimistic, pessimistic)
- Daily and monthly predictions for tourism arrivals

${contextData.webSearch}
${contextData.tdmsData}
${contextData.forecasts}
${contextData.dailyPredictions}

User question: ${message}

Provide a comprehensive and helpful response using the available data above. If specific data isn't available for the query, clearly state that and provide general guidance based on tourism best practices.`;

      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: prompt
            }]
          }],
          generationConfig: {
            temperature: 0.7,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 1024,
          }
        })
      });

      console.log('Gemini API response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Gemini API error response:', errorText);
        
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch (e) {
          errorData = { error: { message: errorText } };
        }
        
        throw new Error(`Gemini API error: ${response.status} - ${errorData.error?.message || 'Unknown error'}`);
      }

      const data = await response.json();
      console.log('Gemini API response data:', data);
      
      if (data.candidates && data.candidates.length > 0) {
        const text = data.candidates[0].content.parts[0].text;
        
        // Extract sources based on what data was used
        const sources = [];
        if (contextData.webSearch) sources.push('Web search integration');
        if (contextData.tdmsData) sources.push('TDMS dataset');
        if (contextData.forecasts) sources.push('Forecast scenarios');
        if (contextData.dailyPredictions) sources.push('Daily predictions');
        
        return { text, sources };
      } else {
        throw new Error('No response generated from Gemini API');
      }
    } catch (error) {
      console.error('Gemini API call failed:', error);
      throw error;
    }
  };

  const generateChatTitle = async (chatId, userMessage, assistantResponse) => {
    // Fire-and-forget, non-blocking title generation
    if (!currentUser || !chatId) return;

    try {
      // TODO: Replace with actual Gemini API call when integrated
      // For now, use a simple heuristic-based title
      const words = userMessage.split(' ').slice(0, 6).join(' ');
      const generatedTitle = words.length > 0 ? words : userMessage.substring(0, 40);

      // Update the chat document with the generated title
      await updateDoc(doc(db, `users/${currentUser.uid}/chats/${chatId}`), {
        title: generatedTitle
      });
      
      console.log('Chat title updated:', generatedTitle);
    } catch (error) {
      console.error('Error generating chat title:', error);
      // Silently fail - don't break the chat flow
    }
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim()) return;

    if (!currentUser) {
      setAuthWarning(true);
      return;
    }

    const userMessage = inputMessage;
    setInputMessage('');

    // Add user message to local state
    setMessages(prev => [...prev, { text: userMessage, sender: 'user' }]);

    // Save user message to Firestore and get the chat ID
    let chatIdForThisMessage = currentChatId;
    if (!chatIdForThisMessage) {
      chatIdForThisMessage = await saveMessageToFirestore('user', userMessage, [], currentChatId);
    } else {
      await saveMessageToFirestore('user', userMessage, [], chatIdForThisMessage);
    }

    setIsLoading(true);

    try {
      // Call Gemini API
      const geminiResponse = await callGeminiAPI(userMessage);
      
      setMessages(prev => [...prev, { text: geminiResponse.text, sender: 'bot', sources: geminiResponse.sources }]);

      // Save assistant response to Firestore with the same chat ID
      if (chatIdForThisMessage) {
        await saveMessageToFirestore('assistant', geminiResponse.text, geminiResponse.sources, chatIdForThisMessage);
        
        // Generate meaningful title after first exchange (fire-and-forget)
        if (firstMessageData?.chatId === chatIdForThisMessage) {
          generateChatTitle(chatIdForThisMessage, userMessage, geminiResponse.text);
          setFirstMessageData(null);
        }
      }

      setIsLoading(false);
    } catch (error) {
      console.error('Error sending message:', error);
      
      // Fallback response
      const fallbackResponse = "I apologize, but I'm having trouble connecting to the AI service. Please try again later.";
      setMessages(prev => [...prev, { text: fallbackResponse, sender: 'bot', sources: [] }]);
      
      if (chatIdForThisMessage) {
        await saveMessageToFirestore('assistant', fallbackResponse, [], chatIdForThisMessage);
      }
      
      setIsLoading(false);
    }
  };

  const handleNewChat = () => {
    setMessages([]);
    setCurrentChatId(null);
    setInputMessage('');
    setFirstMessageData(null);
    setIsSidebarOpen(false);
  };

  const handleDeleteChat = async (chatId) => {
    if (!currentUser) return;

    try {
      // Delete all messages in the chat
      const messagesRef = collection(db, `users/${currentUser.uid}/chats/${chatId}/messages`);
      const messagesSnapshot = await getDocs(messagesRef);
      const deletePromises = messagesSnapshot.docs.map(doc => deleteDoc(doc.ref));
      await Promise.all(deletePromises);

      // Delete the chat document
      await deleteDoc(doc(db, `users/${currentUser.uid}/chats/${chatId}`));

      // If this was the active chat, clear the window
      if (currentChatId === chatId) {
        setMessages([]);
        setCurrentChatId(null);
      }

      console.log('Chat deleted successfully');
    } catch (error) {
      console.error('Error deleting chat:', error);
    }
  };

  const handleRenameChat = async (chatId, newTitle) => {
    if (!currentUser) return;

    try {
      await updateDoc(doc(db, `users/${currentUser.uid}/chats/${chatId}`), {
        title: newTitle
      });
      console.log('Chat renamed successfully');
    } catch (error) {
      console.error('Error renaming chat:', error);
    }
  };

  if (isInitializing) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center text-gray-500">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p>Loading chat...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col w-full h-full">
      {/* Header */}
      <div className="pb-4 border-b border-gray-200">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="md:hidden p-2 hover:bg-gray-100 rounded transition-colors"
              title="Toggle chat history"
            >
              <History className="h-5 w-5 text-gray-600" />
            </button>
            <MessageCircle className="h-6 w-6 text-blue-600 flex-shrink-0" />
            <h1 className="text-2xl font-bold text-gray-900">AI Assistant</h1>
            <span className="text-gray-400">|</span>
            <p className="text-gray-600 truncate">
              Chat with our AI assistant for tourism analytics and insights
            </p>
          </div>
        </div>
      </div>

      {/* Auth Warning */}
      {authWarning && (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mx-4 mt-4">
          <p className="text-sm text-yellow-700">
            Please log in to save and view your chat history.
          </p>
        </div>
      )}

      {/* Main Content - Two Column Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Chat History Sidebar */}
        <ChatHistorySidebar
          chats={chats}
          currentChatId={currentChatId}
          onSelectChat={(chatId) => {
            loadChat(currentUser.uid, chatId);
            setIsSidebarOpen(false);
          }}
          onNewChat={handleNewChat}
          onDeleteChat={handleDeleteChat}
          onRenameChat={handleRenameChat}
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
        />

        {/* Chat Window */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Messages Area */}
          <div 
            className="flex-1 overflow-y-auto py-6 px-6"
            data-messages-container
          >
            {messages.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center text-gray-500">
                  <MessageCircle className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                  <p className="text-lg">Start a conversation with the AI assistant</p>
                  <p className="text-sm mt-2">Ask about tourism trends, forecasts, or analytics</p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {messages.map((message, index) => (
                  <div
                    key={index}
                    className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`px-4 py-3 rounded-lg max-w-2xl break-words ${
                        message.sender === 'user'
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-200 text-gray-800'
                      }`}
                    >
                      {message.text}
                      {message.sources && message.sources.length > 0 && (
                        <div className="mt-2 text-xs opacity-75 border-t pt-2">
                          <p className="font-semibold">Sources:</p>
                          {message.sources.map((source, idx) => (
                            <p key={idx}>• {source}</p>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                {isLoading && (
                  <div className="flex justify-start">
                    <div className="bg-gray-200 text-gray-800 px-4 py-3 rounded-lg">
                      <div className="flex items-center space-x-2">
                        <div className="w-2 h-2 bg-gray-600 rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-gray-600 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                        <div className="w-2 h-2 bg-gray-600 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Input Bar */}
          <div className="flex space-x-2 pt-6 border-t border-gray-200 p-6 bg-white">
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
              placeholder="Type your message..."
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={isLoading || !currentUser}
            />
            <Button
              onClick={handleSendMessage}
              disabled={isLoading || !inputMessage.trim() || !currentUser}
              className="px-4 py-2"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ChatbotTab;
