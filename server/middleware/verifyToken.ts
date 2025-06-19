import jwt from "jsonwebtoken";
import { Request, Response, NextFunction } from "express";

const verifyToken = (req: Request, res: Response, next: NextFunction): void => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(" ")[1];
  if (!token) {
    res.status(401).json({ message: "Access denied." });
    return;
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!);
    (req as any).user = decoded;
    next();
  } catch (err) {
    res.status(403).json({ message: "Invalid token." });
  }
};

export default verifyToken;
