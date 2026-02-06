import { Link, usePathname } from "../lib/router";

const TOC_ITEMS = [
  { id: "overview", label: "Overview" },
  { id: "quickstart", label: "Quick start" },
  { id: "concepts", label: "Core concepts" },
  { id: "diagram-workflows", label: "Diagram workflows" },
  { id: "labels-theory", label: "Labels & theory" },
  { id: "layout", label: "Layout & appearance" },
  { id: "import-export", label: "Import & export" },
  { id: "autosave", label: "Auto-save & recovery" },
  { id: "shortcuts", label: "Shortcuts" },
  { id: "troubleshooting", label: "Troubleshooting" },
  { id: "faq", label: "FAQ" }
];

const CONCEPT_CARDS = [
  {
    title: "Project",
    description:
      "Your full workspace. The studio auto-saves when the API is reachable and caches locally when offline."
  },
  {
    title: "Tab",
    description:
      "A page inside the project. Use tabs for alternate layouts, positions, or lesson pages."
  },
  {
    title: "Diagram",
    description:
      "A single neck diagram that you can move, resize, label, and export independently."
  },
  {
    title: "Library",
    description:
      "Searchable keys, scales/modes, and positions used for labeling and diagram creation."
  },
  {
    title: "Label mode",
    description:
      "Controls whether notes show key names, intervals, or picking directions."
  },
  {
    title: "Notes",
    description:
      "Click on the fretboard to toggle notes. In picking mode, clicks cycle D → U → off."
  }
];

const EXPORT_ROWS = [
  {
    format: "Diagram PNG",
    scope: "Selected diagram",
    useCase: "High-resolution images for slides, handouts, or reference sheets."
  },
  {
    format: "Diagram JSON",
    scope: "Selected diagram",
    useCase: "Reuse a single diagram in another project."
  },
  {
    format: "Page PDF / PNG",
    scope: "Active tab",
    useCase: "Printable page of your arranged diagrams."
  },
  {
    format: "Page JSON",
    scope: "Active tab",
    useCase: "Backup or transfer a full tab layout."
  }
];

const SHORTCUT_ROWS = [
  { keys: "Escape", action: "Clear the current selection." },
  { keys: "Delete / Backspace", action: "Delete the selected diagram or tab." },
  { keys: "Cmd/Ctrl + /", action: "Toggle the sidebar." },
  { keys: "Alt + drag", action: "Resize the selected diagram." },
  { keys: "Alt + Shift + drag", action: "Scale the selected diagram proportionally." }
];

