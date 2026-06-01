function csrfProtection(req, res, next) {
    if (["GET", "HEAD", "OPTIONS"].includes(req.method)) {
        return next();
    }

    const cookieToken = req.cookies["XSRF-TOKEN"];
    const headerToken = req.headers["x-xsrf-token"];

    if (!cookieToken || !headerToken || cookieToken !== headerToken) {
        return res.status(403).json({ msg: "CSRF token validation failed" });
    }

    next();
}

module.exports = { csrfProtection };
