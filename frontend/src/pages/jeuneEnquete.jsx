import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import API from "../services/api";
import "./jeuneEnquete.css";

export default function EnqueteJeune() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [enquete,   setEnquete]   = useState(null);
  const [loading,   setLoading]   = useState(true);
  const [answers,   setAnswers]   = useState({});       // { id_question: "valeur" | ["opt1"] }
  const [submitted, setSubmitted] = useState(false);
  const [sending,   setSending]   = useState(false);
  const [error,     setError]     = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        const r = await API.get(`/enquetes/detail/${id}`);
        setEnquete(r.data);
        // init answers
        const init = {};
        (r.data.questions || []).forEach(q => {
          init[q.id_question] = q.type === "checkbox" ? [] : "";
        });
        setAnswers(init);
      } catch (e) {
        setError("Cette enquête est introuvable ou n'est plus disponible.");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  /* ── answer helpers ── */
  const setTextAnswer = (qid, val) => setAnswers(p => ({ ...p, [qid]: val }));

  const toggleCheckbox = (qid, opt) => {
    setAnswers(p => {
      const cur = p[qid] || [];
      return { ...p, [qid]: cur.includes(opt) ? cur.filter(o => o !== opt) : [...cur, opt] };
    });
  };

  const setRadio = (qid, opt) => setAnswers(p => ({ ...p, [qid]: opt }));

  /* ── submit ── */
 const handleSubmit = async () => {
  const unanswered = (enquete.questions || []).filter(q => {
    const a = answers[q.id_question];
    if (q.type === "text") return !a || !String(a).trim();
    if (q.type === "radio") return !a;
    if (q.type === "checkbox") return !a || a.length === 0;
    return false;
  });

  if (unanswered.length > 0) {
    setError(`Veuillez répondre à toutes les questions (${unanswered.length})`);
    return;
  }

  setError(null);
  setSending(true);

  try {
    const reponses = Object.entries(answers).map(([qid, val]) => ({
      question_id: Number(qid),
      contenu: Array.isArray(val) ? val.join(", ") : val,
    }));

    await API.post(`/enquetes/${id}/reponses`, { reponses });

    setSubmitted(true);

  } catch (err) {
    if (err.response?.status === 409) {
      setError("✅ Vous avez déjà répondu à cette enquête");
    } else {
      setError("❌ Une erreur s'est produite");
    }
  } finally {
    setSending(false); // ✅ مهم جدًا
  }
};

  /* ════════════════ LOADING ════════════════ */
  if (loading) return (
    <div className="ej-loading">
      <div className="ej-spinner" />
    </div>
  );

  /* ════════════════ ERROR ════════════════ */
  if (!enquete) return (
    <div className="ej-loading">
      <div className="ej-error-box">
        <div className="ej-error-icon">📋</div>
        <p>{error || "Enquête introuvable."}</p>
        <button className="ej-btn-back" onClick={() => navigate(-1)}>← Retour</button>
      </div>
    </div>
  );

  /* ════════════════ SUBMITTED ════════════════ */
  if (submitted) return (
    <div className="ej-root">
      <div className="ej-paper ej-paper-done">
        <div className="jn-corner jn-tl"/><div className="jn-corner jn-tr"/>
        <div className="jn-corner jn-bl"/><div className="jn-corner jn-br"/>
        <div className="ej-done-icon">✓</div>
        <h2 className="ej-done-title">Merci pour vos réponses !</h2>
        <p className="ej-done-sub">Vos réponses ont bien été enregistrées.</p>
        <div className="jn-ruling" style={{ margin: "28px 0" }} />
        <p className="ej-done-hint">Vous pouvez fermer cette page.</p>
      </div>
    </div>
  );

  /* ════════════════ MAIN ════════════════ */
  return (
    <div className="ej-root">

      {/* ── Error banner ── */}
      {error && <div className="ej-error-banner">{error}</div>}

      {/* ════ PAPER ════ */}
      <div className="ej-paper">

        <span className="jn-corner jn-tl"/><span className="jn-corner jn-tr"/>
        <span className="jn-corner jn-bl"/><span className="jn-corner jn-br"/>

        {/* Masthead */}
        <div className="jn-masthead">
          <div className="jn-day">Challenge Day 1</div>
          <div className="jn-ruling" />
          <h1 className="jn-title">{(enquete.titre || "ENQUÊTE").toUpperCase()} ?</h1>
          {enquete.description && <p className="jn-subtitle">{enquete.description}</p>}
          <div className="jn-ruling" />
        </div>

        {/* Questions */}
        <div className="jn-body">
          {(enquete.questions || []).map((q, i) => (
            <div key={q.id_question} className="ej-q-block">

              <p className="jn-q-text">{i + 1}. {q.texte} ?</p>

              {/* TEXT */}
              {q.type === "text" && (
                <div className="ej-text-wrap">
                  <textarea
                    className="ej-textarea"
                    placeholder="Votre réponse…"
                    value={answers[q.id_question] || ""}
                    onChange={e => setTextAnswer(q.id_question, e.target.value)}
                    rows={3}
                  />
                </div>
              )}

              {/* RADIO */}
              {q.type === "radio" && (
                <div className="ej-opts">
                  {(q.options || []).map((opt, oi) => (
                    <label
                      key={oi}
                      className={`ej-opt-label${answers[q.id_question] === opt ? " ej-opt-selected" : ""}`}
                      onClick={() => setRadio(q.id_question, opt)}
                    >
                      <span className={`ej-radio${answers[q.id_question] === opt ? " ej-radio-on" : ""}`} />
                      <span>{opt}</span>
                    </label>
                  ))}
                </div>
              )}

              {/* CHECKBOX */}
              {q.type === "checkbox" && (
                <div className="ej-opts">
                  {(q.options || []).map((opt, oi) => {
                    const checked = (answers[q.id_question] || []).includes(opt);
                    return (
                      <label
                        key={oi}
                        className={`ej-opt-label${checked ? " ej-opt-selected" : ""}`}
                        onClick={() => toggleCheckbox(q.id_question, opt)}
                      >
                        <span className={`ej-checkbox${checked ? " ej-checkbox-on" : ""}`}>
                          {checked && <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" width="9" height="9"><polyline points="10 3 5 9 2 6"/></svg>}
                        </span>
                        <span>{opt}</span>
                      </label>
                    );
                  })}
                </div>
              )}

            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="jn-footer">
          <div className="jn-foot-line" /><span>Swafy Platform</span><div className="jn-foot-line" />
        </div>
      </div>

      {/* ── Submit ── */}
      <div className="ej-submit-bar">
        <button
        className={`ej-submit-btn${sending ? " ej-submitting" : ""}`}
        onClick={handleSubmit}
        disabled={sending || submitted} // ✅ BONUS
      >
          {sending
            ? <><span className="jn-spin" /> Envoi en cours…</>
            : "Soumettre mes réponses →"
          }
        </button>
        <p className="ej-submit-hint">Vos réponses sont anonymes et sécurisées</p>
      </div>

    </div>
  );
}
