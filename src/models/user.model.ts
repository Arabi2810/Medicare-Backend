// src/models/user.model.ts
import mongoose, { Document, Schema } from "mongoose";

export interface IDeviceToken {
  token: string;
  platform: "android" | "ios" | "web";
  deviceId: string;
  lastUsed: Date;
  isActive: boolean;
}

export interface IUserProfile {
  dateOfBirth?: string | null;
  bloodGroup?: "A+" | "A-" | "B+" | "B-" | "AB+" | "AB-" | "O+" | "O-" | null;
  gender?: string | null;
  height?: string | null;
  weight?: string | null;
  allergies: string[];
  chronicConditions: string[];
  emergencyContact?: string | null;
  address?: string | null;
  profilePhoto?: string | null;
}

export interface IUser extends Document {
  email?: string;
  mobileNumber?: string;
  fullName: string;
  password: string;
  googleId?: string;
  isVerified: boolean;
  isActive: boolean;
  profile: IUserProfile;
  deviceTokens: IDeviceToken[];
  notificationSettings: {
    enabled: boolean;
    medicationReminders: boolean;
    emailNotifications: boolean;
    pushNotifications: boolean;
  };
  createdAt: Date;
  updatedAt: Date;
}

const DeviceTokenSchema = new Schema<IDeviceToken>(
  {
    token: { type: String, required: true },
    platform: { type: String, enum: ["android", "ios", "web"], required: true },
    deviceId: { type: String, required: true },
    lastUsed: { type: Date, default: Date.now },
    isActive: { type: Boolean, default: true },
  },
  { _id: false }
);

const UserProfileSchema = new Schema<IUserProfile>(
  {
    dateOfBirth: { type: String, default: null },
    bloodGroup: {
      type: String,
      enum: ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-", null],
      default: null,
    },
   gender: {
      type: String,
      default: null,
    },
    height: { type: String, default: null },
    weight: { type: String, default: null },
    allergies: { type: [String], default: [] },
    chronicConditions: { type: [String], default: [] },
    emergencyContact: { type: String, default: null },
    address: { type: String, default: null },
    profilePhoto: { type: String, default: null },
  },
  { _id: false }
);

const userSchema = new Schema<IUser>(
  {
    email: { type: String, unique: true, sparse: true },
    mobileNumber: { type: String, unique: true, sparse: true },
    fullName: { type: String, required: true },
    password: { type: String, required: true },
    googleId: { type: String, unique: true, sparse: true },
    isVerified: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
    profile: { type: UserProfileSchema, default: () => ({}) },
    deviceTokens: { type: [DeviceTokenSchema], default: [] },
    notificationSettings: {
      type: {
        enabled: { type: Boolean, default: true },
        medicationReminders: { type: Boolean, default: true },
        emailNotifications: { type: Boolean, default: false },
        pushNotifications: { type: Boolean, default: true },
      },
      default: {
        enabled: true,
        medicationReminders: true,
        emailNotifications: false,
        pushNotifications: true,
      },
    },
  },
  { timestamps: true }
);

userSchema.index({ "deviceTokens.token": 1 });
userSchema.index({ "deviceTokens.deviceId": 1 });

export const User = mongoose.model<IUser>("User", userSchema);