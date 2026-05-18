import { useState } from "react";
import api from "../services/api";

export default function AddPublication({ onSuccess }) {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");

 const handlePublish = async () => {
    alert("NEW SYSTEM ✅");
  console.log("🚀 sending publication...");

  try {
    const formData = new FormData();

    formData.append("titre_publication", title);
    formData.append("contenu", content);
    formData.append("type_publication", "texte");

    const res = await api.post("/publications", formData);

    console.log("✅ RESPONSE:", res.data);

    setTitle("");
    setContent("");

    onSuccess && onSuccess();

  } catch (err) {
    console.error("❌ publish error:", err);
  }
};
  return (
    <div style={{ background: "#fff", padding: 15, marginBottom: 20 }}>
      <h3>Nouvelle publication</h3>

      <input
        placeholder="Titre"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        style={{ width: "100%", marginBottom: 10 }}
      />

      <textarea
        placeholder="Contenu"
        value={content}
        onChange={(e) => setContent(e.target.value)}
        style={{ width: "100%", marginBottom: 10 }}
      />

      <button onClick={handlePublish}>
        Publier
      </button>
    </div>
  );
}