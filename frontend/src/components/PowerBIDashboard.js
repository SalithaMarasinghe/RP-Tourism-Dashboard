import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Link } from 'react-router-dom';
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
  MessageCircle
} from 'lucide-react';

function PowerBIDashboard() {

  const { userData, currentUser } = React.useContext(AuthContext);

  const [activeTab, setActiveTab] = useState('overview');

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);



  // Close sidebar on Escape key

  React.useEffect(() => {

    const handleEscape = (e) => {

      if (e.key === 'Escape') {

        setIsSidebarOpen(false);

      }

    };



    window.addEventListener('keydown', handleEscape);

    return () => window.removeEventListener('keydown', handleEscape);

  }, []);



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

        <div className="flex items-center justify-between px-4 py-2">

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

          <div className="flex items-center space-x-4">

            <div className="text-sm">

              <span className="text-gray-300">Logged in as:</span>

              <span className="ml-2 font-semibold">{displayName}</span>

            </div>

            <Link to="/profile">

              <Button size="sm" variant="ghost" className="text-white hover:bg-gray-700">

                <User className="h-4 w-4" />

              </Button>

            </Link>



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
