const express = require("express");
const mongoose = require("mongoose");
const multer = require("multer");
const bcrypt = require("bcrypt");
const {getAudioDurationInSeconds} = require("get-audio-duration");
const {User} = require("./userSchema");
const {Artist, Song, Party} = require("./artistSchema");
// const Song = require("./artistSchema");
const Playlist  = require("./playlistSchema");

//UPDATE THE REGISTER SECTION SO THAT THE USERNAME IS STORED IN LOCAL STORAGE

const app = express();
const port = 3000;
const dbURI = "mongodb://127.0.0.1:27017/D-Tunes";

mongoose.connect(dbURI)
.then((result) => {
    app.listen(port, "0.0.0.0", () => {console.log(`Listening on port ${port}`)});
    console.log("Connected to mongodb");
})
.catch( (err) => {
    console.log(err);
} );

app.use(express.static("public"));
app.use(express.urlencoded({extended: true}));
app.use(express.json());

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, "public/uploads");
    },
    filename: (req, file, cb) => {
        cb(null, file.originalname);
    }
});

const upload = multer({storage: storage});


app.get("/", async (req, res) => {
    const code = req.query.code;

    // const TOKEN_URL = `https://auth.delta.nitt.edu/api/oauth/token?client_id=${CLIENT_ID}&client_secret=${CLIENT_SECRET}&redirect_uri=${REDIRECT_URI}&grant_type=authorization_code&code=${code}`;
    // const TOKEN_URL = `https://auth.delta.nitt.edu/api/oauth/token?client_id=${CLIENT_ID}&client_secret=${CLIENT_SECRET}&grant_type=authorization_code&code=${code}&redirect_uri=${REDIRECT_URI}`;

    // const response = await fetch(TOKEN_URL, {
    //     method: "POST",
    //     headers: {
    //         "Content-Type": "application/x-www-form-urlencoded"
    //     }
    // })

    // console.log(response);

    res.sendFile("./index.html", {root: __dirname});
});

app.get("/login", (req, res) => {
    res.sendFile("./login.html", {root: __dirname});
});

app.get("/register", (req, res) => {
    res.sendFile("./register.html", {root: __dirname});
});

app.get("/upload", (req, res) => {
    res.sendFile("./upload.html", {root: __dirname});
})

app.post("/register", async (req, res) => {
    const content = req.body;
    const hashedPassword = await bcrypt.hash(content.password, 10);
    const user = new User({username: content.username, password: hashedPassword});
    const temp = User.findOne({username: content.username});

    User.findOne({username: content.username})
    .then((existingUser) => {
        if(existingUser){
            res.json({success: false, message: "Username already exists"});
        }
        else{    
            user.save()
            .then( () => {
                res.json({success: true, message: "Account created successfully", username: content.username});
            })
            .catch( (err) => {
                res.json({success: false, message: "Error creating account"});
                console.log(err);
            })
        }
    })
    .catch((err) => {
        res.json({success: false, message: "Error creating account"});
        console.log(err);
    });
});

app.post("/login", (req, res) => {
    const content = req.body;

    User.findOne({username: content.username})
    .then( async (user) => {
        if(user){
            const match = await bcrypt.compare(content.password, user.password);
            if(match) {
                res.json({
                    success: true,
                    username: content.username,
                });
            }
            else {
                res.json({
                    success: false,
                    message: "Wrong password",
                });
                res.redirect("/login");
            }
        }
        else{
            res.json({
                success: false,
                message: "User not found ",
            });
            res.redirect("/login");
        }
    })
    .catch( (err) => {
        console.log(err);
    })
});

