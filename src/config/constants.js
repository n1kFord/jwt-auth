const requiredEnv = (name) => {
    const value = process.env[name];

    if (process.env.NODE_ENV === "test") {
        return value || "test-value";
    }

    if (!value) {
        throw new Error(`Missing required environment variable: ${name}`);
    }

    return value;
};

const PORT = process.env.PORT || 8080;

const MONGO_URI = requiredEnv("MONGO_URI");
const REDIS_CLIENT_URI = requiredEnv("REDIS_CLIENT_URI");

const JWT_SECRET = requiredEnv("JWT_SECRET");
const JWT_REFRESH_SECRET = requiredEnv("JWT_REFRESH_SECRET");

module.exports = {
    PORT,
    MONGO_URI,
    REDIS_CLIENT_URI,
    JWT_SECRET,
    JWT_REFRESH_SECRET,
};
