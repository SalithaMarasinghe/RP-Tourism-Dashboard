import React, { useRef, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { Link, useNavigate } from "react-router-dom";
import "./AuthStyles.css";

export default function Signup() {
    const emailRef = useRef();
    const passwordRef = useRef();
    const passwordConfirmRef = useRef();
    const firstNameRef = useRef();
    const lastNameRef = useRef();

    const { signup, googleSignIn } = useAuth();
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    async function handleSubmit(e) {
        e.preventDefault();

        if (passwordRef.current.value !== passwordConfirmRef.current.value) {
            return setError("Passwords do not match");
        }

        try {
            setError("");
            setLoading(true);
            await signup(emailRef.current.value, passwordRef.current.value, {
                firstName: firstNameRef.current.value,
                lastName: lastNameRef.current.value
            });
            navigate("/dashboard");
        } catch (err) {
            console.error(err);
            setError("Failed to create an account: " + err.message);
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
                            <path d="M8 1l1.8 5.5L15 8l-5.2 1.5L8 15l-1.8-5.5L1 8l5.2-1.5z" fill="#4c6ef5"/>
                        </svg>
                        Official SLTDA Analytics Partner
                    </div>
                    <h1 className="lp-headline">Data-driven decisions<br/>for <span className="ac">Sri Lanka's</span><br/>tourism future</h1>
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
                        <Link to="/login" className="tab-btn">Sign In</Link>
                        <button className="tab-btn active" role="tab" aria-selected="true">Create Account</button>
                    </div>

                    {/* Signup Form */}
                    <div className="form-body">
                        <div className="form-header">
                            <div className="form-title">Create your account</div>
                            <div className="form-sub">Join Sri Lanka's tourism intelligence network</div>
                        </div>

                        <form onSubmit={handleSubmit} novalidate>
                            {/* Name Fields */}
                            <div className="field">
                                <div className="field-row">
                                    <div>
                                        <label htmlFor="reg-fname">First Name</label>
                                        <div className="input-wrap">
                                            <span className="input-icon">
                                                <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8">
                                                    <circle cx="8" cy="5" r="3"/>
                                                    <path d="M2 14c0-3.3 2.7-6 6-6s6 2.7 6 6"/>
                                                </svg>
                                            </span>
                                            <input 
                                                type="text" 
                                                id="reg-fname" 
                                                ref={firstNameRef}
                                                placeholder="First name" 
                                                autoComplete="given-name" 
                                                required
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label htmlFor="reg-lname">Last Name</label>
                                        <div className="input-wrap">
                                            <span className="input-icon">
                                                <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8">
                                                    <circle cx="8" cy="5" r="3"/>
                                                    <path d="M2 14c0-3.3 2.7-6 6-6s6 2.7 6 6"/>
                                                </svg>
                                            </span>
                                            <input 
                                                type="text" 
                                                id="reg-lname" 
                                                ref={lastNameRef}
                                                placeholder="Last name" 
                                                autoComplete="family-name" 
                                                required
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Email Field */}
                            <div className="field">
                                <label htmlFor="reg-email">Organisation Email</label>
                                <div className="input-wrap">
                                    <span className="input-icon">
                                        <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8">
                                            <rect x="1.5" y="3" width="13" height="10" rx="2"/>
                                            <path d="M1.5 5.5l6.5 4 6.5-4"/>
                                        </svg>
                                    </span>
                                    <input 
                                        type="email" 
                                        id="reg-email" 
                                        ref={emailRef}
                                        placeholder="you@organisation.lk" 
                                        autoComplete="email" 
                                        required
                                    />
                                </div>
                                <div className="field-hint">Use your official government or business email.</div>
                            </div>

                            {/* Password Field */}
                            <div className="field">
                                <label htmlFor="reg-password">Password</label>
                                <div className="input-wrap">
                                    <span className="input-icon">
                                        <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8">
                                            <rect x="3" y="7" width="10" height="8" rx="2"/>
                                            <path d="M5 7V5a3 3 0 0 1 6 0v2"/>
                                        </svg>
                                    </span>
                                    <input 
                                        type="password" 
                                        id="reg-password" 
                                        ref={passwordRef}
                                        placeholder="Create a strong password" 
                                        autoComplete="new-password" 
                                        required
                                    />
                                </div>
                            </div>

                            {/* Confirm Password */}
                            <div className="field">
                                <label htmlFor="reg-confirm-password">Confirm Password</label>
                                <div className="input-wrap">
                                    <span className="input-icon">
                                        <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8">
                                            <rect x="3" y="7" width="10" height="8" rx="2"/>
                                            <path d="M5 7V5a3 3 0 0 1 6 0v2"/>
                                        </svg>
                                    </span>
                                    <input 
                                        type="password" 
                                        id="reg-confirm-password" 
                                        ref={passwordConfirmRef}
                                        placeholder="Confirm your password" 
                                        autoComplete="new-password" 
                                        required
                                    />
                                </div>
                            </div>

                            {/* Terms Checkbox */}
                            <div className="check-field">
                                <input type="checkbox" id="terms" required/>
                                <label htmlFor="terms">
                                    I agree to the <a href="#">Terms of Use</a> and <a href="#">Privacy Policy</a>. Official email required for verification.
                                </label>
                            </div>

                            {/* Error Display */}
                            {error && <div className="field-error show">{error}</div>}

                            {/* Submit Button */}
                            <button type="submit" className="submit-btn" disabled={loading}>
                                <span className="btn-text">Create Account</span>
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
                                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18C1.43 20.53 1 18.75 1 16.57V7.07H2.18C3.99 8.55 7.7 11 12 11c4.3 0 7.7-3.45 7.7-8.07 0-4.62-3.4-8.07-7.7-8.07z" fill="#34A853"/>
                                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                            </svg>
                            Continue with Google
                        </button>

                        {/* Footer Link */}
                        <div className="form-footer">
                            Already have an account? <Link to="/login">Sign in here</Link>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