app.post("/like", (req, res) => {

    if(req.body.username){
        Playlist.findOne({username: req.body.username})
        .then(result => {
            if(result){ //username is found in the playlist collection i.e user has some playlists
                const likedPlaylist = result.playlists.find(playlist => playlist.name === "liked_songs");
                const dislikedPlaylist = result.playlists.find(playlist => playlist.name === "disliked_songs");

                //username is found but there is no liked playlist
                if(!likedPlaylist){
                    Playlist.updateOne({
                        _id: result._id,
                    },
                    {
                        $push: {playlists: {
                            name: 'liked_songs',
                            songs: [req.body.track],
                            visibility: 'private',
                            coverImgUrl: "media/liked_playlist_cover.jpg",
                            description: "Liked songs by the user"
                        }}
                    })
                    .then(updated => res.json({success: true}))
                    .catch(err => console.log(err));

                    //if the song exits in the disliked playlist remove it
                    if(dislikedPlaylist && dislikedPlaylist.songs.some(song => song.uri === req.body.track.uri)){
                        Playlist.updateOne({
                            _id: result._id,
                            "playlists.name": "disliked_songs"
                        },
                        {
                            $pull: {"playlists.$.songs": req.body.track}
                        })
                        .then(updated => res.json({success: true}))
                        .catch(err => console.log(err));
                    }
                    
                    return;
                }

                const likedSongs = likedPlaylist.songs;

                //user already likes this song and wants to remove it
                if(likedSongs.some(song => song.uri === req.body.track.uri)){
                    Playlist.updateOne({
                        _id: result._id,
                        "playlists.name": "liked_songs"
                    },
                    {
                        $pull: {"playlists.$.songs": req.body.track}
                    })
                    .then(updated => res.json({success: true}))
                    .catch(err => console.log(err));
                }
                else{   //user likes this song
                    Playlist.updateOne({
                        _id: result._id,
                        "playlists.name": "liked_songs"
                    },
                    {
                        $push: {"playlists.$.songs": req.body.track}
                    })
                    .then(updated => res.json({success: true}))
                    .catch(err => console.log(err));

                    //if the song exits in the disliked playlist remove it
                    if(dislikedPlaylist && dislikedPlaylist.songs.some(song => song.uri === req.body.track.uri)){
                        Playlist.updateOne({
                            _id: result._id,
                            "playlists.name": "disliked_songs"
                        },
                        {
                            $pull: {"playlists.$.songs": req.body.track}
                        })
                        .then(updated => res.json({success: true}))
                        .catch(err => console.log(err));
                    }
                }

            }
            else{   //username is not found i.e user has no playlist
                const likedPlaylist = new Playlist({username: req.body.username, playlists: {
                    name: 'liked_songs',
                    songs: [req.body.track],
                    visibility: 'private',
                    coverImgUrl: "media/liked_playlist_cover.jpg",
                    description: "Liked songs by the user"
                }});

                likedPlaylist.save()
                .then(result => res.json({success: true}))
                .catch(err => console.log("Error", err));
            }
        })
    }
});

