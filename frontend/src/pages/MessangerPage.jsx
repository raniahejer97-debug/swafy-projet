import { useEffect, useRef, useState, useCallback } from "react";
import "./MessangerPage.css";
import api from "../services/api";
import { initSocket, onMessageReceived } from "../services/socket";

export default function MessangerPage() {
  const [loadingIntro, setLoadingIntro] = useState(true);
  const [contacts,     setContacts]     = useState([]);
  const [selected,     setSelected]     = useState(null);
  const [query,        setQuery]        = useState("");
  const [text,         setText]         = useState("");
  const [initializing, setInitializing] = useState(true);

  const fileRef    = useRef(null);
  const bottomRef  = useRef(null);
  const pollingRef = useRef(null);
  /* garder la conv courante accessible dans les closures */
  const selectedRef = useRef(null);
  useEffect(() => { selectedRef.current = selected; }, [selected]);

  /* ══════════════════════════════════════
     FETCH MESSAGES
  ══════════════════════════════════════ */
  const fetchMessages = useCallback(async (convId) => {
    if (!convId) return;
    const numId = Number(convId);
    try {
      const res = await api.get(`/messages/conversation/${numId}`);
      const me  = Number(JSON.parse(localStorage.getItem("user"))?.id_user);
      const msgs = res.data.map((m) => ({
        id:   m.id,
        from: Number(m.sender_id) === me ? "me" : "them",
        text: m.text,
        at:   new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      }));
      setSelected((prev) => {
        /* ne mettre à jour que si c'est toujours la même conv */
        if (!prev || Number(prev.id) !== numId) return prev;
        return { ...prev, messages: msgs };
      });
    } catch (e) {
      console.error("❌ fetchMessages error", e?.response?.data || e.message);
    }
  }, []);

  /* ══════════════════════════════════════
     POLLING
  ══════════════════════════════════════ */
  const startPolling = useCallback((convId) => {
    if (pollingRef.current) clearInterval(pollingRef.current);
    pollingRef.current = setInterval(() => fetchMessages(convId), 4000);
  }, [fetchMessages]);

  const stopPolling = useCallback(() => {
    if (pollingRef.current) { clearInterval(pollingRef.current); pollingRef.current = null; }
  }, []);

  useEffect(() => () => stopPolling(), [stopPolling]);

  /* ══════════════════════════════════════
     SPLASH
  ══════════════════════════════════════ */
  useEffect(() => {
    const t = setTimeout(() => setLoadingIntro(false), 2000);
    return () => clearTimeout(t);
  }, []);

  /* ══════════════════════════════════════
     INIT — créer/récupérer conv avec l'admin
  ══════════════════════════════════════ */
  useEffect(() => {
    let cancelled = false;

    const init = async () => {
      try {
        /* 1. récupérer les admins */
        const adminsRes = await api.get("/messages/admins");
        const admins = adminsRes.data;
        if (!admins || admins.length === 0) { setInitializing(false); return; }

        const firstAdmin = admins[0];
        const me = Number(JSON.parse(localStorage.getItem("user")).id_user);

        /* 2. créer ou récupérer la conversation */
        const convRes = await api.post("/messages/conversation", { targetId: firstAdmin.id_user });
        const conv    = convRes.data;

        if (cancelled) return;

        /* 3. trouver l'admin réel dans la conversation */
        const adminId = Number(conv.user_a_id) === me
          ? Number(conv.user_b_id)
          : Number(conv.user_a_id);

        const realAdmin = admins.find((a) => Number(a.id_user) === adminId) || firstAdmin;

        /* 4. construire le contact */
        const contact = {
          id:      Number(conv.id),   /* ← id de la conversation, PAS du user */
          name:    `${realAdmin.nom_user} ${realAdmin.prenom_user || ""}`.trim(),
          avatar:  (realAdmin.nom_user?.[0] || "A").toUpperCase(),
          color:   "#7c5cbf",
          preview: "Démarrer la conversation…",
          time:    "",
          messages: [],
          online:  true,
        };

        setContacts([contact]);
        setSelected(contact);
        setInitializing(false);

        /* 5. fetch messages + polling */
        await fetchMessages(contact.id);
//startPolling(contact.id);

      } catch (err) {
        console.error("❌ init error", err?.response?.data || err.message);
        if (!cancelled) setInitializing(false);
      }
    };

    init();
    return () => { cancelled = true; };
  }, []); /* [] → une seule fois */

/* ══════════════════════════════════════
   SOCKET REALTIME
═════════════════════════════════════ */
useEffect(() => {
  const token = localStorage.getItem("token");
  if (!token) return;

  // ✅ connect مرة واحدة فقط
  initSocket(token);

  // ✅ listen messages
  onMessageReceived((data) => {
    console.log("📥 SOCKET RECEIVED:", data);

    const currentConv = selectedRef.current?.id;
    if (currentConv) {
      fetchMessages(currentConv);
    }
  });

}, []); // ✅ مرة واحدة فقط ✅ مرة واحدة فقط
  /* ══════════════════════════════════════
     SCROLL
  ══════════════════════════════════════ */
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [selected?.messages?.length]);

  /* ══════════════════════════════════════
     ENVOYER
  ══════════════════════════════════════ */
 const send = async () => {
  if (!text.trim() || !selected) return;

  const convId = selected.id; // ✅ هنا التعريف الصحيح
  const sentText = text.trim();

  console.log("📤 TRY SEND", {
    convId,
    text: sentText,
  });

  setText("");

  const meMsg = {
    id: Date.now(),
    from: "me",
    text: sentText,
    at: new Date().toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    }),
  };

  setSelected((prev) => ({
    ...prev,
    messages: [...(prev.messages || []), meMsg],
    preview: sentText,
  }));

  try {
    await api.post("/messages", {
      conversationId: convId,
      text: sentText,
    });

    console.log("✅ MESSAGE SENT");

    setTimeout(() => {
      fetchMessages(convId);
    }, 500);

  } catch (err) {
    console.error("❌ send error", err?.response?.data || err.message);
  }
};

  /* ══════════════════════════════════════
     ATTACH
  ══════════════════════════════════════ */
  const attachFiles = (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length || !selected) return;
    const first = files[0];
    let icon = "📁";
    if (first.type.startsWith("image/")) icon = "🖼️";
    else if (first.type === "application/pdf") icon = "📄";
    else if (first.type.includes("zip") || first.type.includes("rar")) icon = "🗜️";
    const label = files.length > 1 ? `${icon} ${files.length} fichiers` : `${icon} ${first.name}`;
    const msg = {
      id: Date.now(), from: "me", text: label,
      at: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };
    setSelected((prev) => ({ ...prev, messages: [...(prev.messages || []), msg], preview: msg.text }));
    e.target.value = "";
  };

  const filtered = contacts.filter((c) =>
    c.name.toLowerCase().includes(query.toLowerCase())
  );

  /* ══════════════════════════════════════
     RENDER
  ══════════════════════════════════════ */
  return (
    <>
      {loadingIntro && (
        <div className="chat-splash">
          <img src="/contact.png" alt="logo" />
        </div>
      )}

      <input ref={fileRef} type="file" multiple
        accept="image/*,application/pdf,.doc,.docx,.txt,.zip,.rar"
        style={{ display: "none" }} onChange={attachFiles} />

      <div className="messenger-layout">

        {/* ── SIDEBAR ── */}
        <aside className="sidebar">
          <div className="sidebar-header">
            <h2 className="sidebar-title">Mes messages</h2>
            <div className="sidebar-socials">
              {[
                { key: "wa", url: "https://cdn.simpleicons.org/whatsapp", href: "https://web.whatsapp.com" },
                { key: "li", url: "https://cdn.simpleicons.org/linkedin", href: "https://www.linkedin.com" },
                { key: "gm", url: "https://cdn.simpleicons.org/gmail",    href: "https://mail.google.com" },
              ].map((p) => (
                <button key={p.key} className="social-btn" onClick={() => window.open(p.href, "_blank")}>
                  <img src={p.url} width="16" height="16" alt={p.key} />
                </button>
              ))}
            </div>
          </div>

          <div className="search-box">
            <svg className="search-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
            <input type="text" className="search-input" placeholder="Rechercher…"
              value={query} onChange={(e) => setQuery(e.target.value)} />
          </div>

          <div className="contact-list">
            {filtered.map((c) => (
              <div key={c.id}
                className={`contact-row ${Number(selected?.id) === Number(c.id) ? "active" : ""}`}
                onClick={() => setSelected(c)}>
                <div className="av-wrap">
                  <div className="av" style={{ background: c.color }}>{c.avatar}</div>
                  <span className={`dot ${c.online ? "dot-on" : "dot-off"}`} />
                </div>
                <div className="c-body">
                  <div className="c-top">
                    <span className="c-name">{c.name}</span>
                    <span className="c-time">{c.time}</span>
                  </div>
                  <div className="c-preview">{c.preview}</div>
                </div>
              </div>
            ))}
          </div>
        </aside>

        {/* ── CHAT PANE ── */}
        <main className="chat-pane">
          {initializing ? (
            <div className="chat-empty"><div className="spinner" /><p>Chargement…</p></div>
          ) : !selected ? (
            <div className="chat-empty"><p>Sélectionnez une conversation</p></div>
          ) : (
            <>
              <div className="chat-topbar">
                <div className="av-wrap">
                  <div className="av av-lg" style={{ background: selected.color }}>{selected.avatar}</div>
                  <span className="dot dot-on" />
                </div>
                <div className="topbar-text">
                  <span className="topbar-name">{selected.name}</span>
                  <span className="topbar-sub"><span className="online-badge" /> En ligne · Swafy</span>
                </div>
                <div className="topbar-btns">
                  <button className="t-btn" title="Rafraîchir"
                    onClick={() => fetchMessages(selected.id)}>🔄</button>
                </div>
              </div>

              <div className="messages-area">
                {(!selected.messages || selected.messages.length === 0) && (
                  <div className="no-msgs">Pas encore de messages — dites bonjour 👋</div>
                )}
                {(selected.messages || []).map((m) => (
                  <div key={m.id} className={`bw ${m.from === "me" ? "bw-out" : "bw-in"}`}>
                    {m.from === "them" && (
                      <div className="bav" style={{ background: selected.color }}>{selected.avatar}</div>
                    )}
                    <div className={`bubble ${m.from === "me" ? "b-out" : "b-in"}`}>
                      <span className="b-txt">{m.text}</span>
                      <span className="b-time">{m.at}</span>
                    </div>
                  </div>
                ))}
                <div ref={bottomRef} />
              </div>

              <div className="input-bar">
                <button className="bar-btn" onClick={() => fileRef.current?.click()} title="Joindre">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
                    <path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/>
                  </svg>
                </button>
                <button className="bar-btn" onClick={() => setText((t) => t + "😊")} title="Emoji">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
                    <circle cx="12" cy="12" r="10"/>
                    <path d="M8 13s1.5 2 4 2 4-2 4-2"/>
                    <line x1="9" y1="9" x2="9.01" y2="9"/>
                    <line x1="15" y1="9" x2="15.01" y2="9"/>
                  </svg>
                </button>
                <textarea className="bar-input" placeholder="Écrire un message…"
                  value={text} rows={1}
                  onChange={(e) => setText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
                  }}
                />
                <button className={`send-btn ${text.trim() ? "send-active" : ""}`} onClick={send} title="Envoyer">
                  <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
                    <path d="M2.01 21 23 12 2.01 3 2 10l15 2-15 2z"/>
                  </svg>
                </button>
              </div>
            </>
          )}
        </main>
      </div>
    </>
  );
}
