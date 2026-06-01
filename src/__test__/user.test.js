const request = require("supertest");
const app = require("../index");
const User = require("../models/User");
const { redisClient } = require("../config/redis");

describe("User API (JWT)", () => {
    let csrfToken;
    let accessToken;
    let refreshToken;
    let testUser;

    // helper to extract cookies from response
    const getCookies = (res) => {
        const cookies = {};
        const setCookie = res.headers["set-cookie"];

        if (setCookie) {
            setCookie.forEach((cookie) => {
                const [name, value] = cookie.split(";")[0].split("=");
                cookies[name] = value;
            });
        }

        return cookies;
    };

    // helper to register and get authenticated user
    const registerAndGetAuth = async () => {
        const res = await request(app).post("/auth/register").send({
            email: "test@example.com",
            password: "secret123",
            confirmPassword: "secret123",
            username: "testuser",
            bio: "test bio",
        });

        const cookies = getCookies(res);

        return {
            cookies,
            csrfToken: cookies["XSRF-TOKEN"],
            accessToken: cookies.token,
            refreshToken: cookies.refreshToken,
        };
    };

    // helper to check cookies are cleared
    const expectCookiesCleared = (res) => {
        const setCookieHeaders = res.headers["set-cookie"];
        expect(setCookieHeaders).toBeDefined();

        // should have 3 cookies to clear (token, refreshToken, XSRF-TOKEN)
        expect(setCookieHeaders.length).toBe(3);

        // check each cookie is cleared
        const hasTokenClear = setCookieHeaders.some(
            (c) =>
                c.startsWith("token=") &&
                (c.includes("Expires=Thu, 01 Jan 1970") ||
                    c.includes("Max-Age=0")),
        );

        const hasRefreshClear = setCookieHeaders.some(
            (c) =>
                c.startsWith("refreshToken=") &&
                (c.includes("Expires=Thu, 01 Jan 1970") ||
                    c.includes("Max-Age=0")),
        );

        const hasXsrfClear = setCookieHeaders.some(
            (c) =>
                c.startsWith("XSRF-TOKEN=") &&
                (c.includes("Expires=Thu, 01 Jan 1970") ||
                    c.includes("Max-Age=0")),
        );

        expect(hasTokenClear).toBe(true);
        expect(hasRefreshClear).toBe(true);
        expect(hasXsrfClear).toBe(true);
    };

    // setup before each test
    beforeEach(async () => {
        await User.deleteMany({});
        await redisClient.flushAll();

        const auth = await registerAndGetAuth();
        csrfToken = auth.csrfToken;
        accessToken = auth.accessToken;
        refreshToken = auth.refreshToken;
        testUser = await User.findOne({ email: "test@example.com" });
    });

    // ==============================
    // GET /me/
    // ==============================
    describe("GET /me/", () => {
        test("should return current user data without _id and password", async () => {
            const res = await request(app)
                .get("/me/")
                .set("Cookie", [
                    `token=${accessToken}`,
                    `XSRF-TOKEN=${csrfToken}`,
                ])
                .set("x-xsrf-token", csrfToken);

            expect(res.statusCode).toBe(200);
            expect(res.body).toHaveProperty("email", "test@example.com");
            expect(res.body).toHaveProperty("username", "testuser");
            expect(res.body).toHaveProperty("bio", "test bio");
            expect(res.body).not.toHaveProperty("_id");
            expect(res.body).not.toHaveProperty("password");
        });

        test("should return 401 without access token", async () => {
            const res = await request(app)
                .get("/me/")
                .set("x-xsrf-token", csrfToken);

            expect(res.statusCode).toBe(401);
        });
    });

    // ==============================
    // POST /me/change-email
    // ==============================
    describe("POST /me/change-email", () => {
        test("should change email successfully and clear cookies", async () => {
            const res = await request(app)
                .post("/me/change-email")
                .set("Cookie", [
                    `token=${accessToken}`,
                    `XSRF-TOKEN=${csrfToken}`,
                ])
                .set("x-xsrf-token", csrfToken)
                .send({
                    newEmail: "newemail@example.com",
                    password: "secret123",
                });

            expect(res.statusCode).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.msg).toContain("email updated successfully");

            // verify email was changed
            const updatedUser = await User.findById(testUser._id);
            expect(updatedUser.email).toBe("newemail@example.com");

            // check cookies are cleared
            expectCookiesCleared(res);

            // verify refresh token removed from redis
            const tokenExists = await redisClient.get(`rt:${refreshToken}`);
            expect(tokenExists).toBeNull();
        });

        test("should return 401 with wrong password", async () => {
            const res = await request(app)
                .post("/me/change-email")
                .set("Cookie", [
                    `token=${accessToken}`,
                    `XSRF-TOKEN=${csrfToken}`,
                ])
                .set("x-xsrf-token", csrfToken)
                .send({
                    newEmail: "new@example.com",
                    password: "wrongpassword",
                });

            expect(res.statusCode).toBe(401);
            expect(res.body.msg).toBe("invalid credentials");
        });

        test("should return 400 if new email is missing", async () => {
            const res = await request(app)
                .post("/me/change-email")
                .set("Cookie", [
                    `token=${accessToken}`,
                    `XSRF-TOKEN=${csrfToken}`,
                ])
                .set("x-xsrf-token", csrfToken)
                .send({ password: "secret123" });

            expect(res.statusCode).toBe(400);
        });

        test("should return 400 if password is missing", async () => {
            const res = await request(app)
                .post("/me/change-email")
                .set("Cookie", [
                    `token=${accessToken}`,
                    `XSRF-TOKEN=${csrfToken}`,
                ])
                .set("x-xsrf-token", csrfToken)
                .send({ newEmail: "new@example.com" });

            expect(res.statusCode).toBe(400);
        });

        test("should return 400 for invalid email format", async () => {
            const res = await request(app)
                .post("/me/change-email")
                .set("Cookie", [
                    `token=${accessToken}`,
                    `XSRF-TOKEN=${csrfToken}`,
                ])
                .set("x-xsrf-token", csrfToken)
                .send({
                    newEmail: "not-an-email",
                    password: "secret123",
                });

            expect(res.statusCode).toBe(400);
        });

        test("should return 409 if email already taken", async () => {
            // create another user with target email
            await User.create({
                email: "taken@example.com",
                password: "hashed",
                username: "takenuser",
            });

            const res = await request(app)
                .post("/me/change-email")
                .set("Cookie", [
                    `token=${accessToken}`,
                    `XSRF-TOKEN=${csrfToken}`,
                ])
                .set("x-xsrf-token", csrfToken)
                .send({
                    newEmail: "taken@example.com",
                    password: "secret123",
                });

            expect(res.statusCode).toBe(409);
            expect(res.body.msg).toBe("this email is already in use");
        });

        test("should return 403 without CSRF token", async () => {
            const res = await request(app)
                .post("/me/change-email")
                .set("Cookie", [`token=${accessToken}`])
                .send({
                    newEmail: "new@example.com",
                    password: "secret123",
                });

            expect(res.statusCode).toBe(403);
        });
    });

    // ==============================
    // POST /me/change-password
    // ==============================
    describe("POST /me/change-password", () => {
        test("should change password successfully and clear cookies", async () => {
            const res = await request(app)
                .post("/me/change-password")
                .set("Cookie", [
                    `token=${accessToken}`,
                    `XSRF-TOKEN=${csrfToken}`,
                ])
                .set("x-xsrf-token", csrfToken)
                .send({
                    password: "secret123",
                    newPassword: "newsecret456",
                    confirmNewPassword: "newsecret456",
                });

            expect(res.statusCode).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.msg).toContain("password updated successfully");

            // check cookies are cleared
            expectCookiesCleared(res);

            // verify can't login with old password
            const loginRes = await request(app).post("/auth/login").send({
                email: "test@example.com",
                password: "secret123",
            });
            expect(loginRes.statusCode).toBe(401);

            // verify refresh token removed from redis
            const tokenExists = await redisClient.get(`rt:${refreshToken}`);
            expect(tokenExists).toBeNull();
        });

        test("should return 401 with wrong current password", async () => {
            const res = await request(app)
                .post("/me/change-password")
                .set("Cookie", [
                    `token=${accessToken}`,
                    `XSRF-TOKEN=${csrfToken}`,
                ])
                .set("x-xsrf-token", csrfToken)
                .send({
                    password: "wrongpassword",
                    newPassword: "newsecret456",
                    confirmNewPassword: "newsecret456",
                });

            expect(res.statusCode).toBe(401);
            expect(res.body.msg).toBe("invalid password");
        });

        test("should return 400 if new password is same as current", async () => {
            const res = await request(app)
                .post("/me/change-password")
                .set("Cookie", [
                    `token=${accessToken}`,
                    `XSRF-TOKEN=${csrfToken}`,
                ])
                .set("x-xsrf-token", csrfToken)
                .send({
                    password: "secret123",
                    newPassword: "secret123",
                    confirmNewPassword: "secret123",
                });

            expect(res.statusCode).toBe(400);
            expect(res.body.errors).toBeDefined();
        });

        test("should return 400 if new passwords do not match", async () => {
            const res = await request(app)
                .post("/me/change-password")
                .set("Cookie", [
                    `token=${accessToken}`,
                    `XSRF-TOKEN=${csrfToken}`,
                ])
                .set("x-xsrf-token", csrfToken)
                .send({
                    password: "secret123",
                    newPassword: "newsecret456",
                    confirmNewPassword: "different",
                });

            expect(res.statusCode).toBe(400);
            expect(res.body.errors).toBeDefined();
        });

        test("should return 400 if new password is too short", async () => {
            const res = await request(app)
                .post("/me/change-password")
                .set("Cookie", [
                    `token=${accessToken}`,
                    `XSRF-TOKEN=${csrfToken}`,
                ])
                .set("x-xsrf-token", csrfToken)
                .send({
                    password: "secret123",
                    newPassword: "123",
                    confirmNewPassword: "123",
                });

            expect(res.statusCode).toBe(400);
        });
    });

    // ==============================
    // POST /me/change-username
    // ==============================
    describe("POST /me/change-username", () => {
        test("should change username successfully", async () => {
            const res = await request(app)
                .post("/me/change-username")
                .set("Cookie", [
                    `token=${accessToken}`,
                    `XSRF-TOKEN=${csrfToken}`,
                ])
                .set("x-xsrf-token", csrfToken)
                .send({ newUsername: "newusername123" });

            expect(res.statusCode).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.username).toBe("newusername123");

            const updatedUser = await User.findById(testUser._id);
            expect(updatedUser.username).toBe("newusername123");
        });

        test("should return 400 if new username is missing", async () => {
            const res = await request(app)
                .post("/me/change-username")
                .set("Cookie", [
                    `token=${accessToken}`,
                    `XSRF-TOKEN=${csrfToken}`,
                ])
                .set("x-xsrf-token", csrfToken)
                .send({});

            expect(res.statusCode).toBe(400);
        });

        test("should return 400 if username is too long", async () => {
            const res = await request(app)
                .post("/me/change-username")
                .set("Cookie", [
                    `token=${accessToken}`,
                    `XSRF-TOKEN=${csrfToken}`,
                ])
                .set("x-xsrf-token", csrfToken)
                .send({ newUsername: "a".repeat(31) });

            expect(res.statusCode).toBe(400);
        });

        test("should return 403 without CSRF token", async () => {
            const res = await request(app)
                .post("/me/change-username")
                .set("Cookie", [`token=${accessToken}`])
                .send({ newUsername: "newusername" });

            expect(res.statusCode).toBe(403);
        });
    });

    // ==============================
    // POST /me/change-bio
    // ==============================
    describe("POST /me/change-bio", () => {
        test("should change bio successfully", async () => {
            const res = await request(app)
                .post("/me/change-bio")
                .set("Cookie", [
                    `token=${accessToken}`,
                    `XSRF-TOKEN=${csrfToken}`,
                ])
                .set("x-xsrf-token", csrfToken)
                .send({ newBio: "updated bio text here" });

            expect(res.statusCode).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.bio).toBe("updated bio text here");

            const updatedUser = await User.findById(testUser._id);
            expect(updatedUser.bio).toBe("updated bio text here");
        });

        test("should return 400 if new bio is missing", async () => {
            const res = await request(app)
                .post("/me/change-bio")
                .set("Cookie", [
                    `token=${accessToken}`,
                    `XSRF-TOKEN=${csrfToken}`,
                ])
                .set("x-xsrf-token", csrfToken)
                .send({});

            expect(res.statusCode).toBe(400);
        });

        test("should return 400 if bio is too long", async () => {
            const res = await request(app)
                .post("/me/change-bio")
                .set("Cookie", [
                    `token=${accessToken}`,
                    `XSRF-TOKEN=${csrfToken}`,
                ])
                .set("x-xsrf-token", csrfToken)
                .send({ newBio: "b".repeat(301) });

            expect(res.statusCode).toBe(400);
        });
    });

    // ==============================
    // DELETE /me/
    // ==============================
    describe("DELETE /me/", () => {
        test("should delete user successfully and clear cookies", async () => {
            const res = await request(app)
                .delete("/me/")
                .set("Cookie", [
                    `token=${accessToken}`,
                    `XSRF-TOKEN=${csrfToken}`,
                ])
                .set("x-xsrf-token", csrfToken);

            expect(res.statusCode).toBe(200);
            expect(res.body.message).toBe("user deleted successfully");

            // verify user was deleted
            const deletedUser = await User.findById(testUser._id);
            expect(deletedUser).toBeNull();

            // check cookies are cleared
            expectCookiesCleared(res);

            // verify refresh token removed from redis
            const tokenExists = await redisClient.get(`rt:${refreshToken}`);
            expect(tokenExists).toBeNull();

            // try to access protected endpoint should fail
            const profileRes = await request(app)
                .get("/me/")
                .set("Cookie", [
                    `token=${accessToken}`,
                    `XSRF-TOKEN=${csrfToken}`,
                ])
                .set("x-xsrf-token", csrfToken);

            expect(profileRes.statusCode).toBe(404);
        });

        test("should return 403 without CSRF token", async () => {
            const res = await request(app)
                .delete("/me/")
                .set("Cookie", [`token=${accessToken}`]);

            expect(res.statusCode).toBe(403);
        });

        test("should return 401 without access token", async () => {
            const res = await request(app)
                .delete("/me/")
                .set("x-xsrf-token", csrfToken);

            expect(res.statusCode).toBe(401);
        });
    });
});
