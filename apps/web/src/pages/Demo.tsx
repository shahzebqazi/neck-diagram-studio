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
      <div className="demo-stage">
        <App mode="demo" />
      </div>
    </div>
  );
};

export default DemoPage;
