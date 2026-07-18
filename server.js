const express = require("express");
const bodyParser = require('body-parser');
const path = require('path');
const cors = require('cors')

const app = express();
const PORT = 8080;

// const STORAGE_ROOT = path.join(__dirname, "./uploads");
const STORAGE_ROOT = "/run/media/hkiba/Shared";

const allowedOrigins = [
  "https://cloud.xraiga.dev"
];
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no Origin (Postman, curl, server-to-server)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    callback(new Error("Not allowed by CORS"));
  },
  credentials: true
  // origin: "*",
}));

app.use(bodyParser.json());

app.use("/api/drive", require("./api/drive.route"));
app.use("/api/auth", require("./api/auth.route"));

app.get("/health", (req, res) => {
    res.send("OK");
})
app.get("/share", (req, res) => {
    const relativePath = req.query.path;
    if (!relativePath)
      return res.sendStatus(400);
    const root = path.resolve(STORAGE_ROOT);
    const file = path.resolve(root, relativePath);
    if (!file.startsWith(root))
        return res.sendStatus(403);
    res.download(file);
    res.status(200);
});

app.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}`));