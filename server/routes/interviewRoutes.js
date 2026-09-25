const express = require("express");

const {
  generateInterview,
  evaluateInterview,
  getInterviewHistory,
  transcribeAudio,
} = require("../controllers/interviewController");

const protect = require("../middleware/authMiddleware");

const multer = require("multer");

const upload = multer({
  storage: multer.memoryStorage(),
});

const router = express.Router();

router.post(
  "/generate",
  protect,
  generateInterview
);

router.post(
  "/evaluate",
  protect,
  evaluateInterview
);

router.get(
  "/history",
  protect,
  getInterviewHistory
);

// =========================================
// AUDIO TRANSCRIPTION
// =========================================

router.post(
  "/transcribe",
  protect,
  upload.single("audio"),
  transcribeAudio
);

module.exports = router;