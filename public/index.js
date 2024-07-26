import { config } from './config.js';

const clientId = config.clientId;
const clientSecret = config.clientSecret;

const searchBar = document.getElementById("searchBar");
const searchResults = document.getElementById("searchResultsContainer");
const searchContainer = document.getElementById("searchContainer");
const accountBtn = document.getElementById("accountBtn");
const playlistBtn = document.getElementById("playlistBtn");
const homeContainer = document.getElementById("homeContainer");
const profileContainer = document.getElementById("profileContainer");
const lyricsContainer = document.querySelector("#lyricsContainer");
const songIframe = document.getElementById("songIframe");
const desktopPlaybackContainer = document.getElementById('desktopPlaybackContainer');
const playBtns = document.querySelectorAll('.playBtn');
const playbackTrackImgs = document.querySelectorAll('.coverImg');
const songTitles = document.querySelectorAll('.songTitle');
const songArtists = document.querySelectorAll('.songArtist');
const progressBar = document.getElementById('progressBar');
const currentTimeDisplay = document.getElementById('currentTimeDisplay');
const totalDurationDisplay = document.getElementById('totalDurationDisplay');
const prevBtns = document.querySelectorAll('.prevBtn');
const nextBtns = document.querySelectorAll('.nextBtn');
const likeBtn  = document.getElementById('likeBtn');
const lyricsBtn  = document.getElementById('lyricsBtn');
const dislikeBtn  = document.getElementById('disLikeBtn');
let homeSection = document.getElementById('homeSection');
let searchSection = document.getElementById('searchSection');
let profileSection = document.getElementById('profileSection');
let addPlaylistBtn = document.getElementById('addPlaylistBtn');
let partySection = document.getElementById('partySection');
const partyContainer = document.getElementById('partyContainer');
let partyBtn = document.getElementById('partyBtn');
const mobilePlaybackContainer = document.querySelector('#mobilePlaybackContainer');
const mobileSongDisplayContainer = document.querySelector('#mobileSongDisplayContainer');
const darkDiv = document.createElement('div');

darkDiv.classList.add('darkDiv');

let spotifyPlayer, localPlayer, currentTrack = null, currentPlaylist = null, isPlaying = false, currentTimeInMs = 0, progressBarTimeoutId, removeSpotifyPlaybackListener;
let token, loggedInUser, temp;
const PROGRESSBAR_UPDATE_FREQUENCY = 500, TOKEN_EXPIRY_TIME = 3600000;

//setInterval to refresh token
getSpotifyToken(clientId, clientSecret).then((t) => token = t);
setInterval(() => {
	getSpotifyToken(clientId, clientSecret).then((t) => token = t);
}, TOKEN_EXPIRY_TIME);

//for skipping songs through headphones
if ('mediaSession' in navigator) {
	navigator.mediaSession.setActionHandler('nexttrack', function() {
	  console.log('Next track requested');
	  playNxtSong(currentPlaylist);
	});

	navigator.mediaSession.setActionHandler('previoustrack', function() {
		console.log('Previous track requested');
		playPrevSong(currentPlaylist);
	});
}

window.onSpotifyIframeApiReady = (IFrameAPI) => {
	let options = {
		width: '100%',
        height: '100',
		uri: ''
	};

	IFrameAPI.createController(songIframe, options, (EmbedController) => {
		spotifyPlayer = EmbedController;
		removeSpotifyPlaybackListener = spotifyPlayer.addListener('playback_update', updateSpotifyPlaybackState);
	});
};

window.addEventListener("load", displayParties);

searchBar.addEventListener("keyup", async (e) => {

	searchResults.innerHTML = '';
	if(!e.target.value) return;

	if(accountBtn.classList.contains("selected")){
		//search accounts
		searchResults.append("Loading...");

		const users = await searchUser(e.target.value);
		searchResults.innerHTML = '';
		if(!users.length) searchResults.append("No accounts found");

		if(!JSON.parse(localStorage.getItem('loggedInUser'))){
			searchResults.append("Login for searching accounts");
			return;
		}
		for(let i=0; i<Object.keys(users).length; i++){
			const user = users[i];
			searchResults.append(await createUserCard(user));
		}

	}
	else if(playlistBtn.classList.contains("selected")){
		//search playlists
		searchResults.append("Loading...");
		const res = await searchPlaylist(e.target.value);

		searchResults.innerHTML = '';
		if(!res.datas) {
			searchResults.append("No playlists found");
			return;
		}

		res.datas.forEach(data => {
			data.playlists.forEach(playlist => {
				if(playlist.name.includes(e.target.value) && playlist.visibility === 'public'){
					const card = createPlaylistCard(playlist, data.username);
					card.querySelector(".playlistDetails").children[1].innerText = data.username;
					searchResults.append(card);
				}
			})
		});
	}
	else{
		try{
			searchResults.append("Loading...");
			const localTracks = await searchLocalTracks(e.target.value);
			const tracks = await searchTrack(token, e.target.value);

			searchResults.innerHTML = '';
			if(!localTracks.length && !tracks) searchResults.append("No tracks found");
			if(localTracks){
				for(let i=0; i<Object.keys(localTracks).length; i++){
					const track = localTracks[i];
					searchResults.append(createSongCard(track));
				}
			}
			if(tracks){
				for(let i=0; i<Object.keys(tracks).length; i++){
					const track = tracks[i];

					searchResults.append(createSongCard(track));
				}
			}
		}
		catch (err) {
			console.log(err);
		}
	}
});

progressBar.addEventListener('mouseup', seekProgressBar);
progressBar.addEventListener("input", (e) => {
	e.target.style.setProperty('--range-progress', `${e.target.value}%`);
})
progressBar.addEventListener('mousedown', () => temp=true);

mobileSongDisplayContainer.querySelector("#mobileProgressBar input").addEventListener('mouseup', seekProgressBar);
mobileSongDisplayContainer.querySelector("#mobileProgressBar input").addEventListener("input", (e) => {
	e.target.style.setProperty('--range-progress', `${e.target.value}%`);
})
mobileSongDisplayContainer.querySelector("#mobileProgressBar input").addEventListener('mousedown', () => temp=true);

// mobileSongDisplayContainer.querySelector("#mobileProgressBar input").addEventListener('input', seekProgressBar);

document.querySelector("#menuContainer #menuBtn").onclick = () => {
	const sideContainerMobile = document.querySelector("#sidebarContainer").cloneNode(true);
	darkDiv.style.display = "block";
	document.body.appendChild(darkDiv);
	document.querySelector("#displayContainer").prepend(sideContainerMobile);

	homeSection = sideContainerMobile.querySelector('#homeSection');
	searchSection = sideContainerMobile.querySelector('#searchSection');
	profileSection = sideContainerMobile.querySelector('#profileSection');
	addPlaylistBtn = sideContainerMobile.querySelector('#addPlaylistBtn');
	partySection = sideContainerMobile.querySelector('#partySection');
	partyBtn = sideContainerMobile.querySelector('#partyBtn');

	homeSection.onclick = showHomeSection;
	searchSection.onclick = showSearchSection;
	profileSection.onclick = showProfileSection;
	addPlaylistBtn.onclick = createNewPlaylist;
	partyBtn.onclick = startNewParty;
	displayParties();

	darkDiv.onclick = () => {
		darkDiv.style.display = "none";
		sideContainerMobile.style.animation = "slideLeft 0.5s";
		setTimeout(() => {
			document.querySelector("#displayContainer").removeChild(sideContainerMobile);
			document.body.removeChild(darkDiv);

			homeSection = document.getElementById('homeSection');
			profileSection = document.getElementById('profileSection');
			addPlaylistBtn = document.getElementById('addPlaylistBtn');
			partySection = document.getElementById('partySection');
			partyBtn = document.getElementById('partyBtn');
			searchSection = document.getElementById('searchSection');
		}, 500);
	}

	sideContainerMobile.style.display = "flex";
	sideContainerMobile.style.position = "absolute";
	sideContainerMobile.style.top = "0%";
	sideContainerMobile.style.left = "0%";
	sideContainerMobile.style.zIndex = 1;

	sideContainerMobile.style.animation = "slideRight 0.5s";
	sideContainerMobile.style.width = "80%";

}

