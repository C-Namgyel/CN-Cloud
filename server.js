const express = require("express");
const multer = require("multer");
const bodyParser = require('body-parser');
const path = require('path');
const fs = require("fs/promises");

const PORT = 3000;

const app = express();
const STORAGE_ROOT = path.join(__dirname, "uploads");

app.use(express.static(path.join(__dirname, '/public')));
app.use(bodyParser.json());

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
            size: stats.size,
            modifiedAt: stats.mtime
        });
    }
    return result;
}

// Upload
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, "./uploads");
    },
    filename: function (req, file, cb) {
        cb(null, file.originalname);
    }
});
const upload = multer({ storage });

// APIS
app.post("/upload", upload.single("file"), (req, res) => {
    console.log(req.file);
    res.send("Upload complete!");
});
app.get("/getFiles", async (req, res) => {
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
app.listen(PORT, () => console.log(`App running at http://localhost:${PORT}`));