app.post("/dislike", (req, res) => {
    if(req.body.username){
        Playlist.findOne({username: req.body.username})
        .then(result => {
            if(result){ //username is found in the playlist collection i.e user has some playlists
                
                const likedPlaylist = result.playlists.find(playlist => playlist.name === "liked_songs");
                const dislikedPlaylist = result.playlists.find(playlist => playlist.name === "disliked_songs");

                //username is found but there is no disliked playlist
                if(!dislikedPlaylist){
                    Playlist.updateOne({
                        _id: result._id,
                    },
                    {
                        $push: {playlists: {
                            name: 'disliked_songs',
                            songs: [req.body.track],
                            visibility: 'private',
                            coverImgUrl: "media/disliked_playlist_cover.jpg",
                            description: "Disliked songs"
                        }}
                    })
                    .then(updated => res.json({success: true}))
                    .catch(err => console.log(err));

                    //if the song exits in the liked playlist remove it
                    if(likedPlaylist && likedPlaylist.songs.some(song => song.uri === req.body.track.uri)){
                        Playlist.updateOne({
                            _id: result._id,
                            "playlists.name": "liked_songs"
                        },
                        {
                            $pull: {"playlists.$.songs": req.body.track}
                        })
                        .then(updated => res.json({success: true}))
                        .catch(err => console.log(err));
                    }
                    
                    return;
                }

                const dislikedSongs = dislikedPlaylist.songs;

                //user already dislike this song and wants to remove it
                if(dislikedSongs.some(song => song.uri === req.body.track.uri)){
                    Playlist.updateOne({
                        _id: result._id,
                        "playlists.name": "disliked_songs"
                    },
                    {
                        $pull: {"playlists.$.songs": req.body.track}
                    })
                    .then(updated => res.json({success: true}))
                    .catch(err => console.log(err));
                }
                else{   //user dislike this song
                    Playlist.updateOne({
                        _id: result._id,
                        "playlists.name": "disliked_songs"
                    },
                    {
                        $push: {"playlists.$.songs": req.body.track}
                    })
                    .then(updated => res.json({success: true}))
                    .catch(err => console.log(err));

                    //if the song exits in the liked playlist remove it
                    if(likedPlaylist && likedPlaylist.songs.some(song => song.uri === req.body.track.uri)){
                        Playlist.updateOne({
                            _id: result._id,
                            "playlists.name": "liked_songs"
                        },
                        {
                            $pull: {"playlists.$.songs": req.body.track}
                        })
                        .then(updated => res.json({success: true}))
                        .catch(err => console.log(err));
                    }
                }

            }
            else{ //username is not found i.e user has no playlist
                const dislikedPlaylist = new Playlist({username: req.body.username, playlists: {
                    name: 'disliked_songs',
                    songs: [req.body.track],
                    visibility: 'private',
                    coverImgUrl: "media/disliked_playlist_cover.jpg",
                    description: "Disliked songs"
                }});

                dislikedPlaylist.save()
                .then(result => res.json({success: true}))
                .catch(err => console.log("Error", err));
            }
        })
    }
});

app.post("/get-liked-songs", (req, res) => {
    Playlist.findOne({username: req.body.username})
    .then(result => {
        if(result){
            const likedSongsPlaylist = result.playlists.find(playlist => playlist.name === "liked_songs");
            if(likedSongsPlaylist) res.json({tracks: likedSongsPlaylist.songs});
            else res.json({tracks: []});
        }
        else{
            res.json({tracks: []});
        }
    })
    .catch(err => console.log(err));
});

app.post("/get-disliked-songs", (req, res) => {
    Playlist.findOne({username: req.body.username})
    .then(result => {
        if(result){
            const dislikedSongsPlaylist = result.playlists.find(playlist => playlist.name === "disliked_songs");
            if(dislikedSongsPlaylist) res.json({tracks: dislikedSongsPlaylist.songs});
            else res.json({tracks: []});
        }
        else{
            res.json({tracks: []});
        }
    })
    .catch(err => console.log(err));
});

app.post("/create-playlist", upload.single("image"), (req, res) => {

    if(req.body.username === "null") return;

    Playlist.findOne({username: req.body.username})
    .then(result => {
        if(result){
            Playlist.updateOne({_id: result._id}, {
                $push: {"playlists": {name: req.body.name, description: req.body.description, visibility: req.body.public?"public":"private", coverImgUrl: req.file? req.file.path.split('\\').slice(-2).join('\\'):null}}
            })
            .then(update => console.log("added custom playlist",update))
            .catch(err => console.log(err));
        }
        else{
            const playlist = new Playlist({
                username: req.body.username,
                playlists: {
                    name: req.body.name,
                    description: req.body.description,
                    visibility: "private",
                    coverImgUrl: req.file? req.file.path.split('\\').slice(-2).join('\\') : null,
                    songs: [],
                }
            });

            playlist.save()
            .then(result => console.log("added user with his playlist", result))
            .catch(err => console.log("Error", err));
        }
        res.json({success: true});
    })
    .catch(err => console.log(err));
});

app.get("/:username/get-all-playlists", (req, res) => {
    Playlist.findOne({username: req.params.username})
    .then(result => {
        if(result){
            res.json({data: result});
        }
        else{
            console.log("User does not exit");
            res.json({data: null});
        }
    })
    .catch(err => console.log(err));
});