homeSection.onclick = showHomeSection;
document.querySelector("#menuContainer #homeBtn").onclick = showHomeSection;

searchSection.onclick = showSearchSection;
document.querySelector("#menuContainer #searchBtn").onclick = showSearchSection;

accountBtn.onclick = () => {
	playlistBtn.classList.remove("selected");
	accountBtn.classList.toggle("selected");
}

playlistBtn.onclick = () => {
	accountBtn.classList.remove("selected");
	playlistBtn.classList.toggle("selected");
}

mobilePlaybackContainer.onclick = () => {
	mobileSongDisplayContainer.style.display = "flex";
	mobileSongDisplayContainer.style.animation = "slideUp 0.5s";
}

mobileSongDisplayContainer.querySelector("#minimizeBtn").onclick = () => {
	mobileSongDisplayContainer.style.animation = "slideDown 0.5s";

	setTimeout(() => {
		mobileSongDisplayContainer.style.display = "none";
	}, 500);
}

profileSection.onclick = showProfileSection;
document.querySelector("#menuContainer #profileBtn").onclick = showProfileSection;

//displaying profile picture in menubar
searchUser(JSON.parse(localStorage.getItem("loggedInUser")))
.then(user => {
	loggedInUser = user[0];
	document.querySelector("#menuContainer #profileBtn img").src = loggedInUser.profilePicUrl? `./${loggedInUser.profilePicUrl}` : './media/default_profile.jpg';
})
.catch(err => console.log(err));




playBtns.forEach(playBtn => {
	playBtn.onclick = (e) => {
		e.stopPropagation();
		if(playBtn.getAttribute("state") === "play"){
			isPlaying = true;

			//checking if the track is local or not
			if(currentTrack.is_local || currentTrack.dj){
				localPlayer.play();
				updateProgressBar();
			}
			else spotifyPlayer.resume();

			playBtn.innerHTML = '<i class="fa-solid fa-pause"></i>';
			playBtn.setAttribute("state", "pause");
		}
		else if(playBtn.getAttribute("state") === "pause") {
			spotifyPlayer.pause();

			if(currentTrack.is_local || currentTrack.dj){
				localPlayer.pause();
				clearTimeout(progressBarTimeoutId);
			}
			else spotifyPlayer.pause();

			isPlaying = false;
			playBtn.innerHTML = '<i class="fa-solid fa-play"></i>';
			playBtn.setAttribute("state", "play");
		}
	}
})

prevBtns.forEach(prevBtn => {
	prevBtn.onclick = () => { playPrevSong(currentPlaylist); }
})

nextBtns.forEach(nextBtn => {
	nextBtn.onclick = () => {
		playNxtSong(currentPlaylist);
	}
})

likeBtn.onclick = () => {
	if(likeBtn.getAttribute("state") === "none"){
		likeBtn.innerHTML = '<i class="fa-solid fa-thumbs-up"></i>';
		likeBtn.style.color = "lightblue";
		dislikeBtn.innerHTML = '<i class="fa-regular fa-thumbs-down"></i>';
		dislikeBtn.style.color = "white";
		dislikeBtn.setAttribute("state", "none");
		likeBtn.setAttribute("state", "liked");
	}
	else if(likeBtn.getAttribute("state") === "liked"){
		likeBtn.innerHTML = '<i class="fa-regular fa-thumbs-up"></i>';
		likeBtn.style.color = "white";
		likeBtn.setAttribute("state", "none");
	}
	fetch("/like", {
		method: "POST",
		headers: {
			'Content-Type': 'application/json'
		},
		body: JSON.stringify({ username: JSON.parse(localStorage.getItem('loggedInUser')), track: currentTrack })
	});
}

dislikeBtn.onclick = () => {
	if(dislikeBtn.getAttribute("state") === "none"){
		dislikeBtn.innerHTML = '<i class="fa-solid fa-thumbs-down"></i>';
		likeBtn.innerHTML = '<i class="fa-regular fa-thumbs-up"></i>';
		dislikeBtn.style.color = "red";
		likeBtn.style.color = "white";
		likeBtn.setAttribute("state", "none");
		dislikeBtn.setAttribute("state", "disliked");
	}
	else if(dislikeBtn.getAttribute("state") === "disliked"){
		dislikeBtn.innerHTML = '<i class="fa-regular fa-thumbs-down"></i>';
		dislikeBtn.style.color = "white";
		dislikeBtn.setAttribute("state", "none");
	}
	fetch("/dislike", {
		method: "POST",
		headers: {
			'Content-Type': 'application/json'
		},
		body: JSON.stringify({ username: JSON.parse(localStorage.getItem('loggedInUser')), track: currentTrack })
	});
}

lyricsBtn.onclick = () => {
	if(lyricsBtn.getAttribute("state") === "hide"){
		lyricsContainer.style.display = "none";
		document.body.style.overflow = "auto";
		lyricsBtn.style.color = "white";
		lyricsBtn.setAttribute("state", "show");
	}
	else if(lyricsBtn.getAttribute("state") === "show"){
		lyricsBtn.setAttribute("state", "hide");
		fetch(`https://api.lyrics.ovh/v1/${currentTrack.artists[0].name}/${currentTrack.name}`)
		.then(response => response.json())
		.then(data => {
			lyricsContainer.style.display = "block";
			document.body.style.overflow = "hidden";
			lyricsBtn.style.color = "#1ed760";
			if(data.lyrics){
				lyricsContainer.querySelector("pre").innerText = data.lyrics;
			}
			else{
				lyricsContainer.querySelector("pre").innerText = "Sorry, no lyrics available";
			}

		})
		.catch(error => lyricsContainer.querySelector("pre").innerText = "Sorry, no lyrics available");

	}

}

addPlaylistBtn.onclick = createNewPlaylist;

partyBtn.onclick = startNewParty;

async function getSpotifyToken(clientId, clientSecret) {
  const response = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': 'Basic ' + btoa(clientId + ':' + clientSecret)
    },
    body: 'grant_type=client_credentials'
  });
  const data = await response.json();
  return data.access_token;
}

