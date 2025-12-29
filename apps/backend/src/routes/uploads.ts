import path from "node:path";
import { Router } from "express";
import createError from "http-errors";
import multer from "multer";
import { requireAuth } from "../middleware/auth.js";
import { attachmentsDir } from "../config/attachments.js";

const router = Router();

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, attachmentsDir);
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${uniqueSuffix}-${file.originalname}`);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
});

router.use(requireAuth);

router.post("/file", upload.single("file"), async (req, res, next) => {
  if (!req.user) {
    next(createError(401, "Authentication required"));
    return;
  }

  try {
    const file = req.file;
    if (!file) {
      next(createError(400, "No file uploaded"));
      return;
    }

    const relativePath = path.relative(process.cwd(), file.path);
    res.status(201).json({ path: relativePath });
  } catch (error) {
    next(error);
  }
});

export default router;
