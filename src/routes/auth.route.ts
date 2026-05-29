import { Router } from "express";
import passport from "passport";
import {
  firebaseAuthController,
  googleCallbackController,
  loginController,
  signupEmailController,
  signupMobileRequestController,
  signupMobileVerifyController,
  deleteAccountController,
} from "../controllers/auth.controller";
import {
  validateOtpVerify,
  validateSignupEmail,
  validateSignupMobile,
} from "../validation/auth.validation";
import { authenticate } from "../middleware/authenticate.middleware";

const router = Router();

router.post("/signup/email", validateSignupEmail, signupEmailController);
router.post("/signup/mobile", validateSignupMobile, signupMobileRequestController);
router.post("/verify-otp", validateOtpVerify, signupMobileVerifyController);
router.post("/login", loginController);
router.post("/firebase", firebaseAuthController);
router.delete("/account", authenticate, deleteAccountController);

router.get(
  "/google",
  passport.authenticate("google", { scope: ["profile", "email"] })
);
router.get(
  "/google/callback",
  passport.authenticate("google", { session: false }),
  googleCallbackController
);

export default router;