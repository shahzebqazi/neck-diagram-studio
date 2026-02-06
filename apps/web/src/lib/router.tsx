import { useEffect, useState, type MouseEvent, type ReactNode } from "react";

const ensureLeadingSlash = (path: string) => (path.startsWith("/") ? path : `/${path}`);

const normalizePath = (path: string) => {
  if (!path || path === "/index.html") return "/";
  const withSlash = ensureLeadingSlash(path);
  if (withSlash.length > 1 && withSlash.endsWith("/")) return withSlash.slice(0, -1);
  return withSlash;
};

const rawBasePath = import.meta.env.BASE_URL ?? "/";
const basePath = rawBasePath === "/" ? "" : rawBasePath.replace(/\/$/, "");

const splitPathAndSuffix = (value: string) => {
  const match = value.match(/^[^?#]*/);
  const path = match ? match[0] : value;
  return { path, suffix: value.slice(path.length) };
};

const withBase = (path: string) => {
  const normalized = normalizePath(path);
  if (!basePath) return normalized;
  if (normalized === "/") return `${basePath}/`;
  return `${basePath}${normalized}`;
};

const stripBase = (path: string) => {
  const normalized = normalizePath(path);
  if (!basePath) return normalized;
  if (normalized === basePath) return "/";
  if (normalized.startsWith(`${basePath}/`)) {
    return normalizePath(normalized.slice(basePath.length));
  }
  return normalized;
};

export const getPathname = () => {
  if (typeof window === "undefined") return "/";
  return stripBase(window.location.pathname || "/");
};

export const navigate = (to: string) => {
  if (typeof window === "undefined") return;
  const { path, suffix } = splitPathAndSuffix(to);
  const target = normalizePath(path);
  const current = getPathname();
  if (current === target && !suffix) return;
  window.history.pushState({}, "", `${withBase(target)}${suffix}`);
  window.dispatchEvent(new PopStateEvent("popstate"));
};

export const usePathname = () => {
  const [pathname, setPathname] = useState(getPathname());

  useEffect(() => {
    const handle = () => setPathname(getPathname());
    window.addEventListener("popstate", handle);
    return () => window.removeEventListener("popstate", handle);
  }, []);

  return pathname;
};

type LinkProps = {
  to: string;
  className?: string;
  children: ReactNode;
  onClick?: (event: MouseEvent<HTMLAnchorElement>) => void;
};

export const Link = ({ to, className, children, onClick }: LinkProps) => {
  const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
    onClick?.(event);
    if (event.defaultPrevented) return;
    if (event.button !== 0 || event.metaKey || event.altKey || event.ctrlKey || event.shiftKey) {
      return;
    }
    event.preventDefault();
    navigate(to);
  };

  return (
    <a href={withBase(to)} className={className} onClick={handleClick}>
      {children}
    </a>
  );
};
