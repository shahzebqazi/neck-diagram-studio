import { useEffect, useRef, useState } from "react";
import { Link } from "../lib/router";

const FEATURES = [
  {
    title: "Scale + interval labeling",
    description:
      "Label every note by key name or interval. Switch between views to build a clear reference for any scale or mode.",
    gif: "/screenshots/shape-sharing-themes.gif",
    still: "/screenshots/shape-sharing/oled-blackout.png"
  },
  {
    title: "Full studio workspace",
    description:
      "A sidebar with theory controls, a zoomable canvas, and configurable diagrams — all in one place.",
    gif: "/screenshots/sidebar-themes.gif",
    still: "/screenshots/sidebar/oled-blackout.png"
  },
  {
    title: "Worksheets + presets",
    description:
      "Load bundled worksheets for shape sharing, sweep arpeggios, and harmonic minor modes — or build your own.",
    gif: "/screenshots/harmonic-minor-themes.gif",
    still: "/screenshots/harmonic-minor/oled-blackout.png"
  }
];

const STEPS = [
  {
    num: "01",
    title: "Open a project",
    description: "Start with a blank canvas or load a bundled worksheet."
  },
  {
    num: "02",
    title: "Label + arrange",
    description: "Pick keys, scales, and positions. Drag diagrams into layout."
  },
  {
    num: "03",
    title: "Export + share",
    description: "Export the page or individual diagrams as PNG, PDF, or JSON."
  }
];

const USE_CASES = [
  {
    title: "Practice charts",
    description: "Build a scale map for focused daily routines."
  },
  {
    title: "Teaching handouts",
    description: "Print clean diagrams students can actually read."
  },
  {
    title: "Song mapping",
    description: "Map intervals and positions across the full neck."
  }
];

function useReveal() {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.15 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return { ref, className: `reveal${visible ? " is-visible" : ""}` };
}

const LandingPage = () => {
  const feature0 = useReveal();
  const feature1 = useReveal();
  const feature2 = useReveal();
  const stepsReveal = useReveal();
  const useCasesReveal = useReveal();
  const ctaReveal = useReveal();
  const featureReveals = [feature0, feature1, feature2];

  useEffect(() => {
    document.documentElement.dataset.theme = "oled-blackout";
    return () => {
      const stored = localStorage.getItem("neck-diagram:theme");
      if (stored) document.documentElement.dataset.theme = stored;
    };
  }, []);

  return (
    <div className="lp">
      <nav className="lp-nav">
        <div className="lp-brand">
          <div className="lp-logo">NDS</div>
          <span className="lp-wordmark">Neck Diagram Studio</span>
        </div>
        <div className="lp-nav-links">
          <Link to="/docs" className="lp-link">
            Docs
          </Link>
          <a
            className="lp-link"
            href="https://gitlab.com/destroyerofworlds/neck-diagram-studio"
            target="_blank"
            rel="noreferrer"
          >
            Source
          </a>
          <Link to="/app" className="lp-cta">
            Open Studio
          </Link>
        </div>
      </nav>

      <header className="lp-hero">
        <div className="lp-hero-bg" aria-hidden="true" />
        <div className="lp-hero-inner">
          <div className="lp-hero-copy">
            <h1 className="lp-headline">
              Build clear guitar neck diagrams in&nbsp;minutes.
            </h1>
            <p className="lp-subline">
              A free studio for scale charts, interval maps, and teaching
              handouts. Label fretboard notes, arrange diagrams, and export
              print&#8209;ready pages.
            </p>
            <div className="lp-hero-actions">
              <Link to="/app" className="lp-btn lp-btn--primary">
                Start a Project
              </Link>
            </div>
            <div className="lp-hero-meta">
              <span>Auto&#8209;saves</span>
              <span>Local recovery</span>
              <span>PNG &middot; PDF &middot; JSON</span>
            </div>
          </div>
          <div className="lp-hero-visual">
            <div className="lp-phone">
              <img
                src="/screenshots/sweep-arpeggios-themes.gif"
                alt="Neck Diagram Studio — 8-string sweep arpeggios cycling through all themes"
                draggable={false}
              />
            </div>
          </div>
        </div>
      </header>

      <section className="lp-features">
        {FEATURES.map((feature, i) => {
          const r = featureReveals[i];
          const reversed = i % 2 === 1;
          return (
            <div
              key={feature.title}
              ref={r.ref}
              className={`lp-feature${reversed ? " lp-feature--reversed" : ""} ${r.className}`}
            >
              <div className="lp-feature-copy">
                <h2>{feature.title}</h2>
                <p>{feature.description}</p>
              </div>
              <div className="lp-feature-visual">
                <div className="lp-phone">
                  <img
                    src={feature.gif}
                    alt={feature.title}
                    draggable={false}
                    loading="lazy"
                  />
                </div>
              </div>
            </div>
          );
        })}
      </section>

      <section ref={stepsReveal.ref} className={`lp-steps ${stepsReveal.className}`}>
        <h2 className="lp-section-title">How it works</h2>
        <div className="lp-steps-grid">
          {STEPS.map((step) => (
            <div key={step.num} className="lp-step">
              <span className="lp-step-num">{step.num}</span>
              <h3>{step.title}</h3>
              <p>{step.description}</p>
            </div>
          ))}
        </div>
      </section>

      <section ref={useCasesReveal.ref} className={`lp-cases ${useCasesReveal.className}`}>
        <h2 className="lp-section-title">Built for</h2>
        <div className="lp-cases-grid">
          {USE_CASES.map((uc) => (
            <div key={uc.title} className="lp-case">
              <h3>{uc.title}</h3>
              <p>{uc.description}</p>
            </div>
          ))}
        </div>
      </section>

      <section ref={ctaReveal.ref} className={`lp-final ${ctaReveal.className}`}>
        <h2>Ready to build?</h2>
        <Link to="/app" className="lp-btn lp-btn--primary">
          Open Studio
        </Link>
      </section>

      <footer className="lp-footer">
        <div className="lp-footer-links">
          <Link to="/docs">Docs</Link>
          <a
            href="https://gitlab.com/destroyerofworlds/neck-diagram-studio"
            target="_blank"
            rel="noreferrer"
          >
            GitLab
          </a>
          <a href="https://iconoclastaud.io/" target="_blank" rel="noreferrer">
            iconoclastaud.io
          </a>
        </div>
        <span className="lp-footer-version">v0.1 Preview</span>
      </footer>
    </div>
  );
};

export default LandingPage;
