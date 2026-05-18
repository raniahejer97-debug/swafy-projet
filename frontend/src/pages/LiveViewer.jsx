import { useParams, useSearchParams } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";
import "./LiveViewer.css";

const SOCKET_URL = "https://swafy-backend.onrender.com";

export default function LiveViewer() {
  const { roomCode } = useParams();
  const [params] = useSearchParams();
  const token = params.get("vt") || params.get("at");

  const socket = useRef(null);
  const chatEndRef = useRef(null);
  const streamRef = useRef(null);

  const [messages, setMessages] = useState([]);
  const [chatInput, setChatInput] = useState("");
  const [isMicOn, setIsMicOn] = useState(false);

  // ✅ decode token
  const decodeToken = (token) => {
    try {
      return JSON.parse(atob(token.split(".")[1]));
    } catch {
      return null;
    }
  };

  // ✅ SECURITY (مهم)
  useEffect(() => {
    const data = decodeToken(token);

    if (!data || data.role !== "jeune") {
      alert("⛔ Accès refusé");
      window.location.href = "/";
    }
  }, [token]);

  // ✅ SOCKET
  useEffect(() => {
    const data = decodeToken(token);

    if (!roomCode || !token || data?.role !== "jeune") return;

    socket.current = io(SOCKET_URL, {
  transports: ["websocket"],
});

    socket.current.emit("join-room", {
      roomCode,
      userName: "Viewer",
      role: "guest",
      accessToken: token,
    });

    socket.current.on("receive-message", (msg) => {
      setMessages((prev) => [...prev, msg]);
    });

    return () => {
      socket.current?.off("receive-message");
      socket.current?.disconnect();
    };
  }, [roomCode, token]);

  // ✅ MIC
  useEffect(() => {
    const data = decodeToken(token);
    if (data?.role !== "jeune") return;

    const enableMic = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
        });
        streamRef.current = stream;
        setIsMicOn(true);
      } catch (err) {
        console.error("Mic error:", err);
      }
    };

    enableMic();
  }, [token]);

  // ✅ AUTO SCROLL
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // ✅ SEND MESSAGE
  const sendMessage = () => {
    if (!chatInput.trim() || !socket.current || !roomCode) return;

    socket.current.emit("send-message", {
      roomCode,
      message: chatInput,
    });

    setChatInput("");
  };

  return (
    <div className="lv-page">
      <header className="lv-header">
        Salut à tous — <strong>enjoy !</strong>
      </header>

      <div className="lv-main">
        <div className="lv-video-zone">
          <div className="lv-main-video">🎥 Vidéo principale</div>

          <button
            onClick={() => {
              const track = streamRef.current?.getAudioTracks()[0];
              if (track) {
                track.enabled = !track.enabled;
                setIsMicOn(track.enabled);
              }
            }}
          >
            {isMicOn ? "🎤 On" : "🔇 Off"}
          </button>
        </div>

        {/* ✅ CHAT */}
        <aside className="lv-chat">
          <div className="chat-header">Chat Room</div>

          <div className="chat-messages">
            {messages.map((m, i) => (
              <div key={i} className="msg other">
                <strong>{m.user}</strong> {m.text}
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>

          <div className="chat-input">
            <input
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendMessage()}
              placeholder="Écrire un message…"
            />
            <button onClick={sendMessage}>➤</button>
          </div>
        </aside>
      </div>
    </div>
  );
}