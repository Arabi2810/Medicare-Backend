import app from "./app";
import { runStartupTasks } from "./bootstrap/startup";
import { appConfig } from "./config/app.config";
import { connectDatabase } from "./config/db.config";
import { initializeFirebase } from "./services/notification.service";
import cron from "node-cron";
import { runRemindersForTimeSlot, runCleanupJobs } from "./jobs/reminderScheduler";

const startServer = async () => {
  await runStartupTasks();
  await connectDatabase();

  try {
    initializeFirebase();
    console.log("✅ Firebase initialized for push notifications");
  } catch (error) {
    console.error("⚠️ Firebase initialization failed:", error);
  }

  // Cron scheduler - Asia/Dhaka timezone
  cron.schedule('0 8 * * *', () => runRemindersForTimeSlot('morning'), { timezone: 'Asia/Dhaka' });
  cron.schedule('0 14 * * *', () => runRemindersForTimeSlot('noon'), { timezone: 'Asia/Dhaka' });
  cron.schedule('0 20 * * *', () => runRemindersForTimeSlot('night'), { timezone: 'Asia/Dhaka' });
  cron.schedule('0 0 * * *', () => runCleanupJobs(), { timezone: 'Asia/Dhaka' });
  console.log("⏰ Reminder scheduler started");

  app.listen(appConfig.PORT, () => {
    console.log(`Prescription management service is running on port ${appConfig.PORT}`);
    console.log(`Environment: ${appConfig.NODE_ENV}`);
    console.log(`Health check: http://localhost:${appConfig.PORT}${appConfig.BASE_PATH}/health`);
  });
};

startServer().catch((err) => {
  console.error("❌ Application failed to start:", err);
  process.exit(1);
});