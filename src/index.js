require("dotenv").config();

const express = require("express");
const cors = require("cors");
const rateLimit = require("express-rate-limit");
const cookieParser = require("cookie-parser");

const app = express();

const {
    jsonOnlyMiddleware,
    jsonErrorMiddleware,
    fallbackErrorMiddleware,
} = require("./middlewares/fallback.js");

const authRouter = require("./routers/authRouter.js");
const userRouter = require("./routers/userRouter.js");

const { connectMongo } = require("./config/mongo.js");
const { connectRedis } = require("./config/redis.js");
const requestLogger = require("./middlewares/requestLogger.js");
const logger = require("./utils/logger.js");

// true when running normally (not in test mode)
const isNormalStart =
    require.main === module && process.env.NODE_ENV !== "test";

// CORS - allow all origins (for development)
app.use(
    cors({
        origin: true,
        credentials: true,
    }),
);

const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100,
    message: { error: "Too many requests, please try again later" },
    skipSuccessfulRequests: false,
});

if (isNormalStart) app.use(limiter);

const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10,
    message: { error: "Too many login attempts, please try again later" },
    skipSuccessfulRequests: true,
});

app.use(express.json());
app.use(requestLogger);
app.use(cookieParser());
app.use(jsonOnlyMiddleware);
app.use(jsonErrorMiddleware);

if (isNormalStart) app.use("/auth", authLimiter);
app.use("/auth", authRouter);
app.use("/me", userRouter);

app.use(fallbackErrorMiddleware);

const start = async () => {
    try {
        await connectMongo();
        await connectRedis();

        app.listen(process.env.PORT || 8080, () => {
            logger.info("Server started");
        });
    } catch (err) {
        logger.error(`Startup error: ${err.message}`);
        process.exit(1);
    }
};

if (isNormalStart) {
    start();
}

module.exports = app;
