// src/index.js
import dotenv from "dotenv";
dotenv.config({ path: "./.env" });

import connectDB from "./db/index.js";
import app from "./app.js";

const HOST = "0.0.0.0";
const PORT = Number(process.env.PORT) || 8000;

let server;

(async () => {
  try {
    await connectDB();

    // Start HTTP server
    server = app.listen(PORT, HOST, () => {
      console.log(`✅ API listening on http://${HOST}:${PORT}`);
    });

    // Listen-level error handler
    server.on("error", (err) => {
      console.error("🔴 Server error:", err);
      process.exit(1);
    });
  } catch (err) {
    console.error("❌ Failed to connect to the database:", err);
    process.exit(1);
  }
})();

/* ---------- Global safety net & graceful shutdown ---------- */
process.on("uncaughtException", (err) => {
  console.error("🧨 Uncaught Exception:", err);
  shutdown(1);
});

process.on("unhandledRejection", (err) => {
  console.error("⚠️ Unhandled Rejection:", err);
  shutdown(1);
});

process.on("SIGTERM", () => {
  console.log("📴 SIGTERM received");
  shutdown(0);
});

process.on("SIGINT", () => {
  console.log("📴 SIGINT received");
  shutdown(0);
});

function shutdown(code) {
  if (server) {
    server.close(() => {
      console.log("🛑 HTTP server closed");
      process.exit(code);
    });
  } else {
    process.exit(code);
  }
}


