import React, { useState, useEffect, useRef } from 'react';
import { Button } from './ui/button';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import OverviewTab from './OverviewTab';
import MonthlyPredictionsComponent from './MonthlyPredictionsComponent';
import DailyPredictionsComponent from './DailyPredictionsComponent';
import TDMSComponent from './TDMSComponent';
import SourceMarketIntelligence from './SourceMarketIntelligence';
import ChatbotTab from '../ChatbotTab';
import RevenueDashboard from '../pages/RevenueDashboard';
import {
  BarChart3,
  Calendar,
  CalendarDays,
  Menu,
  X,
  User,
  MapPin,
  MessageCircle,
  ChevronDown,
  LogOut,
  Settings,
  TrendingUp,
  Wallet,
} from 'lucide-react';

function PowerBIDashboard() {

  const { userData, currentUser, logout } = React.useContext(AuthContext);
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState('overview');

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);



  // Close sidebar on Escape key

  React.useEffect(() => {

    const handleEscape = (e) => {

      if (e.key === 'Escape') {

        setIsSidebarOpen(false);

        setIsProfileDropdownOpen(false);

      }

    };

    document.addEventListener('keydown', handleEscape);

    return () => document.removeEventListener('keydown', handleEscape);

  }, []);

  // Close dropdown when clicking outside

  React.useEffect(() => {

    const handleClickOutside = (event) => {

      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {

        setIsProfileDropdownOpen(false);

      }

    };

    document.addEventListener('mousedown', handleClickOutside);

    return () => document.removeEventListener('mousedown', handleClickOutside);

  }, []);

  const handleLogout = async () => {

    try {

      await logout();

      navigate('/login');

    } catch (error) {

      console.error('Logout failed:', error);

    }

  };

  const getUserInitials = () => {

    if (!userData) return "U";

    const first = userData.firstName?.[0] || "";

    const last = userData.lastName?.[0] || "";

    return (first + last).toUpperCase() || "U";

  };



  // Handle tab click - close sidebar automatically

  const handleTabClick = (tabId) => {

    setActiveTab(tabId);

    setIsSidebarOpen(false);

  };



  const displayName = (userData?.firstName && userData?.lastName)

    ? `${userData.firstName} ${userData.lastName}`

    : (userData?.firstName || currentUser?.email || 'User');



  return (
    <div className="min-h-screen bg-gray-100">
      {/* Sidebar Backdrop */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/30 z-40"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Floating Sidebar Navigation */}
      <div
        className={`fixed top-4 left-4 h-[calc(100vh-2rem)] w-56 bg-white border border-gray-200 rounded-lg shadow-lg z-50 transform transition-transform duration-250 ease-out ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
      >
        <div className="p-4">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-gray-800">Navigation</h2>
            <button
              onClick={() => setIsSidebarOpen(false)}
              className="p-1 rounded-md hover:bg-gray-100 transition-colors"
              title="Close sidebar"
            >
              <X className="h-5 w-5 text-gray-500" />
            </button>
          </div>
          <nav className="space-y-1">
            {[
              { id: 'overview', label: 'Overview', icon: BarChart3 },
              { id: 'revenue', label: 'Revenue Intelligence', icon: Wallet },
              { id: 'predictions', label: 'Monthly Predictions', icon: Calendar },
              { id: 'daily-predictions', label: 'Daily Predictions', icon: CalendarDays },
              { id: 'tdms', label: 'Distribution Management', icon: MapPin },
              { id: 'source-markets', label: 'Source Markets', icon: TrendingUp },
              { id: 'chatbot', label: 'AI Assistant', icon: MessageCircle }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => handleTabClick(tab.id)}
                className={`w-full flex items-center px-4 py-3 text-sm font-medium rounded-md transition-colors ${activeTab === tab.id
                  ? 'bg-blue-50 text-blue-600'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                  }`}
              >
                <tab.icon className="h-5 w-5 mr-3" />
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Dashboard Content */}
      <div className="flex h-screen bg-gray-50">
        {/* Main Content Area */}
        <div className="flex-1 flex flex-col overflow-hidden w-full">
          {/* Integrated Navigation Bar */}
          <div className="bg-white border-b border-gray-200 px-6 py-4">
            <div className="flex items-center justify-between">
              {/* Left side - Menu button and title */}
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                  className="p-2 hover:bg-gray-100 rounded-md transition-colors"
                  aria-label="Toggle sidebar"
                  title="Toggle sidebar"
                >
                  <Menu className="h-5 w-5 text-gray-600" />
                </button>
                <h1 className="text-xl font-bold text-gray-800">Sri Lanka Tourism Analytics</h1>
              </div>

              {/* Right side - Profile */}
              <div className="flex items-center space-x-4 relative" ref={dropdownRef}>
                <button
                  onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}
                  className="flex items-center space-x-2 text-sm hover:bg-gray-100 rounded-md px-3 py-2 transition-colors"
                >
                  <span className="text-gray-600">Logged in as:</span>
                  <span className="ml-2 font-semibold text-gray-800">{displayName}</span>
                  <User className="h-4 w-4 text-gray-600" />
                  <ChevronDown className={`h-4 w-4 text-gray-600 transition-transform ${isProfileDropdownOpen ? 'rotate-180' : ''}`} />
                </button>

                {/* Profile Dropdown */}
                {isProfileDropdownOpen && (
                  <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50 overflow-hidden">
                    {/* User Summary */}
                    <div className="px-4 py-3 border-b border-gray-100">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-semibold flex-shrink-0">
                          {getUserInitials()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-gray-900 truncate">
                            {userData?.firstName || ""} {userData?.lastName || ""}
                          </div>
                          <div className="text-sm text-gray-500 truncate">
                            {currentUser?.email}
                          </div>
                          {userData?.role && (
                            <div className="mt-1">
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                                {userData.role.toUpperCase()}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Navigation Actions */}
                    <div className="py-1">
                      <Link
                        to="/profile"
                        onClick={() => setIsProfileDropdownOpen(false)}
                        className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                      >
                        <Settings className="h-4 w-4 mr-3 text-gray-400 flex-shrink-0" />
                        Account settings
                      </Link>
                    </div>

                    {/* Logout Action */}
                    <div className="border-t border-gray-100 pt-1">
                      <button
                        onClick={handleLogout}
                        className="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                      >
                        <LogOut className="h-4 w-4 mr-3 flex-shrink-0" />
                        Log out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Tab Content */}
          <div className="flex-1 overflow-auto p-6">
            {activeTab === 'overview' && <OverviewTab />}
            {activeTab === 'revenue' && <RevenueDashboard />}
            {activeTab === 'predictions' && <MonthlyPredictionsComponent />}
            {activeTab === 'daily-predictions' && <DailyPredictionsComponent />}
            {activeTab === 'tdms' && <TDMSComponent />}
            {activeTab === 'source-markets' && <SourceMarketIntelligence />}
            {activeTab === 'chatbot' && <div className="h-full p-0"><ChatbotTab /></div>}
          </div>
        </div>
      </div>
    </div>
  );

}

export default PowerBIDashboard;
