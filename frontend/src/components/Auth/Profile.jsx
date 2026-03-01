import React, { useRef, useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import { Link, useNavigate } from "react-router-dom";
import { User, Edit, Lock, AlertTriangle, ChevronRight, X } from 'lucide-react';

export default function Profile() {
    const { currentUser, userData, logout, updateProfile, deleteAccount, changePassword } = useAuth();
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const [loading, setLoading] = useState(false);
    const [activeSection, setActiveSection] = useState("account");
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [deleteConfirmText, setDeleteConfirmText] = useState("");
    const navigate = useNavigate();

    // Edit profile state
    const [editFirstName, setEditFirstName] = useState("");
    const [editLastName, setEditLastName] = useState("");
    const [securityData, setSecurityData] = useState({
        currentPassword: "",
        newPassword: "",
        confirmPassword: ""
    });

    const firstNameRef = useRef();
    const lastNameRef = useRef();

    useEffect(() => {
        if (userData) {
            setEditFirstName(userData.firstName || "");
            setEditLastName(userData.lastName || "");
        }
    }, [userData]);

    async function handleLogout() {
        setError("");
        try {
            await logout();
            navigate("/login");
        } catch {
            setError("Failed to log out");
        }
    }

    async function handleUpdateProfile(e) {
        e.preventDefault();
        setLoading(true);
        setError("");
        setSuccess("");

        try {
            await updateProfile({
                firstName: editFirstName.trim(),
                lastName: editLastName.trim()
            });
            setSuccess("Profile updated successfully!");
        } catch (err) {
            console.error(err);
            setError("Failed to update profile");
        }

        setLoading(false);
    }

    async function handleUpdatePassword(e) {
        e.preventDefault();
        setError("");
        setSuccess("");

        if (securityData.newPassword !== securityData.confirmPassword) {
            setError("New passwords do not match");
            return;
        }

        if (securityData.newPassword.length < 6) {
            setError("Password must be at least 6 characters");
            return;
        }

        setLoading(true);
        try {
            await changePassword(securityData.currentPassword, securityData.newPassword);
            setSuccess("Password updated successfully!");
            setSecurityData({ currentPassword: "", newPassword: "", confirmPassword: "" });
        } catch (err) {
            console.error(err);
            setError(err.message || "Failed to update password");
        }

        setLoading(false);
    }

    async function handleDelete() {
        if (deleteConfirmText !== "DELETE") {
            setError("Please type DELETE to confirm");
            return;
        }

        try {
            setError("");
            setLoading(true);
            await deleteAccount();
            navigate("/signup");
        } catch (err) {
            console.error(err);
            setError("Failed to delete account: " + err.message);
            setLoading(false);
        }
    }

    const getUserInitials = () => {
        if (!userData) return "U";
        const first = userData.firstName?.[0] || "";
        const last = userData.lastName?.[0] || "";
        return (first + last).toUpperCase() || "U";
    };

    const getMemberSince = () => {
        if (!currentUser?.metadata?.creationTime) return "Unknown";
        return new Date(currentUser.metadata.creationTime).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long'
        });
    };

    const getPasswordStrength = (password) => {
        if (!password) return { strength: 0, color: 'bg-gray-300', text: '' };
        if (password.length < 6) return { strength: 1, color: 'bg-red-500', text: 'Weak' };
        if (password.length < 10) return { strength: 2, color: 'bg-yellow-500', text: 'Fair' };
        if (password.length < 12) return { strength: 3, color: 'bg-blue-500', text: 'Good' };
        return { strength: 4, color: 'bg-green-500', text: 'Strong' };
    };

    const sidebarItems = [
        { id: 'account', label: 'Account', icon: User, description: 'Name, email, role' },
        { id: 'profile', label: 'Edit Profile', icon: Edit, description: 'Editable name field' },
        { id: 'security', label: 'Security', icon: Lock, description: 'Password change' },
        { id: 'danger', label: 'Danger Zone', icon: AlertTriangle, description: 'Delete account' }
    ];

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="flex h-screen">
                {/* Left Sidebar */}
                <div className="w-60 bg-gray-100 border-r border-gray-200 flex-shrink-0">
                    <div className="p-6">
                        <h2 className="text-lg font-semibold text-gray-900 mb-6">Settings</h2>
                        <nav className="space-y-1">
                            {sidebarItems.map((item) => {
                                const Icon = item.icon;
                                return (
                                    <button
                                        key={item.id}
                                        onClick={() => setActiveSection(item.id)}
                                        className={`w-full flex items-center px-3 py-2 text-sm rounded-lg transition-colors ${
                                            activeSection === item.id
                                                ? 'bg-white text-blue-600 border-l-4 border-blue-600 shadow-sm'
                                                : 'text-gray-700 hover:bg-gray-200'
                                        }`}
                                    >
                                        <Icon className="h-4 w-4 mr-3 flex-shrink-0" />
                                        <div className="text-left">
                                            <div className="font-medium">{item.label}</div>
                                            <div className="text-xs text-gray-500">{item.description}</div>
                                        </div>
                                    </button>
                                );
                            })}
                        </nav>
                    </div>
                </div>

                {/* Right Content Panel */}
                <div className="flex-1 overflow-auto">
                    <div className="p-8">
                        {/* Header */}
                        <div className="flex justify-between items-center mb-8">
                            <div>
                                <h1 className="text-2xl font-bold text-gray-900">
                                    {sidebarItems.find(item => item.id === activeSection)?.label}
                                </h1>
                                <p className="text-gray-500 mt-1">
                                    {sidebarItems.find(item => item.id === activeSection)?.description}
                                </p>
                            </div>
                            <Link to="/" className="text-blue-600 hover:text-blue-800 font-medium flex items-center">
                                Back to Dashboard
                                <ChevronRight className="h-4 w-4 ml-1" />
                            </Link>
                        </div>

                        {/* Error/Success Messages */}
                        {error && (
                            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
                                {error}
                            </div>
                        )}
                        {success && (
                            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg mb-6">
                                {success}
                            </div>
                        )}

                        {/* Account Section */}
                        {activeSection === 'account' && (
                            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
                                <div className="text-center">
                                    {/* Avatar */}
                                    <div className="w-24 h-24 bg-blue-600 rounded-full flex items-center justify-center text-white text-3xl font-bold mx-auto mb-4">
                                        {getUserInitials()}
                                    </div>
                                    
                                    {/* Name */}
                                    <h3 className="text-2xl font-bold text-gray-900 mb-2">
                                        {userData?.firstName || ""} {userData?.lastName || ""}
                                    </h3>
                                    
                                    {/* Email */}
                                    <p className="text-gray-600 mb-4">{currentUser?.email}</p>
                                    
                                    {/* Role Badge */}
                                    <div className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 mb-4">
                                        {userData?.role || "USER"}
                                    </div>
                                    
                                    {/* Member Since */}
                                    <div className="text-sm text-gray-500">
                                        Member since {getMemberSince()}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Edit Profile Section */}
                        {activeSection === 'profile' && (
                            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
                                <h3 className="text-xl font-semibold text-gray-900 mb-6 pb-4 border-b">Edit Profile</h3>
                                <form onSubmit={handleUpdateProfile} className="space-y-6">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                First Name
                                            </label>
                                            <input
                                                type="text"
                                                value={editFirstName}
                                                onChange={(e) => setEditFirstName(e.target.value)}
                                                ref={firstNameRef}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                                placeholder="Enter your first name"
                                                required
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                Last Name
                                            </label>
                                            <input
                                                type="text"
                                                value={editLastName}
                                                onChange={(e) => setEditLastName(e.target.value)}
                                                ref={lastNameRef}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                                placeholder="Enter your last name"
                                                required
                                            />
                                        </div>
                                    </div>
                                    
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Email
                                        </label>
                                        <div className="px-3 py-2 bg-gray-100 border border-gray-300 rounded-lg text-gray-600">
                                            {currentUser?.email}
                                        </div>
                                        <p className="text-xs text-gray-500 mt-1">Contact admin to change email</p>
                                    </div>
                                    
                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors disabled:opacity-50"
                                    >
                                        {loading ? 'Saving...' : 'Save Changes'}
                                    </button>
                                </form>
                            </div>
                        )}

                        {/* Security Section */}
                        {activeSection === 'security' && (
                            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
                                <h3 className="text-xl font-semibold text-gray-900 mb-6 pb-4 border-b">Security</h3>
                                <form onSubmit={handleUpdatePassword} className="space-y-6">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Current Password
                                        </label>
                                        <input
                                            type="password"
                                            value={securityData.currentPassword}
                                            onChange={(e) => setSecurityData({...securityData, currentPassword: e.target.value})}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                            required
                                        />
                                    </div>
                                    
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            New Password
                                        </label>
                                        <input
                                            type="password"
                                            value={securityData.newPassword}
                                            onChange={(e) => setSecurityData({...securityData, newPassword: e.target.value})}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                            required
                                        />
                                        {securityData.newPassword && (
                                            <div className="mt-2 flex items-center space-x-2">
                                                <div className="flex-1 bg-gray-200 rounded-full h-2">
                                                    <div 
                                                        className={`h-2 rounded-full transition-all ${getPasswordStrength(securityData.newPassword).color}`}
                                                        style={{ width: `${(getPasswordStrength(securityData.newPassword).strength / 4) * 100}%` }}
                                                    />
                                                </div>
                                                <span className="text-xs text-gray-600">
                                                    {getPasswordStrength(securityData.newPassword).text}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                    
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Confirm New Password
                                        </label>
                                        <input
                                            type="password"
                                            value={securityData.confirmPassword}
                                            onChange={(e) => setSecurityData({...securityData, confirmPassword: e.target.value})}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                            required
                                        />
                                    </div>
                                    
                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors disabled:opacity-50"
                                    >
                                        {loading ? 'Updating...' : 'Update Password'}
                                    </button>
                                </form>
                            </div>
                        )}

                        {/* Danger Zone Section */}
                        {activeSection === 'danger' && (
                            <div className="bg-white rounded-xl border border-red-200 shadow-sm p-6">
                                <h3 className="text-xl font-semibold text-red-600 mb-2">Delete My Account</h3>
                                <p className="text-gray-600 mb-6">
                                    This action is permanent and cannot be undone. All your data will be deleted.
                                </p>
                                <button
                                    onClick={() => setShowDeleteModal(true)}
                                    className="border border-red-600 text-red-600 hover:bg-red-50 font-medium py-2 px-4 rounded-lg transition-colors"
                                >
                                    Delete Account
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Delete Account Modal */}
            {showDeleteModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-semibold text-gray-900">Are you sure?</h3>
                            <button
                                onClick={() => {
                                    setShowDeleteModal(false);
                                    setDeleteConfirmText("");
                                    setError("");
                                }}
                                className="text-gray-400 hover:text-gray-600"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>
                        
                        <p className="text-gray-600 mb-4">
                            Type DELETE to confirm account deletion
                        </p>
                        
                        <input
                            type="text"
                            value={deleteConfirmText}
                            onChange={(e) => setDeleteConfirmText(e.target.value)}
                            placeholder="Type DELETE"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 mb-4"
                        />
                        
                        <div className="flex space-x-3">
                            <button
                                onClick={() => {
                                    setShowDeleteModal(false);
                                    setDeleteConfirmText("");
                                    setError("");
                                }}
                                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleDelete}
                                disabled={deleteConfirmText !== "DELETE" || loading}
                                className="flex-1 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {loading ? 'Deleting...' : 'Confirm Delete'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
