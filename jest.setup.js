process.env.MONGO_URI =
    process.env.MONGO_URI || "mongodb://localhost:27017/auth_test";
process.env.REDIS_CLIENT_URI =
    process.env.REDIS_CLIENT_URI || "redis://localhost:6379";
process.env.JWT_ACCESS_SECRET = "test-access-secret-key";
process.env.JWT_REFRESH_SECRET = "test-refresh-secret-key";
process.env.NODE_ENV = "test";
process.env.PORT = "8080";

const mongoose = require("mongoose");
const { redisClient } = require("./src/config/redis");
const logger = require("./src/utils/logger");

beforeAll(async () => {
    if (process.env.CI) {
        await new Promise((resolve) => setTimeout(resolve, 2000));
    }

    await mongoose.connect(process.env.MONGO_URI);

    // connect redis if not already open
    if (!redisClient.isOpen) {
        await redisClient.connect();
    }

    logger.info("✅ Test environment ready");
});

afterAll(async () => {
    await mongoose.connection.dropDatabase();
    await mongoose.disconnect();

    // only quit if client is open
    if (redisClient && redisClient.isOpen) {
        await redisClient.flushAll();
        await redisClient.quit();
    }

    logger.info("✅ Test environment cleaned up");
});
