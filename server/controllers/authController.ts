import { Request, Response } from "express";
import jwt from "jsonwebtoken";

const EMAIL = "admin@example.com";
const PASSWORD = "admin123";

export const login = (req: Request, res: Response): void => {
  const { email, password } = req.body;
  if (email !== EMAIL || password !== PASSWORD) {
    res.status(401).json({ message: "Invalid credentials." });
    return;
  }

  const token = jwt.sign({ email }, process.env.JWT_SECRET!, { expiresIn: "8h" });
  res.json({ token });
};
