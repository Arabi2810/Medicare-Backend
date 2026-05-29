import { Router } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import {
  getProfileController,
  updateProfileController,
} from "../controllers/user.controller";
import { authenticate } from "../middleware/authenticate.middleware";

const router = Router();

// Configure multer for profile photo uploads
const profileStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = "uploads/profiles";
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `profile_${req.userId}_${Date.now()}${ext}`);
  },
});

const uploadProfile = multer({
  storage: profileStorage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith("image/")) {
      return cb(new Error("Only image files allowed"));
    }
    cb(null, true);
  },
});

router.get("/profile", authenticate, getProfileController);
router.put("/profile", authenticate, uploadProfile.single("profilePhoto"), updateProfileController);

export default router;