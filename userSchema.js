const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const userSchema = new Schema({
    username: {
        type: String,
        required: true,
        unique: true
    },
    password: {
        type: String,
        required: true
    },
    profilePicUrl: {
        type: String,
        default: "media/default_profile.jpg"
    },
    friendRequestsSent:{
        type: [Object],
        default: []
    },
    friendRequestsReceived:{
        type: [Object],
        default: []
    },
    friends: {
        type: [Object],
        default: []
    },
    artist: {
        type: Boolean,
        default: false
    },
    currentlyListening: {
        type: Object,
        default: {}
    },
    stats:{
        type: Object,
        default: {
            artists: [],
            tracks: [],
            genres: []
        }
    }
}, {minimize: false});

const User = mongoose.model("User", userSchema);
module.exports = {User, userSchema};