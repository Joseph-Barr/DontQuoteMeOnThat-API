var mongoose = require('mongoose');
var Schema = mongoose.Schema;

// User layout
const UserSchema = new Schema({
    username: {
        type: String,
        required: [true, "Username is required"],
        index: {
            unique: true
        }
    },
    password: {
        type: String,
        required: [true, "Password is required"]
    },
    permissionLevel: {
        type: String,
        default: 'user',
        enum: ['user', 'admin']

    }
});

exports.UserSchema = mongoose.model('User', UserSchema);

// Schema that defines the quotes
var QuoteSchema = new Schema({
    text: {
        type: String,
        required: [true, "A man must have said something"]
    },
    by: {
        type: String,
        default: "Anonymous"
    },
    year: {
        type: Number
    },
    // ID of the user that uploaded the quote
    creator: {
        type: String,
        required: [true, 'Missing Quote Creator Field'] 
    },
    public: {
        type: Boolean,
        defualt: false
    }
});

exports.QuoteSchema = mongoose.model('Quote', QuoteSchema);