import { useState, useEffect } from "react";
import API from "../services/api";

const IcoEdit  = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="13" height="13"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>;
const IcoDel   = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="13" height="13"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/></svg>;
const IcoPlus  = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="14" height="14"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>;
const IcoPDF   = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>;
const IcoShare = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>;
const IcoCheck = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="12" height="12"><polyline points="20 6 9 17 4 12"/></svg>;

export default function StyleCheckbox({ detail, detailId, refresh, onGeneratePDF }) {
  const [questions, setQuestions] = useState([]);
  const [toast,     setToast]     = useState(null);

  /* add */
  const [adding,  setAdding]  = useState(false);
  const [newText, setNewText] = useState("");
  const [newType, setNewType] = useState("text");
  const [newOpts, setNewOpts] = useState(["", ""]);

  /* edit */
  const [editId,   setEditId]   = useState(null);
  const [editText, setEditText] = useState("");
  const [editType, setEditType] = useState("text");
  const [editOpts, setEditOpts] = useState([""]);

  /* share */
  const [sharing, setSharing] = useState(false);
  const [shared,  setShared]  = useState(false);

  useEffect(() => { setQuestions(detail?.questions || []); }, [detail]);

  const showToast = (msg, err = false) => {
    setToast({ msg, err });
    setTimeout(() => setToast(null), 3200);
  };

  /* ── ADD ── */
 const handleAdd = async () => {
  if (!newText.trim()) {
    showToast("Veuillez écrire une question", true);
    return;
  }

  const opts = newType !== "text"
    ? newOpts.filter(o => o.trim())
    : [];

  if (newType !== "text" && opts.length < 2) {
    showToast("Minimum 2 options requises", true);
    return;
  }

  try {
    const res = await API.post(`/enquetes/${detailId}/questions`, {
      texte: newText.trim(),
      type: newType,
      options: opts
    });

    // ✅ update UI مباشرة
    setQuestions(prev => [
      ...prev,
      {
        id_question: res.data.id_question,
        texte: newText.trim(),
        type: newType,
        options: opts
      }
    ]);

    showToast("✅ Question ajoutée");

    // reset
    setNewText("");
    setNewOpts(["", ""]);
    setNewType("text");
    setAdding(false);

  } catch (err) {
    console.error(err);
    showToast("❌ Erreur lors de l'ajout", true);
  }
};

  /* ── EDIT ── */
  const startEdit = (q) => {
    setEditId(q.id_question);
    setEditText(q.texte);
    setEditType(q.type || "text");
    setEditOpts(q.options?.length ? [...q.options] : [""]);
  };

 const handleEdit = async () => {
  const opts = editType !== "text" ? editOpts.filter(o => o.trim()) : [];

  // ✅ update مباشرة في UI
  setQuestions(prev =>
    prev.map(q =>
      q.id_question === editId
        ? { ...q, texte: editText, type: editType, options: opts }
        : q
    )
  );

  showToast("Question modifiée (local) ✓");

  setEditId(null);
};

  /* ── DELETE ── */
  const handleDelete = async (id) => {
    if (!window.confirm("Supprimer cette question ?")) return;
    try {
      await API.delete(`/enquetes/${detailId}/questions/${id}`);
      showToast("Question supprimée");
      refresh();
    } catch { showToast("Erreur suppression", true); }
  };

  /* ── SHARE ── */
  const handleShare = async () => {
    if (shared || sharing) return;
    if (questions.length === 0) { showToast("Ajoutez au moins une question avant de partager", true); return; }
    setSharing(true);
    try {
      await API.post(`/enquetes/${detailId}/partager`);
      setShared(true);
      showToast("Enquête partagée — les jeunes ont reçu une notification !");
    } catch { showToast("Erreur lors du partage", true); }
    finally { setSharing(false); }
  };

  /* ── Reusable: Type selector ── */
  const TypeSelector = ({ val, set }) => (
    <div className="jn-type-row">
      {[["text","Texte libre"],["radio","Choix unique"],["checkbox","Choix multiple"]].map(([t, lbl]) => (
        <button key={t} className={`jn-type-btn${val === t ? " active" : ""}`} onClick={() => set(t)}>{lbl}</button>
      ))}
    </div>
  );

  /* ── Reusable: Options editor ── */
  const OptsEditor = ({ opts, set }) => (
    <div className="jn-opts-editor">
      {opts.map((o, i) => (
        <div key={i} className="jn-opt-row">
          <span className="jn-opt-bullet" />
          <input className="jn-opt-input" value={o} placeholder={`Option ${i + 1}`}
            onChange={e => { const a = [...opts]; a[i] = e.target.value; set(a); }} />
          {opts.length > 2 && (
            <button className="jn-rm-opt" onClick={() => set(opts.filter((_, x) => x !== i))}>×</button>
          )}
        </div>
      ))}
      <button className="jn-add-opt" onClick={() => set([...opts, ""])}>+ option</button>
    </div>
  );

  return (
    <div className="jn-wrap">

      {/* Toast */}
      {toast && <div className={`jn-toast${toast.err ? " jn-toast-err" : ""}`}>{toast.msg}</div>}

      {/* ════ PAPER ════ */}
      <div className="jn-paper">

        {/* corner marks */}
        <span className="jn-corner jn-tl"/><span className="jn-corner jn-tr"/>
        <span className="jn-corner jn-bl"/><span className="jn-corner jn-br"/>

        {/* Masthead */}
        <div className="jn-masthead">
          <div className="jn-day">Challenge Day 1</div>
          <div className="jn-ruling" />
          <h1 className="jn-title">{(detail?.titre || "TITRE").toUpperCase()} ?</h1>
          {detail?.description && <p className="jn-subtitle">{detail.description}</p>}
          <div className="jn-ruling" />
        </div>

        {/* Questions */}
        <div className="jn-body">
          {questions.length === 0 && (
            <p className="jn-empty-hint">Ajoutez votre première question ci-dessous…</p>
          )}

          {questions.map((q, i) => (
            <div key={q.id_question} className={`jn-row${editId === q.id_question ? " jn-row-editing" : ""}`}>

              {editId === q.id_question ? (
                /* EDIT FORM */
                <div className="jn-edit-block">
                  <TypeSelector val={editType} set={v => { setEditType(v); setEditOpts([""]);  }} />
                  <input className="jn-edit-input" value={editText} autoFocus
                    onChange={e => setEditText(e.target.value)}
                    onKeyDown={e => e.key === "Escape" && setEditId(null)} />
                  {editType !== "text" && <OptsEditor opts={editOpts} set={setEditOpts} />}
                  <div className="jn-form-actions">
                    <button className="jn-btn-save" onClick={handleEdit}><IcoCheck /> Enregistrer</button>
                    <button className="jn-btn-cancel" onClick={() => setEditId(null)}>Annuler</button>
                  </div>
                </div>
              ) : (
                /* VIEW */
                <>
                  <div className="jn-q-main">
                    <p className="jn-q-text">{i + 1}. {q.texte} ?</p>
                    {q.type === "text" && (
                      <div className="jn-lines">
                        <div className="jn-line" /><div className="jn-line" />
                      </div>
                    )}
                    {q.type !== "text" && (
                      <div className="jn-q-opts">
                        {(q.options || []).map((o, oi) => (
                          <div key={oi} className="jn-q-opt">
                            {q.type === "radio" ? <span className="jn-circle" /> : <span className="jn-box" />}
                            <span>{o}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* ── Per-question action buttons ── */}
                  <div className="jn-q-btns">
                    <button className="jn-q-btn jn-q-edit" onClick={() => startEdit(q)} title="Modifier">
                      <IcoEdit /> <span>Modifier</span>
                    </button>
                    <button className="jn-q-btn jn-q-del" onClick={() => handleDelete(q.id_question)} title="Supprimer">
                      <IcoDel /> <span>Supprimer</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          ))}

          {/* ADD FORM */}
          {adding && (
            <div className="jn-add-block">
              <div className="jn-add-label">Nouvelle question</div>
              <TypeSelector val={newType} set={v => { setNewType(v); setNewOpts(["", ""]); }} />
              <input className="jn-edit-input" value={newText} autoFocus
                placeholder="Rédigez votre question…"
                onChange={e => setNewText(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") handleAdd(); if (e.key === "Escape") setAdding(false); }} />
              {newType !== "text" && <OptsEditor opts={newOpts} set={setNewOpts} />}
              <div className="jn-form-actions">
                <button className="jn-btn-save" onClick={handleAdd}><IcoCheck /> Ajouter</button>
                <button className="jn-btn-cancel" onClick={() => { setAdding(false); setNewText(""); }}>Annuler</button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="jn-footer">
          <div className="jn-foot-line" /><span>Swafy Platform</span><div className="jn-foot-line" />
        </div>
      </div>

      {/* ════ ACTION BAR ════ */}
      <div className="jn-bar">
        <button className="jn-bar-btn jn-bar-add" onClick={() => { setAdding(!adding); setEditId(null); }}>
          <IcoPlus /> {adding ? "Annuler" : "Ajouter une question"}
        </button>

        <div className="jn-bar-right">
          <button className="jn-bar-btn jn-bar-pdf" onClick={onGeneratePDF}>
            <IcoPDF /> Télécharger PDF
          </button>

          <button
            className={`jn-bar-btn jn-bar-share${shared ? " jn-shared" : ""}${sharing ? " jn-sharing" : ""}`}
            onClick={handleShare}
            disabled={sharing || shared}
          >
            {shared
              ? <><IcoCheck /> Partagée aux jeunes</>
              : sharing
                ? <><span className="jn-spin" /> Envoi en cours…</>
                : <><IcoShare /> Partager aux jeunes</>
            }
          </button>
        </div>
      </div>

    </div>
  );
}
