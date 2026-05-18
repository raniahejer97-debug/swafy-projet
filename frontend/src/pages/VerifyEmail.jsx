import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import API from "../services/api"; // تأكد المسار

export default function VerifyEmail() {
  const location = useLocation();
  const navigate = useNavigate();

  const email = location.state?.email || "";
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);

  // ✅ 1. إرسال الكود
  const sendCode = async () => {
    try {
      setLoading(true);

      await API.post("/auth/sendPassword", {
        email_user: email
      });

      alert("Code envoyé ✅ (Check Mailtrap)");

    } catch (err) {
      console.error(err);
      alert("Erreur envoi ❌");
    } finally {
      setLoading(false);
    }
  };

  // ✅ 2. التحقق بالكود
  const handleVerify = async (e) => {
    e.preventDefault();

    try {
      const res = await API.post("/auth/verify-code", {
        email_user: email,
        code: code
      });

      if (res.data.success) {
        localStorage.setItem("token", res.data.token);
        localStorage.setItem("user", JSON.stringify(res.data.user));

        alert("Compte activé ✅");
        navigate("/jeune");
      }

    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || "Code incorrect ❌");
    }
  };

  return (
    <div>
      <h3>Vérification Email</h3>

      {/* ✅ زر إرسال الكود */}
      <button onClick={sendCode} disabled={loading}>
        {loading ? "Envoi..." : "Envoyer code"}
      </button>

      {/* ✅ فورم التحقق */}
      <form onSubmit={handleVerify}>
        <input
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="Entrez le code"
        />
        <button type="submit">Vérifier et Entrer</button>
      </form>
    </div>
  );
}