async function searchTrack(token, trackName) {
  const query = encodeURIComponent(`track:${trackName}`);
  const response = await fetch(`https://api.spotify.com/v1/search?q=${query}&type=track&limit=50`, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  const data = await response.json();
  if (data.tracks.items.length > 0) {
    const track = data.tracks.items[0];
	return data.tracks.items;
  }
  return null;
}

async function searchLocalTracks(trackName){
	const response = await fetch(`/songs/${trackName}`);
	const data = await response.json();
	return data.tracks;
}

async function searchUser(username){
	let users;

	await fetch(`/user/${username}`)
	.then(res => res.json())
	.then(data => {
		users = data.users;
	})
	.catch(err => console.log(err));

	return users;
}

async function searchPlaylist(playlistName){
	let response;

	await fetch(`/playlist/${playlistName}`)
	.then(res => res.json())
	.then(datas => {
		response = datas;
	})
	.catch(err => console.log(err));

	return response;

}

async function getTrackUri(trackName, artistName) {
  try {
    const token = await getSpotifyToken(clientId, clientSecret);
    const track = await searchTrack(token, trackName, artistName);
    if (track) {
        return track.uri;
    } else {
      console.log('Track not found');
    }
  } catch (error) {
    console.error('Error:', error);
  }
}


//function to create song cards
function createSongCard(track, playlist = null){

	//Creating all elements of the card
	const div = document.createElement('div');
	const songDetails = document.createElement('div');
	const img = document.createElement('img');
	const searchedSongTitle = document.createElement('span');
	const searchedSongArtist = document.createElement('span');

	//assign song details
	searchedSongTitle.innerHTML = track.name;
	searchedSongArtist.innerHTML = track.artists.map((artist) => {
		if(artist.name) return artist.name
		else return artist
	}).join(', '); //joining artist names with comma

	songDetails.classList.add('songDetails');
	songDetails.append(searchedSongTitle);
	songDetails.append(searchedSongArtist);

	//img
	img.src = (track.album && track.album.images)? track.album.images[2].url : `./${track.coverImgUrl}`;
	if(track.uri) div.setAttribute("uri", track.uri); //for spotifyPlayer.loadUri

	//adding event listener for playing the song
	div.onclick = () => {
		//checks if the song is in a playlist
		if(playlist) currentPlaylist = playlist;
		else currentPlaylist = null;

		playSong(track);
	}

	div.classList.add('songCard');
	//appending everything
	div.append(img);
	div.append(songDetails);

	return div;
}

async function createUserCard(user){

	let loggedInUser;
	await searchUser(JSON.parse(localStorage.getItem('loggedInUser'))).then(user => loggedInUser = user[0]);

	//Creating all elements of the card
	const card = document.createElement('div');
	const profilePic = document.createElement('img');
	const username = document.createElement('span');
	const friendRequestBtn = document.createElement('button');
	const withdrawRequestBtn = document.createElement('button');

	//assign user details
	username.innerHTML = user.username;


	friendRequestBtn.innerHTML = '<i class="fa-solid fa-user-plus"></i>';
	friendRequestBtn.style.marginLeft = 'auto';
	friendRequestBtn.style.marginRight = '1rem';

	withdrawRequestBtn.innerHTML = '<i class="fa-solid fa-user-minus"></i>';
	withdrawRequestBtn.style.marginLeft = 'auto';
	withdrawRequestBtn.style.marginRight = '1rem';
	withdrawRequestBtn.style.color = 'red';

	profilePic.src = user.profilePicUrl? `./${user.profilePicUrl}` : './media/default_profile.jpg';
	profilePic.style.borderRadius = "50%";

	//adding event listener for sending friend request
	friendRequestBtn.onclick = () => {
		sendFriendRequest(user);
		card.removeChild(friendRequestBtn);
		card.append(withdrawRequestBtn);
	}

	withdrawRequestBtn.onclick = () => {
		withdrawFriendRequest(user);
		card.removeChild(withdrawRequestBtn);
		card.append(friendRequestBtn);
	}

	//appending everything
	card.classList.add("userCard");
	card.append(profilePic);
	card.append(username);

	//users can't send friend request to themselves and to the ones they already sent a friend request
	if(user.username !== loggedInUser.username && !(loggedInUser.friendRequestsSent.includes(user.username) || loggedInUser.friends.includes(user.username) || loggedInUser.friendRequestsReceived.includes(user.username))) card.append(friendRequestBtn);
	else if(user.username !== loggedInUser.username && loggedInUser.friendRequestsSent.includes(user.username)) card.append(withdrawRequestBtn);

	return card;
}

//function to create playlist cards
function createPlaylistCard(playlist, username){

	//Creating all elements of the card
	const card = document.createElement('div');
	const coverImg = document.createElement('img');
	const playlistDetails = document.createElement('div');
	const playlistName = document.createElement('span');
	const playlistBy = document.createElement('span');
	const playBtn = document.createElement('button');

	//assign playlist details
	playlistName.innerHTML = playlist.name || "Untilted";
	playlistBy.innerHTML = "";
	coverImg.src = playlist.coverImgUrl? `./${playlist.coverImgUrl}`:'./media/default_image.jpg';
	playBtn.innerHTML = '<i class="fa-solid fa-play"></i>';

	playBtn.onclick = (e) => {
		e.stopImmediatePropagation();
		currentPlaylist = playlist;
		playSong(playlist.songs[0]);
	}

	card.classList.add("playlistCard");

	playlistDetails.append(playlistName);
	playlistDetails.append(playlistBy);
	playlistDetails.classList.add("playlistDetails");

	card.append(coverImg);
	card.append(playlistDetails);
	card.append(playBtn);

	card.addEventListener("click", () => {
		//open the playlist
		homeContainer.innerHTML = "";
		homeContainer.style.display = "flex";
		homeContainer.append(createPlaylistWindow(playlist, username));
	});

	return card;
}

function createPartyCard(partyName){
	const username = JSON.parse(localStorage.getItem("loggedInUser"));

	const partyCard = document.createElement("div");
	const name = document.createElement("span");
	const endBtn = document.createElement("button");
	endBtn.innerHTML = "<i class='fa-solid fa-trash'></i>";

	endBtn.onclick = () => {
		partySection.querySelector("#partyList").removeChild(partyCard);
		fetch(`/${endBtn.getAttribute("partyId")}/end-party`)
		.catch(err => console.log(err));
	}

	name.innerText = partyName;
	partyCard.append(name, endBtn);

	partyCard.onclick = async () => {
		const response = await fetch(`/${username}/get-parties`);
		const data = await response.json();
		const party = data.parties[0];
		partyContainer.innerHTML = "";

		partyContainer.style.display = "flex";
		homeContainer.style.display = "none";
		searchContainer.style.display = "none";
		searchResults.style.display = "none";
		profileContainer.style.display = "none";

		partyContainer.append(createPartyWindow(party));
	}

	return partyCard;
}

function createPartyWindow(party){
	const username = JSON.parse(localStorage.getItem("loggedInUser"));

	//Creating all elements of the card
	const partyWindow = document.createElement("div");
	const partyDetails = document.createElement("div");
	const header = document.createElement("header");
	const partyName = document.createElement("h1");
	const partyDescription = document.createElement("span");
	const buttonContainer = document.createElement("div");
	const addSongWindow = document.createElement("div");
	const playBtn = document.createElement("button");
	const djBtn = document.createElement("button");
	const songContainer = document.createElement("div");
	const searchContainer = document.createElement("div");
	const searchBar = document.createElement("input");
	const searchResultsContainer = document.createElement("div");
	const coverImg = document.createElement("img");

	partyName.innerHTML = party.name;
	partyDescription.innerHTML = `Started by ${party.host.username}\n, People: ${party.people.join(", ")}`;
	coverImg.src = "./media/party_image.jpg";

	partyDetails.classList.add("partyDetails");
	partyDetails.append(partyName, partyDescription);

	header.append(coverImg, partyDetails);

	//displaying all songs in party
	party.songs.forEach((track, index) => {

		const card = createSongCard(track, party);

		const removeBtn = document.createElement("button");
		removeBtn.classList.add("removeBtn");
		removeBtn.innerHTML = '<i class="fa-solid fa-xmark"></i>';
		removeBtn.style.marginLeft = "auto";
		removeBtn.style.marginRight = "1rem";

		card.append(removeBtn);

		removeBtn.onclick = async (e) => {
			e.stopPropagation();

			//removing song from party
			await fetch(`/${party._id}/remove-song`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({song: track})
			})
			.then(res => console.log("removed song from party"))
			.catch(err => console.log(err));
			party.songs.slice(index, 1);
			songContainer.removeChild(card);
		}

		songContainer.append(card);
	});
	songContainer.id = 'partySongsContainer';

	searchBar.type = "text";
	searchBar.placeholder = "Search songs to add";
	searchBar.classList.add("searchBar");

	searchBar.addEventListener("keyup", async (e) => {
		if(e.target.value === ''){ //if search bar is empty then remove all the cards
			while(searchResultsContainer.firstChild) searchResultsContainer.removeChild(searchResultsContainer.firstChild);
			console.log("search bar is empty");
			return;
		}

		if(e.key === "Escape"){ //if escape is pressed then remove all the cards
			while(searchResultsContainer.firstChild) searchResultsContainer.removeChild(searchResultsContainer.firstChild);
			return;
		}

		try{
			// const token = await getSpotifyToken(clientId, clientSecret); //FIX THIS LATER BY CREATING TOKEN VARIABLE
			const tracks = await searchTrack(token, e.target.value, '');
			const localTracks = await searchLocalTracks(e.target.value);

			if(tracks || localTracks) while(searchResultsContainer.firstChild) searchResultsContainer.removeChild(searchResultsContainer.firstChild);
			if(localTracks){
				for(let i=0; i<Object.keys(localTracks).length; i++){
					const track = localTracks[i];
					searchResultsContainer.append(createAddableSongCard(track, party, true));
				}
			}

			if(tracks){
				for(let i=0; i<Object.keys(tracks).length; i++){
					const track = tracks[i];
					searchResultsContainer.append(createAddableSongCard(track, party, true));
				}
			}
		}
		catch (err) {
			console.log(err);
		}
	});

	searchContainer.append(searchBar);
	addSongWindow.append(searchContainer);

	searchContainer.classList.add("searchContainer");
	searchResultsContainer.classList.add("searchResultsContainer");
	addSongWindow.classList.add("addSongWindow");

	playBtn.innerHTML = '<i class="fa-solid fa-play"></i>';
	djBtn.innerHTML = '<img src="./media/dj_icon.png"/>';
	djBtn.id = 'djBtn';
	playBtn.id = "playBtn";
	playBtn.onclick = () =>{playSong(party.songs[0]); currentPlaylist = party};
	djBtn.onclick = () =>{
		djBtn.classList.toggle("selected");
		party.songs.forEach(song => {
			if(!song.preview_url) return;
			song.dj = djBtn.classList.contains("selected");
		})
	};

	buttonContainer.id = "buttonContainer";
	if(party.host.username === username) buttonContainer.append(playBtn, djBtn);

	partyWindow.append(header);
	partyWindow.append(buttonContainer);
	partyWindow.append(songContainer);
	partyWindow.append(addSongWindow);
	partyWindow.append(searchResultsContainer);
	partyWindow.classList.add("partyWindow");

	return partyWindow;
}

