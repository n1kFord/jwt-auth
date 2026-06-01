const morgan = require("morgan");
const logger = require("../utils/logger");

const statusColor = (status) => {
    if (status >= 500) return "ERROR";
    if (status >= 400) return "WARN";
    return "OK";
};

morgan.token("statusType", (req, res) => {
    return statusColor(res.statusCode);
});

morgan.token("ip", (req) => {
    return req.headers["x-forwarded-for"] || req.ip;
});

const format =
    ":method :url | :status (:statusType) | :response-time ms | IP: :ip";

const stream = {
    write: (message) => {
        logger.http(message.trim());
    },
};

module.exports = morgan(format, { stream });
