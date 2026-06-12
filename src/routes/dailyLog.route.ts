// src/routes/dailyLog.route.ts
import express from "express";
import { authenticate } from "../middleware/authenticate.middleware";
import {
  getTodayProgressController,
  markMedicineTakenController,
  markTakenByReminderController,
  getMissedMedicinesController,
} from "../controllers/dailyLog.controller";

const router = express.Router();

router.use(authenticate);

// GET today's progress
router.get("/today", getTodayProgressController);

// GET missed medicines today
router.get("/missed", getMissedMedicinesController);

// POST mark medicine taken by logId
router.post("/mark-taken", markMedicineTakenController);

// POST mark taken from notification (by reminderId + slot)
router.post("/mark-taken-by-reminder", markTakenByReminderController);

export default router;