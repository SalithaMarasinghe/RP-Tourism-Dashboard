import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import './LandingPage.css';

const LandingPage = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [activeScenario, setActiveScenario] = useState('baseline');

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 6);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('revealed');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.08, rootMargin: '0px 0px -28px 0px' }
    );

    document.querySelectorAll('[data-reveal]').forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  const setScenarioTab = (scenario) => {
    setActiveScenario(scenario);
  };

  return (
    <div className="landing-page">
      {/* TOP BAR */}
      <header className={`topbar ${isScrolled ? 'shadow' : ''}`} role="banner">
        <div className="tb-left">
          <span className="brand-pill">Sri Lanka Tourism Analytics</span>
        </div>

        <nav className="tb-nav" aria-label="Main navigation">
          <a href="#features">Features</a>
          <a href="#audience">Who It's For</a>
          <a href="#ai-assistant">AI Assistant</a>
          <a href="#how-it-works">How It Works</a>
        </nav>

        <div className="tb-right">
          <Link to="/login" className="btn btn-ghost">Sign In</Link>
          <Link to="/signup" className="btn btn-blue">Register Now</Link>
        </div>
      </header>

      {/* MOBILE PANEL - REMOVED */}

      {/* HERO */}
      <section className="hero" aria-label="Platform overview">
        <div className="hero-bg" aria-hidden="true"></div>
        <div className="hg hg1" aria-hidden="true"></div>
        <div className="hg hg2" aria-hidden="true"></div>
        <div className="pw">
          <div className="hero-inner">
            <div className="hero-left">
              <div className="hero-label" data-reveal>
                <svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
                  <circle cx="8" cy="8" r="6.5"/>
                </svg>
                Official SLTDA Analytics Partner
              </div>
              <h1 className="hero-h1" data-reveal>
                Tourism intelligence<br/>for <span className="ac">Sri Lanka's</span><br/>decision makers
              </h1>
              <p className="hero-sub" data-reveal>
                AI-powered arrival forecasting, real-time visitor load monitoring, and redistribution planning — built for SLTDA, hotels, and operators.
              </p>
              <div className="hero-ctas" data-reveal>
                <Link to="/signup" className="btn-blue-lg">
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
                    <path d="M8 2a4 4 0 0 1 4 4v1H4V6a4 4 0 0 1 4-4z"/>
                    <rect x="2" y="7" width="12" height="8" rx="2"/>
                  </svg>
                  Register Now
                </Link>
                <a href="#features" className="btn-outline-blue">Explore Features</a>
              </div>
              <div className="hero-stats" role="list" aria-label="Key statistics" data-reveal>
                <div role="listitem">
                  <div className="hs-val">2.05<span className="u">M</span></div>
                  <div className="hs-label">2024 Total Arrivals</div>
                </div>
                <div role="listitem">
                  <div className="hs-val">17.1<span className="u">M</span></div>
                  <div className="hs-label">Baseline 2030 Forecast</div>
                </div>
                <div role="listitem">
                  <div className="hs-val">50<span className="u">+</span></div>
                  <div className="hs-label">Sites Monitored</div>
                </div>
                <div role="listitem">
                  <div className="hs-val">94<span className="u">%</span></div>
                  <div className="hs-label">Model Confidence</div>
                </div>
              </div>
            </div>

            <div className="hero-right" aria-label="Dashboard preview" role="img" data-reveal data-d2>
              <div className="dash-preview">
                <div className="dptb" aria-hidden="true">
                  <div className="dp-dot" style={{background: '#F27B6E'}}></div>
                  <div className="dp-dot" style={{background: '#F5D26A'}}></div>
                  <div className="dp-dot" style={{background: '#4CD99A'}}></div>
                  <span className="dptb-title">Tourism Analytics Overview</span>
                </div>
                <div className="dp-body" aria-hidden="true">
                  <div className="dp-kpis">
                    <div className="dp-kpi">
                      <div className="dp-kpi-lbl">Total Arrivals <span className="dp-badge">2024</span></div>
                      <div className="dp-kpi-val">2.05M</div>
                      <div className="dp-delta">▲ 38.1% vs 2023</div>
                    </div>
                    <div className="dp-kpi">
                      <div className="dp-kpi-lbl">Revenue (USD) <span className="dp-badge">2024</span></div>
                      <div className="dp-kpi-val">$3.17B</div>
                      <div className="dp-delta">▲ 53.1% vs 2023</div>
                    </div>
                    <div className="dp-kpi">
                      <div className="dp-kpi-lbl">Avg. Stay (Days) <span className="dp-badge">2024</span></div>
                      <div className="dp-kpi-val">8.42</div>
                      <div className="dp-delta">▲ 0.2% vs 2023</div>
                    </div>
                    <div className="dp-kpi">
                      <div className="dp-kpi-lbl">Daily Spend <span className="dp-badge">2024</span></div>
                      <div className="dp-kpi-val">$181</div>
                      <div className="dp-delta">▲ 10.0% vs 2023</div>
                    </div>
                  </div>
                  <div className="dp-chart">
                    <div className="dp-ch-head">
                      <div className="dp-ch-title">Monthly Tourist Predictions</div>
                      <div className="dp-tabs">
                        <button 
                          className={`dp-tab ${activeScenario === 'baseline' ? 'on' : ''}`} 
                          onClick={() => setScenarioTab('baseline')}
                        >
                          Baseline
                        </button>
                        <button 
                          className={`dp-tab ${activeScenario === 'optimistic' ? 'on' : ''}`} 
                          onClick={() => setScenarioTab('optimistic')}
                        >
                          Optimistic
                        </button>
                        <button 
                          className={`dp-tab ${activeScenario === 'pessimistic' ? 'on' : ''}`} 
                          onClick={() => setScenarioTab('pessimistic')}
                        >
                          Pessimistic
                        </button>
                      </div>
                    </div>
                    <div className="dp-bars">
                      <div className="dp-br">
                        <span className="dp-bl">Jan</span>
                        <div className="dp-bt"><div className="dp-bf" style={{width: '99%'}}></div></div>
                        <span className="dp-bv">290K</span>
                      </div>
                      <div className="dp-br">
                        <span className="dp-bl">Feb</span>
                        <div className="dp-bt"><div className="dp-bf" style={{width: '90%'}}></div></div>
                        <span className="dp-bv">263K</span>
                      </div>
                      <div className="dp-br">
                        <span className="dp-bl">Mar</span>
                        <div className="dp-bt"><div className="dp-bf" style={{width: '99%'}}></div></div>
                        <span className="dp-bv">291K</span>
                      </div>
                      <div className="dp-br">
                        <span className="dp-bl">Apr</span>
                        <div className="dp-bt"><div className="dp-bf" style={{width: '96%'}}></div></div>
                        <span className="dp-bv">281K</span>
                      </div>
                      <div className="dp-br">
                        <span className="dp-bl">May</span>
                        <div className="dp-bt"><div className="dp-bf" style={{width: '99%'}}></div></div>
                        <span className="dp-bv">290K</span>
                      </div>
                      <div className="dp-br">
                        <span className="dp-bl">Jun</span>
                        <div className="dp-bt"><div className="dp-bf" style={{width: '96%'}}></div></div>
                        <span className="dp-bv">280K</span>
                      </div>
                    </div>
                    <div style={{fontSize: '8px', color: 'var(--text-dim)', marginTop: '7px', textAlign: 'center'}}>
                      Showing {activeScenario} scenario predictions for 2026
                    </div>
                  </div>
                  <div className="dp-bottom">
                    <div className="dp-mini">
                      <div className="dp-mini-title">Visitor Load Index</div>
                      <div className="dp-vr">
                        <span className="dp-vn">Sigiriya</span>
                        <div className="dp-vbw"><div className="dp-vbf" style={{width: '100%', background: '#ef4444'}}></div></div>
                        <span className="dp-vnum" style={{color: '#ef4444'}}>128</span>
                      </div>
                      <div className="dp-vr">
                        <span className="dp-vn">Kandy</span>
                        <div className="dp-vbw"><div className="dp-vbf" style={{width: '88%', background: 'var(--green)'}}></div></div>
                        <span className="dp-vnum" style={{color: 'var(--green)'}}>88</span>
                      </div>
                      <div className="dp-vr">
                        <span className="dp-vn">Galle</span>
                        <div className="dp-vbw"><div className="dp-vbf" style={{width: '92%', background: 'var(--amber)'}}></div></div>
                        <span className="dp-vnum" style={{color: 'var(--amber)'}}>114</span>
                      </div>
                      <div className="dp-vr">
                        <span className="dp-vn">Mirissa</span>
                        <div className="dp-vbw"><div className="dp-vbf" style={{width: '72%', background: 'var(--green)'}}></div></div>
                        <span className="dp-vnum" style={{color: 'var(--green)'}}>72</span>
                      </div>
                    </div>
                    <div className="dp-mini">
                      <div className="dp-mini-title">ML Model</div>
                      <div style={{fontSize: '17px', fontWeight: '800', color: 'var(--blue)', marginBottom: '1px'}}>0.29M</div>
                      <div style={{fontSize: '8px', color: 'var(--text-muted)', marginBottom: '6px'}}>Apr 2026 Prediction</div>
                      <span style={{fontSize: '8px', background: 'var(--blue-soft)', color: 'var(--blue)', padding: '2px 6px', borderRadius: '3px', fontWeight: '700'}}>94% Confidence</span>
                      <div style={{fontSize: '14px', fontWeight: '800', color: 'var(--green)', marginTop: '7px'}}>+15.0%</div>
                      <div style={{fontSize: '8px', color: 'var(--text-muted)'}}>Predicted YoY Growth</div>
                      <span style={{fontSize: '8px', background: 'var(--green-soft)', color: 'var(--green)', padding: '2px 6px', borderRadius: '3px', fontWeight: '700', marginTop: '4px', display: 'inline-block'}}>High Confidence</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* AUDIENCE */}
      <section className="sec" id="audience" aria-labelledby="aud-h2">
        <div className="pw">
          <div data-reveal>
            <span className="eyebrow">Who It's For</span>
            <h2 className="sec-h2" id="aud-h2">Built for every stakeholder<br/>in Sri Lanka's tourism chain</h2>
            <p className="sec-lead">Three role-specific dashboards — each surfacing the metrics, forecasts, and controls relevant to how you actually operate.</p>
          </div>
          <div className="aud-grid">
            <article className="aud-card aud-card--sl" data-reveal data-d1 aria-labelledby="aud-sl">
              <div className="aud-ico" aria-hidden="true">
                <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="#3b5bdb" strokeWidth="1.9">
                  <rect x="3" y="3" width="18" height="18" rx="3"/>
                  <path d="M9 9h6M9 12h6M9 15h4"/>
                </svg>
              </div>
              <div className="aud-role">Tourism Board & Government</div>
              <h3 id="aud-sl">SLTDA Officers</h3>
              <p>Evidence-based policy tools for sustainable tourism development and regulatory oversight.</p>
              <ul className="aud-bens" role="list">
                <li>
                  <svg className="chk" viewBox="0 0 16 16" fill="none" stroke="#3b5bdb" strokeWidth="2.2" aria-hidden="true">
                    <polyline points="2,8 6,12 14,4"/>
                  </svg>
                  5-year arrival forecasts for infrastructure planning
                </li>
                <li>
                  <svg className="chk" viewBox="0 0 16 16" fill="none" stroke="#3b5bdb" strokeWidth="2.2" aria-hidden="true">
                    <polyline points="2,8 6,12 14,4"/>
                  </svg>
                  Congestion alerts and redistribution controls
                </li>
                <li>
                  <svg className="chk" viewBox="0 0 16 16" fill="none" stroke="#3b5bdb" strokeWidth="2.2" aria-hidden="true">
                    <polyline points="2,8 6,12 14,4"/>
                  </svg>
                  Policy-grade PDF reports and data exports
                </li>
              </ul>
            </article>
            <article className="aud-card aud-card--ht" data-reveal data-d2 aria-labelledby="aud-ht">
              <div className="aud-ico" aria-hidden="true">
                <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="#12b886" strokeWidth="1.9">
                  <path d="M3 21V8l9-5 9 5v13"/>
                  <rect x="9" y="13" width="6" height="8"/>
                </svg>
              </div>
              <div className="aud-role">Hospitality</div>
              <h3 id="aud-ht">Hotels & Resorts</h3>
              <p>Demand visibility that drives smarter pricing, staffing, and partnership decisions ahead of season.</p>
              <ul className="aud-bens" role="list">
                <li>
                  <svg className="chk" viewBox="0 0 16 16" fill="none" stroke="#12b886" strokeWidth="2.2" aria-hidden="true">
                    <polyline points="2,8 6,12 14,4"/>
                  </svg>
                  Occupancy predictions up to 30 days ahead
                </li>
                <li>
                  <svg className="chk" viewBox="0 0 16 16" fill="none" stroke="#12b886" strokeWidth="2.2" aria-hidden="true">
                    <polyline points="2,8 6,12 14,4"/>
                  </svg>
                  Origin-market breakdown for campaign targeting
                </li>
                <li>
                  <svg className="chk" viewBox="0 0 16 16" fill="none" stroke="#12b886" strokeWidth="2.2" aria-hidden="true">
                    <polyline points="2,8 6,12 14,4"/>
                  </svg>
                  Peak/off-peak alerts for dynamic pricing
                </li>
              </ul>
            </article>
            <article className="aud-card aud-card--op" data-reveal data-d3 aria-labelledby="aud-op">
              <div className="aud-ico" aria-hidden="true">
                <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="#f59f00" strokeWidth="1.9">
                  <circle cx="12" cy="12" r="3"/>
                  <circle cx="12" cy="12" r="9"/>
                  <path d="M12 3v3M12 18v3M3 12h3M18 12h3"/>
                </svg>
              </div>
              <div className="aud-role">Operations</div>
              <h3 id="aud-op">Tour & Transport Providers</h3>
              <p>Real-time tourist flow data to optimise routes, fleets, and seasonal capacity planning.</p>
              <ul className="aud-bens" role="list">
                <li>
                  <svg className="chk" viewBox="0 0 16 16" fill="none" stroke="#f59f00" strokeWidth="2.2" aria-hidden="true">
                    <polyline points="2,8 6,12 14,4"/>
                  </svg>
                  Site-specific visitor load for route planning
                </li>
                <li>
                  <svg className="chk" viewBox="0 0 16 16" fill="none" stroke="#f59f00" strokeWidth="2.2" aria-hidden="true">
                    <polyline points="2,8 6,12 14,4"/>
                  </svg>
                  7-day forecasts for fleet and crew allocation
                </li>
                <li>
                  <svg className="chk" viewBox="0 0 16 16" fill="none" stroke="#f59f00" strokeWidth="2.2" aria-hidden="true">
                    <polyline points="2,8 6,12 14,4"/>
                  </svg>
                  Redistribution scenarios to avoid bottlenecks
                </li>
              </ul>
            </article>
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section className="sec" id="features" style={{background: 'var(--white)'}} aria-labelledby="feat-h2">
        <div className="pw">
          <div data-reveal style={{display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: '20px', flexWrap: 'wrap'}}>
            <div>
              <span className="eyebrow">Platform Capabilities</span>
              <h2 className="sec-h2" id="feat-h2">Every dimension of<br/>tourism intelligence</h2>
            </div>
            <p className="sec-lead" style={{maxWidth: '380px', margin: '0'}}>
              Four core modules built on machine learning, real-time data feeds, and Sri Lanka's official arrivals dataset.
            </p>
          </div>
          <div className="feat-grid">
            <div className="feat-card" data-reveal data-d1>
              <div className="feat-ico" aria-hidden="true">
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#3b5bdb" strokeWidth="2">
                  <polyline points="22,12 18,12 15,21 9,3 6,12 2,12"/>
                </svg>
              </div>
              <h3>Monthly Arrival Forecasting</h3>
              <p>SVR and ensemble model predictions from 2026–2030 with baseline, optimistic, and pessimistic scenarios.</p>
              <span className="feat-badge">5-Year Horizon</span>
            </div>
            <div className="feat-card" data-reveal data-d2>
              <div className="feat-ico" aria-hidden="true">
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#12b886" strokeWidth="2">
                  <rect x="3" y="4" width="18" height="18" rx="2"/>
                  <path d="M16 2v4M8 2v4M3 10h18"/>
                </svg>
              </div>
              <h3>Daily Rolling Predictions</h3>
              <p>7-day granular forecasts per tourist site with live data refresh. Exportable as PDF for operations teams.</p>
              <span className="feat-badge" style={{background: 'var(--green-soft)', color: 'var(--green)'}}>Operational</span>
            </div>
            <div className="feat-card" data-reveal data-d3>
              <div className="feat-ico" aria-hidden="true">
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#f59f00" strokeWidth="2">
                  <circle cx="12" cy="12" r="3"/>
                  <path d="M3 12a9 9 0 1 0 18 0"/>
                </svg>
              </div>
              <h3>Visitor Load Index</h3>
              <p>Real-time VLI monitoring for 50+ sites. Automated congestion alerts when visitor load exceeds 120% capacity.</p>
              <span className="feat-badge" style={{background: 'var(--amber-soft)', color: 'var(--amber)'}}>50+ Sites</span>
            </div>
            <div className="feat-card" data-reveal data-d1>
              <div className="feat-ico" aria-hidden="true">
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#7950f2" strokeWidth="2">
                  <path d="M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z"/>
                </svg>
              </div>
              <h3>Redistribution Simulator</h3>
              <p>Interactive tool to model tourist rerouting between locations with before/after impact visualisation.</p>
              <span className="feat-badge" style={{background: 'rgba(121,80,242,.1)', color: '#7950f2'}}>Planning Tool</span>
            </div>
            <div className="feat-card" data-reveal data-d2>
              <div className="feat-ico" aria-hidden="true">
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#12b886" strokeWidth="2">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                  <polyline points="14,2 14,8 20,8"/>
                  <line x1="16" y1="13" x2="8" y2="13"/>
                </svg>
              </div>
              <h3>Exportable Reports</h3>
              <p>Policy-grade PDF exports and CSV data extracts. Scheduled delivery to ministry inboxes or teams.</p>
              <span className="feat-badge" style={{background: 'var(--green-soft)', color: 'var(--green)'}}>PDF / CSV</span>
            </div>
            <div className="feat-card" data-reveal data-d3>
              <div className="feat-ico" aria-hidden="true">
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#3b5bdb" strokeWidth="2">
                  <circle cx="9" cy="12" r="1"/>
                  <circle cx="12" cy="12" r="1"/>
                  <circle cx="15" cy="12" r="1"/>
                  <rect x="2" y="4" width="20" height="16" rx="2"/>
                </svg>
              </div>
              <h3>Top Source Markets</h3>
              <p>Market share by origin country — India, Russia, UK, Germany, China — with trend tracking and alerts.</p>
              <span className="feat-badge">Market Intel</span>
            </div>
          </div>
        </div>
      </section>

      {/* AI ASSISTANT */}
      <section className="ai-sec" id="ai-assistant" aria-labelledby="ai-h2">
        <div className="ai-glow-1" aria-hidden="true"></div>
        <div className="ai-glow-2" aria-hidden="true"></div>
        <div className="pw">
          <div className="ai-inner">
            <div data-reveal>
              <div className="ai-label">
                <svg width="11" height="11" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                  <path d="M8 1l1.8 5.5L15 8l-5.2 1.5L8 15l-1.8-5.5L1 8l5.2-1.5z" fill="#a78bfa"/>
                </svg>
                Powered by Gemini AI
              </div>
              <h2 className="ai-h2" id="ai-h2">Your <span className="aiac">AI Assistant</span><br/>for tourism insights</h2>
              <p className="ai-sub">Ask anything about Sri Lanka's tourism landscape. Get instant analysis, trend breakdowns, and strategic recommendations — backed by live data and Gemini's intelligence.</p>
              <div className="ai-feats">
                <div className="ai-feat">
                  <div className="ai-fic" aria-hidden="true">
                    <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="#a78bfa" strokeWidth="2">
                      <circle cx="8" cy="8" r="6.5"/>
                      <path d="M8 5v3.5l2 1.5"/>
                    </svg>
                  </div>
                  <div>
                    <div className="ai-ft">Real-Time Web Search</div>
                    <div className="ai-fd">Pulls live tourism news, events, and market updates directly into your conversation.</div>
                  </div>
                </div>
                <div className="ai-feat">
                  <div className="ai-fic" aria-hidden="true">
                    <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="#a78bfa" strokeWidth="2">
                      <rect x="2" y="2" width="12" height="12" rx="2"/>
                      <path d="M5 8h6M5 5h6M5 11h4"/>
                    </svg>
                  </div>
                  <div>
                    <div className="ai-ft">Sri Lanka Tourism Knowledge Base</div>
                    <div className="ai-fd">Contextual insights trained on SLTDA data, seasonal patterns, and site-level analytics.</div>
                  </div>
                </div>
                <div className="ai-feat">
                  <div className="ai-fic" aria-hidden="true">
                    <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="#a78bfa" strokeWidth="2">
                      <path d="M2 3h12a1 1 0 0 1 1 1v7a1 1 0 0 1-1 1H5l-3 3V4a1 1 0 0 1 1-1z"/>
                    </svg>
                  </div>
                  <div>
                    <div className="ai-ft">Persistent Chat History</div>
                    <div className="ai-fd">Your conversations are saved per organisation — resume analysis anytime, from any device.</div>
                  </div>
                </div>
              </div>
              <div className="gemini-badge">
                <svg width="13" height="13" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                  <path d="M8 1l1.8 5.5L15 8l-5.2 1.5L8 15l-1.8-5.5L1 8l5.2-1.5z" fill="#a78bfa"/>
                </svg>
                Gemini Integration — Natural Language Processing
              </div>
            </div>

            <div data-reveal data-d2>
              <div className="acp" aria-label="AI Assistant interface preview" role="img">
                <div className="acp-head" aria-hidden="true">
                  <div className="acp-hic">
                    <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="#a78bfa" strokeWidth="2">
                      <path d="M14 2H2a1 1 0 0 0-1 1v10l3-3h10a1 1 0 0 0 1-1V3a1 1 0 0 0-1-1z"/>
                    </svg>
                  </div>
                  <div>
                    <div className="acp-htitle">AI Assistant</div>
                    <div className="acp-hsub">Tourism analytics &amp; insights</div>
                  </div>
                </div>
                <div className="acp-layout" aria-hidden="true">
                  <div className="acp-sidebar">
                    <button className="acp-newbtn">
                      <svg width="11" height="11" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2.2">
                        <line x1="7" y1="1" x2="7" y2="13"/>
                        <line x1="1" y1="7" x2="13" y2="7"/>
                      </svg> New Chat
                    </button>
                    <div className="acp-hlabel">Chat History</div>
                    <div className="acp-hitem active">Sigiriya congestion Q3</div>
                    <div className="acp-hitem dim">Indian arrivals forecast</div>
                    <div className="acp-hitem dim">Revenue vs 2023</div>
                  </div>
                  <div className="acp-msgs">
                    <div className="acp-msg u">What are predicted arrivals for March 2026 under the optimistic scenario?</div>
                    <div className="acp-msg a">Based on the optimistic model, March 2026 arrivals are projected at <strong>~318K</strong> — 9.2% above the 291K baseline. Key drivers include higher inbound volumes from India (+12%) and Germany (+8%).</div>
                    <div className="acp-msg u">Which sites should we alert for capacity issues next week?</div>
                    <div className="acp-msg a">⚠️ <strong>Sigiriya (VLI 128)</strong> and <strong>Galle Fort (VLI 114)</strong> require attention. I recommend activating the redistribution simulator to model rerouting to Dambulla and Mirissa.</div>
                  </div>
                </div>
                <div className="acp-inp-row" aria-hidden="true">
                  <input className="acp-inp" type="text" placeholder="Type your message..." tabIndex="-1" readOnly/>
                  <button className="acp-send" tabIndex="-1" aria-label="Send">
                    <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="white" strokeWidth="2">
                      <line x1="15" y1="1" x2="1" y2="8"/>
                      <line x1="15" y1="1" x2="6" y2="15"/>
                      <line x1="1" y1="8" x2="6" y2="15"/>
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="sec proc-sec" id="how-it-works" aria-labelledby="proc-h2">
        <div className="pw">
          <div data-reveal style={{textAlign: 'center'}}>
            <span className="eyebrow">Getting Started</span>
            <h2 className="sec-h2" id="proc-h2" style={{textAlign: 'center', margin: '0 auto 10px'}}>Up and running in two steps</h2>
            <p className="sec-lead" style={{textAlign: 'center', margin: '0 auto'}}>Create your account and get immediate access to all tourism analytics features.</p>
          </div>
          <div className="proc-grid" role="list">
            <div className="proc-card" data-reveal data-d1 role="listitem">
              <div className="proc-num n1" aria-label="Step 1">1</div>
              <h3>Create Account</h3>
              <p>Register with your organisational email and select your role — SLTDA officer, hotel, or tour operator.</p>
              <span className="proc-badge">~2 minutes</span>
            </div>
            <div className="proc-card" data-reveal data-d2 role="listitem">
              <div className="proc-num n2" aria-label="Step 2">2</div>
              <h3>Access Dashboard</h3>
              <p>Log in and start exploring forecasts, VLI monitoring, and the AI assistant — all in your role-specific view.</p>
              <span className="proc-badge g">Immediate access</span>
            </div>
          </div>
          <div style={{textAlign: 'center', marginTop: '48px'}} data-reveal>
            <Link to="/signup" className="btn-blue-lg" style={{fontSize: '15px', padding: '12px 30px'}}>Register Now →</Link>
            <p style={{fontSize: '13px', color: 'var(--text-muted)', marginTop: '11px'}}>Open to verified SLTDA-registered organisations and licensed tourism operators.</p>
          </div>
        </div>
      </section>

      {/* REGISTER CTA */}
      <section className="cta-sec" id="register" aria-labelledby="cta-h2">
        <div className="cta-glow" aria-hidden="true"></div>
        <div className="pw">
          <div className="cta-inner" data-reveal>
            <h2 className="cta-h2" id="cta-h2">Join Sri Lanka's tourism<br/>intelligence network</h2>
            <p className="cta-sub">Create your account to access AI-powered forecasting, real-time visitor load data, and the full analytics dashboard.</p>
            <div className="cta-btns">
              <Link to="/signup" className="btn-blue-lg" role="button">
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
                  <path d="M8 2a4 4 0 0 1 4 4v1H4V6a4 4 0 0 1 4-4z"/>
                  <rect x="2" y="7" width="12" height="8" rx="2"/>
                </svg>
                Create Account
              </Link>
              <Link to="/login" className="btn-outline-lg" role="button">Sign In to Portal</Link>
            </div>
            <p className="cta-note">Official organisational or government email required for verification.</p>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer role="contentinfo">
        <div className="pw">
          <div className="foot-grid">
            <div>
              <span className="brand-pill" style={{fontSize: '12px'}}>Sri Lanka Tourism Analytics</span>
              <p className="foot-brand-sub">Empowering Sri Lanka's tourism ecosystem with authoritative, AI-powered analytics.</p>
            </div>
            <div className="foot-col">
              <h4>Platform</h4>
              <a href="#features">Monthly Forecasting</a>
              <a href="#features">Daily Predictions</a>
              <a href="#features">Visitor Load Index</a>
              <a href="#ai-assistant">AI Assistant</a>
            </div>
            <div className="foot-col">
              <h4>Organisation</h4>
              <a href="#">About SLTAP</a>
              <a href="#">SLTDA Partnership</a>
              <a href="#">Data Sources</a>
              <a href="#">Contact</a>
            </div>
            <div className="foot-col">
              <h4>Language</h4>
              <a href="#" lang="si">සිංහල</a>
              <a href="#" lang="ta">தமிழ்</a>
              <a href="#" lang="en">English</a>
            </div>
          </div>
          <div className="foot-bottom">
            <p className="foot-copy">© 2026 Sri Lanka Tourism Analytics Portal. All rights reserved.</p>
            <div className="foot-legal">
              <a href="#">Privacy Policy</a>
              <a href="#">Terms of Use</a>
              <a href="#">Accessibility</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