function createPlaylistWindow(playlist, username){

	//Creating all elements of the card
	const playlistWindow = document.createElement("div");
	const playlistCoverImg = document.createElement("img");
	const playlistDetails = document.createElement("div");
	const playlistName = document.createElement("h1");
	const playlistDescription = document.createElement("span");
	const playlistDuration = document.createElement("span");
	const buttonContainer = document.createElement("div");
	const playBtn = document.createElement("button");
	const djBtn = document.createElement("button");
	const addBtn = document.createElement("button");
	const header = document.createElement("div");
	const playlistSongsContainer = document.createElement("div");

	//assign playlist details
	playlistCoverImg.src = playlist.coverImgUrl? `./${playlist.coverImgUrl}`:'./media/default_image.jpg';
	playlistName.innerHTML = playlist.name || 'Untitled';
	playlistDescription.innerHTML = playlist.description || 'No description';

	//displaying playlist duration
	playlistDuration.innerHTML = `${Math.floor((playlist.songs.reduce((accumulator, element) => accumulator+element.duration_ms, 0) / 1000 )/60)} min 
									${Math.floor((playlist.songs.reduce((accumulator, element) => accumulator+element.duration_ms, 0) / 1000 )%60)} sec`;

	header.id = 'header';
	playlistDetails.append(playlistName);
	playlistDetails.append(playlistDescription);
	playlistDetails.append(playlistDuration);
	header.append(playlistCoverImg);
	header.append(playlistDetails);

	playBtn.innerHTML = '<i class="fa-solid fa-play"></i>';
	djBtn.innerHTML = '<img src="./media/dj_icon.png"/>';
	djBtn.id = 'djBtn';
	playBtn.id = "playBtn";
	playBtn.onclick = () =>{playSong(playlist.songs[0]); currentPlaylist = playlist};
	djBtn.onclick = () =>{
		djBtn.classList.toggle("selected");
		playlist.songs.forEach(song => {
			if(!song.preview_url) return;
			song.dj = djBtn.classList.contains("selected");
		})
	};


	addBtn.onclick = () =>{
		const addSongWindow = document.createElement("div");
		const searchContainer = document.createElement("div");
		const searchBar = document.createElement("input");
		const searchResultsContainer = document.createElement("div");

		searchBar.type = "text";
		searchBar.placeholder = "Search songs to add";
		searchBar.classList.add("searchBar");

		searchBar.addEventListener("keyup", async (e) => {
			if(e.target.value === ''){ //if search bar is empty then remove all the cards
				while(searchResultsContainer.firstChild) searchResultsContainer.removeChild(searchResultsContainer.firstChild);
				return;
			}

			if(e.key === "Escape"){ //if escape is pressed then remove all the cards
				while(searchResultsContainer.firstChild) searchResultsContainer.removeChild(searchResultsContainer.firstChild);
				return;
			}

			try{
				const tracks = await searchTrack(token, e.target.value, '');
				const localTracks = await searchLocalTracks(e.target.value);

				if(tracks || localTracks) while(searchResultsContainer.firstChild) searchResultsContainer.removeChild(searchResultsContainer.firstChild);
				if(localTracks){
					for(let i=0; i<Object.keys(localTracks).length; i++){
						const track = localTracks[i];
						searchResultsContainer.append(createAddableSongCard(track, playlist));
					}
				}

				if(tracks){
					for(let i=0; i<Object.keys(tracks).length; i++){
						const track = tracks[i];
						searchResultsContainer.append(createAddableSongCard(track, playlist));
					}
				}
			}
			catch (err) {
				console.log(err);
			}
		});

		searchContainer.append(searchBar);
		addSongWindow.append(searchContainer);
		addSongWindow.append(searchResultsContainer);

		searchContainer.classList.add("searchContainer");
		searchResultsContainer.classList.add("searchResultsContainer");
		addSongWindow.classList.add("addSongWindow");
		if(!playlistWindow.querySelector(".addSongWindow")) playlistWindow.append(addSongWindow);
		searchBar.scrollIntoView({ behavior: 'smooth', block: 'start' });

	}
	addBtn.innerHTML = '<i class="fa-solid fa-plus"></i>';
	addBtn.id = "addBtn";

	buttonContainer.id = "buttonContainer";
	buttonContainer.append(playBtn, djBtn);
	if(username === JSON.parse(localStorage.getItem("loggedInUser")) && playlist.name !== "liked_songs" && playlist.name !== "disliked_songs") buttonContainer.append(addBtn);

	//create song cards
	playlist.songs.forEach((track, index) => {

		const card = createSongCard(track, playlist);

		const removeBtn = document.createElement("button");
		removeBtn.classList.add("removeBtn");
		removeBtn.innerHTML = '<i class="fa-solid fa-xmark"></i>';
		removeBtn.style.marginLeft = "auto";
		removeBtn.style.marginRight = "1rem";

		if(username === JSON.parse(localStorage.getItem("loggedInUser")) && playlist.name !== "liked_songs" && playlist.name !== "disliked_songs") card.append(removeBtn);

		removeBtn.onclick = async (e) => {
			e.stopImmediatePropagation();

			await fetch("/playlist/remove-song", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({username: JSON.parse(localStorage.getItem("loggedInUser")), playlistId: playlist._id, song: track})
			})
			.then(res => console.log("removed song from playlist"))
			.catch(err => console.log(err));
			playlist.songs.slice(index, 1);
			playlistSongsContainer.removeChild(card);
		}
		playlistSongsContainer.append(card);
	});
	playlistSongsContainer.id = 'playlistSongsContainer';

	playlistWindow.classList.add("playlistWindow");
	playlistWindow.append(header);
	playlistWindow.append(buttonContainer);
	playlistWindow.append(playlistSongsContainer);


	return playlistWindow;
}

