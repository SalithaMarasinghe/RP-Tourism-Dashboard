import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Login from './components/Auth/Login';
import Signup from './components/Auth/Signup';
import Profile from './components/Auth/Profile';
import ProtectedRoute from './components/Auth/ProtectedRoute';
import TDMSComponent from './components/TDMSComponent';
import MonthlyPredictionsComponent from './components/MonthlyPredictionsComponent';
import DailyPredictionsComponent from './components/DailyPredictionsComponent';
import ChatbotTab from './ChatbotTab';
import PowerBIDashboard from './components/PowerBIDashboard';
import OverviewTab from './components/OverviewTab';

const App = () => {

  return (

    <BrowserRouter>

      <AuthProvider>

        <Routes>

          <Route path="/login" element={<Login />} />

          <Route path="/signup" element={<Signup />} />

          <Route

            path="/profile"

            element={

              <ProtectedRoute>

                <Profile />

              </ProtectedRoute>

            }

          />

          <Route

            path="/"

            element={

              <ProtectedRoute>

                <PowerBIDashboard />

              </ProtectedRoute>

            }

          />

          <Route

            path="/dashboard"

            element={

              <ProtectedRoute>

                <PowerBIDashboard />

              </ProtectedRoute>

            }

          />

        </Routes>

      </AuthProvider>

    </BrowserRouter>

  );

}

export default App;
