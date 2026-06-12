// src/controllers/dailyLog.controller.ts
import { Request, Response } from "express";
import { createServiceError, createSuccessResponse } from "../lib/utils";
import {
  getTodayProgressService,
  markMedicineTakenService,
  markTakenByReminderService,
  getMissedMedicinesService,
} from "../services/dailyLog.service";

// GET /api/daily-log/today
export const getTodayProgressController = async (req: Request, res: Response) => {
  if (!req.userId) throw createServiceError("User not authenticated", 401);

  const progress = await getTodayProgressService(req.userId);

  res.status(200).json(createSuccessResponse(progress, "Today's progress retrieved"));
};

// POST /api/daily-log/mark-taken
// Body: { logId }
export const markMedicineTakenController = async (req: Request, res: Response) => {
  if (!req.userId) throw createServiceError("User not authenticated", 401);

  const { logId } = req.body;

  if (!logId) throw createServiceError("logId is required", 400);

  const log = await markMedicineTakenService(req.userId, logId);

  res.status(200).json(createSuccessResponse(log, "Medicine marked as taken"));
};

// POST /api/daily-log/mark-taken-by-reminder
// Body: { reminderId, slot }
// Used from notification action button
export const markTakenByReminderController = async (req: Request, res: Response) => {
  if (!req.userId) throw createServiceError("User not authenticated", 401);

  const { reminderId, slot } = req.body;

  if (!reminderId || !slot) throw createServiceError("reminderId and slot are required", 400);

  const log = await markTakenByReminderService(req.userId, reminderId, slot);

  res.status(200).json(createSuccessResponse(log, "Medicine marked as taken"));
};

// GET /api/daily-log/missed
export const getMissedMedicinesController = async (req: Request, res: Response) => {
  if (!req.userId) throw createServiceError("User not authenticated", 401);

  const missed = await getMissedMedicinesService(req.userId);

  res.status(200).json(createSuccessResponse(missed, "Missed medicines retrieved"));
};