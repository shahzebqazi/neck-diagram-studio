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
    href: "https://gitlab.com/neckdiagramstudio/neck-diagram-studio"
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
    description: "Drop, resize, and align necks on a clean, minimal workspace."
  },
  {
    title: "Scale and mode library",
    description: "Search by key, shape, or position to highlight intervals fast."
  },
  {
    title: "Export-ready layouts",
    description: "Preview page outlines that match the final PNG/PDF output."
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
            <h1>Design clean, printable guitar neck diagrams in minutes.</h1>
            <p>
              Neck Diagram Studio is a focused guitar neck diagram builder for scale maps and
              practice grids. Drop necks on a blank page, annotate with interval labels, and
              export layouts that match your print or share flow.
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
