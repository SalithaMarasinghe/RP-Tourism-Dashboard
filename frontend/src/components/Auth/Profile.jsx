import React, { useRef, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { Link, useNavigate } from "react-router-dom";

export default function Profile() {
    const { currentUser, userData, logout, updateProfile, deleteAccount } = useAuth();
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const navigate = useNavigate();

    const firstNameRef = useRef();
    const lastNameRef = useRef();

    async function handleLogout() {
        setError("");
        try {
            await logout();
            navigate("/login");
        } catch {
            setError("Failed to log out");
        }
    }

    async function handleUpdate(e) {
        e.preventDefault();
        setLoading(true);
        setError("");

        try {
            await updateProfile({
                firstName: firstNameRef.current.value,
                lastName: lastNameRef.current.value
            });
            setIsEditing(false);
        } catch (err) {
            console.error(err);
            setError("Failed to update profile");
        }

        setLoading(false);
    }

    async function handleDelete() {
        if (window.confirm("Are you sure you want to delete your account? This action cannot be undone.")) {
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
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
            <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-2xl">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold text-gray-800">My Profile</h2>
                    <Link to="/" className="text-emerald-600 hover:underline font-medium">
                        Back to Dashboard
                    </Link>
                </div>

                {error && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">{error}</div>}

                {isEditing ? (
                    <form onSubmit={handleUpdate}>
                        <div className="grid grid-cols-2 gap-4 mb-4">
                            <div>
                                <label className="block text-gray-700 text-sm font-bold mb-2">First Name</label>
                                <input
                                    type="text"
                                    ref={firstNameRef}
                                    defaultValue={userData?.firstName}
                                    required
                                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                />
                            </div>
                            <div>
                                <label className="block text-gray-700 text-sm font-bold mb-2">Last Name</label>
                                <input
                                    type="text"
                                    ref={lastNameRef}
                                    defaultValue={userData?.lastName}
                                    required
                                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                />
                            </div>
                        </div>
                        <div className="mb-6">
                            <label className="block text-gray-700 text-sm font-bold mb-2">Email</label>
                            <div className="px-3 py-2 bg-gray-100 rounded text-gray-600">
                                {currentUser?.email}
                            </div>
                            <p className="text-xs text-gray-500 mt-1">Email cannot be changed here.</p>
                        </div>

                        <div className="flex space-x-3">
                            <button
                                disabled={loading}
                                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 px-4 rounded-lg transition duration-200"
                                type="submit"
                            >
                                Save Changes
                            </button>
                            <button
                                type="button"
                                onClick={() => setIsEditing(false)}
                                className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded-lg transition duration-200"
                            >
                                Cancel
                            </button>
                        </div>
                    </form>
                ) : (
                    <div className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider">Details</h3>
                                <div className="mt-4 space-y-4">
                                    <div>
                                        <label className="block text-gray-700 text-sm font-semibold">Name</label>
                                        <p className="text-lg text-gray-900">{userData?.firstName || ""} {userData?.lastName || ""}</p>
                                    </div>
                                    <div>
                                        <label className="block text-gray-700 text-sm font-semibold">Email</label>
                                        <p className="text-lg text-gray-900">{currentUser?.email}</p>
                                    </div>
                                    <div>
                                        <label className="block text-gray-700 text-sm font-semibold">Role</label>
                                        <span className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full uppercase font-bold tracking-wide">
                                            {userData?.role || "USER"}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="border-t pt-6 flex flex-col md:flex-row space-y-3 md:space-y-0 md:space-x-3">
                            <button
                                onClick={() => setIsEditing(true)}
                                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded transition duration-200"
                            >
                                Edit Profile
                            </button>
                            <button
                                onClick={handleLogout}
                                className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-2 px-4 rounded transition duration-200"
                            >
                                Log Out
                            </button>
                        </div>

                        <div className="border-t pt-6">
                            <h3 className="text-red-600 font-bold mb-2">Danger Zone</h3>
                            <button
                                onClick={handleDelete}
                                className="text-red-600 hover:text-red-800 text-sm font-medium underline"
                            >
                                Delete My Account
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