function createAddableSongCard(track, playlist, isParty = false) {
	const card = createSongCard(track);
	const addSongBtn = document.createElement("button");
	const existMark = document.createElement("i");

	//styling addbtn
	addSongBtn.classList.add("addSongBtn");
	addSongBtn.innerHTML = '<i class="fa-solid fa-plus"></i>';
	addSongBtn.style.marginLeft = "auto";
	addSongBtn.style.marginRight = "1rem";

	//styling existmark
	existMark.classList.add("existMark");
	existMark.innerHTML = '<i class="fa-solid fa-check"></i>';
	existMark.style.color = "green";
	existMark.style.marginLeft = "auto";
	existMark.style.marginRight = "1rem";

	addSongBtn.onclick = async () => {
		//adding song to playlist
		if(isParty){
			await fetch(`${playlist._id}/add-song`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					track: track
				})
			})
			.then(res => console.log("added song to party"))
			.catch(err => console.log(err));
		}
		else{
			await fetch("/playlist/add-song", {
				method: "POST",
				headers: {
					"Content-Type": "application/json"
				},
				body: JSON.stringify({username: JSON.parse(localStorage.getItem("loggedInUser")), playlistId: playlist._id, song: track})
			})
			.then(res => console.log("added song to playlist"))
			.catch(err => console.log(err));
		}

		card.removeChild(addSongBtn);
		card.append(existMark);
	}

	card.onclick = () => {}; //clears the click listener

	//checking if the song is already in the playlist
	if(playlist.songs.some(song => song.uri === track.uri)) card.append(existMark);
	else card.append(addSongBtn);

	return card;
}

//function for updating progress bar (runs every 100ms)
function updateProgressBar(){
	if(currentTrack){
		if(currentTrack.dj){
			if(currentTimeInMs >= 30000){
				clearTimeout(progressBarTimeoutId);
				playNxtSong(currentPlaylist);
				return;
			}
			progressBar.value = (currentTimeInMs / 30000) * 100;
			mobileSongDisplayContainer.querySelector("#mobileProgressBar input").value = (currentTimeInMs / 30000) * 100;
		}
		else{
			if(currentTimeInMs >= currentTrack.duration_ms){
				clearTimeout(progressBarTimeoutId);
				playNxtSong(currentPlaylist);
				return;
			}
			progressBar.value = (currentTimeInMs / currentTrack.duration_ms) * 100;
			mobileSongDisplayContainer.querySelector("#mobileProgressBar input").value = (currentTimeInMs / currentTrack.duration_ms) * 100;
		}
		if(!temp){
			progressBar.style.setProperty('--range-progress', `${progressBar.value}%`);
			mobileSongDisplayContainer.querySelector("#mobileProgressBar input").style.setProperty('--range-progress', `${mobileSongDisplayContainer.querySelector("#mobileProgressBar input").value}%`);
		}
		currentTimeInMs += PROGRESSBAR_UPDATE_FREQUENCY;
		currentTimeDisplay.innerHTML = formatTime(currentTimeInMs);

		progressBarTimeoutId = setTimeout(() => {
			updateProgressBar();
		}, PROGRESSBAR_UPDATE_FREQUENCY);
	}
}

async function updateSpotifyPlaybackState(state){
	if(currentTimeInMs >= currentTrack.duration_ms){
		playNxtSong(currentPlaylist);
	}

	if(state.data.isPaused){
		playBtns.forEach(playBtn => {
			playBtn.innerHTML = '<i class="fa-solid fa-play"></i>';
			playBtn.setAttribute("state", "play");
		})
	}
	else{
		playBtns.forEach(playBtn => {
			playBtn.innerHTML = '<i class="fa-solid fa-pause"></i>';
			playBtn.setAttribute("state", "pause");
		})
	}

	currentTimeInMs = state.data.position;
	const username = JSON.parse(localStorage.getItem('loggedInUser'));
	if(currentTimeInMs / currentTrack.duration_ms > 0.1 && username && !currentTrack.statsUpdated){
		await updateUserStats(username).then(result => currentTrack.statsUpdated = true);
	}

	progressBar.value = (currentTimeInMs / (currentTrack.duration_ms)) * 100;
	mobileSongDisplayContainer.querySelector("#mobileProgressBar input").value = (currentTimeInMs / (currentTrack.duration_ms)) * 100;
	document.querySelector("#mobilePlaybackContainer #mobileProgressBar").style.width = `${(currentTimeInMs / (currentTrack.duration_ms)) * 100}%`;
	currentTimeDisplay.innerHTML = formatTime(currentTimeInMs);
	mobileSongDisplayContainer.querySelector("#mobileProgressBar #currentTime").innerHTML = formatTime(currentTimeInMs);
	totalDurationDisplay.innerHTML = formatTime(currentTrack.duration_ms);
	mobileSongDisplayContainer.querySelector("#mobileProgressBar #totalDuration").innerHTML = formatTime(currentTrack.duration_ms);
	if(!temp){
		progressBar.style.setProperty('--range-progress', `${progressBar.value}%`);
		mobileSongDisplayContainer.querySelector("#mobileProgressBar input").style.setProperty('--range-progress', `${mobileSongDisplayContainer.querySelector("#mobileProgressBar input").value}%`);
	}
}

//function for formatting time
function formatTime(milliseconds) {
    const totalSeconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

//function to fetch liked songs
async function fetchLikedSongs(){
	let likedSongs;

	await fetch('/get-liked-songs', {
		method: 'POST',
		headers: {
            'Content-Type': 'application/json',
        },
		body: JSON.stringify({
			username: JSON.parse(localStorage.getItem('loggedInUser'))
		})
	})
	.then(res => res.json())
	.then(data => {
		likedSongs = data;
	});

	return likedSongs;
}

//function that gets the disliked songs from the database
async function fetchDislikedSongs(){
	let dislikedSongs;

	await fetch('/get-disliked-songs', {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
		},
		body: JSON.stringify({
			username: JSON.parse(localStorage.getItem('loggedInUser')) //sending the current username to the database
		})
	})
	.then(res => res.json())
	.then(data => {
		dislikedSongs = data;
	});

	return dislikedSongs;
}

async function fetchUserPlaylists(username){
	let res;

	await fetch(`/${username}/get-all-playlists`)
	.then(res => res.json())
	.then(data => res = data)

	return res;
}

//function for updating the like and dislike btns
async function updateLikeDislikeBtns(){

	//fetching liked and disliked songs
	const likedSongs = await fetchLikedSongs();
	const dislikedSongs = await fetchDislikedSongs();

	//if the current track is liked
	if(likedSongs.tracks.some(track => track.uri === currentTrack.uri)){
		console.log("liked");
		likeBtn.innerHTML = '<i class="fa-solid fa-thumbs-up"></i>'; //higlighting the like button
		likeBtn.style.color = "lightblue";
		likeBtn.setAttribute("state", "liked");	//changing state to liked
	}
	else{
		likeBtn.innerHTML = '<i class="fa-regular fa-thumbs-up"></i>';
		likeBtn.setAttribute("state", "none");
	}


	//if the current track is disliked
	if(dislikedSongs.tracks.some(track => track.uri === currentTrack.uri)){
		console.log("disliked");
		dislikeBtn.innerHTML = '<i class="fa-solid fa-thumbs-down"></i>'; //higlighting the dislike button
		dislikeBtn.style.color = "red";
		dislikeBtn.setAttribute("state", "disliked"); //changing state to disliked
	}
	else{
		dislikeBtn.setAttribute("state", "none");
		dislikeBtn.innerHTML = '<i class="fa-regular fa-thumbs-down"></i>';
	}
}