app.post("/:username/update-stats", (req, res) => {
    User.findOneAndUpdate({username: req.params.username, 'stats.artists':{$not: {$elemMatch: {id: req.body.track.artists[0].id}}}}, {
        $push: {
          'stats.artists': {
            name: req.body.track.artists[0].name,
            id: req.body.track.artists[0].id,
            coverImgUrl: req.body.track.artists[0].images[1].url,
            count: 1
          }
        }})
    .then(result => {
        if(!result){
            User.updateOne({username: req.params.username, 'stats.artists': {$elemMatch: {id: req.body.track.artists[0].id}}}, {
                $inc:{
                    'stats.artists.$.count': 1
                }
            }).then(updated => console.log(updated, "updtated"))
        }
    })

    User.findOneAndUpdate({username: req.params.username, 'stats.genres':{$not: {$elemMatch: {name: req.body.track.genre[0]}}}}, {
        $push: {
          'stats.genres': {
            name: req.body.track.genre[0],
            count: 1
          }
        }})
    .then(result => {
        if(!result){
            User.updateOne({username: req.params.username, 'stats.genres': {$elemMatch: {name: req.body.track.genre[0]}}}, {
                $inc:{
                    'stats.genres.$.count': 1
                }
            }).then(updated => console.log(updated, "updated"))
        }
    })

    User.findOneAndUpdate({username: req.params.username, 'stats.tracks':{$not: {$elemMatch: {id: req.body.track.id}}}}, {
        $push: {
          'stats.tracks': {
            name: req.body.track.name,
            id: req.body.track.id,
            coverImgUrl: req.body.track.album.images[1].url,
            count: 1
          }
        }})
    .then(result => {
        if(!result){
            User.updateOne({username: req.params.username, 'stats.tracks': {$elemMatch: {id: req.body.track.id}}}, {
                $inc:{
                    'stats.tracks.$.count': 1
                }
            }).then(updated => {res.json({success: true})})
        }
    })

    
});

app.get("/:username/get-stats", (req, res) => {
    User.findOne({username: req.params.username})
    .then(result => {
        if(result){
            res.json({data: result.stats});
        }
        else{
            console.log("User does not exit");
            res.json({data: null});
        }
    })
    .catch(err => console.log(err));
});

app.post("/playlist/add-song", (req, res) => {
    Playlist.findOne({username: req.body.username})
    .then(result => {
        if(result){

            //check if the song already exists
            const playlist = result.playlists.find(playlist => playlist._id.toString() === req.body.playlistId);
            if(playlist.songs.some(song => song.uri === req.body.song.uri)){
                res.json({success: false});
                return;
            }

            //if not add it
            Playlist.updateOne({_id: result._id, "playlists._id": req.body.playlistId}, {
                $push: {"playlists.$.songs": req.body.song}
            })
            .then(update => console.log("added song to playlist",update))
            .catch(err => console.log(err));
        }
        else{
            console.log("User does not exit");
        }
        res.json({success: true});
    })
    .catch(err => console.log(err));
});

app.post("/playlist/remove-song", (req, res) => {
    Playlist.findOne({username: req.body.username})
    .then(result => {
        if(result){
            Playlist.updateOne({_id: result._id, "playlists._id": req.body.playlistId}, {
                $pull: {"playlists.$.songs": req.body.song}
            })
            .then(update => console.log("removed song from playlist",update))
            .catch(err => console.log(err));
        }
        else{
            console.log("User does not exit");
        }
        res.json({success: true});
    })
    .catch(err => console.log(err));
});

app.get("/playlist/:playlistName", (req, res) => {
    Playlist.find({"playlists.name": {$regex: new RegExp(req.params.playlistName, 'i')}})
    .limit(10).where("playlists.visibility").equals("public")
    .then(result => {
        if(result.length > 0){
            res.json({message: `${result.length} playlists found`, datas: result});
        }
        else{
            res.json({message: "No playlist found", playlists: []});
        }
    })
});

