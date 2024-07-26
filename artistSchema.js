const mongoose = require("mongoose");
const {userSchema} = require("./userSchema");
const Schema = mongoose.Schema;

const songSchema = new Schema({
    name: {
        type: String,
        required: true
    },
    duration_ms: {
        type: Number,
        required: true
    },
    uri: {
        type: String,
        required: true
    },
    coverImgUrl: {
        type: String,
        required: true
    },
    album: {
        type: String,
    },
    artists: {
        type: [String],
        required: true
    },
    is_local: {
        type: Boolean,
        default: true
    }
});

const artistSchema = new Schema({
    name: {
        type: String,
        required: true,
        unique: true
    },
    songs:{
        type: [songSchema],
        default: []
    }
});

const partySchema = new Schema({
    name:{
        type: String,
        required: true
    },
    host:{
        type: userSchema,
        required: true
    },
    songs:{
        type: [Object],
        default: []
    },
    people:{
        type: [String],
        default: []
    },
    currentTrack:{
        type: Object,
        default: {}
    }
});

const Artist = mongoose.model("Artist", artistSchema);
const Song = mongoose.model("Song", songSchema);
const Party = mongoose.model("Party", partySchema);
module.exports = {Artist, Song, Party};