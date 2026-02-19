import React, { createContext, useContext, useState, useEffect } from "react";
import { auth, googleProvider } from "../firebase";
import {
    signOut,
    onAuthStateChanged,
    sendPasswordResetEmail,
    signInWithPopup,
    signInWithCustomToken
} from "firebase/auth";

const API_BASE = "http://localhost:8000";

export const AuthContext = createContext();

export function useAuth() {
    return useContext(AuthContext);
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
        // 1. Backend creates the user + Firestore profile, returns custom token
        const res = await fetch(`${API_BASE}/api/auth/signup`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                email,
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
        const result = await signInWithEmailAndPassword(auth, email, password);
        return result;
    }

    async function googleSignIn() {
        // 1. Firebase client-side popup (no change needed here)
        const result = await signInWithPopup(auth, googleProvider);
        const idToken = await result.user.getIdToken();

        // 2. Backend ensures Firestore profile exists
        await fetch(`${API_BASE}/api/auth/google`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ idToken })
        });

        return result;
    }

    function logout() {
        setUserData(null);
        return signOut(auth);
    }

    function resetPassword(email) {
        return sendPasswordResetEmail(auth, email);
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
            setCurrentUser(user);

            if (user) {
                try {
                    const token = await user.getIdToken();
                    const res = await fetch(`${API_BASE}/api/auth/me`, {
                        headers: { Authorization: `Bearer ${token}` }
                    });
                    if (res.ok) {
                        const profile = await res.json();
                        // eslint-disable-next-line no-unused-vars
                        const { uid, ...profileData } = profile;
                        setUserData(profileData);
                    } else {
                        setUserData(null);
                    }
                } catch (err) {
                    console.error("Failed to fetch user profile:", err);
                    setUserData(null);
                }
            } else {
                setUserData(null);
            }

            setLoading(false);
        });

        return unsubscribe;
    }, []);

    const value = {
        currentUser,
        userData,
        signup,
        login,
        googleSignIn,
        logout,
        resetPassword,
        updateProfile,
        deleteAccount
    };

    return (
        <AuthContext.Provider value={value}>
            {!loading && children}
        </AuthContext.Provider>
    );
}
