import dotenv from "dotenv";
import express from "express";
import http from "http";
import { Server } from "socket.io";
import axios from "axios";
import cors from "cors";
import { dirname } from "path";
import { fileURLToPath } from "url";
import path from "path";

dotenv.config();

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
const server = http.createServer(app);
const port = process.env.PORT || 3000;

const io = new Server(server, {
  cors: { 
    origin: "*",
    methods: ["GET", "POST"],
    credentials: true,
    allowedHeaders: ["*"]
  },
  transports: ['websocket', 'polling'],
  pingTimeout: 60000,
  pingInterval: 25000
});

app.set("view engine", "ejs");
app.use(express.static(path.join(__dirname, "public")));
app.use(express.json());
app.use(cors({
  origin: "*",
  methods: ["GET", "POST", "OPTIONS"],
  credentials: true
}));

app.get("/", (req, res) => res.render("index.ejs"));
app.get("/predict", (req, res) => res.render("predict.ejs"));

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  socket.emit("receive_message", {
    reply: "Hello! I am your AI doctor. Please tell me your symptoms by speaking or typing."
  });

  socket.on("send_symptoms", async (data) => {
    const { symptoms } = data;

    if (!symptoms || symptoms.trim() === "") {
      socket.emit("receive_message", { reply: "I couldn't understand your symptoms. Please try again." });
      return;
    }

    socket.emit("processing", { status: true });

    try {
      const mlResponse = await axios.post("http://127.0.0.1:5000/predict", { symptoms });
      const result = mlResponse.data;

      const medications = JSON.parse(result.medications[0].replace(/'/g, '"'));
      const recommendedDiet = JSON.parse(result.recommended_diet[0].replace(/'/g, '"'));
      const precautions = result.precautions.filter(item => item && item !== "NaN");

      const diagnosisReply = `
        Based on your symptoms, you may have: ${result.disease_description}.
        Suggested medicines: ${medications.join(", ")}.
        Precautions: ${precautions.join(", ")}.
        Recommended Diet: ${recommendedDiet.join(", ")}.
      `;

      setTimeout(() => {
        socket.emit("receive_message", { reply: diagnosisReply });
        socket.emit("processing", { status: false });
      }, 2000);
      
    } catch (error) {
      socket.emit("receive_message", {
        error: "I encountered an error analyzing your symptoms. Please try again."
      });
      socket.emit("processing", { status: false });
    }
  });

  socket.on("disconnect", () => console.log("User disconnected:", socket.id));
  socket.on("error", (error) => console.error("Socket error:", error));
});

server.listen(port, "0.0.0.0", () => {
  console.log(`Server is Live on port ${port}`);
  console.log(`Access the app at http://localhost:${port}`);
});

server.on("error", (error) => console.error("Server error:", error));
