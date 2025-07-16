// Spicetify Downloader Extension - Enhanced with Artist Support and Playlist-v2 Fix
(async function() {
    // Wait for Spicetify to be ready
    while (!Spicetify.React || !Spicetify.ReactDOM) {
        await new Promise(resolve => setTimeout(resolve, 10));
    }
    
    // Wait for Spicetify notifications to be available
    while (!Spicetify || !Spicetify.showNotification) {
        await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    // Helper function to get URI type using Spicetify.URI.fromString
    function getURIType(uri) {
        try {
            const parsedUri = Spicetify.URI.fromString(uri);
            return parsedUri.type;
        } catch (e) {
            console.warn('Failed to parse URI:', uri, e);
            return null;
        }
    }
    
    // Helper function to check if URI is a playlist (including playlist-v2)
    function isPlaylistUri(uri) {
        const type = getURIType(uri);
        return type === 'playlist' || type === 'playlist-v2';
    }
    
    // Try to start server if needed
    async function startServerIfNeeded() {
        try {
            const response = await fetch('http://localhost:3001/health');
            if (response.ok) return;
        } catch (e) {}
        
        try {
            const { exec } = require('child_process');
            const path = require('path');
            const extensionsPath = path.join(require('os').homedir(), 'AppData', 'Roaming', 'spicetify', 'Extensions');
            const managerPath = path.join(extensionsPath, 'server-manager.js');
            
            exec(`node "${managerPath}" --start`, (error, stdout, stderr) => {
                if (error) {
                    console.error('Failed to start server:', error);
                } else {
                    console.log('Server manager:', stdout);
                }
            });
        } catch (e) {
            console.warn('Could not auto-start server:', e);
        }
    }
    
    // Get Spotify access token
    function getAccessToken() {
        try {
            return Spicetify.Platform.AuthorizationAPI._tokenProvider?._token?.accessToken || 
                   Spicetify.Platform.AuthorizationAPI.getToken?.()?.access_token || null;
        } catch (e) {
            console.warn('Could not get access token:', e);
            return null;
        }
    }
    
    // Main download function
    async function downloadContent(uri, metadata) {
        const url = Spicetify.URI.fromString(uri).toURL();
        let type, name;
        
        if (Spicetify.URI.isTrack(uri)) {
            type = 'track';
            name = `${metadata?.title || metadata?.name || 'Unknown'} by ${metadata?.artist_name || metadata?.artists?.[0]?.name || 'Unknown'}`;
        } else if (isPlaylistUri(uri)) {
            type = 'playlist';
            name = metadata?.name || 'Unknown Playlist';
        } else if (Spicetify.URI.isAlbum(uri)) {
            type = 'album';
            name = `${metadata?.name || 'Unknown Album'} by ${metadata?.artist_name || metadata?.artists?.[0]?.name || 'Unknown Artist'}`;
        } else if (Spicetify.URI.isArtist(uri)) {
            type = 'artist';
            name = metadata?.name || 'Unknown Artist';
        }
        
        try {
            const accessToken = getAccessToken();
            
            if (type === 'album' || type === 'playlist' || type === 'artist') {
                Spicetify.showNotification(`Starting enhanced ${type} download: ${name}`, false, 3000);
            } else {
                Spicetify.showNotification(`Starting ${type} download: ${name}`, false, 3000);
            }
            
            const response = await fetch('http://localhost:3001/download', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({url, type, name, accessToken})
            });
            
            const result = await response.json();
            
            if (result.success) {
                Spicetify.showNotification(`${type} download completed successfully!`, false, 3000);
            } else {
                throw new Error(result.error || 'Download failed');
            }
        } catch (error) {
            if (error.message.includes('fetch')) {
                await startServerIfNeeded();
                await new Promise(resolve => setTimeout(resolve, 3000));
                
                try {
                    const accessToken = getAccessToken();
                    const response = await fetch('http://localhost:3001/download', {
                        method: 'POST',
                        headers: {'Content-Type': 'application/json'},
                        body: JSON.stringify({url, type, name, accessToken})
                    });
                    
                    const result = await response.json();
                    
                    if (result.success) {
                        Spicetify.showNotification(`${type} download completed successfully!`, false, 3000);
                    } else {
                        throw new Error(result.error || 'Download failed');
                    }
                } catch (retryError) {
                    Spicetify.showNotification(`Download failed: ${retryError.message}`, true, 5000);
                }
            } else {
                Spicetify.showNotification(`Download failed: ${error.message}`, true, 5000);
            }
            console.error('Download error:', error);
        }
    }
    
    // Get track metadata
    async function getTrackMetadata(trackId) {
        try {
            const accessToken = getAccessToken();
            const response = await fetch(`https://api.spotify.com/v1/tracks/${trackId}`, {
                headers: {'Authorization': `Bearer ${accessToken}`}
            });
            
            if (response.ok) {
                const track = await response.json();
                return {
                    title: track.name,
                    artist_name: track.artists?.[0]?.name,
                    artists: track.artists
                };
            }
        } catch (e) {
            console.warn('Failed to get track metadata from API:', e);
        }
        return {title: 'Unknown', artist_name: 'Unknown'};
    }
    
    // Get album metadata
    async function getAlbumMetadata(albumId) {
        try {
            const accessToken = getAccessToken();
            const response = await fetch(`https://api.spotify.com/v1/albums/${albumId}`, {
                headers: {'Authorization': `Bearer ${accessToken}`}
            });
            
            if (response.ok) {
                const album = await response.json();
                return {
                    name: album.name,
                    artist_name: album.artists?.[0]?.name,
                    artists: album.artists
                };
            }
        } catch (e) {
            console.warn('Failed to get album metadata from API:', e);
        }
        return {name: 'Unknown Album', artist_name: 'Unknown Artist'};
    }
    
    // Get artist metadata
    async function getArtistMetadata(artistId) {
        try {
            const accessToken = getAccessToken();
            const response = await fetch(`https://api.spotify.com/v1/artists/${artistId}`, {
                headers: {'Authorization': `Bearer ${accessToken}`}
            });
            
            if (response.ok) {
                const artist = await response.json();
                return {name: artist.name};
            }
        } catch (e) {
            console.warn('Failed to get artist metadata from API:', e);
        }
        return {name: 'Unknown Artist'};
    }
    
    // Enhanced playlist metadata function with multiple fallback methods
    async function getPlaylistMetadata(playlistId) {
        // Method 1: Try Spicetify Platform API first
        try {
            const playlist = await Spicetify.Platform.PlaylistAPI.getPlaylist(playlistId);
            if (playlist && playlist.name) {
                console.log('Got playlist name from Platform API:', playlist.name);
                return {name: playlist.name};
            }
        } catch (e) {
            console.warn('Platform API failed for playlist:', e);
        }
        
        // Method 2: Try Spotify Web API with access token
        try {
            const accessToken = getAccessToken();
            if (accessToken) {
                const response = await fetch(`https://api.spotify.com/v1/playlists/${playlistId}`, {
                    headers: {'Authorization': `Bearer ${accessToken}`}
                });
                
                if (response.ok) {
                    const playlist = await response.json();
                    if (playlist && playlist.name) {
                        console.log('Got playlist name from Web API:', playlist.name);
                        return {name: playlist.name};
                    }
                }
            }
        } catch (e) {
            console.warn('Web API failed for playlist:', e);
        }
        
        // Method 3: Try DOM scraping as last resort
        try {
            // Look for playlist title in the current page
            const titleSelectors = [
                '[data-testid="playlist-page-title"]',
                '[data-testid="entityTitle"]',
                'h1[data-encore-id="text"]',
                'h1.Type__TypeElement-sc-goli3j-0',
                '.playlist-playlist-playlistContent h1',
                '.main-entityHeader-title',
                '.main-entityHeader-titleText'
            ];
            
            for (const selector of titleSelectors) {
                const element = document.querySelector(selector);
                if (element && element.textContent.trim()) {
                    const name = element.textContent.trim();
                    console.log('Got playlist name from DOM:', name);
                    return {name: name};
                }
            }
        } catch (e) {
            console.warn('DOM scraping failed for playlist:', e);
        }
        
        // Method 4: Try to get from current Spotify.Player state
        try {
            const playerState = Spicetify.Player.data;
            if (playerState && playerState.context && playerState.context.uri && playerState.context.uri.includes(playlistId)) {
                const contextTitle = playerState.context.metadata && playerState.context.metadata.context_description;
                if (contextTitle) {
                    console.log('Got playlist name from Player context:', contextTitle);
                    return {name: contextTitle};
                }
            }
        } catch (e) {
            console.warn('Player state failed for playlist:', e);
        }
        
        console.warn('All methods failed to get playlist name, using fallback');
        return {name: 'Unknown Playlist'};
    }
    
    // Register context menu item
    new Spicetify.ContextMenu.Item(
        "Download",
        async function(uris) {
            const uri = uris[0];
            let metadata = {};
            
            if (Spicetify.URI.isTrack(uri)) {
                const trackId = Spicetify.URI.fromString(uri).id;
                metadata = await getTrackMetadata(trackId);
            } else if (isPlaylistUri(uri)) {
                const playlistId = Spicetify.URI.fromString(uri).id;
                metadata = await getPlaylistMetadata(playlistId);
            } else if (Spicetify.URI.isAlbum(uri)) {
                const albumId = Spicetify.URI.fromString(uri).id;
                metadata = await getAlbumMetadata(albumId);
            } else if (Spicetify.URI.isArtist(uri)) {
                const artistId = Spicetify.URI.fromString(uri).id;
                metadata = await getArtistMetadata(artistId);
            }
            
            await downloadContent(uri, metadata);
        },
        function(uris) {
            const uri = uris[0];
            return Spicetify.URI.isTrack(uri) || isPlaylistUri(uri) || Spicetify.URI.isAlbum(uri) || Spicetify.URI.isArtist(uri);
        }
    ).register();
    
    // Try to start server on extension load
    await startServerIfNeeded();
})();
