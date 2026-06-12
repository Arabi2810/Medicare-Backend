// src/models/dailyLog.model.ts
import mongoose, { Schema, Document, Types } from "mongoose";

export interface IDailyLogDocument extends Document {
  userId: Types.ObjectId;
  prescriptionId: Types.ObjectId;
  reminderId: Types.ObjectId;
  medicineName: string;
  dosage: string;
  scheduledTime: string; // "08:00"
  scheduledSlot: "morning" | "noon" | "night";
  date: string; // "2025-06-03" — easy querying by day
  status: "pending" | "taken" | "missed";
  takenAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const DailyLogSchema = new Schema<IDailyLogDocument>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    prescriptionId: {
      type: Schema.Types.ObjectId,
      ref: "Prescription",
      required: true,
    },
    reminderId: {
      type: Schema.Types.ObjectId,
      ref: "Reminder",
      required: true,
    },
    medicineName: { type: String, required: true },
    dosage: { type: String, default: "" },
    scheduledTime: { type: String, required: true },
    scheduledSlot: {
      type: String,
      enum: ["morning", "noon", "night"],
      required: true,
    },
    date: { type: String, required: true, index: true }, // "2025-06-03"
    status: {
      type: String,
      enum: ["pending", "taken", "missed"],
      default: "pending",
      index: true,
    },
    takenAt: { type: Date, default: null },
  },
  { timestamps: true }
);

// Compound index — one log per reminder per day per slot
DailyLogSchema.index(
  { userId: 1, reminderId: 1, date: 1, scheduledSlot: 1 },
  { unique: true }
);

DailyLogSchema.index({ userId: 1, date: 1 });

export const DailyLogModel = mongoose.model<IDailyLogDocument>(
  "DailyLog",
  DailyLogSchema
);