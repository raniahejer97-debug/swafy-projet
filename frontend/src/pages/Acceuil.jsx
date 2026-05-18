import { Link } from "react-router-dom";
import "./Acceuil.css";
import { useEffect, useState } from "react";
import api from "../services/api";
import PublicationCard from "../components/PublicationCard";

import {
  FiArrowRight,
  FiClock,
  FiCpu,
  FiShield,
  FiMessageCircle,
  FiZap,
} from "react-icons/fi";

/* ✅ BRAND */
function Brand() {
  return (
    <div className="brand">
      <div className="brandDot" />
      <span>SWAFY</span>
    </div>
  );
}

/* ✅ HERO SVG */
function HeroIllustration() {
  return (
    <img 
      src="/swa.png" 
      alt="logo" 
      className="heroImage"
    />
  );
}



/* ✅ MAIN PAGE */
export default function Acceuil() {
  const [publications, setPublications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadPublications();
  }, []);

  const loadPublications = async () => {
    try {
      console.log("📥 Loading public publications...");
      
      const res = await api.get("/publications/public");
      
      console.log("✅ Publications loaded:", res.data);
      setPublications(res.data || []);
      setError(null);
    } catch (err) {
      console.error("❌ Error loading publications:", err);
      setError("Failed to load publications");
      setPublications([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page" id="acceuil">
      {/* ✅ NAVBAR */}
     

      {/* ✅ HERO */}
      <section className="hero">
        <div className="container heroGrid">
          <div className="heroText">
            <h1>Science With and For Youth</h1>
            <p>Share your knowledge, engage in debates, and inspire the next generation</p>
          </div>
          <div className="heroArt">
            <HeroIllustration />
          </div>
        </div>
      </section>

      {/* ✅ PUBLICATIONS PUBLIC */}
      <section className="section">
        <div className="container">
          <h2> Les Publications Disponibles </h2>

          {error && (
            <div style={{
              padding: "16px",
              background: "#fee",
              color: "#c33",
              borderRadius: "8px",
              marginBottom: "20px"
            }}>
              ⚠️ {error}
            </div>
          )}

          {loading && (
            <div style={{ textAlign: "center", padding: "40px" }}>
              <div className="spinner" />
              <p>Loading publications...</p>
            </div>
          )}

          {!loading && publications.length === 0 && (
            <div style={{ textAlign: "center", padding: "40px", color: "#999" }}>
              <p>No publications yet. Be the first to share! 📝</p>
            </div>
          )}

          {/* ✅ FEED SOCIAL */}
          {!loading && publications.length > 0 && (
            <div className="feed">
              {publications.map((pub) => (
                <PublicationCard
                  key={pub.id_publication}
                  publication={pub}
                  onUpdate={() => {
                    loadPublications();
                  }}
                />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ✅ FOOTER */}
      <footer className="footer">
        <div className="container">
          <Brand />
          <p>© {new Date().getFullYear()} SWAFY - Science With and For Youth</p>
        </div>
      </footer>
    </div>
  );
}