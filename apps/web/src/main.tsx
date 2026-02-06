import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import DocsPage from "./pages/Docs";
import DemoPage from "./pages/Demo";
import LandingPage from "./pages/Landing";
import { usePathname } from "./lib/router";
import "./styles.css";

const Router = () => {
  const pathname = usePathname();

  if (pathname === "/demo") {
    return <DemoPage />;
  }

  if (pathname === "/docs") {
    return <DocsPage />;
  }

  if (pathname === "/app") {
    return <App />;
  }

  return <LandingPage />;
};

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <Router />
  </React.StrictMode>
);
