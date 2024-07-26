# D-Tunes

A web application for streaming music, built with Node.js and Mongoose.

## Features

- User authentication
- Search for songs, playlists, and users
- Create and manage playlists
- Play local and Spotify tracks using Spotify Embed API
- Real-time lyrics display
- Friend system with friend requests
- Artist accounts with song upload capability
- Party mode for collaborative listening

## Prerequisites

- Node.js (v14 or later)
- MongoDB
- Spotify Developer account (for Spotify API integration)
- Spotify account (for enhanced user experience)

## Installation

1. Clone the repository: ```git clone https://github.com/npraveen005/D-Tunes.git```
2. Install dependencies: npm install
3. Start the server: npm start
4. Open your browser and navigate to `http://localhost:3000` (or whichever port you've configured).

## Usage

1. Register for an account or log in if you already have one.
2. **Important**: For the best experience, sign in to your Spotify account in the same browser you're using to access the webapp.
3. Search for songs, playlists, or users using the search bar.
4. Create playlists and add songs to them.
5. Play songs by clicking on them in search results or playlists.
6. View real-time lyrics while a song is playing.
7. Send friend requests to other users and manage your friends list.
8. If you're an artist, you can upload your own songs.
9. Create or join parties for collaborative listening experiences.

## Spotify Integration

This webapp uses Spotify's Embed API for playing Spotify tracks. The integration allows for:

- Playback of Spotify tracks within the webapp
- Display of track information and album art
- Basic playback controls (play, pause, seek)

For the best experience:
- Sign in to your Spotify account in the same browser you're using for this webapp.
- While the Embed API allows for playback without logging in, being signed in to Spotify can provide a more personalized experience and potentially unlock additional features.
- If you encounter any issues with Spotify playback, try logging out and logging back into your Spotify account.
