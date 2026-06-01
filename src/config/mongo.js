const mongoose = require("mongoose");
const { MONGO_URI } = require("./constants");
const logger = require("../utils/logger");

const connectMongo = async () => {
    const uri = MONGO_URI;

    try {
        logger.info("📦 Connecting to MongoDB...");
        await mongoose.connect(uri);
        logger.info("✅ MongoDB connected");
    } catch (error) {
        logger.error("❌ MongoDB connection error:", error.message);
        throw error;
    }
};

module.exports = { connectMongo };
