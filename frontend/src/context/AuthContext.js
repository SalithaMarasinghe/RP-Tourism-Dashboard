import React, { createContext, useContext, useState, useEffect } from "react";
import { auth, db, googleProvider } from "../firebase";
import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged,
    sendPasswordResetEmail,
    deleteUser,
    updatePassword,
    updateEmail,
    signInWithPopup
} from "firebase/auth";
import { doc, setDoc, getDoc, updateDoc, deleteDoc } from "firebase/firestore";

export const AuthContext = createContext();

export function useAuth() {
    return useContext(AuthContext);
}

export function AuthProvider({ children }) {
    const [currentUser, setCurrentUser] = useState(null);
    const [userData, setUserData] = useState(null);
    const [loading, setLoading] = useState(true);

    async function signup(email, password, additionalData) {
        const result = await createUserWithEmailAndPassword(auth, email, password);
        const user = result.user;

        // Create user document in Firestore
        await setDoc(doc(db, "users", user.uid), {
            email: user.email,
            firstName: additionalData.firstName,
            lastName: additionalData.lastName,
            createdAt: new Date().toISOString(),
            role: 'user' // Default role
        });

        return result;
    }

    function login(email, password) {
        return signInWithEmailAndPassword(auth, email, password);
    }

    async function googleSignIn() {
        try {
            const result = await signInWithPopup(auth, googleProvider);
            const user = result.user;

            // Check if user document exists
            const docRef = doc(db, "users", user.uid);
            const docSnap = await getDoc(docRef);

            if (!docSnap.exists()) {
                // Determine names from display name
                const displayName = user.displayName || "";
                const nameParts = displayName.split(" ");
                const firstName = nameParts[0] || "User";
                const lastName = nameParts.length > 1 ? nameParts.slice(1).join(" ") : "";

                // Create new user document
                await setDoc(doc(db, "users", user.uid), {
                    email: user.email,
                    firstName: firstName,
                    lastName: lastName,
                    createdAt: new Date().toISOString(),
                    role: 'user'
                });
            }

            return result;
        } catch (error) {
            throw error;
        }
    }

    function logout() {
        setUserData(null);
        return signOut(auth);
    }

    function resetPassword(email) {
        return sendPasswordResetEmail(auth, email);
    }

    function updateUserEmail(email) {
        return updateEmail(currentUser, email);
    }

    function updateUserPassword(password) {
        return updatePassword(currentUser, password);
    }

    async function updateProfile(data) {
        if (!currentUser) return;

        const userRef = doc(db, "users", currentUser.uid);
        await updateDoc(userRef, data);

        // Update local state
        setUserData(prev => ({ ...prev, ...data }));
    }

    async function deleteAccount() {
        if (!currentUser) return;

        const uid = currentUser.uid;

        // Delete from Firestore
        await deleteDoc(doc(db, "users", uid));

        // Delete from Auth
        await deleteUser(currentUser);
    }

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            setCurrentUser(user);

            if (user) {
                // Fetch user data from Firestore
                const docRef = doc(db, "users", user.uid);
                const docSnap = await getDoc(docRef);

                if (docSnap.exists()) {
                    setUserData(docSnap.data());
                } else {
                    console.log("No user profile found in Firestore");
                    // Optionally create one if it's missing (e.g. legacy users)
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
        updateUserEmail,
        updateUserPassword,
        updateProfile,
        deleteAccount
    };

    return (
        <AuthContext.Provider value={value}>
            {!loading && children}
        </AuthContext.Provider>
    );
}