async function playSong(track){
	stopCurrentAudio();

	const username = JSON.parse(localStorage.getItem('loggedInUser'));

	//updating the cover image, song title and artist name
	playbackTrackImgs.forEach(playbackTrackImg => playbackTrackImg.src = (track.album && track.album.images)? track.album.images[2].url : `./${track.coverImgUrl}`);
	mobileSongDisplayContainer.querySelector(".coverImg").src = (track.album && track.album.images)? track.album.images[0].url : `./${track.coverImgUrl}`
	songTitles.forEach(songTitle => songTitle.innerHTML = track.name);
	mobileSongDisplayContainer.querySelector("#topDiv #songTitle").innerHTML = track.name;
	songArtists.forEach(songArtist => songArtist.innerHTML = track.artists.map((artist) => artist.name?artist.name:artist).join(', ')) //joining the artist names

	//changing the play button to pause button as the song is playing
	playBtns.forEach(playBtn => {
		playBtn.innerHTML = '<i class="fa-solid fa-pause"></i>';
		playBtn.setAttribute("state", "pause");
	})

	//unhilighting the like and dislike btns
	likeBtn.innerHTML = '<i class="fa-regular fa-thumbs-up"></i>';
	dislikeBtn.innerHTML = '<i class="fa-regular fa-thumbs-down"></i>';
	likeBtn.setAttribute("state", "none");
	dislikeBtn.setAttribute("state", "none");

	currentTrack = track;

	fetch(`/${username}/listening-to`, {
		method: "POST",
		headers:{
			"Content-Type": "application/json"
		},
		body: JSON.stringify(track)
	})
	.then(result => console.log("Updated listening to"))
	.catch(err => console.log(err));

	if(!currentTrack.is_local){
		const genre = await getGenre(track.artists[0].name, track.name)
		if(genre) currentTrack.genre = genre;
		else currentTrack.genre = ["others"];
	
		const artistResponse = await fetch(`https://api.spotify.com/v1/artists/${track.artists[0].id}`, {headers: { 'Authorization': `Bearer ${token}` }});
		const artist = await artistResponse.json();
		currentTrack.artists[0].images = artist.images;
	}else{
		currentTrack.genre = ["local"];
	}

	//displaying the lyrics
	fetch(`https://api.lyrics.ovh/v1/${currentTrack.artists[0].name}/${currentTrack.name}`)
	.then(response => response.json())
	.then(data => {
		if(data.lyrics){
			mobileSongDisplayContainer.querySelector("#lyrics").innerText = data.lyrics;
			lyricsContainer.querySelector("pre").innerText = data.lyrics;
		}
		else{
			mobileSongDisplayContainer.querySelector("#lyrics").innerText = "Sorry, no lyrics available";
			lyricsContainer.querySelector("pre").innerText = "Sorry, no lyrics available";
		}

	});

	progressBar.value = 0; currentTimeInMs = 0; isPlaying = true;
	currentTimeDisplay.innerHTML = '00:00';
	if(!track.local && track.dj) totalDurationDisplay.innerHTML = formatTime(30 * 1000);
	else totalDurationDisplay.innerHTML = formatTime(currentTrack.duration_ms);

	updateLikeDislikeBtns(); //higlighting the like and dislike btns accordingly

	if(track.is_local){
		progressBar.value = 0;
		mobileSongDisplayContainer.querySelector("#mobileProgressBar input").value
		localPlayer = new Audio(`${track.uri}`);
		localPlayer.onloadeddata = () => localPlayer.play();

		updateProgressBar();
	}
	else{
		if(track.dj){
			progressBar.value = 0;
			mobileSongDisplayContainer.querySelector("#mobileProgressBar input").value = 0;
			localPlayer = new Audio(`${track.preview_url}`);
			localPlayer.play();

			updateProgressBar();
		}
		else{
			spotifyPlayer.loadUri(track.uri);
			removeSpotifyPlaybackListener = spotifyPlayer.addListener('playback_update', updateSpotifyPlaybackState);
			const removeListener = spotifyPlayer.addListener('ready', () => {
				if(!spotifyPlayer.loading){
					spotifyPlayer.play(); //play the song
				}

				removeListener(); //removes the listener to avoid stacking the listeners
			});
		}
	}
}

function stopCurrentAudio() {
    if (localPlayer) {
        localPlayer.pause();
        localPlayer.currentTime = 0;
		clearTimeout(progressBarTimeoutId);
    }
    if (spotifyPlayer) {
        spotifyPlayer.pause();
		removeSpotifyPlaybackListener();
    }
}

async function playNxtSong(playlist){

	const username = JSON.parse(localStorage.getItem('loggedInUser'));

	if(!playlist){
		fetch(`/${username}/listening-to`, {
			method: "POST",
			headers:{
				"Content-Type": "application/json"
			},
			body: JSON.stringify({})
		})
		.then(result => console.log("Updated listening to"))
		.catch(err => console.log(err));
		currentTrack.statsUpdated = false;

		//getting recommendations from spotify
		const recommendationParams = new URLSearchParams({
			seed_tracks: currentTrack.id,
			seed_genres: currentTrack.genre[0],
			seed_artists: currentTrack.artists[0].id,
			limit: 10
		});

		const recommendationResponse = await fetch(`https://api.spotify.com/v1/recommendations?${recommendationParams}`, {
			headers: { 'Authorization': `Bearer ${token}` },
			limit: 10
		});

		const recommendations = await recommendationResponse.json();
		playSong(recommendations.tracks[0]);
		currentPlaylist = {name:"Recommendation", description:"Plays when there is no song in the queue", songs: recommendations.tracks};

		// fetch(`https://api.spotify.com/v1/search?q=genre:${currentTrack.genre[0]}&type=track&artist=${currentTrack.artists[0].name}`, {
		// 	headers: {
		// 	  'Authorization': `Bearer ${token}`
		// 	}
		// })
		// .then(response => response.json())
		// .then(data => {
		// 	console.log(data);
		// 	if(data.tracks.items.length > 0){
		// 		playSong(data.tracks.items[0]);
		// 		currentPlaylist = {name:"Recomendation", description:"Plays when there is no song in the queue", songs: data.tracks.items};
		// 		console.log(currentPlaylist, data.tracks.items);
		// 	}
		// });

		return; //if playlist is not found, return
	}
	const currentIndex = playlist.songs.findIndex((track) => track.uri === currentTrack.uri); //finding the index of the current track

	if(currentIndex + 1 < playlist.songs.length){ //checks if next song exists
		playSong(playlist.songs[currentIndex + 1]);
	}
	else{ //if next song doesn't exist then play the first song
		playSong(playlist.songs[0]);
	}
}

function playPrevSong(playlist){
	const THRESHOLD = 2000;	// 1 sec
	const currentIndex = playlist? playlist.songs.findIndex((track) => track.uri === currentTrack.uri):null; //finding the index of the current track
	if(spotifyPlayer){
		if(currentTrack.is_local || currentTrack.dj){
			localPlayer.currentTime = 0;
			if(isPlaying) localPlayer.play();
			else localPlayer.pause();
		}
		else{
			//if the currenttime is less than threshold then play the previous song from the playlist
			if(currentTimeInMs < THRESHOLD && playlist && currentIndex - 1 >= 0) playSong(playlist.songs[currentIndex-1]);
			//else play the song from the start
			else spotifyPlayer.playFromStart();
			
			
		}
	}
	currentTimeInMs = 0;
	progressBar.value = 0;
	currentTimeDisplay.innerHTML = formatTime(currentTimeInMs);
}

async function sendFriendRequest(user){

	await fetch("/send-friend-request", {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
		},
		body: JSON.stringify({username: JSON.parse(localStorage.getItem("loggedInUser")), friendUser: user})
	})
	.then(res => console.log("friend request sent"))
	.catch(err => console.log(err));
}

async function withdrawFriendRequest(user){

	await fetch("/withdraw-friend-request", {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
		},
		body: JSON.stringify({username: JSON.parse(localStorage.getItem("loggedInUser")), friendUser: user})
	})
	.then(res => console.log("friend request withdrawn"))
	.catch(err => console.log(err));
}

