// db/index.js
const Database = require("better-sqlite3");
const path = require("path");

// create single shared instance
const db = new Database(path.join(__dirname, "../database.db"), {});

console.log("SQLite connected");

// db.exec(`
//     CREATE TABLE IF NOT EXISTS teachers (
//         id INTEGER PRIMARY KEY AUTOINCREMENT,
//         name TEXT,
//         email TEXT UNIQUE,
//         password TEXT
//     );
//     CREATE TABLE IF NOT EXISTS sessions (
//         id INTEGER PRIMARY KEY AUTOINCREMENT,
//         ts INTEGER,
//         teacher TEXT,
//         class TEXT,
//         period TEXT
//     );
//     CREATE TABLE IF NOT EXISTS attendance (
//         id INTEGER PRIMARY KEY AUTOINCREMENT,
//         sessionId INTEGER,
//         student TEXT,   
//         status TEXT
//     );
//     CREATE TABLE IF NOT EXISTS classes (
//         classes TEXT
//     );
//     CREATE TABLE IF NOT EXISTS admin (
//         pass TEXT
//     );
//     CREATE TABLE IF NOT EXISTS timetable (
//         class TEXT NOT NULL,
//         day TEXT NOT NULL,
//         period TEXT NOT NULL,
//         teacherId INTEGER
//     );
//     CREATE TABLE IF NOT EXISTS periods (
//         name TEXT UNIQUE NOT NULL,
//         start TEXT NOT NULL,
//         end TEXT NOT NULL
//     );
// `);

// export it
module.exports = db;