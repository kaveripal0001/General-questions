//
//import { WebSocketServer } from "ws";
//import http from "http";

const express = require("express");
const http = require("http");
const { WebSocketServer } = require("ws");
const mongoose = require("mongoose");
require("dotenv").config();

const app = express();
const server = http.createServer(app);

// Serve frontend
app.use(express.static("public"));

// ✅ MongoDB Connection
mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("✅ Connected to MongoDB"))
  .catch((err) => console.error("❌ MongoDB error:", err));

// ✅ Message Schema
const messageSchema = new mongoose.Schema({
  text: String,
  sender: String,
  timestamp: { type: Date, default: Date.now },
});
const Message = mongoose.model("Message", messageSchema);

// WebSocket server
const wss = new WebSocketServer({ server });

wss.on("connection", async (ws) => {
  console.log("✅ New client connected");

  // Send old messages when a new client connects
  const history = await Message.find().sort({ timestamp: 1 }).limit(20);
  history.forEach((msg) => {
    ws.send(JSON.stringify(msg));
  });

  // When client sends a message
  ws.on("message", async (data) => {
    const text = data.toString();
    console.log("📩 Received:", text);

    // Save to DB
    const newMessage = new Message({ text, sender: "user" });
    await newMessage.save();

    // Broadcast to everyone
    wss.clients.forEach((client) => {
      if (client.readyState === ws.OPEN) {
        client.send(JSON.stringify(newMessage));
      }
    });
  });

  ws.on("close", () => console.log("❌ Client disconnected"));
});

const PORT = 3000;
server.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});
