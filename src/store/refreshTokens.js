const { redisClient } = require("../config/redis");

const REFRESH_TOKEN_PREFIX = "rt:";

// add refresh token
const addRefreshToken = async (token, userId) => {
    await redisClient.setEx(
        `${REFRESH_TOKEN_PREFIX}${token}`,
        60 * 60 * 24 * 7,
        userId.toString(),
    );
};

// remove single token
const removeRefreshToken = async (token) => {
    await redisClient.del(`${REFRESH_TOKEN_PREFIX}${token}`);
};

// remove ALL tokens for user (find by scanning)
const removeAllUserTokens = async (userId) => {
    // get all keys starting with "rt:"
    const keys = await redisClient.keys(`${REFRESH_TOKEN_PREFIX}*`);

    // check each key if it belongs to this user
    for (const key of keys) {
        const value = await redisClient.get(key);
        if (value === userId.toString()) {
            await redisClient.del(key);
        }
    }
};

// find token
const findRefreshToken = async (token) => {
    const userId = await redisClient.get(`${REFRESH_TOKEN_PREFIX}${token}`);

    if (userId) {
        return { token, userId: parseInt(userId) };
    }

    return null;
};

module.exports = {
    addRefreshToken,
    removeRefreshToken,
    removeAllUserTokens,
    findRefreshToken,
};
