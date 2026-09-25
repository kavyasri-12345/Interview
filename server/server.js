require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

const authRoutes = require("./routes/authRoutes");
const interviewRoutes = require("./routes/interviewRoutes");

const app = express();

// =========================================
// MIDDLEWARE
// =========================================

app.use(cors());
app.use(express.json());

// =========================================
// ROUTES
// =========================================

app.use("/api/auth", authRoutes);
app.use("/api/interviews", interviewRoutes);

// =========================================
// HEALTH CHECK
// =========================================

app.get("/", (req, res) => {
  res.json({
    message: "AI Mock Interview API is running",
  });
});

// =========================================
// DATABASE + SERVER
// =========================================

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("MongoDB Connected");

    const PORT = process.env.PORT || 5000;

    app.listen(PORT, "0.0.0.0", () => {
      console.log(
        `Server running on port ${PORT}`
      );
    });
  })
  .catch((error) => {
    console.error(
      "MongoDB connection failed:",
      error.message
    );
  });