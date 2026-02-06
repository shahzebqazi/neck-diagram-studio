import { useEffect, useState, type MouseEvent, type ReactNode } from "react";

const normalizePath = (path: string) => {
  if (!path || path === "/index.html") return "/";
  if (path.length > 1 && path.endsWith("/")) return path.slice(0, -1);
  return path;
};

export const getPathname = () => {
  if (typeof window === "undefined") return "/";
  return normalizePath(window.location.pathname || "/");
};

export const navigate = (to: string) => {
  if (typeof window === "undefined") return;
  const target = normalizePath(to);
  const current = normalizePath(window.location.pathname || "/");
  if (current === target) return;
  window.history.pushState({}, "", target);
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
    <a href={to} className={className} onClick={handleClick}>
      {children}
    </a>
  );
};
