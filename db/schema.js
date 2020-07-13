var mongoose = require('mongoose');
var Schema = mongoose.Schema;

// User layout
const UserSchema = new Schema({
    username: {
        type: String,
        required: [true, "Username is required"]
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

// The current valid JWT tokens
const CurrentUsers = new Schema({
    user: {
        type: Schema.Types.ObjectId,
        required: [true, 'Token must belong to user']
    },
    token: {
        type: String,
        required: [true, 'Must set token']
    }
});

exports.CurrentUsersSchema = mongoose.model('currentUser', this.CurrentUsersSchema);

// Schema that defines the quotes
var QuoteSchema = new Schema({
    text: {
        type: String,
        required: [true, "A man must have said something"]
    },
    by: {
        type: String
    },
    // ID of the user that uploaded the quote
    creator: {
        type: mongoose.Schema.Types.ObjectId,
        required: [true, 'Missing quote Uploader'] 
    },
    public: {
        type: Boolean,
        defualt: false
    }
});

exports.QuoteSchema = mongoose.model('Quote', QuoteSchema);