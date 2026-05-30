import { Router } from "express";
import { testSendReminder, triggerMorningReminders, triggerNoonReminders, triggerNightReminders } from "../controllers/notification.test.controller";



const router = Router();
router.post("/reminders/morning", triggerMorningReminders);
router.post("/reminders/noon", triggerNoonReminders);
router.post("/reminders/night", triggerNightReminders);

// POST /test/notification
router.post("/notification", testSendReminder);


export default router;