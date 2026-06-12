// src/services/dailyLog.service.ts
import { Types } from "mongoose";
import { DailyLogModel } from "../models/dailyLog.model";
import { ReminderModel } from "../models/reminder.model";

// Get today's date string "YYYY-MM-DD"
const getTodayString = (): string => {
  return new Date().toISOString().split("T")[0];
};

// ============================================
// Create today's log entries for a user
// Called at midnight (12:00 AM) or on first app open
// ============================================
export const createTodayLogsService = async (userId: string) => {
  const today = getTodayString();

  // Get all active reminders for user
  const reminders = await ReminderModel.find({
    userId: new Types.ObjectId(userId),
    isActive: true,
    $or: [{ endDate: null }, { endDate: { $gte: new Date() } }],
    startDate: { $lte: new Date() },
  }).lean();

  const logsToCreate = [];

  for (const reminder of reminders) {
    const slots = [
      { slot: "morning" as const, time: reminder.timings.morning, active: reminder.schedules.morning },
      { slot: "noon" as const, time: reminder.timings.noon, active: reminder.schedules.noon },
      { slot: "night" as const, time: reminder.timings.night, active: reminder.schedules.night },
    ];

    for (const { slot, time, active } of slots) {
      if (!active) continue;

      logsToCreate.push({
        userId: reminder.userId,
        prescriptionId: reminder.prescriptionId,
        reminderId: reminder._id,
        medicineName: reminder.medicineName,
        dosage: reminder.dosage,
        scheduledTime: time,
        scheduledSlot: slot,
        date: today,
        status: "pending",
      });
    }
  }

  // Insert only if not already exists (upsert by unique index)
  for (const log of logsToCreate) {
    await DailyLogModel.updateOne(
      {
        userId: log.userId,
        reminderId: log.reminderId,
        date: log.date,
        scheduledSlot: log.scheduledSlot,
      },
      { $setOnInsert: log },
      { upsert: true }
    );
  }

  return logsToCreate.length;
};

// ============================================
// Mark a medicine as taken
// ============================================
export const markMedicineTakenService = async (
  userId: string,
  logId: string
) => {
  const log = await DailyLogModel.findOneAndUpdate(
    {
      _id: new Types.ObjectId(logId),
      userId: new Types.ObjectId(userId),
      status: "pending",
    },
    {
      $set: {
        status: "taken",
        takenAt: new Date(),
      },
    },
    { new: true }
  );

  if (!log) {
    throw new Error("Log not found or already marked");
  }

  return log;
};

// ============================================
// Mark medicine as taken by reminderId + slot
// Used from notification action button
// ============================================
export const markTakenByReminderService = async (
  userId: string,
  reminderId: string,
  slot: "morning" | "noon" | "night"
) => {
  const today = getTodayString();

  const log = await DailyLogModel.findOneAndUpdate(
    {
      userId: new Types.ObjectId(userId),
      reminderId: new Types.ObjectId(reminderId),
      date: today,
      scheduledSlot: slot,
      status: "pending",
    },
    {
      $set: {
        status: "taken",
        takenAt: new Date(),
      },
    },
    { new: true, upsert: false }
  );

  return log;
};

// ============================================
// Get today's log + progress for a user
// ============================================
export const getTodayProgressService = async (userId: string) => {
  const today = getTodayString();

  // Ensure today's logs exist
  await createTodayLogsService(userId);

  const logs = await DailyLogModel.find({
    userId: new Types.ObjectId(userId),
    date: today,
  }).lean();

  const total = logs.length;
  const taken = logs.filter((l) => l.status === "taken").length;
  const missed = logs.filter((l) => l.status === "missed").length;
  const pending = logs.filter((l) => l.status === "pending").length;

  const progress = total > 0 ? taken / total : 0;

  return {
    date: today,
    total,
    taken,
    missed,
    pending,
    progress, // 0..1
    logs,
  };
};

// ============================================
// Auto-mark missed medicines
// Called by scheduler every hour or at 11:00 PM
// ============================================
export const autoMarkMissedService = async () => {
  const today = getTodayString();
  const now = new Date();
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();
  const currentTimeMinutes = currentHour * 60 + currentMinute;

  // Get all pending logs for today
  const pendingLogs = await DailyLogModel.find({
    date: today,
    status: "pending",
  }).lean();

  const toMark = [];

  for (const log of pendingLogs) {
    // Parse scheduled time
    const [h, m] = log.scheduledTime.split(":").map(Number);
    const scheduledMinutes = h * 60 + m;

    // Mark as missed if scheduled time + 2 hours has passed
    if (currentTimeMinutes >= scheduledMinutes + 120) {
      toMark.push(log._id);
    }
  }

  if (toMark.length > 0) {
    await DailyLogModel.updateMany(
      { _id: { $in: toMark } },
      { $set: { status: "missed" } }
    );
  }

  return toMark.length;
};

// ============================================
// Get missed medicines for end-of-day summary
// Used for 11:00 PM notification
// ============================================
export const getMissedMedicinesService = async (userId: string) => {
  const today = getTodayString();

  const missedLogs = await DailyLogModel.find({
    userId: new Types.ObjectId(userId),
    date: today,
    status: "missed",
  }).lean();

  return missedLogs;
};

// ============================================
// End of day — mark all remaining pending as missed
// Called at 11:59 PM
// ============================================
export const endOfDayMarkMissedService = async (userId: string) => {
  const today = getTodayString();

  const result = await DailyLogModel.updateMany(
    {
      userId: new Types.ObjectId(userId),
      date: today,
      status: "pending",
    },
    { $set: { status: "missed" } }
  );

  return result.modifiedCount;
};