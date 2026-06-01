const setAuthCookies = (res, accessToken, refreshToken, csrfToken) => {
    res.cookie("token", accessToken, {
        httpOnly: true,
        secure: true,
        sameSite: "none",
        maxAge: 15 * 60 * 1000,
        path: "/",
    });

    res.cookie("refreshToken", refreshToken, {
        httpOnly: true,
        secure: true,
        sameSite: "none",
        maxAge: 7 * 24 * 60 * 60 * 1000,
        path: "/",
    });

    res.cookie("XSRF-TOKEN", csrfToken, {
        httpOnly: false,
        secure: true,
        sameSite: "none",
        maxAge: 24 * 60 * 60 * 1000,
        path: "/",
    });
};

const clearAuthCookies = (res) => {
    res.clearCookie("token");
    res.clearCookie("refreshToken");
    res.clearCookie("XSRF-TOKEN");
};

module.exports = {
    setAuthCookies,
    clearAuthCookies,
};