async function showHomeSection(){
	searchContainer.style.display = "none";
	searchResults.style.display = "none";
	profileContainer.style.display = "none";
	homeContainer.style.display = "flex";
	partyContainer.style.display = "none";

	homeContainer.append(document.querySelector("#loadingScreen").cloneNode(true));
	homeContainer.querySelector("#loadingScreen").style.visibility = "visible";

	const res = await fetchUserPlaylists(JSON.parse(localStorage.getItem("loggedInUser")));

	homeContainer.innerHTML = ""; //clear the home container
	if(!res.data){
		homeContainer.innerHTML = "Nothing here yet!";
		return;
	}
	res.data.playlists.forEach(playlist => {
		homeContainer.append(createPlaylistCard(playlist, res.data.username)); //append playlist cards
	})
}

function showSearchSection(){
	searchContainer.style.display = "flex";
	searchResults.style.display = "flex";

	homeContainer.style.display = "none";
	profileContainer.style.display = "none";
	partyContainer.style.display = "none";
}

async function showProfileSection(){

	const uploadBtn = profileContainer.querySelector("#uploadBtn");

	searchContainer.style.display = "none";
	searchResults.style.display = "none";
	homeContainer.style.display = "none";
	partyContainer.style.display = "none";

	profileContainer.style.display = "flex";

	profileContainer.querySelector("#username").innerText = JSON.parse(localStorage.getItem("loggedInUser")) || "Guest";
	profileContainer.querySelector("#logoutBtn").onclick = () => {
		localStorage.setItem("loggedInUser", null);
		location.reload();
	}
	let loggedInUser;
	await searchUser(JSON.parse(localStorage.getItem("loggedInUser"))).then(user => loggedInUser = user[0]);

	profileContainer.querySelector("#editBtn").onclick = () => {
		profileContainer.querySelector("#profilePicInput").click();
	}

	profileContainer.querySelector("#profilePicInput").onchange = () => {
		const file = profileContainer.querySelector("#profilePicInput").files[0];
		const reader = new FileReader();
		reader.readAsDataURL(file);
		reader.onload = () => {
			profileContainer.querySelector("#profilePic").src = reader.result;
		}

		// Create a FormData object
		const formData = new FormData();
		formData.append('profilePic', file);	  

		// upload profile picture
		fetch(`${loggedInUser.username}/upload-profile-pic`, {
			method: "POST",
			body: formData
		})
		.catch(err => console.log(err));
	}

	if(!loggedInUser){
		profileContainer.querySelector("#loginBtn").style.display = "block";
		profileContainer.querySelector("#logoutBtn").style.display = "none";
		profileContainer.querySelector("#artistBtn").style.display = "none";
		profileContainer.querySelector("#artistTag").style.display = "none";
		uploadBtn.style.display = "none";
	}
	else{
		profileContainer.querySelector("#loginBtn").style.display = "none";
		profileContainer.querySelector("#logoutBtn").style.display = "block";
		profileContainer.querySelector("#profilePic").src = loggedInUser.profilePicUrl? `./${loggedInUser.profilePicUrl}` : './media/default_profile.jpg';
		profileContainer.querySelector("#friendRequests").innerHTML = "";
		profileContainer.querySelector("#friends").innerHTML = "";
		profileContainer.querySelector("#stats #favoriteArtists").innerHTML = "";
		profileContainer.querySelector("#stats #favoriteGenres").innerHTML = "";
		profileContainer.querySelector("#stats #favoriteTracks").innerHTML = "";
		const userStats = await getUserStats(loggedInUser.username);
		
		const favoriteArtists = [...userStats.artists].sort((a, b) => b.count - a.count);
		favoriteArtists.slice(0, 5).forEach(artist => {
			const div = document.createElement("div");
			const li = document.createElement("li");
			const img = document.createElement("img");
			const percentage = document.createElement("span");
			const totalCount = favoriteArtists.reduce((accumulator, element) => accumulator + element.count, 0);
			percentage.innerText = `${((artist.count / totalCount) * 100).toFixed(2)}%`;
			div.append(img, li, percentage);
			li.innerHTML = `${artist.name}`;
			img.src = artist.coverImgUrl;
			profileContainer.querySelector("#stats #favoriteArtists").append(div);
		})

		const favoriteGenres = [...userStats.genres].sort((a, b) => b.count - a.count);
		favoriteGenres.slice(0, 5).forEach(genre => {
			const div = document.createElement("div");
			const li = document.createElement("li");
			const img = document.createElement("img");
			const percentage = document.createElement("span");
			const totalCount = favoriteGenres.reduce((accumulator, element) => accumulator + element.count, 0);
			percentage.innerText = `${((genre.count / totalCount) * 100).toFixed(2)}%`;
			div.append(img, li, percentage);
			li.innerHTML = `${genre.name}`;
			img.src = "./media/music_icon.jpg";
			profileContainer.querySelector("#stats #favoriteGenres").append(div);
		})

		const favoriteTracks = [...userStats.tracks].sort((a, b) => b.count - a.count);
		favoriteTracks.slice(0, 5).forEach(track => {
			const div = document.createElement("div");
			const li = document.createElement("li");
			const img = document.createElement("img");
			const percentage = document.createElement("span");
			const totalCount = favoriteTracks.reduce((accumulator, element) => accumulator + element.count, 0);
			percentage.innerText = `${((track.count / totalCount) * 100).toFixed(2)}%`;
			div.append(img, li, percentage);
			img.src = track.coverImgUrl;
			li.innerHTML = `${track.name}`;
			profileContainer.querySelector("#stats #favoriteTracks").append(div);
		})

		if(loggedInUser.friendRequestsReceived.length === 0) profileContainer.querySelector("#friendRequests").append("No friend requests");
		else{
			loggedInUser.friendRequestsReceived.forEach(requester => {
				const li = document.createElement("li");
				const acceptBtn = document.createElement("button");
				const rejectBtn = document.createElement("button");

				acceptBtn.innerHTML = "<i class='fa-solid fa-check'></i>";
				rejectBtn.innerHTML = "<i class='fa-solid fa-times'></i>";
				rejectBtn.style.marginLeft = "auto";
				rejectBtn.style.marginRight = "1.2rem";
				rejectBtn.style.color = "red";
				acceptBtn.style.color = "green";

				acceptBtn.onclick = async () => {
					await fetch("/accept-friend-request", {
						method: "POST",
						headers:{
							"Content-Type": "application/json"
						},
						body:JSON.stringify({
							username: loggedInUser.username,
							requester: requester
						})
					})

					profileContainer.querySelector("#friendRequests").removeChild(li);
				}

				rejectBtn.onclick = async () => {
					await fetch("/reject-friend-request", {
						method: "POST",
						headers:{
							"Content-Type": "application/json"
						},
						body:JSON.stringify({
							username: loggedInUser.username,
							requester: requester
						})
					})
					profileContainer.querySelector("#friendRequests").removeChild(li);
				}

				li.append(requester.username, rejectBtn, acceptBtn);

				profileContainer.querySelector("#friendRequests").append(li);
			});
		}

		if(loggedInUser.friends.length === 0) profileContainer.querySelector("#friends").append("No friends");
		loggedInUser.friends.forEach(friend => {
			const li = document.createElement("li");
			const currentlyListeningCoverImg = document.createElement("img");

			li.append(friend.username);
			if(Object.keys(friend.currentlyListening).length){
				currentlyListeningCoverImg.src = (friend.currentlyListening.album && friend.currentlyListening.album.images)? friend.currentlyListening.album.images[2].url : `./${friend.currentlyListening.coverImgUrl}`;
				currentlyListeningCoverImg.title = `Listening to "${friend.currentlyListening.name}"`;
				li.append(currentlyListeningCoverImg);
			}
			li.classList.add("friendsCard");

			profileContainer.querySelector("#friends").append(li);
		});
	}

	if(loggedInUser && loggedInUser.artist){
		profileContainer.querySelector("#artistTag").style.display = "block";
		uploadBtn.style.display = "block";
		profileContainer.querySelector("#artistBtn").style.display = "none";
	}
	else if(loggedInUser && !loggedInUser.artist){
		profileContainer.querySelector("#artistTag").style.display = "none";
		uploadBtn.style.display = "none";
		profileContainer.querySelector("#artistBtn").style.display = "block";
	}

	uploadBtn.onclick = () => {
		window.location.href = `/upload`;
	}

	profileContainer.querySelector("#artistBtn").onclick = () => {
		if(JSON.parse(localStorage.getItem("loggedInUser"))){
			const isConfirmed = window.confirm("Are you sure");
			if(isConfirmed){
				fetch("/artist/add-artist", {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
					},
					body: JSON.stringify({ username: JSON.parse(localStorage.getItem('loggedInUser')) })
				})
				.catch(error => console.log(error));

				window.location.reload();
			}
		}
		else{
			window.alert("Please login first");
		}
	}
}

