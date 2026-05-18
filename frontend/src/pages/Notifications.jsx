  import React, { useEffect, useState } from "react";
  import { useNavigate } from "react-router-dom";
  import API from "../services/api";
  import "./Notifications.css";

  /* ── icône selon le type de notification ── */
  const ICONS = {
    new_post:             "📢",
    publication_comment:  "💬",
    publication_reaction: "❤️",
    debat_vote:           "⚖️",
    comment_reaction:     "👍",
    enquete:              "📋",
    message:              "✉️",
    live:                 "🎥",
    live_created:         "🎥",
    new_live:             "🎥",
  };

  /* ── couleur de fond de la pastille ── */
  const BADGE_COLORS = {
    new_post:             "#6366f1",
    publication_comment:  "#3b82f6",
    publication_reaction: "#ef4444",
    debat_vote:           "#8b5cf6",
    comment_reaction:     "#f59e0b",
    enquete:              "#10b981",
    message:              "#0ea5e9",
    live:                 "#f97316",
    live_created:         "#f97316",
    new_live:             "#f97316",
  };

  /* ── temps relatif ── */
  function timeAgo(date) {
    const diff  = Date.now() - new Date(date).getTime();
    const mins  = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days  = Math.floor(diff / 86400000);
    if (mins  < 1)  return "À l'instant";
    if (mins  < 60) return `Il y a ${mins} min`;
    if (hours < 24) return `Il y a ${hours}h`;
    return `Il y a ${days}j`;
  }

  export default function Notifications({ onBack }) {
    const [notifications, setNotifications] = useState([]);
    const [loading,       setLoading]       = useState(true);
    const navigate = useNavigate();

    const backendUrl =
      import.meta.env.VITE_API_URL ||
      "https://debat-jeune-production.up.railway.app";

    /* ── fetch ── */
   useEffect(() => {
  (async () => {
    try {
      const res = await API.get("/notifications");

      console.log("✅ NOTIF RESPONSE:", res.data);

      const data = res.data.notifications || [];

      const formatted = data.map(n => ({
        ...n,
        is_read: !!n.is_read
      }));

      setNotifications(formatted);

    } catch (err) {
      console.error("❌ Erreur notifications", err);
    } finally {
      setLoading(false);
    }
  })();
}, []);

    /* ── marquer une notif lue + naviguer ── */
    const handleClick = async (n) => {
      /* marquer comme lu si pas encore lu */
      if (!n.is_read) {
        try {
          await API.put(`/notifications/${n.id_notification}/read`);
          setNotifications(prev =>
            prev.map(x =>
              x.id_notification === n.id_notification ? { ...x, is_read: 1 } : x
            )
          );
        } catch (err) {
          console.error("Mark read error", err);
        }
      }

      /* navigation selon le type */
      const id = n.entity_id || n.reference_id;
      const type = n.type_notification || n.type;

      if (!id) return;

      switch (type) {
        case "new_post":
        case "publication_comment":
        case "publication_reaction":
          navigate(`/jeune?publication=${id}`);
          break;

        case "comment_reaction":
          navigate(`/jeune?publication=${id}`);
          break;

        case "debat_vote":
          navigate(`/debat/${id}`);
          break;

        case "enquete":
          navigate(`/enquete/${id}`);
          break;

        case "message":
          navigate("/messenger");
          break;

        case "live":
        case "live_created":
        case "new_live":
          navigate(`/live/${id}`);
          break;

        default:
          break;
      }
    };

    /* ── tout marquer lu ── */
    const markAllRead = async () => {
      try {
        await API.put("/notifications/read-all");
        setNotifications(prev => prev.map(n => ({ ...n, is_read: 1 })));
      } catch (err) {
        console.error("markAllRead error", err);
      }
    };

    const unreadCount = notifications.filter(n => !n.is_read).length;

    /* ── avatar ── */
    const getAvatar = (n) => {
      if (n.photo_user) return `${backendUrl}/${n.photo_user}`;
      return null;
    };

    const getInitials = (n) => {
      const name = n.nom_user || n.prenom_user || "?";
      return name[0].toUpperCase();
    };

    /* ══════════════════════════════════════
      RENDER
    ══════════════════════════════════════ */
    return (
      <div className="notif-page-container">
        <div className="notif-card">

          {/* ── Header ── */}
        {/* ── Header ── */}
  <div className="notif-header">
    <div className="notif-header-left">
      <button className="notif-back-btn" onClick={onBack}>←</button>
      <div>
        <h2 className="notif-title">
          Notifications
          {unreadCount > 0 && (
            <span className="notif-badge">{unreadCount}</span>
          )}
        </h2>
      </div>
    </div>
    {unreadCount > 0 && (
      <button className="notif-mark-all" onClick={markAllRead}>
        Tout lire
      </button>
    )}
  </div>

          {/* ── Content ── */}
          {loading ? (
            <div className="notif-empty">
              <span className="notif-empty-ico">⏳</span>
              <p>Chargement…</p>
            </div>
          ) : notifications.length === 0 ? (
            <div className="notif-empty">
              <span className="notif-empty-ico">🔔</span>
              <p className="notif-empty-title">Aucune notification</p>
              <p className="notif-empty-sub">Vous serez notifié des nouvelles activités</p>
            </div>
          ) : (
            <div className="notif-list">
              {notifications.map((n, idx) => {
                const type    = n.type_notification || n.type || "";
                const icon    = ICONS[type]        || "🔔";
                const color   = BADGE_COLORS[type] || "#6366f1";
                const avatar  = getAvatar(n);
                const isLast  = idx === notifications.length - 1;

                return (
                  <div
                    key={n.id_notification}
                    className={`notif-item${!n.is_read ? " unread" : ""}${isLast ? " notif-item-last" : ""}`}
                    onClick={() => handleClick(n)}
                  >
                    {/* Avatar */}
                    <div className="notif-avatar-wrap">
                      {avatar ? (
                        <img
                          src={avatar}
                          alt="user"
                          className="notif-img"
                          onError={e => { e.target.style.display = "none"; e.target.nextSibling.style.display = "flex"; }}
                        />
                      ) : null}
                      <div
                        className="notif-initials"
                        style={{ background: color, display: avatar ? "none" : "flex" }}
                      >
                        {getInitials(n)}
                      </div>
                      <span className="notif-type-badge" style={{ background: color }}>
                        {icon}
                      </span>
                    </div>

                    {/* Text */}
                    <div className="notif-text">
                      <p className="notif-message">
                        {(n.nom_user || n.prenom_user) && (
                          <strong>{n.nom_user} {n.prenom_user} </strong>
                        )}
                        <span>{n.message}</span>
                      </p>
                      <span className="notif-date">
                        {timeAgo(n.created_at || n.date_creation)}
                      </span>
                    </div>

                    {/* Unread dot */}
                    {!n.is_read && <div className="blue-dot" />}
                  </div>
                );
              })}
            </div>
          )}

        </div>
      </div>
    );
  }
