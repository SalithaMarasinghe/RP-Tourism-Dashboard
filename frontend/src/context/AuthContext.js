import React, { createContext, useContext, useState, useEffect } from "react";
import { auth, googleProvider } from "../firebase";
import {
    signOut,
    onAuthStateChanged,
    sendPasswordResetEmail,
    signInWithPopup,
    signInWithCustomToken
} from "firebase/auth";

const API_BASE = process.env.REACT_APP_API_URL || "http://localhost:8000";

export const AuthContext = createContext();

export function useAuth() {
    return useContext(AuthContext);
}

function normalizeEmail(email) {
    // Remove hidden whitespace characters and normalize casing.
    return String(email || "")
        .replace(/[\u200B-\u200D\uFEFF]/g, "")
        .trim()
        .toLowerCase();
}

function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// Helper: get Firebase ID token from current user
async function getIdToken() {
    const user = auth.currentUser;
    if (!user) throw new Error("Not authenticated");
    return user.getIdToken();
}

// Helper: authenticated fetch to backend
async function apiFetch(path, options = {}) {
    const token = await getIdToken();
    const res = await fetch(`${API_BASE}${path}`, {
        ...options,
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
            ...(options.headers || {})
        }
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || "Request failed");
    return data;
}

export function AuthProvider({ children }) {
    const [currentUser, setCurrentUser] = useState(null);
    const [userData, setUserData] = useState(null);
    const [loading, setLoading] = useState(true);

    // ---------- Auth functions ----------

    async function signup(email, password, additionalData) {
        const normalizedEmail = normalizeEmail(email);
        if (!isValidEmail(normalizedEmail)) {
            throw new Error("Invalid email format");
        }
        // 1. Backend creates the user + Firestore profile, returns custom token
        const res = await fetch(`${API_BASE}/api/auth/signup`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                email: normalizedEmail,
                password,
                firstName: additionalData.firstName,
                lastName: additionalData.lastName
            })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || "Signup failed");

        // 2. Sign in locally with the custom token
        return signInWithCustomToken(auth, data.customToken);
    }

    async function login(email, password) {
        // Import signInWithEmailAndPassword only for login — Firebase Auth handles
        // credential validation; we keep this direct for simplicity since we are not
        // storing passwords on the backend.
        const { signInWithEmailAndPassword } = await import("firebase/auth");
        const normalizedEmail = normalizeEmail(email);
        if (!isValidEmail(normalizedEmail)) {
            throw new Error("Invalid email format");
        }
        const result = await signInWithEmailAndPassword(auth, normalizedEmail, password);
        return result;
    }

    async function googleSignIn() {
        try {
            // 1. Firebase client-side popup with error handling
            console.log("[Auth] Starting Google Sign-In popup...");
            
            let result;
            try {
                result = await signInWithPopup(auth, googleProvider);
                console.log("[Auth] Popup successful, user:", result.user.email);
            } catch (popupError) {
                // Handle specific popup errors
                if (popupError.code === 'auth/popup-closed-by-user') {
                    console.warn("[Auth] User closed the popup");
                    throw new Error("Sign-in cancelled. Please try again.");
                } else if (popupError.code === 'auth/popup-blocked') {
                    console.warn("[Auth] Popup was blocked by browser");
                    throw new Error("Popup blocked. Please allow popups for this site.");
                } else if (popupError.code === 'auth/cancelled-popup-request') {
                    console.warn("[Auth] Popup request was cancelled");
                    throw new Error("Sign-in cancelled. Please try again.");
                } else {
                    console.error("[Auth] Popup error:", popupError.code, popupError.message);
                    throw popupError;
                }
            }

            // 2. Get ID token
            console.log("[Auth] Getting ID token...");
            const idToken = await result.user.getIdToken();

            // 3. Backend ensures Firestore profile exists
            console.log("[Auth] Syncing user profile with backend...");
            const response = await fetch(`${API_BASE}/api/auth/google`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ idToken })
            });

            if (!response.ok) {
                const errorData = await response.json();
                console.error("[Auth] Backend sync failed:", errorData);
                throw new Error(errorData.detail || "Failed to sync user profile");
            }

            console.log("[Auth] Google Sign-In completed successfully");
            return result;
            
        } catch (error) {
            console.error("[Auth] Google Sign-In error:", error.message);
            throw error;
        }
    }

    function logout() {
        setUserData(null);
        return signOut(auth);
    }

    function resetPassword(email) {
        const normalizedEmail = normalizeEmail(email);
        if (!isValidEmail(normalizedEmail)) {
            throw new Error("Invalid email format");
        }
        return sendPasswordResetEmail(auth, normalizedEmail);
    }

    async function changePassword(currentPassword, newPassword) {
        // First, reauthenticate user with current password
        const { EmailAuthProvider, reauthenticateWithCredential, updatePassword } = await import("firebase/auth");
        const user = auth.currentUser;

        if (!user) {
            throw new Error("No authenticated user found");
        }

        // Create credential for reauthentication
        const credential = EmailAuthProvider.credential(user.email, currentPassword);

        try {
            // Reauthenticate user
            await reauthenticateWithCredential(user, credential);

            // Update password
            await updatePassword(user, newPassword);

            return { success: true };
        } catch (error) {
            console.error("Password change error:", error);
            if (error.code === 'auth/wrong-password') {
                throw new Error("Current password is incorrect");
            } else if (error.code === 'auth/weak-password') {
                throw new Error("New password is too weak");
            } else {
                throw new Error("Failed to update password: " + error.message);
            }
        }
    }

    async function updateProfile(data) {
        const updated = await apiFetch("/api/auth/profile", {
            method: "PUT",
            body: JSON.stringify(data)
        });
        // Update local state
        setUserData(prev => ({ ...prev, ...data }));
        return updated;
    }

    async function deleteAccount() {
        await apiFetch("/api/auth/profile", { method: "DELETE" });
        // Firebase auth session will be invalidated; sign out locally
        await signOut(auth);
    }

    // ---------- Auth state listener ----------

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            try {
                if (user) {
                    console.log("[Auth] User signed in:", user.email);
                    setCurrentUser(user);

                    try {
                        const token = await user.getIdToken();
                        const res = await fetch(`${API_BASE}/api/auth/me`, {
                            headers: { Authorization: `Bearer ${token}` }
                        });
                        if (res.ok) {
                            const profile = await res.json();
                            console.log("[Auth] User profile loaded:", profile.email);
                            // eslint-disable-next-line no-unused-vars
                            const { uid, ...profileData } = profile;
                            setUserData(profileData);
                        } else {
                            console.warn("[Auth] Failed to fetch profile, status:", res.status);
                            setUserData(null);
                        }
                    } catch (err) {
                        console.error("[Auth] Failed to fetch user profile:", err);
                        setUserData(null);
                    }
                } else {
                    console.log("[Auth] User signed out");
                    setCurrentUser(null);
                    setUserData(null);
                }
            } finally {
                setLoading(false);
            }
        });

        return unsubscribe;
    }, []);

    const value = {
        currentUser,
        userData,
        loading,
        signup,
        login,
        googleSignIn,
        logout,
        resetPassword,
        changePassword,
        updateProfile,
        deleteAccount
    };

    return (
        <AuthContext.Provider value={value}>
            {!loading && children}
        </AuthContext.Provider>
    );
}