function createNewPlaylist(){
	darkDiv.style.display = "block";

	document.body.style.overflow = "hidden";

	const addPlaylistDiv = document.createElement("div");
	const addPlaylistForm = document.createElement("form");
	const playlistNameInput = document.createElement("input");
	const playlistNameLabel = document.createElement("label");
	const playlistDescription = document.createElement("textarea");
	const playlistDescriptionLabel = document.createElement("label");
	const playlistCoverImg = document.createElement("input");
	const publicCheckbox = document.createElement("input");
	const closeBtn = document.createElement("button");
	const submitBtn = document.createElement("button");

	playlistDescription.classList.add("playlistDescription");
	publicCheckbox.classList.add("publicCheckbox");
	addPlaylistForm.classList.add("addPlaylistForm");
	addPlaylistDiv.classList.add("addPlaylistDiv");
	playlistCoverImg.classList.add("playlistCoverImg");


	addPlaylistForm.action = "/create-playlist";
	addPlaylistForm.method = "POST";

	addPlaylistForm.onsubmit = (e) => {
		e.preventDefault();
		darkDiv.style.display = "none";
		document.body.removeChild(addPlaylistDiv);
		document.body.style.overflow = "auto";

		const formData = new FormData();
		formData.append('username', JSON.parse(localStorage.getItem('loggedInUser')));
		formData.append('name', playlistNameInput.value);
		formData.append('description', playlistDescription.value);
		formData.append('image', playlistCoverImg.files[0]);  // Assuming playlistCoverImg is an input element of type "file"
		formData.append('public', publicCheckbox.checked);

		fetch("/create-playlist", {
			method: "POST",
			body: formData
		})
		.then(res => console.log("Playlist created successfully"))
		.catch(err => console.log(err));


	};

	playlistNameLabel.innerText = "Playlist Name";
	playlistDescriptionLabel.innerText = "Description";
	playlistNameInput.type = "text";
	playlistCoverImg.type = "file";
	publicCheckbox.type = "checkbox";
	submitBtn.innerText = "Create";
	closeBtn.innerHTML = "<i class='fa-solid fa-xmark'></i>";
	closeBtn.classList.add("closeBtn");
	closeBtn.onclick = () => {
		// darkDiv.style.display = "none";
		document.body.removeChild(addPlaylistDiv);
		document.body.removeChild(darkDiv);
		document.body.style.overflow = "auto";
	}

	addPlaylistForm.append(playlistNameLabel);
	addPlaylistForm.append(playlistNameInput);
	addPlaylistForm.append(playlistDescriptionLabel);
	addPlaylistForm.append(playlistDescription);
	addPlaylistForm.append("Make it Public",publicCheckbox);
	addPlaylistForm.append(playlistCoverImg);
	addPlaylistForm.append(submitBtn);

	addPlaylistDiv.append(addPlaylistForm);
	addPlaylistDiv.append(closeBtn);


	document.body.append(darkDiv);
	document.body.append(addPlaylistDiv);
}

function startNewParty(){
    const input = document.createElement("input");
    input.placeholder = "Enter party name";

    input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            const partyName = input.value.trim();
            if (partyName) {
				const partyCard = createPartyCard(partyName);

				const username = JSON.parse(localStorage.getItem('loggedInUser'));

				fetch(`/${username}/start-party`, {
					method: "POST",
					headers:{
						'Content-Type': 'application/json'
					},
					body: JSON.stringify({
						name: partyName
					})
				})
				.then(res => res.json())
				.then(data => {
					if(data.success) {
						partyCard.querySelector("button").setAttribute("partyId", data._id)
						partySection.querySelector("#partyList").append(partyCard);

					}
					else alert("Unable to start party (this might happen when your friends are already in a party or when you try to start multiple parties)");
				})
				.catch(err => console.log(err));

				partySection.removeChild(input);
            }
        }
    });

    partySection.insertBefore(input, partyBtn);
    input.focus();
};

async function displayParties(){
	const username = JSON.parse(localStorage.getItem('loggedInUser'));

	const response = await fetch(`/${username}/get-parties`);
	const data = await response.json();
	const parties = data.parties;

	parties.forEach(party => {
		const partyCard = createPartyCard(party.name);
		partyCard.querySelector("button").setAttribute("partyId", party._id);
		if(party.host.username !== username){
			const leaveBtn = partyCard.querySelector("button")
			leaveBtn.innerHTML = "<i class='fa-solid fa-xmark'></i>";
			leaveBtn.onclick = () => {
				fetch(`/${username}/${party._id}/leave-party`)
				.catch(err => console.log(err));

				partyCard.remove();
			}
		}
		partySection.querySelector("#partyList").innerHTML = '';
		partySection.querySelector("#partyList").append(partyCard);
	})
}

function seekProgressBar(e){
	if(currentTrack){
		// const seekPosition = window.innerWidth>800 ? (Number(progressBar.value) / 100) * (currentTrack.duration_ms/1000) : (Number(mobileSongDisplayContainer.querySelector("#mobileProgressBar input").value) / 100) * (currentTrack.duration_ms/1000);
		const seekPosition = window.innerWidth>800 ? Number(e.target.style.getPropertyValue('--range-progress').slice(0, -1)) / 100 * (currentTrack.duration_ms/1000) : Number(mobileSongDisplayContainer.querySelector("#mobileProgressBar input").style.getPropertyValue('--range-progress').slice(0, -1)) / 100 * (currentTrack.duration_ms/1000);
		currentTimeInMs = seekPosition * 1000;
		if(currentTrack.is_local || currentTrack.dj) localPlayer.currentTime = seekPosition;
		else spotifyPlayer.seek(seekPosition);
	}
	temp=false;

	e.target.style.setProperty('--range-progress', `${e.target.value}%`);
	mobileSongDisplayContainer.querySelector("#mobileProgressBar input").style.setProperty('--range-progress', `${mobileSongDisplayContainer.querySelector("#mobileProgressBar input").value}%`);
}

async function getGenre(artist, title) {
	const url = `https://itunes.apple.com/search?term=${encodeURIComponent(artist + ' ' + title)}&media=music&limit=1`;
  
	try {
	  const response = await fetch(url);
	  if (!response.ok) {
		throw new Error(`HTTP error! status: ${response.status}`);
	  }
	  const data = await response.json();
	  if (data.results && data.results.length > 0) {
		return data.results[0].primaryGenreName ? [data.results[0].primaryGenreName] : null;
	  }
	  return null;
	} catch (error) {
	  console.error('Error:', error);
	  return null;
	}
}

async function updateUserStats(username){
	fetch(`/${username}/update-stats`, {
		method: "POST",
		headers:{
			'Content-Type': 'application/json'
		},
		body: JSON.stringify({
			track: currentTrack
		})
	})
	.then(res => res.json())
	.then(data => console.log("updated stats"))
	.catch(err => console.log(err));
}

async function getUserStats(username){
	const response = await fetch(`/${username}/get-stats`);
	const data = await response.json();
	return data.data;
}
