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
    title: "Excalidraw-inspired canvas",
    description: "Drop, resize, and align fretboard diagrams on a clean workspace."
  },
  {
    title: "Scale and mode library",
    description: "Search by key, scale, or position to highlight intervals fast."
  },
  {
    title: "Export-ready layouts",
    description: "Export PNG, PDF, and JSON layouts that match your print flow."
  }
];

const STEP_ITEMS = [
  {
    title: "Start with a blank canvas",
    description: "Create a new project and drop in guitar neck diagrams."
  },
  {
    title: "Arrange and label",
    description: "Move, resize, and label notes by key, interval, or picking direction."
  },
  {
    title: "Export and share",
    description: "Save layouts as PNG/PDF or JSON for backup and reuse."
  }
];

const USE_CASES = [
  {
    title: "Scale practice charts",
    description: "Build consistent scale maps across multiple positions."
  },
  {
    title: "Lesson handouts",
    description: "Create clean, printable fretboard diagrams for students."
  },
  {
    title: "Song mapping",
    description: "Track chord tones and interval targets per diagram."
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

  return (
    <div className="landing-page">
      <nav className="landing-nav">
        <div className="landing-brand">
          <div className="landing-logo">NDS</div>
          <div>
            <div className="landing-title">Neck Diagram Studio</div>
            <div className="landing-subtitle">Excalidraw-inspired guitar layouts</div>
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
        <section className="landing-hero">
          <div className="hero-copy">
            <div className="hero-pill">Version 0.1 Preview</div>
            <h1>Design clean, printable guitar neck diagrams and fretboard charts.</h1>
            <p>
              Neck Diagram Studio is a guitar neck diagram builder for scale maps and practice
              grids. Start from a blank canvas, annotate intervals, and export layouts that match
              your print or share flow.
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
              <span>Offline-safe caching</span>
              <span>Auto-save with Postgres</span>
              <span>Tabs for quick variations</span>
            </div>
          </div>
          <div className="hero-panel">
            <div className="hero-panel-header">What you can do</div>
            <div className="hero-panel-grid">
              {FEATURE_ITEMS.map((feature) => (
                <div key={feature.title} className="hero-card">
                  <h3>{feature.title}</h3>
                  <p>{feature.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="landing-section">
          <div className="section-header">
            <h2>How it works</h2>
            <p>Everything you need to build accurate fretboard diagrams quickly.</p>
          </div>
          <div className="section-grid">
            {STEP_ITEMS.map((item) => (
              <div key={item.title} className="info-card">
                <h3>{item.title}</h3>
                <p>{item.description}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="landing-section">
          <div className="section-header">
            <h2>Common use cases</h2>
            <p>Built for practice, teaching, and performance planning.</p>
          </div>
          <div className="section-grid">
            {USE_CASES.map((item) => (
              <div key={item.title} className="info-card">
                <h3>{item.title}</h3>
                <p>{item.description}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="landing-section">
          <div className="section-header">
            <h2>FAQ</h2>
            <p>Quick answers for the most common questions.</p>
          </div>
          <div className="section-grid">
            {FAQ_ITEMS.map((item) => (
              <div key={item.title} className="info-card">
                <h3>{item.title}</h3>
                <p>{item.description}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="landing-links">
          <div className="section-header">
            <h2>Key Links</h2>
            <p>Jump to docs, source, and the creator's pages.</p>
          </div>
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
        </section>
      </main>
    </div>
  );
};

export default LandingPage;
