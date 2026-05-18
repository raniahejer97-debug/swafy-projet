import React, { useEffect, useMemo, useRef, useState } from "react";
import "./PublicationCard.css";
import api from "../services/api";

export default function PublicationCard({ publication, onUpdate, defaultShowComments = false }) {
  const [comments, setComments] = useState([]);
  const [showComments, setShowComments] = useState(defaultShowComments);
  const [newComment, setNewComment] = useState("");
  const [loadingComment, setLoadingComment] = useState(false);

  // reactions
  const [showReactions, setShowReactions] = useState(false);
  const [myReaction, setMyReaction] = useState(null);
  const [reactionsCount, setReactionsCount] = useState(publication.reactions_count || 0);
  const [reactions, setReactions] = useState(
    publication.reactions || { like: 0, love: 0, haha: 0, wow: 0, sad: 0, angry: 0 }
  );

  const [commentsCount, setCommentsCount] = useState(publication.comments_count || 0);

  const reactionsRef = useRef(null);

  useEffect(() => {
    // update local states if publication prop changes
    setReactionsCount(publication.reactions_count || 0);
    setReactions(publication.reactions || { like: 0, love: 0, haha: 0, wow: 0, sad: 0, angry: 0 });
    setCommentsCount(publication.comments_count || 0);
  }, [publication]);

  useEffect(() => {
    const onDocClick = (e) => {
      if (!reactionsRef.current) return;
      if (!reactionsRef.current.contains(e.target)) setShowReactions(false);
    };
    document.addEventListener("click", onDocClick);
    return () => document.removeEventListener("click", onDocClick);
  }, []);

  const API_ORIGIN = useMemo(() => {
    // helps rendering medias with correct absolute url
    const base = api?.defaults?.baseURL || "";
    // if your baseURL is like http://localhost:5000/api => origin becomes http://localhost:5000
    return base.replace(/\/api\/?$/, "");
  }, []);

  const getMediaUrl = (url) => {
    if (!url) return "";
    if (/^https?:\/\//i.test(url)) return url;
    return `${API_ORIGIN}${url}`;
  };

  const authorName = `${publication.nom_user || "Unknown"} ${publication.prenom_user || ""}`.trim();
  const pubDate = publication.date_publication
    ? new Date(publication.date_publication).toLocaleDateString()
    : "";

  const loadComments = async () => {
    try {
      const res = await api.get(`/publications/${publication.id_publication}/comments`);
      const arr = res.data || [];
      setComments(arr);
      setCommentsCount(arr.length);
    } catch (err) {
      console.error("❌ Error loading comments:", err);
    }
  };

  const handleCommentClick = async () => {
    const next = !showComments;
    setShowComments(next);
    if (next) await loadComments();
  };

  const handleAddComment = async () => {
    if (!newComment.trim()) return;

    setLoadingComment(true);
    try {
      const res = await api.post(`/publications/${publication.id_publication}/comments`, {
        contenu_commentaire: newComment.trim(),
        type_commentaire: "texte",
      });

      setNewComment("");
      // Optimistic update
      if (res.data) {
        setComments((prev) => [res.data, ...prev]);
        setCommentsCount((c) => c + 1);
      } else {
        await loadComments();
      }
      onUpdate?.();
    } catch (err) {
      console.error("❌ Error adding comment:", err);
      // غالباً 401 إذا user موش logged in
    } finally {
      setLoadingComment(false);
    }
  };

  const react = async (type) => {
    try {
      const res = await api.post(`/publications/${publication.id_publication}/reactions`, {
        type_reaction: type,
      });

      setReactionsCount(res.data?.reactions_count ?? reactionsCount);
      setReactions(res.data?.reactions ?? reactions);
      setMyReaction(res.data?.reacted ? type : null);
      setShowReactions(false);
      onUpdate?.();
    } catch (err) {
      console.error("❌ Error reacting:", err);
      // غالباً 401 إذا user موش logged in
    }
  };

  const topReactions = useMemo(() => {
    const entries = Object.entries(reactions || {});
    entries.sort((a, b) => (b[1] || 0) - (a[1] || 0));
    return entries.filter(([, c]) => (c || 0) > 0).slice(0, 3);
  }, [reactions]);

  return (
    <div className="publication-card">
      {/* Header */}
      <div className="pub-header">
        <div className="pub-author">
          <div className="avatar">{(publication.nom_user?.[0] || "?").toUpperCase()}</div>
          <div>
            <h3>{authorName}</h3>
            <small>{pubDate}</small>
          </div>
        </div>

        <div className="pub-type">
          <span className={`badge badge-${publication.type_publication}`}>
            {getTypeIcon(publication.type_publication)} {String(publication.type_publication || "").toUpperCase()}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="pub-content">
        {publication.titre_publication ? <h2>{publication.titre_publication}</h2> : null}
        {publication.contenu ? <p>{publication.contenu}</p> : null}
      </div>

      {/* Media */}
      {publication.medias && publication.medias.length > 0 && (
        <div className="pub-media">
          <div className="media-grid">
            {publication.medias.map((media) => (
              <div key={media.id_media} className={`media-item media-${media.type_media}`}>
                {media.type_media === "photo" && (
                  <img src={getMediaUrl(media.url_media)} alt={media.nom_original || "media"} />
                )}

                {media.type_media === "video" && (
                  <video controls>
                    <source src={getMediaUrl(media.url_media)} />
                    Your browser does not support the video tag.
                  </video>
                )}

                {media.type_media === "pdf" && (
                  <a
                    href={getMediaUrl(media.url_media)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="pdf-link"
                  >
                    📄 {media.nom_original || "PDF"}
                  </a>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Summary row (optional) */}
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8, color: "#666" }}>
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          {topReactions.map(([type]) => (
            <span key={type} title={type} style={{ fontSize: 16 }}>
              {reactionEmoji(type)}
            </span>
          ))}
          <span style={{ fontSize: 13 }}>{reactionsCount}</span>
        </div>
        <div style={{ fontSize: 13 }}>{commentsCount} commentaires</div>
      </div>

      {/* Actions */}
      <div className="pub-actions">
        <div style={{ position: "relative" }} ref={reactionsRef}>
          <button
            type="button"
            className={`action-btn ${myReaction ? "active" : ""}`}
            onClick={(e) => {
              e.stopPropagation();
              setShowReactions((v) => !v);
            }}
          >
            {myReaction ? reactionEmoji(myReaction) : "😊"} Réagir
          </button>

          {showReactions && (
            <div
              style={{
                position: "absolute",
                bottom: "46px",
                left: 0,
                background: "#fff",
                border: "1px solid #eee",
                borderRadius: 14,
                padding: "8px 10px",
                display: "flex",
                gap: 8,
                boxShadow: "0 10px 28px rgba(0,0,0,0.12)",
                zIndex: 10,
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {["like", "love", "haha", "wow", "sad", "angry"].map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => react(t)}
                  style={{
                    border: "none",
                    background: "transparent",
                    cursor: "pointer",
                    fontSize: 20,
                    lineHeight: "20px",
                    padding: 6,
                    borderRadius: 10,
                  }}
                  title={t}
                >
                  {reactionEmoji(t)}
                </button>
              ))}
            </div>
          )}
        </div>

        <button type="button" className="action-btn" onClick={handleCommentClick}>
          💬 Commenter
        </button>
      </div>

      {/* Comments Section */}
      {showComments && (
        <div className="pub-comments">
          <div className="comments-list">
            {comments.length === 0 ? (
              <p className="no-comments">Aucun commentaire. Sois le premier.</p>
            ) : (
              comments.map((comment) => (
                <div key={comment.id_commentaire} className="comment">
                  <div className="comment-header">
                    <strong>
                      {comment.nom_user} {comment.prenom_user}
                    </strong>
                    <small>{comment.created_at ? new Date(comment.created_at).toLocaleDateString() : ""}</small>
                  </div>
                  <p>{comment.contenu}</p>
                </div>
              ))
            )}
          </div>

          <div className="comment-input">
            <textarea
              placeholder="Écrire un commentaire..."
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              rows={2}
            />
            <button
              type="button"
              onClick={handleAddComment}
              disabled={loadingComment || !newComment.trim()}
              className="comment-btn"
            >
              {loadingComment ? "⏳ ..." : "Publier"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function getTypeIcon(type) {
  const icons = {
    texte: "📝",
    photo: "🖼️",
    video: "🎬",
    pdf: "📄",
    debat: "💬",
  };
  return icons[type] || "📌";
}

function reactionEmoji(type) {
  const m = {
    like: "👍",
    love: "❤️",
    haha: "😂",
    wow: "😮",
    sad: "😢",
    angry: "😡",
  };
  return m[type] || "👍";
}