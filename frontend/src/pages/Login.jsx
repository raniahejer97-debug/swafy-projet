import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import API from "../services/api";

export default function Login() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    email_user: "",
    mot_de_passe_user: "",
  });

  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };
const handleLogin = async (e) => {
  e.preventDefault();
  setMessage("");
  setLoading(true);

  try {
    // ✅ Login عادي (Admin أو Jeune)
    const res = await API.post("/auth/login", {
  email_user: form.email_user.trim().toLowerCase(),
  mot_de_passe_user: form.mot_de_passe_user,
});

console.log("LOGIN RESPONSE:", res.data); 

    // ✅ نخزّن token و user
    localStorage.setItem("token", res.data.token);
    localStorage.setItem("user", JSON.stringify(res.data.user));

    // ✅ Redirect حسب role
    if (res.data.user.role === "admin") {
      navigate("/admin");
    } else {
      navigate("/jeune");
    }

  } catch (error) {
    console.error("Erreur login:", error);
    setMessage(error.response?.data?.message || "Erreur de connexion");
  } finally {
    setLoading(false);
  }
};
const sendCode = async () => {
  if (!form.email_user) return alert("Entrez votre email");

  try {
    await API.post("/auth/send-password-code-v2", {
      email_user: form.email_user,
    });

    setMessage("✅ Code envoyé à votre email");
  } catch (err) {
    setMessage("Erreur envoi code");
  }
};




  return (
    <div className="auth-page">
      <div className="main-panel"></div>

      <div className="shape shape-top-left"></div>
      <div className="shape shape-bottom-left"></div>
      <div className="shape shape-center-left"></div>
      <div className="shape shape-center-bottom"></div>
      <div className="shape shape-right-center"></div>
      <div className="shape shape-small-wave"></div>
      <div className="shape shape-small-wave-2"></div>
      <div className="shape shape-blob"></div>

      <div className="auth-card">
        <h1>SWAFY</h1>
        <p>Se connecter</p>

        <form onSubmit={handleLogin}>
          <label>Email</label>
          <input
            type="email"
            name="email_user"
            placeholder="name@gmail.com"
            value={form.email_user}
            onChange={handleChange}
            required
          />

          

          <label>mot de passe(code reçu)</label>

          <input
            type="text"
            name="mot_de_passe_user"
            placeholder="Code à 6 chiffres"
            value={form.mot_de_passe_user}
            onChange={handleChange}
            required
          />

          <div className="forgot-password">mot de passe oublié ?</div>

          <button type="submit" disabled={loading}>
            {loading ? "Connexion..." : "Se connecter"}
          </button>
        </form>

        {message && <div className="error-msg">{message}</div>}

        <div className="bottom-link">
          Vous n'avez pas encore de compte ? <Link to="/register">S'inscrire</Link>
        </div>
      </div>
    </div>
  );
}