app.post("/artist/add-artist", (req, res) => {
    User.findOne({username: req.body.username})
    .then(result => {
        if(result){
            User.updateOne({_id: result._id}, {artist: true})
            .then(update => console.log("added artist",update))
            .catch(err => console.log(err));
        }
        else{
            console.log("User does not exit");
        }
        res.json({success: true});
    })
    .catch(err => console.log(err));
});

app.post("/:artist/upload-song", upload.fields([
    { name: 'song', maxCount: 1 },
    { name: 'coverImg', maxCount: 1 }
  ]), async (req, res) => {

    const durationInSeconds = await getAudioDurationInSeconds(req.files["song"][0].path);
    const durationInMs = Math.ceil(durationInSeconds * 1000);

    const song = new Song({
        name: req.body.title,
        artists: [req.params.artist],
        coverImgUrl: req.files["coverImg"]? req.files["coverImg"][0].path.split('\\').slice(-2).join('\\'):null,
        uri: req.files["song"]? req.files["song"][0].path.split('\\').slice(-2).join('\\'):null,
        duration_ms: durationInMs,
        is_local: true
    });

    song.save()
    .then(result => console.log("added song", result))
    .catch(err => console.log("Error", err));

    Artist.findOne({name: req.params.artist})
    .then(result => {
        if(result){
            Artist.updateOne({_id: result._id}, {$push: {"songs": song}})
            .then(update => console.log("added song to artist",update))
            .catch(err => console.log(err));
        }
        else{
            const artist = new Artist({
                name: req.params.artist,
                songs: [song]
            });
        }

        res.json({success: true});
    })
});

app.get("/songs/:songName", (req, res) => {
    Song.find({"name": {$regex: new RegExp(req.params.songName, 'i')}}).
    limit(10)
    .then(result => {
        if(result.length > 0){
            res.json({message: `${result.length} songs found`, tracks: result});
        }
        else{
            res.json({message: "No song found", tracks: []});
        }
    })
});

app.get("/user/:username", (req, res) => {
    User.find({ username: { $regex: new RegExp(req.params.username, 'i') } }) //i for case insensitive
    .limit(10).select("-password")
    .then(users => {
        if(users.length > 0){
            res.json({message: `${users.length} users found`, users: users});
        }
        else{
            res.json({message: "No user found", users: []});
        }
    })
});

app.post("/:username/upload-profile-pic", upload.single("profilePic"), (req, res) => {
    User.findOne({username: req.params.username})
    .then(result => {
        if(result){
            User.updateOne({_id: result._id}, {profilePicUrl: req.file.path.split('\\').slice(-2).join('\\')})
            .then(update => {console.log("uploaded profile pic",update)})
            .catch(err => console.log(err));
        }
    })
});

app.post("/:username/listening-to" , (req, res) => {
    User.updateOne({username: req.params.username}, {currentlyListening: req.body})
    .then(update => console.log("Updated currently listening", update))
    .catch(err => console.log(err));

    User.updateMany({"friends.username": req.params.username}, { $set: { "friends.$.currentlyListening": req.body } })
    .then(update => {console.log("Updated friends currently listening", update); res.json({success: true})})
    .catch(err => console.log(err));
});

app.post("/:username/start-party", async (req, res) => {
    const user = await User.findOne({username: req.params.username});
    const party = new Party({
        host: user,
        people: [user.username, ...user.friends.map(friend => friend.username)],
        name: req.body.name,
    });

    party.save()
    .then(result => {console.log("added party", result); res.json({_id: result._id, success: true})})
    .catch(err => {console.log("Error", err); res.json({success: false})});
});

app.get("/:partyId/end-party", (req, res) => {
    Party.findOneAndDelete({_id: req.params.partyId})
    .then(result => console.log("deleted party", result))
    .catch(err => console.log("Error", err));
});

app.get("/:username/get-parties", async (req, res) => {
    const parties = await Party.find({people: req.params.username});
    res.json({parties: parties});
});

app.get("/:partyId/get-party", (req, res) => {
    Party.findById(req.params.partyId)
    .then(result => res.json({party: result}))
    .catch(err => console.log(err));
});

