import { io } from "socket.io-client";

let socket = null;

// ✅ Initialize socket connection
export const initSocket = (token) => {
  if (socket?.connected) {
    console.log("⚠️ Socket already connected");
    return socket;
  }

 const backendUrl =
  import.meta.env.VITE_API_URL?.replace("/api", "") ||
  "https://swafy-backend.onrender.com";
  
  console.log("🔌 Connecting to socket:", backendUrl + "/messaging");

  socket = io(backendUrl + "/messaging", {
    auth: { token },
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    reconnectionAttempts: 10
  });

  socket.on("connect", () => {
    console.log("✅ Socket connected:", socket.id);
  });

  socket.on("disconnect", (reason) => {
    console.log("❌ Socket disconnected:", reason);
  });

  socket.on("connect_error", (error) => {
    console.error("❌ Socket connection error:", error.message);
  });

  return socket;
};

// ✅ Get socket instance
export const getSocket = () => socket;

// ✅ Listen for incoming messages
export const onMessageReceived = (callback) => {
  if (socket) {
    socket.off("message_received"); // ✅ نحي listeners القديمة
    socket.on("message_received", (data) => {
      console.log("📥 Socket received message:", data);
      callback(data); // ✅ رجّع message للـ page
    });
  }
};

// ✅ Listen for typing indicator
export const onUserTyping = (callback) => {
  if (socket) {
    socket.off("user_typing");
    socket.on("user_typing", callback);
  }
};

// ✅ Listen for stop typing
export const onUserStopTyping = (callback) => {
  if (socket) {
    socket.off("user_stop_typing");
    socket.on("user_stop_typing", callback);
  }
};

// ✅ Emit new message
export const emitNewMessage = (data) => {
  if (socket?.connected) {
    socket.emit("new_message", data);
    console.log("📤 Socket emit: new_message", data);
  } else {
    console.warn("⚠️ Socket not connected, cannot emit");
  }
};

// ✅ Emit typing
export const emitTyping = (data) => {
  if (socket?.connected) {
    socket.emit("typing", data);
  }
};

// ✅ Emit stop typing
export const emitStopTyping = (data) => {
  if (socket?.connected) {
    socket.emit("stop_typing", data);
  }
};

// ✅ Emit mark as read
export const emitMarkRead = (data) => {
  if (socket?.connected) {
    socket.emit("mark_read", data);
  }
};

// ✅ Disconnect socket
export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
    console.log("🔌 Socket disconnected manually");
  }
};