const DocsPage = () => {
  const pathname = usePathname();
  const isActive = (path: string) => pathname === path;

  return (
    <div className="docs-page">
      <nav className="docs-nav">
        <div className="docs-brand">
          <div className="docs-logo">NDS</div>
          <div>
            <div className="docs-title">Neck Diagram Studio</div>
            <div className="docs-subtitle">Documentation</div>
          </div>
        </div>
        <div className="docs-nav-links">
          <Link
            to="/"
            className={`docs-link${isActive("/") ? " is-active" : ""}`}
            aria-current={isActive("/") ? "page" : undefined}
          >
            Home
          </Link>
          <Link
            to="/demo"
            className={`docs-link${isActive("/demo") ? " is-active" : ""}`}
            aria-current={isActive("/demo") ? "page" : undefined}
          >
            Demo
          </Link>
          <Link
            to="/docs"
            className={`docs-link${isActive("/docs") ? " is-active" : ""}`}
            aria-current={isActive("/docs") ? "page" : undefined}
          >
            Docs
          </Link>
        </div>
        <div className="docs-nav-cta">
          <Link to="/app" className="cta-button primary">
            Open Studio
          </Link>
        </div>
      </nav>

      <main className="docs-content">
        <header className="docs-hero">
          <div className="docs-pill">User Guide</div>
          <h1>Build, label, and export neck diagrams with confidence.</h1>
          <p>
            This documentation reflects the current web app behavior. It focuses on fast setup,
            repeatable workflows, and practical export paths for lessons or practice materials.
          </p>
          <div className="docs-hero-actions">
            <Link to="/app" className="cta-button primary">
              Start in the Studio
            </Link>
            <Link to="/demo" className="cta-button ghost">
              Explore the Demo
            </Link>
          </div>
          <div className="docs-meta">
            Last updated: February 6, 2026
            <span>Version: 0.1 Preview</span>
          </div>
        </header>

        <section className="docs-layout">
          <aside className="docs-toc">
            <div className="docs-toc-title">On this page</div>
            <nav className="docs-toc-links">
              {TOC_ITEMS.map((item) => (
                <a key={item.id} href={`#${item.id}`} className="docs-toc-link">
                  {item.label}
                </a>
              ))}
            </nav>
            <div className="docs-toc-note">
              Looking for developer docs? See the `/docs` folder in the repository.
            </div>
          </aside>

          <div className="docs-body">
            <section id="overview" className="docs-section">
              <h2>Overview</h2>
              <p>
                Neck Diagram Studio is a browser-based workspace for building guitar neck
                diagrams, laying them out on printable pages, and exporting clean assets.
              </p>
              <div className="docs-grid">
                <div className="docs-card">
                  <h3>Design layouts</h3>
                  <p>Arrange multiple diagrams on a single tab with drag-and-drop control.</p>
                </div>
                <div className="docs-card">
                  <h3>Label with theory</h3>
                  <p>Apply keys, scales, and positions to highlight and label notes quickly.</p>
                </div>
                <div className="docs-card">
                  <h3>Export with confidence</h3>
                  <p>Export diagram or full-page assets as PNG, PDF, or JSON.</p>
                </div>
              </div>
            </section>

            <section id="quickstart" className="docs-section">
              <h2>Quick start</h2>
              <ol className="docs-list">
                <li>Open `/app` to start a new project or `/demo` to explore the sandbox.</li>
                <li>Click `Add Neck` to place a blank diagram on the canvas.</li>
                <li>Pick a key, scale/mode, and position in the **Theory** panel.</li>
                <li>Click the fretboard to toggle notes.</li>
                <li>Drag diagrams to arrange the page layout.</li>
                <li>Use `Export` to save PNG, PDF, or JSON files.</li>
              </ol>
              <div className="docs-callout">
                Demo mode resets on refresh. Use `/app` if you need persistent storage.
              </div>
            </section>

            <section id="concepts" className="docs-section">
              <h2>Core concepts</h2>
              <div className="docs-grid">
                {CONCEPT_CARDS.map((card) => (
                  <div key={card.title} className="docs-card">
                    <h3>{card.title}</h3>
                    <p>{card.description}</p>
                  </div>
                ))}
              </div>
            </section>

            <section id="diagram-workflows" className="docs-section">
              <h2>Diagram workflows</h2>
              <div className="docs-split">
                <div>
                  <h3>Create</h3>
                  <ul className="docs-list">
                    <li>Use `Add Neck` to insert a blank diagram.</li>
                    <li>Use `Create Diagram` in **Theory** to build from the selected key/scale.</li>
                    <li>Use `Replace Diagram` to refresh the selected diagram without moving it.</li>
                  </ul>
                </div>
                <div>
                  <h3>Edit</h3>
                  <ul className="docs-list">
                    <li>Drag to move. Hold `Alt` to resize, `Alt + Shift` to scale.</li>
                    <li>Double-click the caption to rename a diagram.</li>
                    <li>Drag a diagram into the **Trash** zone or use `Delete` to remove it.</li>
                    <li>Drag a diagram onto a tab button to move it between tabs.</li>
                  </ul>
                </div>
              </div>
            </section>

            <section id="labels-theory" className="docs-section">
              <h2>Labels & theory</h2>
              <p>
                Use the **Theory** panel to choose a key, scale/mode, and position. These defaults
                apply to new diagrams and drive interval labeling and scale highlighting.
              </p>
              <ul className="docs-list">
                <li>`Key` mode displays note names (C, D#, etc.).</li>
                <li>`Interval` mode displays scale intervals (1, b3, 5, etc.).</li>
                <li>`Picking` mode cycles `D` → `U` → off with each click.</li>
              </ul>
            </section>

            <section id="layout" className="docs-section">
              <h2>Layout & appearance</h2>
              <div className="docs-split">
                <div>
                  <h3>Instrument settings</h3>
                  <ul className="docs-list">
                    <li>Change string count and tuning for the selected diagram.</li>
                    <li>Set fret count, capo position, and highlight root notes.</li>
                    <li>8-string tuning presets appear when strings = 8.</li>
                  </ul>
                </div>
                <div>
                  <h3>Display settings</h3>
                  <ul className="docs-list">
                    <li>Toggle standard tuning display vs. custom tuning.</li>
                    <li>Show or hide fret numbers and inlays.</li>
                    <li>Enable snap-to-grid for consistent spacing.</li>
                  </ul>
                </div>
              </div>
              <div className="docs-callout">
                Themes and preferences live in the **Settings** panel. Try multiple themes before
                exporting to match your print style.
              </div>
            </section>

            <section id="import-export" className="docs-section">
              <h2>Import & export</h2>
              <table className="docs-table">
                <thead>
                  <tr>
                    <th>Format</th>
                    <th>Scope</th>
                    <th>Best for</th>
                  </tr>
                </thead>
                <tbody>
                  {EXPORT_ROWS.map((row) => (
                    <tr key={row.format}>
                      <td>{row.format}</td>
                      <td>{row.scope}</td>
                      <td>{row.useCase}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <ul className="docs-list">
                <li>Diagram exports require a selected diagram.</li>
                <li>Page exports require at least one diagram on the active tab.</li>
                <li>Diagram JSON imports add diagrams to the active tab.</li>
                <li>Page JSON imports merge tabs and diagrams into the current project.</li>
              </ul>
            </section>

            <section id="autosave" className="docs-section">
              <h2>Auto-save & recovery</h2>
              <ul className="docs-list">
                <li>Projects auto-save to the API when it is reachable.</li>
                <li>The latest project is cached locally for offline recovery.</li>
                <li>Demo mode does not persist changes and resets on refresh.</li>
              </ul>
            </section>

            <section id="shortcuts" className="docs-section">
              <h2>Shortcuts</h2>
              <table className="docs-table">
                <thead>
                  <tr>
                    <th>Keys</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {SHORTCUT_ROWS.map((row) => (
                    <tr key={row.keys}>
                      <td>{row.keys}</td>
                      <td>{row.action}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>

            <section id="troubleshooting" className="docs-section">
              <h2>Troubleshooting</h2>
              <ul className="docs-list">
                <li>
                  Export buttons are disabled: select a diagram (diagram export) or add one to the
                  tab (page export).
                </li>
                <li>
                  Changes do not persist: the app may be offline. Your last project is cached
                  locally for recovery.
                </li>
                <li>
                  Notes do not toggle: ensure the diagram is selected and click directly on the
                  fretboard surface.
                </li>
              </ul>
            </section>

            <section id="faq" className="docs-section">
              <h2>FAQ</h2>
              <div className="docs-grid">
                <div className="docs-card">
                  <h3>Does the demo save my work?</h3>
                  <p>No. Demo edits reset on refresh. Use `/app` for persistent projects.</p>
                </div>
                <div className="docs-card">
                  <h3>Can I export a single diagram?</h3>
                  <p>Yes. Use Diagram PNG or Diagram JSON from the Export menu.</p>
                </div>
                <div className="docs-card">
                  <h3>What file formats are supported?</h3>
                  <p>PNG, PDF, and JSON are supported for diagram and page exports.</p>
                </div>
              </div>
            </section>
          </div>
        </section>
      </main>
    </div>
  );
};

export default DocsPage;
