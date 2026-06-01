const jwt = require("jsonwebtoken");
const User = require("../models/User");

const { JWT_SECRET } = require("../config/constants");
const logger = require("../utils/logger");

async function authenticate(req, res, next) {
    const token = req.cookies?.token;

    if (!token) {
        return res.status(401).json({ msg: "invalid token" });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);

        if (decoded.type !== "access") {
            return res.status(401).json({ msg: "invalid token type" });
        }

        const user = await User.findById(decoded.userId).select(
            "email username bio _id",
        );

        if (!user) {
            return res.status(404).json({ msg: "user not found" });
        }

        req.user = user;

        next();
    } catch (err) {
        logger.error(err);
        if (err.name === "TokenExpiredError") {
            return res.status(401).json({ msg: "access expired" });
        }

        return res.status(401).json({ msg: "invalid token" });
    }
}

module.exports = { authenticate };
