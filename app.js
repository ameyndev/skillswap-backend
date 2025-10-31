const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const http = require("http");
const socketIo = require("socket.io");
require("dotenv").config();

const userRoutes = require("./routes/userRoutes");
const authRoutes = require("./routes/authRoutes");
const skillRoutes = require("./routes/skillRoutes");
const skillRequestRoutes = require("./routes/skillRequestRoutes");
const chatRoutes = require("./routes/chatRoutes");
const callRoutes = require("./routes/callRoutes");
const quizRoutes = require("./routes/quizRoutes");
const leaderboardRoutes = require("./routes/leaderboardRoutes");

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
	cors: {
		origin: process.env.FRONTEND_URL || "http://localhost:5173",
		methods: ["GET", "POST"],
	},
});

// Middleware
app.use(express.json());
app.use(cors({
	origin: process.env.FRONTEND_URL || "http://localhost:5173",
	credentials: true
}));

// Connect to MongoDB
const mongoURI = process.env.MONGO_URI || "mongodb://localhost:27017/skillswap";
mongoose
	.connect(mongoURI, {
		useNewUrlParser: true,
		useUnifiedTopology: true,
	})
	.then(() => console.log("MongoDB connected"))
	.catch((err) => console.error("MongoDB connection error:", err));

// Routes
app.use("/user", userRoutes);
app.use("/auth", authRoutes);
app.use("/skills", skillRoutes);
app.use("/requests", skillRequestRoutes);
app.use("/chat", chatRoutes);
app.use("/call", callRoutes);
app.use("/quiz", quizRoutes);
app.use("/leaderboard", leaderboardRoutes);

// Socket.io connection handling
io.on("connection", (socket) => {
	console.log("User connected:", socket.id);

	// Join a chat room
	socket.on("join-chat", (chatId) => {
		socket.join(chatId);
		console.log(`User ${socket.id} joined chat ${chatId}`);
	});

	// Leave a chat room
	socket.on("leave-chat", (chatId) => {
		socket.leave(chatId);
		console.log(`User ${socket.id} left chat ${chatId}`);
	});

	// Handle new messages
	socket.on("new-message", (data) => {
		// Broadcast the message to all users in the chat room
		socket.to(data.chatId).emit("message-received", data.message);
	});

	// WebRTC Call Signaling
	socket.on("join-call", (roomId) => {
		socket.join(roomId);
		console.log("=== BACKEND JOIN CALL ===");
		console.log(`User ${socket.id} joined call room ${roomId}`);
		console.log(
			"Room members now:",
			io.sockets.adapter.rooms.get(roomId)?.size || 0
		);
		socket.to(roomId).emit("user-joined", { userId: socket.id });
	});

	socket.on("leave-call", (roomId) => {
		socket.leave(roomId);
		console.log(`User ${socket.id} left call room ${roomId}`);
		socket.to(roomId).emit("user-left", { userId: socket.id });
	});

	// WebRTC Offer
	socket.on("call-offer", (data) => {
		console.log(`User ${socket.id} sent offer to room ${data.roomId}`);
		socket.to(data.roomId).emit("call-offer", data);
	});

	// WebRTC Answer
	socket.on("call-answer", (data) => {
		console.log(`User ${socket.id} sent answer to room ${data.roomId}`);
		socket.to(data.roomId).emit("call-answer", data);
	});

	// ICE Candidate
	socket.on("ice-candidate", (data) => {
		console.log(`User ${socket.id} sent ICE candidate to room ${data.roomId}`);
		socket.to(data.roomId).emit("ice-candidate", data);
	});

	// End Call
	socket.on("end-call", (data) => {
		console.log(`User ${socket.id} ended call in room ${data.roomId}`);
		socket.to(data.roomId).emit("call-ended", { userId: socket.id });
	});

	// Chat message during call
	socket.on("chat-message", (data) => {
		socket.to(data.roomId).emit("chat-message", data.message);
	});

	// Test event
	socket.on("test-event", (data) => {
		console.log("=== BACKEND TEST EVENT ===");
		console.log(`User ${socket.id} sent test event to room ${data.roomId}`);
		console.log("Test data:", data);
		console.log(
			"Room members:",
			io.sockets.adapter.rooms.get(data.roomId)?.size || 0
		);
		socket.to(data.roomId).emit("test-event", data);
		console.log("Test event sent to room:", data.roomId);
	});

	// Call invitation events
	socket.on("call-invitation", (data) => {
		console.log("=== BACKEND CALL INVITATION ===");
		console.log(
			`User ${socket.id} sent call invitation to room ${data.roomId}`
		);
		console.log("Call data:", data);
		console.log(
			"Room members:",
			io.sockets.adapter.rooms.get(data.roomId)?.size || 0
		);
		// Send to all users in the room except the sender
		socket.to(data.roomId).emit("call-invitation", data);
		console.log("Call invitation sent to room:", data.roomId);
	});

	socket.on("call-accepted", (data) => {
		console.log(`User ${socket.id} accepted call in room ${data.roomId}`);
		socket.to(data.roomId).emit("call-accepted", data);
	});

	socket.on("call-declined", (data) => {
		console.log(`User ${socket.id} declined call in room ${data.roomId}`);
		socket.to(data.roomId).emit("call-declined", data);
	});

	socket.on("call-cancelled", (data) => {
		console.log(`User ${socket.id} cancelled call in room ${data.roomId}`);
		socket.to(data.roomId).emit("call-cancelled", data);
	});

	socket.on("disconnect", () => {
		console.log("User disconnected:", socket.id);
	});
});

// Make io available to other modules
app.set("io", io);

// Start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
