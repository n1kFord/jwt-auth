const globals = require("globals");
const prettier = require("eslint-config-prettier");

module.exports = [
    {
        ignores: ["node_modules/**", "coverage/**", "dist/**", "build/**"],
    },
    {
        files: ["**/*.js"],
        languageOptions: {
            ecmaVersion: "latest",
            sourceType: "commonjs",
            globals: {
                ...globals.node,
                ...globals.jest,
            },
        },
        rules: {
            "no-console": "off",

            "no-unused-vars": [
                "error",
                {
                    argsIgnorePattern: "^_",
                    varsIgnorePattern: "^_",
                },
            ],

            eqeqeq: ["error", "always"],
            curly: ["error", "all"],

            "prefer-const": "error",
            "no-var": "error",

            "arrow-body-style": ["off"],
            "object-shorthand": ["error", "always"],
            "prefer-template": "error",
            "dot-notation": "error",
            "no-duplicate-imports": "error",
            "no-useless-return": "error",

            camelcase: "off",
            "require-await": "off",
        },
    },
    prettier,
];
