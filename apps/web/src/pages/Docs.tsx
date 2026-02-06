import { type ReactNode } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Link, usePathname } from "../lib/router";
import userGuide from "../../../../docs/USER_GUIDE.md?raw";

type TocItem = { id: string; label: string };

const slugify = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const extractTitle = (markdown: string) => {
  const match = markdown.match(/^#\s+(.+)$/m);
  return match?.[1]?.trim() || "User Guide";
};

const extractLastUpdated = (markdown: string) => {
  const match = markdown.match(/^Last updated:\s*(.+)$/m);
  return match?.[1]?.trim() || "Unknown";
};

const extractToc = (markdown: string): TocItem[] =>
  markdown
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.startsWith("## "))
    .map((line) => {
      const label = line.replace(/^##\s+/, "").trim();
      return { id: slugify(label), label };
    });

const getText = (node: ReactNode): string => {
  if (typeof node === "string") return node;
  if (typeof node === "number") return `${node}`;
  if (Array.isArray(node)) return node.map(getText).join("");
  if (node && typeof node === "object" && "props" in node) {
    const props = node as { props?: { children?: ReactNode } };
    return getText(props.props?.children ?? "");
  }
  return "";
};

const title = extractTitle(userGuide);
const lastUpdated = extractLastUpdated(userGuide);
const tocItems = extractToc(userGuide);
const markdownBody = userGuide
  .replace(/^#\s+.+\n?/m, "")
  .replace(/^Last updated:.*\n?/m, "")
  .trim();

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
          <h1>{title}</h1>
          <p>
            This page renders the markdown in <code>docs/USER_GUIDE.md</code> so the docs stay
            aligned with shipped features.
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
            <span>Last updated: {lastUpdated}</span>
            <span>Source: docs/USER_GUIDE.md</span>
          </div>
        </header>

        <section className="docs-layout">
          <aside className="docs-toc">
            <div className="docs-toc-title">On this page</div>
            <nav className="docs-toc-links">
              {tocItems.length === 0 ? (
                <span className="docs-toc-note">No sections found.</span>
              ) : (
                tocItems.map((item) => (
                  <a key={item.id} href={`#${item.id}`} className="docs-toc-link">
                    {item.label}
                  </a>
                ))
              )}
            </nav>
            <div className="docs-toc-note">
              Looking for developer docs? See the `/docs` folder in the repository.
            </div>
          </aside>

          <div className="docs-body">
            <article className="docs-markdown">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  h1: () => null,
                  h2: ({ node, children, ...props }) => {
                    const text = getText(children);
                    return (
                      <h2 id={slugify(text)} {...props}>
                        {children}
                      </h2>
                    );
                  },
                  h3: ({ node, children, ...props }) => {
                    const text = getText(children);
                    return (
                      <h3 id={slugify(text)} {...props}>
                        {children}
                      </h3>
                    );
                  },
                  a: ({ node, href, children, ...props }) => {
                    const isExternal = href?.startsWith("http");
                    return (
                      <a
                        href={href}
                        target={isExternal ? "_blank" : undefined}
                        rel={isExternal ? "noreferrer" : undefined}
                        {...props}
                      >
                        {children}
                      </a>
                    );
                  },
                  code: ({ node, inline, className, children, ...props }) => {
                    if (inline) {
                      return (
                        <code className="docs-inline-code" {...props}>
                          {children}
                        </code>
                      );
                    }
                    return (
                      <pre className="docs-code">
                        <code className={className} {...props}>
                          {children}
                        </code>
                      </pre>
                    );
                  }
                }}
              >
                {markdownBody}
              </ReactMarkdown>
            </article>
          </div>
        </section>
      </main>
    </div>
  );
};

export default DocsPage;
