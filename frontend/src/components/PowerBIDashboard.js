import React, { useState, useEffect, useRef } from 'react';
import { Button } from './ui/button';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import OverviewTab from './OverviewTab';
import MonthlyPredictionsComponent from './MonthlyPredictionsComponent';
import DailyPredictionsComponent from './DailyPredictionsComponent';
import TDMSComponent from './TDMSComponent';
import ChatbotTab from '../ChatbotTab';
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
  Settings
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

      {/* Power BI Header */}

      <header className="bg-gray-800 text-white border-b border-gray-700">

        <div className="flex items-center justify-between px-4 py-1">

          <div className="flex items-center space-x-4">

            <button

              onClick={() => setIsSidebarOpen(!isSidebarOpen)}

              className="p-2 hover:bg-gray-700 rounded-md transition-colors"

              aria-label="Toggle sidebar"

              title="Toggle sidebar"

            >

              {isSidebarOpen ? (

                <X className="h-6 w-6" />

              ) : (

                <Menu className="h-6 w-6" />

              )}

            </button>

            <h1 className="text-xl font-bold">Sri Lanka Tourism Analytics</h1>

          </div>

          <div className="flex items-center space-x-4 relative" ref={dropdownRef}>

            <button
              onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}
              className="flex items-center space-x-2 text-sm hover:bg-gray-700 rounded-md px-3 py-2 transition-colors"
            >
              <span className="text-gray-300">Logged in as:</span>
              <span className="ml-2 font-semibold text-white">{displayName}</span>
              <User className="h-4 w-4 text-gray-300" />
              <ChevronDown className={`h-4 w-4 text-gray-300 transition-transform ${isProfileDropdownOpen ? 'rotate-180' : ''}`} />
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

      </header>



      {/* Sidebar Backdrop */}

      {isSidebarOpen && (

        <div

          className="fixed inset-0 bg-black/30 z-40"

          onClick={() => setIsSidebarOpen(false)}

          style={{ top: '60px' }}

        />

      )}



      {/* Floating Sidebar Navigation */}

      <div

        className={`fixed top-0 left-0 h-screen w-56 bg-white border-r border-gray-200 z-50 transform transition-transform duration-250 ease-out rounded-none ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}

        style={{

          boxShadow: isSidebarOpen ? '4px 0 24px rgba(0,0,0,0.15)' : 'none',

          top: '60px',

          height: 'calc(100vh - 60px)'

        }}

      >

        <div className="p-4">

          <h2 className="text-lg font-semibold text-gray-800 mb-6">Navigation</h2>

          <nav className="space-y-1">

            {[

              { id: 'overview', label: 'Overview', icon: BarChart3 },

              { id: 'predictions', label: 'Monthly Predictions', icon: Calendar },

              { id: 'daily-predictions', label: 'Daily Predictions', icon: CalendarDays },



              { id: 'tdms', label: 'Distribution Management', icon: MapPin },

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



      {/* Power BI Content Area */}

      <div className="flex h-[calc(100vh-60px)] bg-gray-50">

        {/* Main Content Area - Now Full Width */}

        <div className="flex-1 flex flex-col overflow-hidden w-full">

          {/* Tab Content */}

          <div className="flex-1 overflow-auto p-6">

            {activeTab === 'overview' && <OverviewTab />}

            {activeTab === 'predictions' && <MonthlyPredictionsComponent />}

            {activeTab === 'daily-predictions' && <DailyPredictionsComponent />}



            {activeTab === 'tdms' && <TDMSComponent />}

            {activeTab === 'chatbot' && <ChatbotTab />}

          </div>

        </div>

      </div>

    </div>

  );

}

export default PowerBIDashboard;
