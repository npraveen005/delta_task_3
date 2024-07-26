const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const playlistSchema = new Schema({
    username:{
        type: String,
        required: true,
        unique: true
    },
    playlists:[
        // type: Object,
        // required: true //CHANGE THIS IF NEEDED

        {
            name: String,
            description: String,
            songs: [Object],
            coverImgUrl: String,
            visibility: String
        }
    ]
});

const Playlist = mongoose.model("Playlist", playlistSchema);
module.exports = Playlist;