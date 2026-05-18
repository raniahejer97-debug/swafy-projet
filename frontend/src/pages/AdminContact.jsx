  import { useEffect, useRef, useState, useCallback } from "react";
  import "./AdminContact.css";
  import api from "../services/api";
  import { initSocket, onMessageReceived } from "../services/socket";
  import { emitNewMessage } from "../services/socket";
  const AVATAR_COLORS = ["#7c5cbf", "#3b82f6", "#22c55e", "#f59e0b", "#ef4444"];

  export default function AdminContact({ setActivePage }) {
    const [loadingIntro, setLoadingIntro] = useState(true);
    const [contacts, setContacts] = useState([]);
    const [selected, setSelected] = useState(null);
    const [query, setQuery] = useState("");
    const [text, setText] = useState("");
    const fileRef = useRef(null);
    const bottomRef = useRef(null);
    const pollingRef = useRef(null); // ✅ polling ref
    const selectedRef = useRef(null);

      useEffect(() => {
        selectedRef.current = selected;
      }, [selected]);

    // ✅ Fetch messages — reusable
    const fetchMessages = useCallback(async (conversationId) => {
      try {
        const res = await api.get(`/messages/conversation/${conversationId}`);
        const me = JSON.parse(localStorage.getItem("user"))?.id_user;
        const msgs = res.data.map((m) => ({
          id: m.id,
          from: Number(m.sender_id) === Number(me) ? "me" : "them",
          text: m.text,
          at: new Date(m.created_at).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          }),
        }));
        setSelected((prev) => {
        if (!prev) return prev;
        return { ...prev, messages: msgs };
      });

      } catch (e) {
        console.error("fetchMessages error", e);
      }
    }, []);

    // ✅ Start polling kol 3 secondes
    const startPolling = useCallback((conversationId) => {
      if (pollingRef.current) clearInterval(pollingRef.current);
      pollingRef.current = setInterval(() => {
        fetchMessages(conversationId);
      }, 8000);
    }, [fetchMessages]);

    // ✅ Stop polling
    const stopPolling = useCallback(() => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    }, []);
 useEffect(() => {
  const token = localStorage.getItem("token");
  if (!token) return;

  initSocket(token);

  onMessageReceived((data) => {
    console.log("📥 SOCKET:", data);

    const convId = selectedRef.current?.conversationId;
    if (convId) {
      fetchMessages(convId);
    }
  });

}, []); // ✅ مرة واحدة فقط
    // ✅ Cleanup
    useEffect(() => {
      return () => stopPolling();
    }, [stopPolling]);

    // ✅ Fetch jeunes
    useEffect(() => {
      const fetchJeunes = async () => {
        try {
          const res = await api.get("/users", { params: { role: "jeune" } });
          const mapped = res.data.map((u) => ({
            userId: u.id_user,
            name: `${u.nom_user} ${u.prenom_user || ""}`.trim(),
            avatar: (u.nom_user?.[0] || "J").toUpperCase(),
            color: AVATAR_COLORS[u.id_user % AVATAR_COLORS.length],
            preview: "Cliquer pour ouvrir",
            time: "",
            messages: [],
            conversationId: null,
          }));
          setContacts(mapped);
          // ❌ mazel7ech setSelected — admin lazem yenchfer b ido
        } catch (err) {
          console.error("fetchJeunes error", err);
        }
      };
      fetchJeunes();
    }, []);

    // ✅ Splash 2s
    useEffect(() => {
      const t = setTimeout(() => setLoadingIntro(false), 2000);
      return () => clearTimeout(t);
    }, []);

    // ✅ Scroll to bottom
    useEffect(() => {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [selected?.messages?.length]);

    // ✅ Open conversation + fetch messages + start polling
    const openConversation = async (c) => {
      try {
        stopPolling(); // stop el polling el qadim

        const convRes = await api.post("/messages/conversation", {
          targetId: c.userId,
        });
        console.log("🔥 CONVERSATION RESPONSE:", convRes.data);
        const conversationId = convRes.data.id;

        // ✅ Set selected awel (bla messages)
        setSelected({ ...c, conversationId, messages: [] });

        // ✅ Update contacts
        setContacts((prev) =>
          prev.map((ct) =>
            ct.userId === c.userId ? { ...ct, conversationId } : ct
          )
        );

        // ✅ Fetch messages mte3 conversation (existing ones)
        await fetchMessages(conversationId);

        // ✅ Start polling jadid
      // startPolling(conversationId);
      } catch (err) {
        console.error("openConversation error", err);
      }
    };

    // ✅ Send message
    const send = async () => {
      if (!text.trim() || !selected?.conversationId) return;

      const sentText = text;
      setText("");

      // ✅ Optimistic UI
      const meMsg = {
        id: Date.now(),
        from: "me",
        text: sentText,
        at: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };

      setSelected((prev) => ({
        ...prev,
        messages: [...(prev.messages || []), meMsg],
      }));

      setContacts((prev) =>
        prev.map((c) =>
          c.userId === selected.userId
            ? { ...c, preview: sentText, time: "now" }
            : c
        )
      );
      try {
      const res = await api.post("/messages", {
  conversationId: selected.conversationId,
  text: sentText
});

// ✅ SOCKET
emitNewMessage({
  conversationId: selected.conversationId,
  recipientId: selected.userId,
  text: sentText
});

console.log("✅ RESPONSE:", res.data);

        console.log("✅ FETCH TEST DONE");

      } catch (err) {
        console.error("❌ send error", err);
      }

     
    };

    const filtered = contacts.filter((c) =>
      c.name.toLowerCase().includes(query.toLowerCase())
    );

    const attachFiles = (e) => {
      const files = Array.from(e.target.files || []);
      if (!files.length || !selected) return;
      const first = files[0];
      let icon = "📁";
      if (first.type.startsWith("image/")) icon = "🖼️";
      else if (first.type === "application/pdf") icon = "📄";
      else if (first.type.includes("zip") || first.type.includes("rar")) icon = "🗜️";
      const label = files.length > 1 ? `${icon} ${files.length} files attached` : `${icon} ${first.name}`;
      const msg = {
        id: Date.now(), from: "me", text: label,
        at: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      const next = contacts.map((c) =>
        c.userId === selected.userId
          ? { ...c, preview: msg.text, time: msg.at, messages: [...(c.messages || []), msg] }
          : c
      );
      setContacts(next);
      setSelected(next.find((c) => c.userId === selected.userId));
      e.target.value = "";
    };

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

        <div className="admin-contact">
          {/* LEFT PANEL */}
          <aside className="contacts-panel">
            <div className="contacts-icons">
              {[
                { key: "whatsapp", url: "https://cdn.simpleicons.org/whatsapp", label: "WhatsApp", href: "https://web.whatsapp.com" },
                { key: "linkedin", url: "https://cdn.simpleicons.org/linkedin", label: "LinkedIn", href: "https://www.linkedin.com" },
                { key: "gmail",    url: "https://cdn.simpleicons.org/gmail",    label: "Email",    href: "https://mail.google.com" },
              ].map((p) => (
                <button key={p.key} className="contact-btn" title={p.label}
                  onClick={() => window.open(p.href, "_blank")}>
                  <img src={p.url} width="26" height="26" alt={p.label} />
                  <span style={{ fontSize: 10, color: "#666", marginTop: 6 }}>{p.label}</span>
                </button>
              ))}
            </div>

            <input type="text" placeholder="Search..." value={query}
              onChange={(e) => setQuery(e.target.value)}
              style={{ width: "100%", padding: "10px 12px", borderRadius: 10,
                border: "1px solid #e5e5e5", outline: "none", fontSize: 13 }} />

            <div className="chat-list">
              {filtered.map((c) => (
                <div key={c.userId}
                  className={`chat-item ${selected?.userId === c.userId ? "active" : ""}`}
                  onClick={() => openConversation(c)}> {/* ✅ toujours openConversation */}
                  <div style={{ width: 38, height: 38, borderRadius: "50%",
                    background: c.color, color: "#fff", fontWeight: 800,
                    display: "flex", alignItems: "center", justifyContent: "center" }}>
                    {c.avatar}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 13 }}>{c.name}</div>
                    <div style={{ fontSize: 12, color: "#888", whiteSpace: "nowrap",
                      overflow: "hidden", textOverflow: "ellipsis", maxWidth: 160 }}>
                      {c.preview}
                    </div>
                  </div>
                  <div style={{ fontSize: 11, color: "#aaa" }}>{c.time}</div>
                </div>
              ))}
            </div>
          </aside>

          {/* MIDDLE CHAT */}
          <main className="chat-window">
            {!selected ? (
              <div className="chat-empty">
                <img src="/contact.png" alt="empty" />
                <p style={{ color: "#aaa", marginTop: 12, fontSize: 14 }}>
                  Choisir un contact pour commencer
                </p>
              </div>
            ) : (
              <>
                <div className="chat-header">
                  <div style={{ width: 40, height: 40, borderRadius: "50%",
                    background: selected.color, color: "#fff", fontWeight: 800,
                    display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>
                    {selected.avatar}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 800 }}>{selected.name}</div>
                    <div style={{ fontSize: 12, color: "#8a8a8a" }}>Online • swafy</div>
                  </div>
                  <div style={{ display: "flex", gap: 10 }}>
                    <button className="emoji-btn" title="Rafraîchir"
                      onClick={() => fetchMessages(selected.conversationId)}>
                      🔄
                    </button>
                  </div>
                </div>

                <div className="chat-messages">
                  {(!selected.messages || selected.messages.length === 0) && (
                    <p style={{ color: "#ccc", textAlign: "center", marginTop: 40, fontSize: 13 }}>
                      Pas encore de messages 👋
                    </p>
                  )}
                  {(selected.messages || []).map((m) => (
                    <div key={m.id}
                      className={m.from === "me" ? "outgoing" : "incoming"}
                      title={m.at}>
                      {m.text}
                    </div>
                  ))}
                  <div ref={bottomRef} />
                </div>

                <div className="chat-input">
                  <textarea placeholder="Type your message here..."
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
                    }}
                  />
                  <div className="input-actions">
                    <span className="emoji-btn" title="Attach"
                      onClick={() => fileRef.current?.click()}>📎</span>
                    <span className="emoji-btn" title="Emoji"
                      onClick={() => setText((t) => t + "😊")}>😊</span>
                    <span className="send-btn" title="Send" onClick={send}>➤</span>
                  </div>
                </div>
              </>
            )}
          </main>
        </div>
      </>
    );
  }
