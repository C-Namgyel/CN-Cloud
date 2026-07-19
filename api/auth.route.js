const express = require("express");
const bcrypt = require("bcrypt");
const uuid = require("uuid");
const crypto = require("crypto");
const router = express.Router();

const db = require("../db");

router.post("/login", async (req, res) => {
    const body = req.body;
    let token;
    try {
        const user = db.prepare("SELECT * FROM auth WHERE username = ?").get(body.username);
        token = user.token;
        if (!user) {
            return res.status(401).json({ error: "Invalid username", success: false });
        }
        const match = await bcrypt.compare(body.password, user.password);
        if (match) {
            const now = Date.now();
            if (now >= user.expires) {
                token = crypto.randomBytes(32).toString("hex");
                expires = now + 24 * 60 * 60 * 1000; // 1 day
                try {
                    db.prepare("UPDATE auth SET token = ?, expires = ? WHERE uuid = ?").run(token, expires, user.uuid)
                } catch (err) {
                    console.error(err)
                    return res.status(500).json({success: false, error: "Error while logging in"});
                }
            }
            res.json({ data: { username: user.username, uuid: user.uuid, token: token }, success: true });
        } else {
            res.status(401).json({ error: "Incorrect Password", success: false });
        }
    } catch (err) {
        console.error(err.message);
        res.status(500).json({success: false, error: err.message});
    }
})
router.post("/register", async (req, res) => {
    const body = req.body;
    try {
        const hash = await bcrypt.hash(body.password, 10);
        const accountId = uuid.v4();
        const token = crypto.randomBytes(32).toString("hex");
        const now = Date.now();
        const expires = now + 24 * 60 * 60 * 1000; // 1 day
        db.prepare("INSERT INTO auth (username, password, uuid, token, expires) VALUES (?, ?, ?, ?, ?)").run(body.username, hash, accountId, token, expires);
        res.json({success: true, data: {uuid: accountId}});
    } catch (err) {
        console.error(err.message);
        res.status(500).json({success: false, error: err.message});
    }
})

module.exports = router;