import App from "../App";
import { Link } from "../lib/router";

const DemoPage = () => {
  return (
    <div className="demo-shell">
      <div className="demo-banner">
        <div className="demo-meta">
          <span className="demo-pill">Demo Mode</span>
          <span>Changes reset when you refresh.</span>
        </div>
        <div className="demo-actions">
          <Link to="/app" className="cta-button primary">
            Open Studio
          </Link>
          <Link to="/" className="cta-button ghost">
            Back to landing
          </Link>
        </div>
      </div>
      <section className="demo-gallery">
        <div className="demo-gallery-header">
          <h2>Studio previews</h2>
          <p>Snapshots and neck diagram examples from the demo layout.</p>
        </div>
        <div className="demo-gallery-grid">
          <figure className="demo-shot">
            <svg viewBox="0 0 320 180" role="img" aria-label="Studio layout snapshot">
              <rect x="0" y="0" width="320" height="180" rx="16" fill="var(--panel)" />
              <rect x="18" y="18" width="284" height="24" rx="8" fill="var(--panel-strong)" />
              <rect x="18" y="54" width="80" height="108" rx="10" fill="var(--panel-strong)" />
              <rect x="110" y="54" width="192" height="108" rx="10" fill="var(--bg)" />
              <rect x="126" y="70" width="160" height="40" rx="8" fill="var(--panel)" />
              <rect x="126" y="120" width="120" height="26" rx="8" fill="var(--panel)" />
              <circle cx="142" cy="90" r="6" fill="var(--accent)" />
              <circle cx="168" cy="90" r="6" fill="var(--accent)" />
              <circle cx="194" cy="90" r="6" fill="var(--accent)" />
              <circle cx="220" cy="90" r="6" fill="var(--accent)" />
              <circle cx="146" cy="132" r="5" fill="var(--accent-strong)" />
              <circle cx="174" cy="132" r="5" fill="var(--accent-strong)" />
              <circle cx="202" cy="132" r="5" fill="var(--accent-strong)" />
            </svg>
            <figcaption>Studio snapshot</figcaption>
          </figure>
          <figure className="demo-shot">
            <svg viewBox="0 0 320 180" role="img" aria-label="Neck diagram preview">
              <rect x="0" y="0" width="320" height="180" rx="16" fill="var(--panel)" />
              <rect x="24" y="36" width="272" height="100" rx="12" fill="var(--bg)" />
              {Array.from({ length: 6 }).map((_, index) => (
                <line
                  key={`string-${index}`}
                  x1="24"
                  y1={52 + index * 16}
                  x2="296"
                  y2={52 + index * 16}
                  stroke="var(--border)"
                  strokeWidth={index === 0 || index === 5 ? 2 : 1}
                />
              ))}
              {Array.from({ length: 7 }).map((_, index) => (
                <line
                  key={`fret-${index}`}
                  x1={48 + index * 36}
                  y1="36"
                  x2={48 + index * 36}
                  y2="136"
                  stroke="var(--border)"
                  strokeWidth={index === 0 ? 3 : 1}
                />
              ))}
              <circle cx="120" cy="84" r="8" fill="var(--accent)" />
              <circle cx="180" cy="68" r="8" fill="var(--accent)" />
              <circle cx="240" cy="100" r="8" fill="var(--accent-strong)" />
              <circle cx="86" cy="116" r="8" fill="var(--accent-strong)" />
            </svg>
            <figcaption>Neck diagram layout</figcaption>
          </figure>
          <figure className="demo-shot">
            <svg viewBox="0 0 320 180" role="img" aria-label="Interval labeling example">
              <rect x="0" y="0" width="320" height="180" rx="16" fill="var(--panel)" />
              <rect x="20" y="30" width="280" height="110" rx="14" fill="var(--bg)" />
              {Array.from({ length: 5 }).map((_, index) => (
                <line
                  key={`string-alt-${index}`}
                  x1="20"
                  y1={52 + index * 20}
                  x2="300"
                  y2={52 + index * 20}
                  stroke="var(--border)"
                  strokeWidth={index === 0 || index === 4 ? 2 : 1}
                />
              ))}
              {Array.from({ length: 6 }).map((_, index) => (
                <line
                  key={`fret-alt-${index}`}
                  x1={46 + index * 42}
                  y1="30"
                  x2={46 + index * 42}
                  y2="140"
                  stroke="var(--border)"
                  strokeWidth={index === 0 ? 3 : 1}
                />
              ))}
              <circle cx="110" cy="72" r="9" fill="var(--accent)" />
              <circle cx="152" cy="92" r="9" fill="var(--accent-strong)" />
              <circle cx="194" cy="72" r="9" fill="var(--accent)" />
              <circle cx="236" cy="112" r="9" fill="var(--accent-strong)" />
            </svg>
            <figcaption>Interval labeling example</figcaption>
          </figure>
        </div>
      </section>
      <div className="demo-stage">
        <App mode="demo" />
      </div>
    </div>
  );
};

export default DemoPage;
