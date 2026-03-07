import React, { useRef, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { Link, useNavigate } from "react-router-dom";
import "./AuthStyles.css";

export default function Login() {
    const emailRef = useRef();
    const passwordRef = useRef();
    const { login, googleSignIn } = useAuth();
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    async function handleSubmit(e) {
        e.preventDefault();

        try {
            setError("");
            setLoading(true);
            await login(emailRef.current.value, passwordRef.current.value);
            navigate("/dashboard");
        } catch (err) {
            console.error(err);
            setError("Failed to log in: " + err.message);
        }

        setLoading(false);
    }

    async function handleGoogleSignIn() {
        try {
            setError("");
            setLoading(true);
            await googleSignIn();
            navigate("/dashboard");
        } catch (err) {
            console.error(err);
            setError("Failed to sign in with Google: " + err.message);
            setLoading(false);
        }
    }

    return (
        <div className="auth-layout">
            {/* Left Panel - Wallpaper */}
            <div className="left-panel">
                <div className="grid-texture" aria-hidden="true"></div>
                <div className="glow g1" aria-hidden="true"></div>
                <div className="glow g2" aria-hidden="true"></div>
                <div className="glow g3" aria-hidden="true"></div>

                {/* Brand */}
                <div className="lp-brand">
                    <span className="brand-pill">Sri Lanka Tourism Analytics</span>
                </div>

                {/* Center Content */}
                <div className="lp-center">
                    <div className="lp-tagline-label" aria-hidden="true">
                        <svg width="10" height="10" viewBox="0 0 16 16" fill="none">
                            <path d="M8 1l1.8 5.5L15 8l-5.2 1.5L8 15l-1.8-5.5L1 8l5.2-1.5z" fill="#4c6ef5" />
                        </svg>
                        Official SLTDA Analytics Partner
                    </div>
                    <h1 className="lp-headline">Data-driven decisions<br />for <span className="ac">Sri Lanka's</span><br />tourism future</h1>
                    <p className="lp-sub">AI-powered forecasting, real-time visitor load intelligence, and strategic insights — all in one portal.</p>
                </div>

                {/* Footer Stats */}
                <div className="lp-footer" aria-hidden="true">
                    <div className="lp-footer-stat">
                        <div className="lf-val">50+</div>
                        <div className="lf-label">Sites Monitored</div>
                    </div>
                    <div className="lp-footer-divider"></div>
                    <div className="lp-footer-stat">
                        <div className="lf-val">94%</div>
                        <div className="lf-label">Model Confidence</div>
                    </div>
                    <div className="lp-footer-divider"></div>
                    <div className="lp-footer-stat">
                        <div className="lf-val">7-day</div>
                        <div className="lf-label">Rolling Forecast</div>
                    </div>
                    <div className="lp-footer-divider"></div>
                    <div className="lp-footer-stat">
                        <div className="lf-val">17.1M</div>
                        <div className="lf-label">2030 Baseline</div>
                    </div>
                </div>
            </div>

            {/* Right Panel - Form */}
            <div className="right-panel" role="main">
                <div className="form-card">
                    {/* Tabs */}
                    <div className="form-tabs" role="tablist" aria-label="Authentication">
                        <button className="tab-btn active" role="tab" aria-selected="true">Sign In</button>
                        <Link to="/signup" className="tab-btn">Create Account</Link>
                    </div>

                    {/* Login Form */}
                    <div className="form-body">
                        <div className="form-header">
                            <div className="form-title">Welcome back</div>
                            <div className="form-sub">Sign in to your analytics portal</div>
                        </div>

                        <form onSubmit={handleSubmit} noValidate>
                            {/* Email Field */}
                            <div className="field">
                                <label htmlFor="login-email">Email Address</label>
                                <div className="input-wrap">
                                    <span className="input-icon">
                                        <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8">
                                            <rect x="1.5" y="3" width="13" height="10" rx="2" />
                                            <path d="M1.5 5.5l6.5 4 6.5-4" />
                                        </svg>
                                    </span>
                                    <input
                                        type="email"
                                        id="login-email"
                                        ref={emailRef}
                                        placeholder="you@organisation.lk"
                                        autoComplete="email"
                                        required
                                    />
                                </div>
                            </div>

                            {/* Password Field */}
                            <div className="field">
                                <label htmlFor="login-password">Password</label>
                                <div className="input-wrap">
                                    <span className="input-icon">
                                        <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8">
                                            <rect x="3" y="7" width="10" height="8" rx="2" />
                                            <path d="M5 7V5a3 3 0 0 1 6 0v2" />
                                        </svg>
                                    </span>
                                    <input
                                        type="password"
                                        id="login-password"
                                        ref={passwordRef}
                                        placeholder="Enter your password"
                                        autoComplete="current-password"
                                        required
                                    />
                                </div>
                            </div>

                            {/* Remember Checkbox */}
                            <div className="check-field">
                                <input type="checkbox" id="remember" name="remember" />
                                <label htmlFor="remember">Keep me signed in for 30 days</label>
                            </div>

                            {/* Error Display */}
                            {error && <div className="field-error show">{error}</div>}

                            {/* Submit Button */}
                            <button type="submit" className="submit-btn" disabled={loading}>
                                <span className="btn-text">Sign In to Portal</span>
                                <div className="spinner"></div>
                            </button>
                        </form>

                        {/* Divider */}
                        <div className="divider">
                            <span className="divider-text">or continue with</span>
                        </div>

                        {/* Google SSO */}
                        <button className="sso-btn" onClick={handleGoogleSignIn} disabled={loading}>
                            <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
                                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
                                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                            </svg>
                            Continue with Google
                        </button>

                        {/* Footer Link */}
                        <div className="form-footer">
                            Don't have an account? <Link to="/signup">Create one free</Link>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
