const { Router } = require("express");
const { body } = require("express-validator");

const { handleValidation } = require("../middlewares/validation");

const User = require("../models/User.js");

const { asyncHandler } = require("../utils/handler.js");

const { hashPassword, comparePassword } = require("../utils/hash.js");

const { getRandomUsername } = require("../utils/username.js");
const {
    generateRefreshToken,
    generateAccessToken,
    generateCsrfToken,
} = require("../utils/tokens.js");
const { setAuthCookies, clearAuthCookies } = require("../utils/cookies.js");

const {
    addRefreshToken,
    removeRefreshToken,
    findRefreshToken,
} = require("../store/refreshTokens.js");
const { JWT_REFRESH_SECRET } = require("../config/constants.js");
const { csrfProtection } = require("../middlewares/csrf.js");
const logger = require("../utils/logger.js");

const authRouter = new Router();

authRouter.post(
    "/register",
    [
        body("email")
            .notEmpty()
            .withMessage("Email is required")
            .isEmail()
            .withMessage("Invalid email")
            .isLength({ max: 100 })
            .withMessage("Email cannot exceed 100 characters"),

        body("password")
            .notEmpty()
            .withMessage("Password is required")
            .isLength({ min: 6, max: 100 })
            .withMessage("Password must be between 6 and 100 characters"),

        body("confirmPassword")
            .notEmpty()
            .withMessage("Confirm password is required")
            .custom((value, { req }) => {
                if (value !== req.body.password) {
                    throw new Error("Passwords do not match");
                }

                return true;
            }),

        body("username")
            .optional()
            .isLength({ min: 1, max: 30 })
            .withMessage("Username must be between 1 and 30 characters"),

        body("bio")
            .optional()
            .isLength({ max: 300 })
            .withMessage("Bio cannot exceed 300 characters"),
    ],
    handleValidation,
    asyncHandler(async (req, res) => {
        const { email, password, username, bio } = req.body || {};

        const userExists = await User.findOne({ email });

        if (userExists) {
            return res.status(409).json({
                msg: "this email is already in use",
            });
        }

        const hashedPassword = await hashPassword(password);

        const newUser = new User({
            email,
            username: username ?? getRandomUsername(),
            bio: bio ?? "",
            password: hashedPassword,
        });

        await newUser.save();

        const accessToken = generateAccessToken(newUser._id);
        const refreshToken = generateRefreshToken(newUser._id);
        const csrfToken = generateCsrfToken();

        await addRefreshToken(refreshToken, newUser._id);

        setAuthCookies(res, accessToken, refreshToken, csrfToken);

        return res.status(201).json({ success: true });
    }),
);

authRouter.post(
    "/login",
    [
        body("email")
            .notEmpty()
            .withMessage("Email is required")
            .isEmail()
            .withMessage("Invalid email")
            .isLength({ max: 100 })
            .withMessage("Email cannot exceed 100 characters"),

        body("password")
            .notEmpty()
            .withMessage("Password is required")
            .isLength({ min: 6, max: 100 })
            .withMessage("Password must be between 6 and 100 characters"),
    ],
    handleValidation,
    asyncHandler(async (req, res) => {
        const { email, password } = req.body || {};

        const user = await User.findOne({ email });

        if (!user) {
            return res.status(401).json({
                msg: "invalid credentials",
            });
        }

        const isPasswordValid = await comparePassword(password, user.password);

        if (!isPasswordValid) {
            return res.status(401).json({
                msg: "invalid credentials",
            });
        }

        const accessToken = generateAccessToken(user._id);
        const refreshToken = generateRefreshToken(user._id);
        const csrfToken = generateCsrfToken();

        await addRefreshToken(refreshToken, user._id);

        setAuthCookies(res, accessToken, refreshToken, csrfToken);

        return res.status(200).json({ success: true });
    }),
);

authRouter.post("/refresh", csrfProtection, async (req, res) => {
    const refreshToken = req.cookies?.refreshToken;

    if (!refreshToken) {
        clearAuthCookies(res);
        return res.status(401).json({
            msg: "no refresh token",
        });
    }

    try {
        const decoded = require("jsonwebtoken").verify(
            refreshToken,
            JWT_REFRESH_SECRET,
        );

        if (decoded.type !== "refresh") {
            clearAuthCookies(res);

            return res.status(401).json({
                msg: "invalid token type",
            });
        }

        const stored = await findRefreshToken(refreshToken);

        if (!stored) {
            clearAuthCookies(res);

            return res.status(401).json({
                msg: "refresh token revoked",
            });
        }

        await removeRefreshToken(refreshToken);

        const newAccessToken = generateAccessToken(decoded.userId);

        const newRefreshToken = generateRefreshToken(decoded.userId);

        await addRefreshToken(newRefreshToken, decoded.userId);

        setAuthCookies(
            res,
            newAccessToken,
            newRefreshToken,
            generateCsrfToken(),
        );

        return res.json({
            success: true,
        });
    } catch (err) {
        logger.error(err);

        clearAuthCookies(res);

        return res.status(401).json({
            msg: "invalid refresh token",
        });
    }
});

authRouter.post(
    "/logout",
    asyncHandler(async (req, res) => {
        const refreshToken = req.cookies?.refreshToken;

        if (refreshToken) {
            await removeRefreshToken(refreshToken);
        }

        clearAuthCookies(res);
        res.status(200).json({ success: true });
    }),
);

module.exports = authRouter;
