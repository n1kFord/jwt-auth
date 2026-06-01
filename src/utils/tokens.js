const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const { JWT_SECRET, JWT_REFRESH_SECRET } = require("../config/constants");

const ACCESS_TOKEN_EXPIRY = "15m";
const REFRESH_TOKEN_EXPIRY = "7d";

const generateAccessToken = (userId) => {
    return jwt.sign(
        { userId, type: "access", jti: crypto.randomUUID() },
        JWT_SECRET,
        { expiresIn: "1m" },
    );
};

const generateRefreshToken = (userId) => {
    return jwt.sign(
        { userId, type: "refresh", jti: crypto.randomUUID() },
        JWT_REFRESH_SECRET,
        { expiresIn: "7d" },
    );
};

const generateCsrfToken = () => {
    return crypto.randomBytes(32).toString("hex");
};

const verifyAccessToken = (token) => {
    try {
        return jwt.verify(token, JWT_SECRET);
    } catch {
        return null;
    }
};

const verifyRefreshToken = (token) => {
    try {
        return jwt.verify(token, JWT_REFRESH_SECRET);
    } catch {
        return null;
    }
};

module.exports = {
    generateAccessToken,
    generateRefreshToken,
    generateCsrfToken,
    verifyAccessToken,
    verifyRefreshToken,
    ACCESS_TOKEN_EXPIRY,
    REFRESH_TOKEN_EXPIRY,
};
