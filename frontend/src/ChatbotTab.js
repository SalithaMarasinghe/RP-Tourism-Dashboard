import React, { useState, useEffect } from 'react';
import { Button } from './components/ui/button';
import { MessageCircle, Send, Plus, Trash2, Pencil, History } from 'lucide-react';
import { auth } from './firebase';
import { onAuthStateChanged } from 'firebase/auth';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';

const API_BASE = 'http://localhost:8000';

// Helper: get an authenticated fetch call using Firebase ID token
async function authFetch(path, options = {}) {
  const user = auth.currentUser;
  if (!user) throw new Error('Not authenticated');
  const token = await user.getIdToken();
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(options.headers || {})
    }
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `Request failed: ${res.status}`);
  }
  return res.json();
}

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
      {/* Sidebar Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/30 z-40"
          onClick={onClose}
        />
      )}

      {/* Floating Sidebar */}
      <div
        className={`fixed left-4 top-20 w-80 h-[calc(100vh-6rem)] bg-white border border-gray-200 rounded-lg shadow-lg flex flex-col z-50 transform transition-all duration-300 ease-in-out overflow-hidden ${
          isOpen ? 'translate-x-0 opacity-100' : '-translate-x-full opacity-0'
        }`}
      >
        {/* Header */}
        <div className="p-4 border-b border-gray-200 flex-shrink-0">
          {/* AI Assistant Branding */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <MessageCircle className="h-6 w-6 text-blue-600 flex-shrink-0" />
              <div>
                <h2 className="text-lg font-bold text-gray-900">AI Assistant</h2>
                <p className="text-xs text-gray-500">Tourism analytics & insights</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1 rounded-md hover:bg-gray-100 transition-colors"
              title="Close sidebar"
            >
              <svg className="h-5 w-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
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
                            className="p-1 rounded hover:bg-gray-200 transition-colors"
                            title="Edit chat title"
                          >
                            <Pencil className="h-3 w-3 text-gray-500" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeletingChatId(chat.id);
                            }}
                            className="p-1 rounded hover:bg-red-100 transition-colors"
                            title="Delete chat"
                          >
                            <Trash2 className="h-3 w-3 text-red-500" />
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

      {/* Delete Confirmation Modal */}
      {deletingChatId && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
          <div className="bg-white rounded-lg p-6 max-w-sm mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Delete Chat?</h3>
            <p className="text-sm text-gray-600 mb-4">
              Are you sure you want to delete this chat? This cannot be undone.
            </p>
            <div className="flex space-x-3">
              <Button
                onClick={() => setDeletingChatId(null)}
                variant="outline"
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={() => {
                  handleDelete(deletingChatId);
                  setDeletingChatId(null);
                }}
                className="flex-1 bg-red-600 hover:bg-red-700"
              >
                Delete
              </Button>
            </div>
          </div>
        </div>
      )}
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

  // Initialize user and load chat list
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      console.log('Auth state changed. User:', user?.uid);
      setCurrentUser(user);

      if (user) {
        setAuthWarning(false);
        await refreshChatList(user);
        setIsInitializing(false);
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

  const refreshChatList = async (user, skipAutoLoad = false) => {
    try {
      const token = await (user || auth.currentUser).getIdToken();
      const res = await fetch(`${API_BASE}/api/chat/list`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) return;
      const data = await res.json();
      const chatsList = data.chats || [];
      setChats(chatsList);

      // Auto-load most recent chat if none selected (but skip if user is actively chatting)
      if (!skipAutoLoad && !currentChatId && chatsList.length > 0) {
        await loadChat(chatsList[0].id);
      }
    } catch (err) {
      console.error('Error loading chat list:', err);
    }
  };

  const loadChat = async (chatId) => {
    try {
      console.log('Loading chat:', chatId);
      setCurrentChatId(chatId);

      const data = await authFetch(`/api/chat/${chatId}`);
      const loadedMessages = (data.messages || []).map(msg => ({
        id: msg.id,
        text: msg.content,
        sender: msg.role === 'assistant' ? 'bot' : 'user',
        sources: msg.sources || []
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

  // Save a message to the backend and return chatId
  const saveMessageToBackend = async (role, content, sources = [], chatIdOverride = null) => {
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
        const newChat = await authFetch('/api/chat/create', {
          method: 'POST',
          body: JSON.stringify({ title })
        });
        chatId = newChat.chatId;
        console.log('New chat created with ID:', chatId);
        setCurrentChatId(chatId);

        if (role === 'user') {
          setFirstMessageData({ userMessage: content, chatId });
        }

        // Refresh sidebar
        await refreshChatList(currentUser, true);
      }

      // Save the message
      console.log('Saving message to chat:', chatId);
      await authFetch(`/api/chat/${chatId}/message`, {
        method: 'POST',
        body: JSON.stringify({ role, content, sources: sources || [] })
      });
      console.log('Message saved successfully');

      // Refresh sidebar to update updatedAt ordering
      await refreshChatList(currentUser, true);

      return chatId;
    } catch (error) {
      console.error('Error saving message:', error);
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

      // 2. Get comprehensive dashboard data for better context
      try {
        // Always get forecast scenarios for context
        const scenariosResponse = await fetch('http://localhost:8000/api/forecasts/scenarios');
        if (scenariosResponse.ok) {
          const scenariosData = await scenariosResponse.json();
          if (scenariosData.baseline && scenariosData.baseline.length > 0) {
            const latestData = scenariosData.baseline.slice(-3); // Last 3 months
            contextData.forecasts = '\n\nRecent tourism forecasts (last 3 months):\n' +
              latestData.map(d => `- ${d.date}: ${d.arrivals_forecast || d.total_forecast} arrivals (growth: ${d.growth_rate ? d.growth_rate.toFixed(1) : 'N/A'}%)`).join('\n');

            // Add external factors if available
            const latestWithFactors = scenariosData.baseline.slice(-1)[0];
            if (latestWithFactors && latestWithFactors.external_factor_contributions_pct) {
              const factors = Object.entries(latestWithFactors.external_factor_contributions_pct)
                .filter(([_, value]) => value && parseFloat(value) !== 0)
                .map(([key, value]) => `${key}: ${value}%`)
                .join(', ');
              if (factors) {
                contextData.forecasts += `\nExternal factors affecting latest forecast: ${factors}`;
              }
            }
          }
        }
      } catch (forecastError) {
        console.warn('Forecast data fetch failed:', forecastError);
      }

      // 3. Get TDMS data for comprehensive site information
      try {
        // Get available sites and latest dashboard data
        const [sitesResponse, dashboardResponse] = await Promise.all([
          fetch('http://localhost:8000/api/tdms/sites'),
          fetch('http://localhost:8000/api/tdms/dashboard/' + new Date().toISOString().split('T')[0])
        ]);

        if (sitesResponse.ok) {
          const sitesData = await sitesResponse.json();
          if (sitesData.sites && sitesData.sites.length > 0) {
            contextData.tdmsData = `\n\nAvailable tourism sites (${sitesData.sites.length}): ${sitesData.sites.slice(0, 15).join(', ')}${sitesData.sites.length > 15 ? '...' : ''}`;

            // If user mentions a specific site, get detailed data
            const mentionedSite = sitesData.sites.find(site => {
              const siteLower = site.toLowerCase();
              const messageLower = message.toLowerCase();

              // Check for exact match or partial match
              if (messageLower.includes(siteLower)) return true;

              // Check for common variations/shortcuts
              const siteVariations = {
                'sigiriya': 'sigiriya rock & museum',
                'galle': 'galle fort',
                'kandy': 'temple of the tooth (kandy)',
                'polonnaruwa': 'polonnaruwa (gal viharaya & ruins)',
                'sinharaja': 'sinharaja conservation forest',
                'udawalawe': 'udawalawe national park',
                'wilpattu': 'wilpattu national park',
                'yala': 'yala national park',
                'knuckles': 'knuckles conservation forest',
                'horton plains': 'horton plains (world\'s end)',
                'jaffna': 'jaffna fort',
                'dambulla': 'dambulla cave temple',
                'adams peak': 'adam\'s peak (sri pada)',
                'mirissa': 'mirissa (whale watching)',
                'kaudulla': 'kaudulla national park'
              };

              // Check if message contains any variation
              for (const [variation, fullName] of Object.entries(siteVariations)) {
                if (messageLower.includes(variation) && siteLower === fullName.toLowerCase()) {
                  return true;
                }
              }

              return false;
            });

            if (mentionedSite) {
              try {
                const [siteResponse, monthlyResponse, trendResponse] = await Promise.all([
                  fetch(`http://localhost:8000/api/tdms/site/${encodeURIComponent(mentionedSite)}`),
                  fetch(`http://localhost:8000/api/tdms/monthly/${mentionedSite}/${new Date().getFullYear()}`),
                  fetch(`http://localhost:8000/api/tdms/weekly-trend/${encodeURIComponent(mentionedSite)}`)
                ]);

                if (siteResponse.ok) {
                  const siteInfo = await siteResponse.json();
                  if (siteInfo.data && siteInfo.data.length > 0) {
                    // Check if user is asking for a specific month
                    const monthNames = ['january', 'february', 'march', 'april', 'may', 'june',
                      'july', 'august', 'september', 'october', 'november', 'december'];
                    const mentionedMonth = monthNames.find(month =>
                      message.toLowerCase().includes(month)
                    );

                    let targetYear = new Date().getFullYear();
                    const yearMatch = message.match(/\b(20\d{2})\b/);
                    if (yearMatch) {
                      targetYear = parseInt(yearMatch[1]);
                    }

                    // Check if we have data for the requested year, if not suggest available years
                    const availableYears = [...new Set(siteInfo.data.map(item => new Date(item.date).getFullYear()))];
                    if (!availableYears.includes(targetYear)) {
                      contextData.tdmsData += `\n\nNote: Data for ${targetYear} is not available. Available years: ${availableYears.join(', ')}. Showing data for ${availableYears[0]} instead:`;
                      targetYear = availableYears[0];
                    }

                    if (mentionedMonth) {
                      // Find data for the specific month and year
                      const monthIndex = monthNames.indexOf(mentionedMonth);
                      const monthData = siteInfo.data.filter(item => {
                        const itemDate = new Date(item.date);
                        return itemDate.getMonth() === monthIndex && itemDate.getFullYear() === targetYear;
                      });

                      if (monthData.length > 0) {
                        const avgVisitors = Math.round(monthData.reduce((sum, item) => sum + item.predicted_total_visitors, 0) / monthData.length);
                        const avgVLI = (monthData.reduce((sum, item) => sum + item.vli_score, 0) / monthData.length).toFixed(1);
                        contextData.tdmsData += `\n\n${mentionedSite} - ${mentionedMonth.charAt(0).toUpperCase() + mentionedMonth.slice(1)} ${targetYear}:\n- Average predicted visitors: ${avgVisitors} per day\n- Average VLI score: ${avgVLI}\n- Statistical capacity: ${monthData[0].statistical_capacity}\n- Data points: ${monthData.length} days`;
                      } else {
                        // Try to get the closest available month
                        const sortedData = siteInfo.data.sort((a, b) => new Date(a.date) - new Date(b.date));
                        const closestDate = sortedData.find(item => {
                          const itemDate = new Date(item.date);
                          return itemDate.getMonth() === monthIndex;
                        });

                        if (closestDate) {
                          contextData.tdmsData += `\n\n${mentionedSite} - ${mentionedMonth.charAt(0).toUpperCase() + mentionedMonth.slice(1)} (closest available data):\n- Predicted visitors: ${closestDate.predicted_total_visitors} (date: ${closestDate.date})\n- VLI score: ${closestDate.vli_score}\n- Statistical capacity: ${closestDate.statistical_capacity}`;
                        }
                      }
                    } else {
                      // Show latest data and recent trends
                      const latestData = siteInfo.data[siteInfo.data.length - 1];
                      const recentData = siteInfo.data.slice(-7); // Last 7 days
                      const avgRecentVisitors = Math.round(recentData.reduce((sum, item) => sum + item.predicted_total_visitors, 0) / recentData.length);

                      contextData.tdmsData += `\n\nDetailed data for ${mentionedSite}:\n- Latest predicted visitors: ${latestData.predicted_total_visitors} (${latestData.date})\n- 7-day average: ${avgRecentVisitors} visitors\n- Latest VLI score: ${latestData.vli_score}\n- Statistical capacity: ${latestData.statistical_capacity}`;
                    }
                  }
                }

                if (monthlyResponse.ok) {
                  const monthlyInfo = await monthlyResponse.json();
                  if (monthlyInfo.monthly_data && monthlyInfo.monthly_data.length > 0) {
                    const latestMonthly = monthlyInfo.monthly_data[monthlyInfo.monthly_data.length - 1];
                    contextData.tdmsData += `\n- Monthly trend: ${latestMonthly.predicted_total_visitors} visitors (capacity utilization: ${latestMonthly.capacity_utilization}%)`;
                  }
                }

                // Add 5-Year Trajectory data
                if (trendResponse.ok) {
                  const trendInfo = await trendResponse.json();
                  if (trendInfo.data && trendInfo.data.length > 0) {
                    const trendStart = trendInfo.data[0];
                    const trendEnd = trendInfo.data[trendInfo.data.length - 1];
                    const growthRate = ((trendEnd.predicted_total_visitors - trendStart.predicted_total_visitors) / trendStart.predicted_total_visitors * 100).toFixed(1);

                    contextData.tdmsData += `\n\n5-Year Trajectory for ${mentionedSite}:\n- Period: ${trendStart.date} to ${trendEnd.date}\n- Growth rate: ${growthRate}%\n- Starting visitors: ${trendStart.predicted_total_visitors}\n- Latest visitors: ${trendEnd.predicted_total_visitors}\n- Data points: ${trendInfo.data.length} weekly observations`;
                  }
                }
              } catch (siteError) {
                console.warn('Detailed site data fetch failed:', siteError);
              }
            }
          }
        }

        if (dashboardResponse.ok) {
          const dashboardData = await dashboardResponse.json();
          if (dashboardData.summary) {
            contextData.tdmsData += `\n\nOverall tourism system summary:\n- Total sites monitored: ${dashboardData.summary.total_sites || 'N/A'}\n- Total predicted visitors: ${dashboardData.summary.total_predicted_visitors || 'N/A'}\n- Average VLI score: ${dashboardData.summary.avg_vli_score || 'N/A'}\n- High utilization sites: ${dashboardData.summary.high_utilization_sites || 'N/A'}`;
          }

          // Add National Grid Heatmap data
          if (dashboardData.vli_scores && dashboardData.vli_scores.length > 0) {
            contextData.tdmsData += `\n\nNational Grid Heatmap (${dashboardData.vli_scores.length} sites):\n`;
            dashboardData.vli_scores.slice(0, 10).forEach(site => {
              const utilization = site.vli_score > 120 ? 'Overcrowded' :
                site.vli_score > 100 ? 'High utilization' :
                  site.vli_score > 80 ? 'Moderate utilization' : 'Low utilization';
              contextData.tdmsData += `- ${site.site}: ${Math.round(site.vli_score)}% (${site.visitors} visitors) - ${utilization}\n`;
            });

            if (dashboardData.vli_scores.length > 10) {
              contextData.tdmsData += `... and ${dashboardData.vli_scores.length - 10} more sites`;
            }
          }
        }
      } catch (tdmsError) {
        console.warn('TDMS data fetch failed:', tdmsError);
      }

      // 4. Get daily predictions for short-term forecasts
      try {
        const dailyResponse = await fetch('http://localhost:8000/api/forecasts/daily');
        if (dailyResponse.ok) {
          const dailyData = await dailyResponse.json();
          if (dailyData.baseline && dailyData.baseline.length > 0) {
            const nextWeek = dailyData.baseline.slice(0, 7);
            contextData.dailyPredictions = '\n\nDaily predictions (next 7 days):\n' +
              nextWeek.map(d => `- ${d.date}: ${d.total_forecast} forecasted arrivals`).join('\n');
          }
        }
      } catch (dailyError) {
        console.warn('Daily predictions fetch failed:', dailyError);
      }

      // Build comprehensive prompt with all context
      const prompt = `You are a helpful AI assistant specializing in tourism analytics and Sri Lanka tourism. You have access to comprehensive real-time data from the tourism analytics dashboard.

Available data sources:
- Current web search results for latest tourism information
- TDMS (Tourism Destination Management System) data with site-specific visitor predictions, VLI scores, and capacity utilization
- National Grid Heatmap showing all 15 sites with current utilization levels
- 5-Year Trajectory data for long-term growth trends
- Tourism forecasts with growth rates and external factor contributions
- Daily predictions for short-term forecasting
- Monthly trends and overall system summary

${contextData.webSearch}
${contextData.tdmsData}
${contextData.forecasts}
${contextData.dailyPredictions}

User question: ${message}

Provide a comprehensive and helpful response using the available data above. You now have access to:
1. Recent tourism forecasts with growth rates and external factors
2. Detailed site-specific information including VLI scores and capacity utilization
3. National Grid Heatmap data showing current utilization for all 15 sites
4. 5-Year Trajectory analysis for long-term growth trends
5. Overall tourism system summaries and trends
6. Daily predictions for short-term planning

Use this data to provide specific, data-driven insights. If specific data isn't available for the query, clearly state that and provide general guidance based on tourism best practices.`;

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

  const generateChatTitle = async (chatId, userMessage) => {
    if (!currentUser || !chatId) return;
    try {
      const words = userMessage.split(' ').slice(0, 6).join(' ');
      const generatedTitle = words.length > 0 ? words : userMessage.substring(0, 40);
      await authFetch(`/api/chat/${chatId}/rename`, {
        method: 'PUT',
        body: JSON.stringify({ title: generatedTitle })
      });
      await refreshChatList();
      console.log('Chat title updated:', generatedTitle);
    } catch (error) {
      console.error('Error generating chat title:', error);
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

    // Save user message to backend and get the chat ID
    let chatIdForThisMessage = currentChatId;
    if (!chatIdForThisMessage) {
      chatIdForThisMessage = await saveMessageToBackend('user', userMessage, [], currentChatId);
    } else {
      await saveMessageToBackend('user', userMessage, [], chatIdForThisMessage);
    }

    setIsLoading(true);

    try {
      // Call backend Gemini API directly
      const response = await authFetch('/api/chat/ask', {
        method: 'POST',
        body: JSON.stringify({ 
          message: userMessage,
          chat_id: chatIdForThisMessage
        })
      });

      setMessages(prev => [...prev, { text: response.response, sender: 'bot', sources: response.sources || [] }]);

      // Update current chat ID if this was a new chat
      if (!currentChatId && response.chat_id) {
        setCurrentChatId(response.chat_id);
        await refreshChatList(currentUser, true);
      }

      if (firstMessageData?.chatId === chatIdForThisMessage) {
        generateChatTitle(chatIdForThisMessage, userMessage);
        setFirstMessageData(null);
      }

      setIsLoading(false);
    } catch (error) {
      console.error('Error sending message:', error);

      // Fallback response
      const fallbackResponse = "I apologize, but I'm having trouble connecting to the AI service. Please try again later.";
      setMessages(prev => [...prev, { text: fallbackResponse, sender: 'bot', sources: [] }]);

      if (chatIdForThisMessage) {
        await saveMessageToBackend('assistant', fallbackResponse, [], chatIdForThisMessage);
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
      await authFetch(`/api/chat/${chatId}`, { method: 'DELETE' });
      if (currentChatId === chatId) {
        setMessages([]);
        setCurrentChatId(null);
      }
      await refreshChatList();
      console.log('Chat deleted successfully');
    } catch (error) {
      console.error('Error deleting chat:', error);
    }
  };

  const handleRenameChat = async (chatId, newTitle) => {
    if (!currentUser) return;
    try {
      await authFetch(`/api/chat/${chatId}/rename`, {
        method: 'PUT',
        body: JSON.stringify({ title: newTitle })
      });
      await refreshChatList();
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
      {/* Auth Warning */}
      {authWarning && (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mx-4 mt-4">
          <p className="text-sm text-yellow-700">
            Please log in to save and view your chat history.
          </p>
        </div>
      )}

      {/* Main Content - Full Width Chat */}
      <div className="flex-1 flex flex-col overflow-hidden relative">
        {/* Floating Chat History Toggle Button */}
        <button
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="fixed left-4 top-20 z-40 bg-blue-600 text-white p-3 rounded-lg shadow-lg hover:bg-blue-700 transition-all duration-200"
          title="Toggle chat history"
        >
          <History className="h-5 w-5" />
        </button>

        {/* Chat Window */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Messages Area */}
          <div
            className="flex-1 overflow-y-auto py-2 px-4"
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
              <div className="space-y-2">
                {messages.map((message, index) => (
                  <div
                    key={index}
                    className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`px-3 py-2 rounded-lg break-words ${message.sender === 'user'
                        ? 'bg-blue-600 text-white max-w-[75%] md:max-w-[75%] lg:max-w-[75%]'
                        : 'bg-white text-gray-800 border border-gray-200 shadow-sm max-w-[90%] md:max-w-[75%] lg:max-w-[75%]'
                        }`}
                    >
                      {message.sender === 'user' ? (
                        <div className="text-sm leading-relaxed">{message.text}</div>
                      ) : (
                        <div className="prose prose-sm max-w-none">
                          <ReactMarkdown
                            remarkPlugins={[remarkGfm]}
                            rehypePlugins={[rehypeRaw]}
                            components={{
                              strong: ({ node, ...props }) => <strong className="font-bold text-gray-900" {...props} />,
                              em: ({ node, ...props }) => <em className="italic text-gray-700" {...props} />,
                              p: ({ node, ...props }) => <p className="mb-3 leading-relaxed text-sm" {...props} />,
                              ul: ({ node, ...props }) => <ul className="list-disc ml-6 mb-3 space-y-1" {...props} />,
                              ol: ({ node, ...props }) => <ol className="list-decimal ml-6 mb-3 space-y-1" {...props} />,
                              li: ({ node, ...props }) => <li className="mb-1 text-sm" {...props} />,
                              h1: ({ node, ...props }) => <h1 className="text-lg font-bold mb-2 text-gray-900" {...props} />,
                              h2: ({ node, ...props }) => <h2 className="text-base font-bold mb-2 text-gray-900" {...props} />,
                              h3: ({ node, ...props }) => <h3 className="text-sm font-bold mb-1 text-gray-900" {...props} />,
                              code: ({ node, inline, ...props }) => (
                                inline
                                  ? <code className="bg-gray-200 px-1 py-0.5 rounded text-xs font-mono" {...props} />
                                  : <pre className="bg-gray-100 p-3 rounded text-xs font-mono overflow-x-auto mt-2" {...props} />
                              ),
                              blockquote: ({ node, ...props }) => <blockquote className="border-l-4 border-gray-300 pl-4 italic text-gray-600 my-2" {...props} />,
                            }}
                          >
                            {message.text}
                          </ReactMarkdown>
                        </div>
                      )}
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
          <div className="flex space-x-2 pt-2 pb-2 border-t border-gray-200 px-4 bg-white">
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
              placeholder="Type your message..."
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              disabled={isLoading || !currentUser}
            />
            <Button
              onClick={handleSendMessage}
              disabled={isLoading || !inputMessage.trim() || !currentUser}
              className="px-3 py-2 bg-blue-600 hover:bg-blue-700"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Chat History Sidebar - Floating */}
      <ChatHistorySidebar
        chats={chats}
        currentChatId={currentChatId}
        onSelectChat={(chatId) => {
          loadChat(chatId);
          setIsSidebarOpen(false);
        }}
        onNewChat={handleNewChat}
        onDeleteChat={handleDeleteChat}
        onRenameChat={handleRenameChat}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />
    </div>
  );
}

export default ChatbotTab;
