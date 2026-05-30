import { Request, Response } from "express";
import { User } from "../models/user.model";
import multer from "multer";
import path from "path";
import { ReminderModel } from "../models/reminder.model";
import { PrescriptionModel } from "../models/prescription.model";

export const deleteAccountController = async (req: Request, res: Response) => {
  try {
    if (!req.userId) { res.status(401).json({ error: "Unauthorized" }); return; }

    // Delete all user data
    await PrescriptionModel.deleteMany({ userId: req.userId });
    await ReminderModel.deleteMany({ userId: req.userId });
    await User.findByIdAndDelete(req.userId);

    res.json({ success: true, message: "Account deleted successfully" });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

export const getProfileController = async (req: Request, res: Response) => {
  try {
    if (!req.userId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    const user = await User.findById(req.userId).select("-password");
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }
    res.json({ success: true, data: user });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

export const updateProfileController = async (req: Request, res: Response) => {
  try {
    if (!req.userId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const {
      fullName,
      dateOfBirth,
      bloodGroup,
      gender,
      height,
      weight,
      allergies,
      chronicConditions,
      emergencyContact,
      address,
    } = req.body;

    const updateData: any = {};

    if (fullName) updateData.fullName = fullName;
    if (dateOfBirth !== undefined) updateData["profile.dateOfBirth"] = dateOfBirth;
    if (bloodGroup !== undefined) updateData["profile.bloodGroup"] = bloodGroup;
    if (gender !== undefined) updateData["profile.gender"] = gender;
    if (height !== undefined) updateData["profile.height"] = height;
    if (weight !== undefined) updateData["profile.weight"] = weight;
    if (allergies !== undefined) updateData["profile.allergies"] = Array.isArray(allergies) ? allergies : [allergies];
    if (chronicConditions !== undefined) updateData["profile.chronicConditions"] = Array.isArray(chronicConditions) ? chronicConditions : [chronicConditions];
    if (emergencyContact !== undefined) updateData["profile.emergencyContact"] = emergencyContact;
    if (address !== undefined) updateData["profile.address"] = address;

    // Handle profile photo upload
    if (req.file) {
      updateData["profile.profilePhoto"] = `/uploads/profiles/${req.file.filename}`;
    }

    const user = await User.findByIdAndUpdate(
      req.userId,
      { $set: updateData },
      { new: true }
    ).select("-password");

    res.json({ success: true, data: user });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};