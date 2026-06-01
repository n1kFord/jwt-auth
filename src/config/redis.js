const { createClient } = require("redis");
const { REDIS_CLIENT_URI } = require("./constants");
const logger = require("../utils/logger");

const redisClient = createClient({
    url: REDIS_CLIENT_URI,
    socket: {
        connectTimeout: 5000,
        reconnectStrategy: (retries) => {
            if (retries > 5) {
                return new Error("Redis connection failed after 5 retries");
            }
            return Math.min(retries * 100, 3000);
        },
    },
});

redisClient.on("error", (err) => {
    logger.error("❌ Redis error:", err.message);
});

redisClient.on("connect", () => {
    logger.info("✅ Redis connected");
});

const connectRedis = async () => {
    if (!redisClient.isOpen) {
        await redisClient.connect();
    }
    return redisClient;
};

module.exports = {
    redisClient,
    connectRedis,
};
