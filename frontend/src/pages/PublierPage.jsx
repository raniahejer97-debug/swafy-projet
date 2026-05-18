  import React, { useEffect, useRef, useState } from "react";
  import { useNavigate } from "react-router-dom";
  import api from "../services/api";
  import "./PublierPage.css";

  export default function PublierPage({ onBack }) {
    const navigate = useNavigate();

    const [activeType, setActiveType] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState(false);

    // upload progress (fake)
    const [uploadProgress, setUploadProgress] = useState(0);
    const progressIntervalRef = useRef(null);

    const [formData, setFormData] = useState({
      titre_publication: "",
      contenu: "",
      question_debat: "",
    });

    const [selectedFiles, setSelectedFiles] = useState([]);
    const [previews, setPreviews] = useState([]);

    const resetForm = () => {
      setFormData({
        titre_publication: "",
        contenu: "",
        question_debat: "",
      });
      setSelectedFiles([]);
      setPreviews([]);
      setError("");
      setSuccess(false);
    };

    const startFakeProgress = () => {
      setUploadProgress(0);
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = setInterval(() => {
        setUploadProgress((prev) => {
          if (prev >= 90) {
            clearInterval(progressIntervalRef.current);
            return 90;
          }
          return Math.min(90, prev + 5 + Math.random() * 10);
        });
      }, 350);
    };

    const finishProgress = () => {
      clearInterval(progressIntervalRef.current);
      setUploadProgress(100);
      setTimeout(() => setUploadProgress(0), 600);
    };

    useEffect(() => {
      return () => {
        clearInterval(progressIntervalRef.current);
        // cleanup previews urls
        previews.forEach((p) => URL.revokeObjectURL(p.url));
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleFileChange = (e) => {
      const files = Array.from(e.target.files || []);
      if (files.length === 0) return;

      // cleanup old previews
      previews.forEach((p) => URL.revokeObjectURL(p.url));

      setSelectedFiles(files);

      const newPreviews = files.map((file) => ({
        url: URL.createObjectURL(file),
        type: file.type.startsWith("image/")
          ? "image"
          : file.type.startsWith("video/")
          ? "video"
          : "pdf",
        name: file.name,
      }));

      setPreviews(newPreviews);
    };

    const handleChange = (e) => {
      setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const canSubmit = () => {
      if (!activeType) return false;
      if (activeType === "debat") return !!formData.question_debat.trim();
      // for other types: allow empty title, but require content OR files
      const hasText = !!formData.contenu.trim() || !!formData.titre_publication.trim();
      const hasFiles = selectedFiles.length > 0;
      return hasText || hasFiles;
    };
   const handleSubmit = async (e) => {
  e.preventDefault();
  setError("");
  setSuccess(false);

  if (!canSubmit()) {
    setError("Écris quelque chose ou ajoute un fichier.");
    return;
  }

  setLoading(true);
  startFakeProgress();

  try {
    const fd = new FormData();
    fd.append("type_publication", activeType);

    if (activeType === "debat") {
      fd.append("question_debat", formData.question_debat || "");
      fd.append("titre_publication", formData.question_debat || "");
    } else {
      fd.append("titre_publication", formData.titre_publication || "");
    }

    fd.append("contenu", formData.contenu || "");

    selectedFiles.forEach((f) => fd.append("files", f));
     const token = localStorage.getItem("token");

    const config = {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    };
config.headers["Content-Type"] = "multipart/form-data";

await api.post("/publications", fd, config);

    finishProgress();
    setSuccess(true);

    setTimeout(() => {
      if (onBack) onBack();
    }, 900);
  } catch (err) {
    console.error(" Publication error:", err);
    console.error(" Response data:", err.response?.data);
    console.error(" Response status:", err.response?.status);

    finishProgress();

    const serverMsg =
      err.response?.data?.message ||
      err.response?.data?.error ||
      "Erreur lors de la publication";

    setError(serverMsg);
  } finally {
    setLoading(false);
  }
};
    

    return (
      <div className="publier-page" style={{ overflowY: "scroll", height: "100vh" }}>
        <div className="publier-container">
          {/* HEADER */}
          <div className="publier-header">
            <button onClick={onBack} className="btn-back" type="button">
    ← Retour
  </button>
            <h1>Créer une Publication</h1>
          </div>

          {/* SELECT TYPE */}
          <div className="type-selector">
            {["texte", "photo", "video", "pdf", "debat"].map((type) => (
              <button
                key={type}
                type="button"
                className={activeType === type ? "active" : ""}
                onClick={() => {
                  setActiveType(type);
                  resetForm();
                }}
              >
                {type === "texte" && "📝 Texte"}
                {type === "photo" && "📷 Photo"}
                {type === "video" && "🎥 Vidéo"}
                {type === "pdf" && "📄 PDF"}
                {type === "debat" && "⚖️ Débat"}
              </button>
            ))}
          </div>

          {/* FORM */}
          {activeType && (
            <form onSubmit={handleSubmit} className="publier-form">
              {/* Fields */}
              {activeType !== "debat" ? (
                <>
                  <input
                    type="text"
                    name="titre_publication"
                    placeholder="Titre (optionnel)"
                    value={formData.titre_publication}
                    onChange={handleChange}
                  />

                  <textarea
                    name="contenu"
                    placeholder="Qu'est-ce que tu veux partager ?"
                    value={formData.contenu}
                    onChange={handleChange}
                    rows="4"
                  />
                </>
              ) : (
                <>
                  <input
                    type="text"
                    name="question_debat"
                    placeholder="Pose ta question de débat..."
                    value={formData.question_debat}
                    onChange={handleChange}
                    required
                  />

                  <textarea
                    name="contenu"
                    placeholder="Ajoute une petite description (optionnel)"
                    value={formData.contenu}
                    onChange={handleChange}
                    rows="4"
                  />
                </>
              )}

              {/* Upload */}
              {(activeType === "photo" || activeType === "video" || activeType === "pdf") && (
                <div className="upload-zone">
                  <input
                    type="file"
                    id="fileInput"
                    multiple={activeType === "photo"}
                    accept={
                      activeType === "photo"
                        ? "image/*"
                        : activeType === "video"
                        ? "video/*"
                        : "application/pdf"
                    }
                    onChange={handleFileChange}
                  />
                  <label htmlFor="fileInput" className="upload-label">
                    Choisir{" "}
                    {activeType === "photo"
                      ? "des photos"
                      : activeType === "video"
                      ? "une vidéo"
                      : "un PDF"}
                  </label>
                </div>
              )}

              {/* Previews */}
              {previews.length > 0 && (
                <div className="previews-section">
                  <h3>Aperçu ({previews.length})</h3>
                  <div className="previews-grid">
                    {previews.map((preview, index) => (
                      <div key={index} className="preview-item">
                        {preview.type === "image" && <img src={preview.url} alt="preview" />}
                        {preview.type === "video" && <video src={preview.url} controls />}
                        {preview.type === "pdf" && <div className="pdf-preview">📄 {preview.name}</div>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Messages */}
              {error && <p className="error-message">{error}</p>}
              {success && <p className="success-message">Publication réussie !</p>}

              {/* Progress */}
              {loading && (
                <div style={{ margin: "15px 0" }}>
                  <div
                    style={{
                      background: "#e8e8f0",
                      borderRadius: "20px",
                      height: "8px",
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        background: "linear-gradient(90deg, #667eea, #764ba2)",
                        width: `${uploadProgress}%`,
                        height: "8px",
                        borderRadius: "20px",
                        transition: "width 0.35s ease",
                        boxShadow: "0 0 10px rgba(102,126,234,0.5)",
                      }}
                    />
                  </div>
                  <p
                    style={{
                      textAlign: "center",
                      marginTop: "8px",
                      color: "#667eea",
                      fontSize: "14px",
                      fontWeight: "500",
                    }}
                  >
                    {Math.round(uploadProgress) < 100
                      ? `Publication en cours... ${Math.round(uploadProgress)}%`
                      : "Presque terminé..."}
                  </p>
                </div>
              )}

              {/* Submit */}
              <button type="submit" className="btn-submit" disabled={loading || !canSubmit()}>
                {loading ? "Publication en cours..." : "Publier maintenant"}
              </button>
            </form>
          )}
        </div>
      </div>
    );
  }