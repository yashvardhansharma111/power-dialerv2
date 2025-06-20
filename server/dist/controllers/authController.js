"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.login = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const EMAIL = "admin@example.com";
const PASSWORD = "admin123";
const login = (req, res) => {
    const { email, password } = req.body;
    if (email !== EMAIL || password !== PASSWORD) {
        res.status(401).json({ message: "Invalid credentials." });
        return;
    }
    const token = jsonwebtoken_1.default.sign({ email }, process.env.JWT_SECRET, { expiresIn: "8h" });
    res.json({ token });
};
exports.login = login;
