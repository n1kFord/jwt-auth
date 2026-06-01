const request = require("supertest");
const app = require("../index");
const User = require("../models/User");
const { hashPassword } = require("../utils/hash");
const { redisClient } = require("../config/redis");

describe("JWT Authentication API", () => {
    // clean database and redis before each test
    beforeEach(async () => {
        await User.deleteMany({});
        await redisClient.flushAll();
    });

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

    // ==============================
    // POST /auth/register
    // ==============================
    describe("POST /auth/register", () => {
        // valid registration
        test("should register a new user and set auth cookies", async () => {
            const res = await request(app).post("/auth/register").send({
                email: "john@example.com",
                password: "123456",
                confirmPassword: "123456",
                username: "john_doe",
                bio: "hello world",
            });

            expect(res.statusCode).toBe(201);
            expect(res.body.success).toBe(true);

            // check cookies are set
            const cookies = getCookies(res);
            expect(cookies.token).toBeDefined();
            expect(cookies.refreshToken).toBeDefined();
            expect(cookies["XSRF-TOKEN"]).toBeDefined();

            // verify user was created
            const user = await User.findOne({ email: "john@example.com" });
            expect(user).not.toBeNull();
            expect(user.username).toBe("john_doe");
            expect(user.bio).toBe("hello world");
        });

        // auto-generate username
        test("should auto-generate username when not provided", async () => {
            const res = await request(app).post("/auth/register").send({
                email: "auto@example.com",
                password: "123456",
                confirmPassword: "123456",
            });

            expect(res.statusCode).toBe(201);

            const user = await User.findOne({ email: "auto@example.com" });
            expect(user.username).toBeDefined();
            expect(user.username.length).toBeGreaterThan(0);
        });

        // bio defaults to empty string
        test("should set empty bio if not provided", async () => {
            const res = await request(app).post("/auth/register").send({
                email: "nobio@example.com",
                password: "123456",
                confirmPassword: "123456",
                username: "nobio",
            });

            expect(res.statusCode).toBe(201);
            const user = await User.findOne({ email: "nobio@example.com" });
            expect(user.bio).toBe("");
        });

        // duplicate email
        test("should return 409 if email already exists", async () => {
            await User.create({
                email: "dup@example.com",
                password: "hashed",
                username: "existing",
            });

            const res = await request(app).post("/auth/register").send({
                email: "dup@example.com",
                password: "123456",
                confirmPassword: "123456",
            });

            expect(res.statusCode).toBe(409);
            expect(res.body.msg).toBe("this email is already in use");
        });

        // password mismatch
        test("should return 400 if passwords do not match", async () => {
            const res = await request(app).post("/auth/register").send({
                email: "mismatch@example.com",
                password: "123456",
                confirmPassword: "different",
            });

            expect(res.statusCode).toBe(400);
            expect(res.body.errors).toBeDefined();

            const user = await User.findOne({ email: "mismatch@example.com" });
            expect(user).toBeNull();
        });

        // missing email
        test("should return 400 if email is missing", async () => {
            const res = await request(app).post("/auth/register").send({
                password: "123456",
                confirmPassword: "123456",
            });

            expect(res.statusCode).toBe(400);
        });

        // invalid email format
        test("should return 400 for invalid email format", async () => {
            const res = await request(app).post("/auth/register").send({
                email: "not-an-email",
                password: "123456",
                confirmPassword: "123456",
            });

            expect(res.statusCode).toBe(400);
        });

        // password too short
        test("should return 400 if password is shorter than 6 characters", async () => {
            const res = await request(app).post("/auth/register").send({
                email: "short@example.com",
                password: "123",
                confirmPassword: "123",
            });

            expect(res.statusCode).toBe(400);
        });

        // password too long
        test("should return 400 if password exceeds 100 characters", async () => {
            const long = "a".repeat(101);
            const res = await request(app).post("/auth/register").send({
                email: "long@example.com",
                password: long,
                confirmPassword: long,
            });

            expect(res.statusCode).toBe(400);
        });

        // username too long
        test("should return 400 if username exceeds 30 characters", async () => {
            const res = await request(app)
                .post("/auth/register")
                .send({
                    email: "longname@example.com",
                    password: "123456",
                    confirmPassword: "123456",
                    username: "a".repeat(31),
                });

            expect(res.statusCode).toBe(400);
        });

        // bio too long
        test("should return 400 if bio exceeds 300 characters", async () => {
            const res = await request(app)
                .post("/auth/register")
                .send({
                    email: "longbio@example.com",
                    password: "123456",
                    confirmPassword: "123456",
                    bio: "b".repeat(301),
                });

            expect(res.statusCode).toBe(400);
        });

        // refresh token should be stored in redis
        test("should store refresh token in redis after registration", async () => {
            const res = await request(app).post("/auth/register").send({
                email: "redis@example.com",
                password: "123456",
                confirmPassword: "123456",
            });

            const cookies = getCookies(res);
            const refreshToken = cookies.refreshToken;

            // check token exists in redis
            const userId = await redisClient.get(`rt:${refreshToken}`);
            expect(userId).toBeDefined();
        });
    });

    // ==============================
    // POST /auth/login
    // ==============================
    describe("POST /auth/login", () => {
        beforeEach(async () => {
            const hashed = await hashPassword("secret123");
            await User.create({
                email: "login@example.com",
                password: hashed,
                username: "logintest",
            });
        });

        // valid login
        test("should login successfully and set auth cookies", async () => {
            const res = await request(app).post("/auth/login").send({
                email: "login@example.com",
                password: "secret123",
            });

            expect(res.statusCode).toBe(200);
            expect(res.body.success).toBe(true);

            const cookies = getCookies(res);
            expect(cookies.token).toBeDefined();
            expect(cookies.refreshToken).toBeDefined();
            expect(cookies["XSRF-TOKEN"]).toBeDefined();
        });

        // wrong password
        test("should return 401 with wrong password", async () => {
            const res = await request(app).post("/auth/login").send({
                email: "login@example.com",
                password: "wrongpassword",
            });

            expect(res.statusCode).toBe(401);
            expect(res.body.msg).toBe("invalid credentials");
        });

        // non-existent email
        test("should return 401 for non-existent email", async () => {
            const res = await request(app).post("/auth/login").send({
                email: "nonexistent@example.com",
                password: "secret123",
            });

            expect(res.statusCode).toBe(401);
            expect(res.body.msg).toBe("invalid credentials");
        });

        // missing email
        test("should return 400 if email is missing", async () => {
            const res = await request(app)
                .post("/auth/login")
                .send({ password: "secret123" });

            expect(res.statusCode).toBe(400);
        });

        // missing password
        test("should return 400 if password is missing", async () => {
            const res = await request(app)
                .post("/auth/login")
                .send({ email: "login@example.com" });

            expect(res.statusCode).toBe(400);
        });

        // invalid email format
        test("should return 400 for invalid email format", async () => {
            const res = await request(app).post("/auth/login").send({
                email: "not-an-email",
                password: "secret123",
            });

            expect(res.statusCode).toBe(400);
        });

        // refresh token should be stored in redis
        test("should store new refresh token in redis after login", async () => {
            const res = await request(app).post("/auth/login").send({
                email: "login@example.com",
                password: "secret123",
            });

            const cookies = getCookies(res);
            const refreshToken = cookies.refreshToken;

            const userId = await redisClient.get(`rt:${refreshToken}`);
            expect(userId).toBeDefined();
            expect(parseInt(userId)).toBeDefined();
        });
    });

    // ==============================
    // POST /auth/refresh
    // ==============================
    describe("POST /auth/refresh", () => {
        let refreshToken;
        let csrfToken;

        beforeEach(async () => {
            // register to get tokens
            const res = await request(app).post("/auth/register").send({
                email: "refresh@example.com",
                password: "123456",
                confirmPassword: "123456",
            });

            const cookies = getCookies(res);
            refreshToken = cookies.refreshToken;
            csrfToken = cookies["XSRF-TOKEN"];
        });

        // valid refresh
        test("should refresh tokens successfully with valid refresh token", async () => {
            const res = await request(app)
                .post("/auth/refresh")
                .set("Cookie", [
                    `refreshToken=${refreshToken}`,
                    `XSRF-TOKEN=${csrfToken}`,
                ])
                .set("x-xsrf-token", csrfToken);

            expect(res.statusCode).toBe(200);
            expect(res.body.success).toBe(true);

            // should issue new tokens
            const newCookies = getCookies(res);
            expect(newCookies.token).toBeDefined();
            expect(newCookies.refreshToken).toBeDefined();
            expect(newCookies["XSRF-TOKEN"]).toBeDefined();

            // old refresh token should be removed
            const oldTokenExists = await redisClient.get(`rt:${refreshToken}`);
            expect(oldTokenExists).toBeNull();
        });

        // missing refresh token
        test("should return 401 if no refresh token provided", async () => {
            const res = await request(app)
                .post("/auth/refresh")
                .set("x-xsrf-token", csrfToken)
                .set("Cookie", [`XSRF-TOKEN=${csrfToken}`]);

            expect(res.statusCode).toBe(401);
            expect(res.body.msg).toBe("no refresh token");
        });

        // invalid CSRF token
        test("should return 403 with invalid CSRF token", async () => {
            const res = await request(app)
                .post("/auth/refresh")
                .set("Cookie", [
                    `refreshToken=${refreshToken}`,
                    `XSRF-TOKEN=${csrfToken}`,
                ])
                .set("x-xsrf-token", "invalid-csrf-token");

            expect(res.statusCode).toBe(403);
            expect(res.body.msg).toBe("CSRF token validation failed");
        });

        // missing CSRF token
        test("should return 403 if CSRF token missing", async () => {
            const res = await request(app)
                .post("/auth/refresh")
                .set("Cookie", [
                    `refreshToken=${refreshToken}`,
                    `XSRF-TOKEN=${csrfToken}`,
                ]);

            expect(res.statusCode).toBe(403);
        });

        // revoked refresh token
        test("should return 401 if refresh token is revoked", async () => {
            // first use the token (it gets revoked)
            await request(app)
                .post("/auth/refresh")
                .set("Cookie", [
                    `refreshToken=${refreshToken}`,
                    `XSRF-TOKEN=${csrfToken}`,
                ])
                .set("x-xsrf-token", csrfToken);

            // try to use same token again
            const res = await request(app)
                .post("/auth/refresh")
                .set("Cookie", [
                    `refreshToken=${refreshToken}`,
                    `XSRF-TOKEN=${csrfToken}`,
                ])
                .set("x-xsrf-token", csrfToken);

            expect(res.statusCode).toBe(401);
            expect(res.body.msg).toBe("refresh token revoked");
        });
    });

    // ==============================
    // POST /auth/logout
    // ==============================
    describe("POST /auth/logout", () => {
        let refreshToken;

        beforeEach(async () => {
            const res = await request(app).post("/auth/register").send({
                email: "logout@example.com",
                password: "123456",
                confirmPassword: "123456",
            });

            const cookies = getCookies(res);
            refreshToken = cookies.refreshToken;
        });

        // successful logout
        test("should clear cookies and remove refresh token", async () => {
            const res = await request(app)
                .post("/auth/logout")
                .set("Cookie", [`refreshToken=${refreshToken}`]);

            expect(res.statusCode).toBe(200);
            expect(res.body.success).toBe(true);

            const setCookieHeaders = res.headers["set-cookie"];
            expect(setCookieHeaders).toBeDefined();

            const tokenCookie = setCookieHeaders.find((c) =>
                c.startsWith("token="),
            );
            const refreshCookie = setCookieHeaders.find((c) =>
                c.startsWith("refreshToken="),
            );
            const xsrfCookie = setCookieHeaders.find((c) =>
                c.startsWith("XSRF-TOKEN="),
            );

            // cleared cookies should have Expires in the past (Thu, 01 Jan 1970)
            expect(tokenCookie).toContain("Expires=Thu, 01 Jan 1970");
            expect(refreshCookie).toContain("Expires=Thu, 01 Jan 1970");
            expect(xsrfCookie).toContain("Expires=Thu, 01 Jan 1970");

            // verify refresh token removed from redis
            const tokenExists = await redisClient.get(`rt:${refreshToken}`);
            expect(tokenExists).toBeNull();
        });

        // logout without refresh token
        test("should work even without refresh token", async () => {
            const res = await request(app).post("/auth/logout");

            expect(res.statusCode).toBe(200);
            expect(res.body.success).toBe(true);
        });
    });
});