app.get("/:username/:partyId/leave-party", (req, res) => {
    Party.findByIdAndUpdate({_id: req.params.partyId}, {$pull: {"people": req.params.username}})
    .then(update => console.log("left party",update))
    .catch(err => console.log(err));
});

app.post("/:partyId/add-song", (req, res) => {
    Party.updateOne({_id: req.params.partyId}, {$push: {"songs": req.body.track}})
    .then(update => {console.log("added song to party",update), res.json({success: true})})
    .catch(err => console.log(err));
});

app.post("/:partyId/remove-song", (req, res) => {
    Party.updateOne({_id: req.params.partyId}, {$pull: {"songs": req.body.song}})
    .then(update => {console.log("removed song from party",update), res.json({success: true})})
    .catch(err => console.log(err));
});

app.post("/send-friend-request", (req, res) => {
    User.findOne({username: req.body.username})
    .then(result => {
        if(result){
            if(!result.friends.some(friend => friend.username === req.body.friendUser.username)){ //if user is not already a friend
                User.updateOne({_id: result._id}, {$push: {"friendRequestsSent": req.body.friendUser}}) //friend request sent
                .then(update => console.log("request sent",update))
                .catch(err => console.log(err));

                User.updateOne({_id: req.body.friendUser._id}, {$push: {"friendRequestsReceived": result}}) //friend request received
                .then(update => console.log("request received",update))
                .catch(err => console.log(err));
            }
        }
        else{
            console.log("User does not exit");
        }
        res.json({success: true});
    })
    .catch(err => console.log(err));
});

app.post("/withdraw-friend-request", (req, res) => {
    User.findOne({username: req.body.username})
    .then(result => {
        if(result){
            if(!result.friends.some(friend => friend.username === req.body.friendUser.username)){
                User.updateOne({_id: result._id}, {$pull: {"friendRequestsSent": {_id: req.body.friendUser._id}}})
                .then(update => console.log("request withdrawn",update))
                .catch(err => console.log(err));

                User.updateOne({_id: req.body.friendUser._id}, {$pull: {"friendRequestsReceived": {_id: result._id}}})
                .then(update => console.log("request withdrawn",update))
                .catch(err => console.log(err));
            }
        }
        else{
            console.log("User does not exit");
        }
        res.json({success: true});
    })
    .catch(err => console.log(err));
});

app.post("/accept-friend-request", (req, res) => {
    User.findOne({username: req.body.username})
    .then(result => {
        if(result){
            if(!result.friends.some(friend => friend.username === req.body.requester.username)){
                User.updateOne({_id: result._id}, {$push: {"friends": req.body.requester}, $pull: {"friendRequestsReceived": {_id: new mongoose.Types.ObjectId(req.body.requester._id)}}}) //friend request accepted
                .then(update => console.log("request accepted",update))
                .catch(err => console.log(err));

                User.updateOne({_id: req.body.requester._id}, {$push: {"friends": result}, $pull: {"friendRequestsSent": {_id: req.body.username._id}}}) //friend request accepted
                .then(update => res.json())
                .catch(err => console.log(err));
            }
        }
    })
});

app.post("/reject-friend-request", (req, res) => {
    User.findOne({username: req.body.username})
    .then(result => {
        if(result){
            if(!result.friends.some(friend => friend.username === req.body.requester.username)){
                User.updateOne({_id: result._id}, {$pull: {"friendRequestsReceived": {_id: new mongoose.Types.ObjectId(req.body.requester._id)}}}) //friend request accepted
                .then(update => console.log("request accepted",update))
                .catch(err => console.log(err));

                User.updateOne({_id: req.body.requester._id}, {$pull: {"friendRequestsSent": {_id: new mongoose.Types.ObjectId(result._id)}}}) //friend request accepted
                .then(update => res.json())
                .catch(err => console.log(err));
            }
        }
    })
});

app.use( (req, res) => {
    res.send("404 Not Found");
} );
