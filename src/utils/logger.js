const winston = require("winston");
const chalk = require("chalk");

const isTest = process.env.NODE_ENV === "test";

const consoleFormat = winston.format.printf(({ timestamp, level, message }) => {
    const colors = {
        error: chalk.red,
        warn: chalk.yellow,
        info: chalk.blue,
        http: chalk.magenta,
    };

    const color = colors[level] || ((t) => t);

    return `${chalk.gray(timestamp)} [${color(level.toUpperCase())}]: ${message}`;
});

const fileFormat = winston.format.printf(({ timestamp, level, message }) => {
    return `${timestamp} [${level.toUpperCase()}]: ${message}`;
});

const logger = winston.createLogger({
    level: "http",
    format: winston.format.combine(winston.format.timestamp()),
    transports: [
        new winston.transports.File({
            filename: isTest ? "logs/tests.log" : "logs/server.log",
            format: winston.format.combine(fileFormat),
        }),

        ...(isTest
            ? []
            : [
                  new winston.transports.Console({
                      format: winston.format.combine(consoleFormat),
                  }),
              ]),
    ],
});

module.exports = logger;
