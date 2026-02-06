import { useState } from "react";
import { Link, usePathname } from "../lib/router";

const LINK_ITEMS = [
  {
    title: "Documentation",
    description: "Shortcuts, exports, and layout tips for fast diagramming.",
    href: "https://neckdiagramstudio.com/docs"
  },
  {
    title: "Code Repository",
    description: "Browse the source and track issues in the public repo.",
    href: "https://gitlab.com/destroyerofworlds/neck-diagram-studio"
  },
  {
    title: "Creator Website",
    description: "Follow the studio behind the diagrams.",
    href: "https://iconoclastaud.io/"
  }
];

const FEATURE_ITEMS = [
  {
    title: "Blank canvas layout",
    description: "Start from a clean canvas and place neck diagrams exactly where you want."
  },
  {
    title: "Key + scale labeling",
    description: "Show note names, intervals, or picking direction with one click."
  },
  {
    title: "Export-ready layouts",
    description: "Export PNG, PDF, or JSON pages that match the on‑screen layout."
  }
];

const STEP_ITEMS = [
  {
    title: "Start a project",
    description: "Open a blank canvas and add a neck diagram to begin."
  },
  {
    title: "Arrange and label",
    description: "Move, resize, and label notes by key, interval, or picking."
  },
  {
    title: "Export and share",
    description: "Save layouts as PNG, PDF, or JSON for reuse and backup."
  }
];

const USE_CASES = [
  {
    title: "Scale practice charts",
    description: "Build scale maps across positions without redrawing."
  },
  {
    title: "Lesson handouts",
    description: "Create clean, printable fretboard diagrams for lessons."
  },
  {
    title: "Song mapping",
    description: "Track interval targets and note choices per diagram."
  }
];

const FAQ_ITEMS = [
  {
    title: "Does the demo save my work?",
    description: "No. Demo edits reset on refresh so you can explore safely."
  },
  {
    title: "What export formats are supported?",
    description: "PNG, PDF, and JSON for full-page or single-diagram exports."
  },
  {
    title: "Is there offline recovery?",
    description: "Yes. The latest project is cached locally for offline recovery."
  }
];

