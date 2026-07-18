const express = require("express");
const multer = require("multer");
const fs = require("fs/promises");
const path = require('path');
const router = express.Router();

const db = require("../db");

// Storage
const STORAGE_ROOT = path.join(__dirname, "../uploads");
// const STORAGE_ROOT = "/run/media/hkiba/Shared";

// Functions
function resolveSafePath(reqPath = "") {
    const cleanPath = path.normalize(reqPath).replace(/^(\.\.(\/|\\|$))+/, "");
    const fullPath = path.join(STORAGE_ROOT, cleanPath);
    if (!fullPath.startsWith(STORAGE_ROOT)) {
        throw new Error("Invalid path");
    }
    return fullPath;
}
async function listFolder(reqPath) {
    const fullPath = resolveSafePath(reqPath);
    const entries = await fs.readdir(fullPath, { withFileTypes: true });
    const result = [];
    for (const entry of entries) {
        const itemFullPath = path.join(fullPath, entry.name);
        const stats = await fs.stat(itemFullPath);
        result.push({
            name: entry.name,
            path: path.join(reqPath, entry.name).replace(/\\/g, "/"),
            type: entry.isDirectory() ? "folder" : "file",
            size: stats.size
        });
    }
    return result;
}
function verify(uuid, token) {
    if (!(uuid && token)) return "Unauthorized: Invalid credentials"; 
    const user = db.prepare("SELECT uuid, token, expires FROM auth WHERE uuid = ?").get(uuid);
    if (!user) {
        return "Unauthorized";
    }
    if (token == user.token) {
        if (Date.now() >= user.expires) return "Unauthorized: Session token expired";
    } else {
        return "Unauthorized";
    }
    return true;
}

// Upload
const storage = multer.diskStorage({
    destination(req, file, cb) {
        try {
            const uploadDir = resolveSafePath(req.query.path || "/");
            cb(null, uploadDir);
        } catch (err) {
            cb(err);
        }
    },
    filename: function (req, file, cb) {
        cb(null, file.originalname);
    }
});
const upload = multer({ storage });

// APIS
router.post("/upload", upload.single("file"), (req, res) => {
    if (verify(req.headers["x-user-id"], req.headers.authorization?.replace("Bearer ", "")) != true) return res.status(401).json({success: false, error: verified})
    res.send("Upload complete!");
});
router.get("/getFiles", async (req, res) => {
    if (verify(req.headers["x-user-id"], req.headers.authorization?.replace("Bearer ", "")) != true) return res.status(401).json({success: false, error: verified})
    try {
        const reqPath = req.query.path || "";
        const files = await listFolder(reqPath);
        res.json({
            success: true,
            path: reqPath,
            items: files
        });

    } catch (err) {
        console.error(err);
        let msg = "";
        if (err.code == "ENOENT") {
            msg = "No such file or directory"
        }
        res.status(500).json({ success: false, error: msg });
    }
});
router.delete("/delete", async (req, res) => {
    if (verify(req.headers["x-user-id"], req.headers.authorization?.replace("Bearer ", "")) != true) return res.status(401).json({success: false, error: verified})
    try {
        const reqPath = req.body.path;
        const fullPath = resolveSafePath(reqPath);

        const stats = await fs.stat(fullPath);

        if (stats.isDirectory()) {
            await fs.rm(fullPath, { recursive: true, force: true });
        } else {
            await fs.unlink(fullPath);
        }
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({
            success: false,
            error: err.message
        });
    }
});
router.post("/rename", async (req, res) => {
    if (verify(req.headers["x-user-id"], req.headers.authorization?.replace("Bearer ", "")) != true) return res.status(401).json({success: false, error: verified})
    try {
        const oldPath = resolveSafePath(req.body.oldPath);
        const newPath = resolveSafePath(req.body.newPath);
        await fs.rename(oldPath, newPath);
        res.json({
            success: true
        });
    } catch (err) {
        res.status(500).json({
            success: false,
            error: err.message
        });
    }
});
router.get("/download", (req, res) => {
    if (verify(req.headers["x-user-id"], req.headers.authorization?.replace("Bearer ", "")) != true) return res.status(401).json({success: false, error: verified})
    const fullPath = resolveSafePath(req.query.path);
    res.download(fullPath);
});
router.post("/mkdir", async (req, res) => {
    if (verify(req.headers["x-user-id"], req.headers.authorization?.replace("Bearer ", "")) != true) return res.status(401).json({success: false, error: verified})
    try {
        const fullPath = resolveSafePath(req.body.path);
        await fs.mkdir(fullPath);
        res.json({
            success: true
        });
    } catch (err) {
        res.status(500).json({
            success: false,
            error: err.message
        });
    }
});

module.exports = router;