import { Request, Response } from "express";
import { MESSAGES } from "../lib/constants";
import { signToken } from "../lib/jwt";
import { hashPassword } from "../lib/password";
import { User } from "../models/user.model";
import {
  loginService,
  signupMobileRequestService,
  signupMobileVerifyService,
  signupWithEmailService,
} from "../services/auth.service";
import admin from "firebase-admin";
import { PrescriptionModel } from "../models/prescription.model";

export const signupEmailController = async (req: Request, res: Response) => {
  try {
    const { email, password, fullName } = req.body;
    const { user, token } = await signupWithEmailService(email, password, fullName);
    res.status(201).json({
      message: MESSAGES.SIGNUP_SUCCESS,
      token,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        isVerified: user.isVerified,
      },
    });
  } catch (err: any) {
    res.status(409).json({ error: err.message });
  }
};

export const signupMobileRequestController = async (req: Request, res: Response) => {
  try {
    const { mobileNumber } = req.body;
    await signupMobileRequestService(mobileNumber);
    res.status(200).json({
      message: MESSAGES.OTP_SENT,
      mobileNumber,
      expiresIn: "5 minutes",
    });
  } catch (err: any) {
    res.status(409).json({ error: err.message });
  }
};

export const signupMobileVerifyController = async (req: Request, res: Response) => {
  try {
    const { mobileNumber, code, password, fullName } = req.body;
    const { user, token } = await signupMobileVerifyService(mobileNumber, code, password, fullName);
    res.status(201).json({
      message: MESSAGES.ACCOUNT_CREATED,
      token,
      user: {
        id: user.id,
        mobileNumber: user.mobileNumber,
        fullName: user.fullName,
        isVerified: user.isVerified,
      },
    });
  } catch (err: any) {
    res.status(401).json({ error: err.message });
  }
};

export const loginController = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    const { user, token } = await loginService(email, password);
    res.status(200).json({
      message: MESSAGES.LOGIN_SUCCESS,
      token,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        isVerified: user.isVerified,
      },
    });
  } catch (err: any) {
    res.status(401).json({ error: err.message });
  }
};

export async function googleCallbackController(req: Request, res: Response) {
  try {
    const user = req.user as any;
    const token = signToken({ id: user.id });
    res.json({
      message: "Google signup successful",
      token,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        isVerified: user.isVerified,
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}

// Firebase Auth — handles Google Sign-In and Phone Sign-In
export const firebaseAuthController = async (req: Request, res: Response) => {
  try {
    const { idToken } = req.body;
    if (!idToken) {
      return res.status(400).json({ error: "Firebase ID token is required" });
    }

    const decodedToken = await admin.auth().verifyIdToken(idToken);
    const { uid, email, name, picture, phone_number } = decodedToken;

    // Find existing user by Firebase UID, email, or phone
    let user = await User.findOne({
      $or: [
        { googleId: uid },
        ...(email ? [{ email }] : []),
        ...(phone_number ? [{ mobileNumber: phone_number }] : []),
      ],
    });

    if (!user) {
      const randomPassword = Math.random().toString(36) + Math.random().toString(36);
      const hashedPassword = await hashPassword(randomPassword);

      user = await User.create({
        googleId: uid,
        fullName: name || email?.split("@")[0] || phone_number || "User",
        email: email || undefined,
        mobileNumber: phone_number || undefined,
        password: hashedPassword,
        isVerified: true,
        "profile.profilePhoto": picture || null,
      });
    } else {
      // Link Firebase UID to existing account
      await User.findByIdAndUpdate(user._id, {
        googleId: uid,
        isVerified: true,
        ...(picture && !user.profile?.profilePhoto
          ? { "profile.profilePhoto": picture }
          : {}),
      });
    }

    const token = signToken({ id: user.id });

    res.status(200).json({
      message: "Authentication successful",
      token,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        isVerified: user.isVerified,
      },
    });
  } catch (err: any) {
    console.error("Firebase auth error:", err);
    res.status(401).json({ error: "Invalid or expired token" });
  }
};

export const deleteAccountController = async (req: Request, res: Response) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    await PrescriptionModel.deleteMany({ userId: req.userId });
    await User.findByIdAndDelete(req.userId);
    res.status(200).json({ message: "Account deleted successfully" });
  } catch (err: any) {
    console.error("Delete account error:", err);
    res.status(500).json({ error: "Failed to delete account" });
  }
};