const LandingPage = () => {
  const pathname = usePathname();
  const primaryTarget = "/app";
  const isActive = (path: string) => pathname === path;
  const [collapsedSections, setCollapsedSections] = useState({
    hero: false,
    how: false,
    useCases: false,
    faq: false,
    links: false
  });

  const toggleSection = (section: keyof typeof collapsedSections) => {
    setCollapsedSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  return (
    <div className="landing-page">
      <nav className="landing-nav">
        <div className="landing-brand">
          <div className="landing-logo">NDS</div>
          <div>
            <div className="landing-title">Neck Diagram Studio</div>
            <div className="landing-subtitle">Guitar neck diagram builder</div>
          </div>
        </div>
        <div className="landing-nav-links">
          <Link
            to="/"
            className={`landing-link${isActive("/") ? " is-active" : ""}`}
            aria-current={isActive("/") ? "page" : undefined}
          >
            Home
          </Link>
          <Link
            to="/demo"
            className={`landing-link${isActive("/demo") ? " is-active" : ""}`}
            aria-current={isActive("/demo") ? "page" : undefined}
          >
            Demo
          </Link>
          <a
            className="landing-link"
            href="https://neckdiagramstudio.com/docs"
            target="_blank"
            rel="noreferrer"
          >
            Docs
          </a>
        </div>
        <div className="landing-nav-cta">
          <Link to={primaryTarget} className="cta-button primary">
            Open Studio
          </Link>
        </div>
      </nav>

      <main className="landing-content">
        <section className={`landing-hero${collapsedSections.hero ? " is-collapsed" : ""}`}>
          <button
            className="section-toggle hero-toggle"
            type="button"
            onClick={() => toggleSection("hero")}
            aria-expanded={!collapsedSections.hero}
          >
            {collapsedSections.hero ? "Expand" : "Minimize"}
          </button>
          {collapsedSections.hero ? (
            <div className="section-collapsed-note">Overview minimized.</div>
          ) : (
            <>
              <div className="hero-copy">
                <div className="hero-pill">Version 0.1 Preview</div>
                <h1>Guitar neck diagrams for practice, lessons, and layout.</h1>
                <p>
                  Neck Diagram Studio is a browser‑based neck diagram builder for guitar neck
                  diagram and fretboard diagram layouts. Build a guitar scale chart or scale map,
                  label fretboard notes with an interval chart view, and export a printable
                  fretboard for a guitar practice chart or guitar lesson handout.
                </p>
                <div className="hero-cta">
                  <Link to={primaryTarget} className="cta-button primary">
                    Start a Project
                  </Link>
                  <Link to="/demo" className="cta-button ghost">
                    Explore the Demo
                  </Link>
                </div>
                <div className="hero-meta">
                  <span>Auto‑save with Postgres</span>
                  <span>Offline recovery cache</span>
                  <span>Tabs for variations</span>
                </div>
              </div>
              <div className="hero-panel">
                <div className="hero-panel-header">Core features</div>
                <div className="hero-panel-grid">
                  {FEATURE_ITEMS.map((feature) => (
                    <div key={feature.title} className="hero-card">
                      <h3>{feature.title}</h3>
                      <p>{feature.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </section>

        <section className={`landing-section${collapsedSections.how ? " is-collapsed" : ""}`}>
          <div className="section-header">
            <div className="section-text">
              <h2>How it works</h2>
              <p>A simple workflow for clean, printable diagrams.</p>
            </div>
            <button
              className="section-toggle"
              type="button"
              onClick={() => toggleSection("how")}
              aria-expanded={!collapsedSections.how}
            >
              {collapsedSections.how ? "Expand" : "Minimize"}
            </button>
          </div>
          {!collapsedSections.how ? (
            <div className="section-body">
              <div className="section-grid">
                {STEP_ITEMS.map((item) => (
                  <div key={item.title} className="info-card">
                    <h3>{item.title}</h3>
                    <p>{item.description}</p>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </section>

        <section className={`landing-section${collapsedSections.useCases ? " is-collapsed" : ""}`}>
          <div className="section-header">
            <div className="section-text">
              <h2>Common use cases</h2>
              <p>Designed for practice, teaching, and layout planning.</p>
            </div>
            <button
              className="section-toggle"
              type="button"
              onClick={() => toggleSection("useCases")}
              aria-expanded={!collapsedSections.useCases}
            >
              {collapsedSections.useCases ? "Expand" : "Minimize"}
            </button>
          </div>
          {!collapsedSections.useCases ? (
            <div className="section-body">
              <div className="section-grid">
                {USE_CASES.map((item) => (
                  <div key={item.title} className="info-card">
                    <h3>{item.title}</h3>
                    <p>{item.description}</p>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </section>

        <section className={`landing-section${collapsedSections.faq ? " is-collapsed" : ""}`}>
          <div className="section-header">
            <div className="section-text">
              <h2>FAQ</h2>
              <p>Quick answers to common questions.</p>
            </div>
            <button
              className="section-toggle"
              type="button"
              onClick={() => toggleSection("faq")}
              aria-expanded={!collapsedSections.faq}
            >
              {collapsedSections.faq ? "Expand" : "Minimize"}
            </button>
          </div>
          {!collapsedSections.faq ? (
            <div className="section-body">
              <div className="section-grid">
                {FAQ_ITEMS.map((item) => (
                  <div key={item.title} className="info-card">
                    <h3>{item.title}</h3>
                    <p>{item.description}</p>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </section>

        <section className={`landing-links${collapsedSections.links ? " is-collapsed" : ""}`}>
          <div className="section-header">
            <div className="section-text">
              <h2>Key Links</h2>
              <p>Documentation, source, and creator links.</p>
            </div>
            <button
              className="section-toggle"
              type="button"
              onClick={() => toggleSection("links")}
              aria-expanded={!collapsedSections.links}
            >
              {collapsedSections.links ? "Expand" : "Minimize"}
            </button>
          </div>
          {!collapsedSections.links ? (
            <div className="section-body">
              <div className="link-grid">
                {LINK_ITEMS.map((item) => (
                  <a
                    key={item.title}
                    className="link-card"
                    href={item.href}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <div className="link-title">{item.title}</div>
                    <div className="link-description">{item.description}</div>
                    <div className="link-arrow">View</div>
                  </a>
                ))}
              </div>
            </div>
          ) : null}
        </section>
      </main>
    </div>
  );
};

export default LandingPage;
