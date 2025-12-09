// app.js
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";

import userRouter from "./routes/user.routes.js";
import healthcheckRouter from "./routes/healthcheck.routes.js";
import tweetRouter from "./routes/tweet.routes.js";
import subscriptionRouter from "./routes/subscription.routes.js";
import videoRouter from "./routes/video.routes.js";
import commentRouter from "./routes/comment.routes.js";
import likeRouter from "./routes/like.routes.js";
import playlistRouter from "./routes/playlist.routes.js";
import dashboardRouter from "./routes/dashboard.routes.js";

const app = express();

// Required for secure cookies behind Render proxy
app.set("trust proxy", 1);

// ---- FIXED CORS ----
// const allowedOrigins = process.env.CORS_ORIGIN
//   ? process.env.CORS_ORIGIN.split(",").map(o => o.trim())
//   : [];

// app.use(
//   cors({
//     origin: function (origin, callback) {
//       if (!origin) return callback(null, true); // allow Postman / server-to-server
//       if (allowedOrigins.includes(origin)) return callback(null, true);
//       return callback(new Error("CORS blocked: " + origin));
//     },
//     credentials: true,
//   })
// );

const allowList = (process.env.CORS_ORIGIN || "")
  .split(",")
  .map(s => s.trim())
  .filter(Boolean);

const corsOptionsDelegate = (req, cb) => {
  const origin = req.headers.origin;

  // allow server-to-server tools (no Origin header)
  if (!origin) return cb(null, { origin: true, credentials: true });

  let allowed = allowList.includes(origin);

  // (optional) allow any Vercel preview subdomain
  try {
    const u = new URL(origin);
    if (u.hostname.endsWith(".vercel.app")) allowed = true;
  } catch {}

  // Do NOT throw. Just return origin: true/false.
  return cb(null, {
    origin: allowed,
    credentials: true,
  });
};

app.use(cors(corsOptionsDelegate));

// Express 5: let CORS handle preflights, but fast-return is fine:
app.use((req, res, next) => {
  if (req.method === "OPTIONS") return res.sendStatus(204);
  next();
});



// Body parser
app.use(express.json({ limit: "20kb" }));
app.use(express.urlencoded({ extended: true, limit: "20kb" }));
app.use(express.static("public"));
app.use(cookieParser());

// ---- ADD HEALTH ROUTE FOR RENDER ----
app.get("/health", (req, res) => {
  res.status(200).send("OK");
});

// ---- API ROUTES ----
app.use("/api/v1/users", userRouter);
app.use("/api/v1/healthcheck", healthcheckRouter);
// remove duplicate users router
app.use("/api/v1/tweets", tweetRouter);
app.use("/api/v1/subscriptions", subscriptionRouter);
app.use("/api/v1/videos", videoRouter);
app.use("/api/v1/comments", commentRouter);
app.use("/api/v1/likes", likeRouter);
app.use("/api/v1/playlist", playlistRouter);
app.use("/api/v1/dashboard", dashboardRouter);

// ---- 404 Handler ----
app.use((req, res) => {
  res.status(404).json({ success: false, message: "Route not found" });
});

// ---- Error Handler ----
app.use((err, req, res, next) => {
  console.error("Unhandled Error:", err);
  res.status(500).json({ success: false, message: err.message || "Server Error" });
});

export default app;
