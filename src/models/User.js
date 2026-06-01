const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
    {
        email: {
            type: String,
            required: true,
            unique: true,
            maxlength: 100,
        },

        username: {
            type: String,
            minlength: 1,
            maxlength: 30,
        },

        bio: {
            type: String,
            maxlength: 300,
        },

        password: {
            type: String,
            required: true,
            minlength: 6,
            maxlength: 100,
        },
    },
    {
        toJSON: {
            transform(doc, ret) {
                delete ret.__v;
                delete ret.password;

                return ret;
            },
        },
    },
);

const UserModel = mongoose.model("User", userSchema);

module.exports = UserModel;
