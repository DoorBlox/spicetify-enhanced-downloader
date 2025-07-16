const http = require('http');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

// Load configuration
let config;
try {
    const configPath = path.join(__dirname, '..', 'config.json');
    config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    
    // Validate download directory
    if (config.downloadDirectory === 'CHANGE_ME') {
        console.error('\n❌ CONFIGURATION ERROR:');
        console.error('Please edit config.json and set your download directory!');
        console.error('Current value: "CHANGE_ME"');
        console.error('\nExample: "C:\\\\Users\\\\YourName\\\\Music\\\\Spotify Downloads"');
        console.error('\nSee INSTALL.md for detailed instructions.');
        process.exit(1);
    }
    
    // Ensure download directory exists
    if (!fs.existsSync(config.downloadDirectory)) {
        fs.mkdirSync(config.downloadDirectory, { recursive: true });
        console.log(`✅ Created download directory: ${config.downloadDirectory}`);
    }
    
} catch (error) {
    console.error('❌ Failed to load config.json:', error.message);
    console.error('\nMake sure config.json exists and is valid JSON.');
    console.error('See INSTALL.md for setup instructions.');
    process.exit(1);
}

const PORT = config.serverPort || 3001;
const BASE_DOWNLOAD_PATH = config.downloadDirectory;
const MAX_CONCURRENT_DOWNLOADS = config.maxConcurrentDownloads || 3;

let activeDownloads = 0;
let downloadQueue = [];

// Store access token for Spotify API calls
let spotifyAccessToken = null;

// Ensure base directory exists
if (!fs.existsSync(BASE_DOWNLOAD_PATH)) {
    fs.mkdirSync(BASE_DOWNLOAD_PATH, { recursive: true });
}

function sanitizeFilename(name) {
    return name.replace(/[<>:"/\\|?*]/g, '_').replace(/\s+/g, ' ').trim();
}

function executeDownload(url, outputPath, type, name) {
    return new Promise((resolve, reject) => {
        activeDownloads++;
        console.log(`[${activeDownloads}/${MAX_CONCURRENT_DOWNLOADS}] Starting ${type} download: ${name}`);
        
        // Use custom output template: song - artist.mp3
        const outputTemplate = path.join(outputPath, '{title} - {artist}.{output-ext}');
        const cmd = `spotdl "${url}" --output "${outputTemplate}"`;
        console.log(`Command: ${cmd}`);
        
        exec(cmd, (error, stdout, stderr) => {
            activeDownloads--;
            
            if (error) {
                console.error(`Download failed: ${error.message}`);
                processQueue(); // Process next in queue
                reject(error);
                return;
            }
            if (stderr) {
                console.warn(`Download stderr: ${stderr}`);
            }
            console.log(`Download completed: ${name}`);
            console.log(`Output: ${stdout}`);
            
            processQueue(); // Process next in queue
            resolve(stdout);
        });
    });
}

function processQueue() {
    if (downloadQueue.length > 0 && activeDownloads < MAX_CONCURRENT_DOWNLOADS) {
        const { resolve, reject, url, outputPath, type, name } = downloadQueue.shift();
        executeDownload(url, outputPath, type, name)
            .then(resolve)
            .catch(reject);
    }
}

function queueDownload(url, outputPath, type, name) {
    return new Promise((resolve, reject) => {
        if (activeDownloads < MAX_CONCURRENT_DOWNLOADS) {
            // Execute immediately
            executeDownload(url, outputPath, type, name)
                .then(resolve)
                .catch(reject);
        } else {
            // Add to queue
            console.log(`Download queued: ${name} (Queue length: ${downloadQueue.length + 1})`);
            downloadQueue.push({ resolve, reject, url, outputPath, type, name });
        }
    });
}

// Enhanced function to fetch album/playlist/artist tracks
async function fetchTracks(url, type, accessToken) {
    try {
        let tracks = [];
        let apiUrl;
        
        // Extract ID from Spotify URL
        const urlParts = url.split('/');
        const id = urlParts[urlParts.length - 1].split('?')[0];
        
        if (type === 'album') {
            apiUrl = `https://api.spotify.com/v1/albums/${id}/tracks?limit=300`;
        } else if (type === 'playlist') {
            apiUrl = `https://api.spotify.com/v1/playlists/${id}/tracks?limit=300`;
        } else if (type === 'artist') {
            // For artists, get top tracks
            apiUrl = `https://api.spotify.com/v1/artists/${id}/top-tracks?market=US`;
        }
        
        let response = await fetch(apiUrl, {
            headers: {
                'Authorization': `Bearer ${accessToken}`
            }
        });
        
        if (!response.ok) {
            throw new Error(`API request failed: ${response.status}`);
        }
        
        let data = await response.json();
        
        // Process tracks
        if (type === 'album') {
            tracks = data.items.map(track => ({
                name: track.name,
                artist: track.artists?.[0]?.name || 'Unknown',
                url: track.external_urls.spotify
            }));
        } else if (type === 'playlist') {
            tracks = data.items
                .filter(item => item.track && item.track.type === 'track')
                .map(item => ({
                    name: item.track.name,
                    artist: item.track.artists?.[0]?.name || 'Unknown',
                    url: item.track.external_urls.spotify
                }));
        } else if (type === 'artist') {
            // For artists, get top tracks (no pagination needed)
            tracks = data.tracks.map(track => ({
                name: track.name,
                artist: track.artists?.[0]?.name || 'Unknown',
                url: track.external_urls.spotify
            }));
        }
        
        // Handle pagination
        while (data.next) {
            response = await fetch(data.next, {
                headers: {
                    'Authorization': `Bearer ${accessToken}`
                }
            });
            
            if (!response.ok) break;
            
            data = await response.json();
            
            if (type === 'album') {
                const moreTracks = data.items.map(track => ({
                    name: track.name,
                    artist: track.artists?.[0]?.name || 'Unknown',
                    url: track.external_urls.spotify
                }));
                tracks.push(...moreTracks);
            } else if (type === 'playlist') {
                const moreTracks = data.items
                    .filter(item => item.track && item.track.type === 'track')
                    .map(item => ({
                        name: item.track.name,
                        artist: item.track.artists?.[0]?.name || 'Unknown',
                        url: item.track.external_urls.spotify
                    }));
                tracks.push(...moreTracks);
            }
        }
        
        return tracks;
    } catch (error) {
        console.error('Error fetching tracks:', error);
        return [];
    }
}

// Enhanced function to handle album/playlist downloads with track-level parallelism
async function handleEnhancedDownload(url, outputPath, type, name, accessToken) {
    console.log(`Starting enhanced ${type} download: ${name}`);
    
    // Fetch individual tracks
    const tracks = await fetchTracks(url, type, accessToken);
    
    if (tracks.length === 0) {
        console.log(`No tracks found for ${name}, falling back to standard download`);
        return await queueDownload(url, outputPath, type, name);
    }
    
    console.log(`Found ${tracks.length} tracks in ${name}`);
    
    // Queue each track individually
    const downloadPromises = tracks.map(track => {
        const trackName = `${track.name} - ${track.artist}`;
        return queueDownload(track.url, outputPath, 'track', trackName);
    });
    
    // Wait for all tracks to complete
    try {
        await Promise.all(downloadPromises);
        console.log(`All tracks completed for ${name}`);
        return `Enhanced download completed: ${tracks.length} tracks`;
    } catch (error) {
        console.error(`Some tracks failed in ${name}:`, error);
        throw error;
    }
}

const server = http.createServer((req, res) => {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }
    
    if (req.method === 'GET' && req.url === '/health') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'ok', message: 'Server is running' }));
        return;
    }
    
    if (req.method === 'GET' && req.url === '/status') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ 
            activeDownloads, 
            maxConcurrent: MAX_CONCURRENT_DOWNLOADS,
            queueLength: downloadQueue.length,
            queuedItems: downloadQueue.map(item => item.name)
        }));
        return;
    }
    
    if (req.method === 'POST' && req.url === '/set-token') {
        let body = '';
        req.on('data', chunk => {
            body += chunk.toString();
        });
        
        req.on('end', () => {
            try {
                const { accessToken } = JSON.parse(body);
                spotifyAccessToken = accessToken;
                console.log('Access token updated');
                
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: true, message: 'Access token set' }));
            } catch (error) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: false, error: error.message }));
            }
        });
        return;
    }
    
    if (req.method === 'POST' && req.url === '/download') {
        let body = '';
        req.on('data', chunk => {
            body += chunk.toString();
        });
        
        req.on('end', async () => {
            try {
                const { url, type, name, accessToken } = JSON.parse(body);
                
                // Update access token if provided
                if (accessToken) {
                    spotifyAccessToken = accessToken;
                }
                
                let outputPath;
                
                if (type === 'track') {
                    outputPath = BASE_DOWNLOAD_PATH;
                    // Individual tracks use normal download
                    await queueDownload(url, outputPath, type, name);
                } else if (type === 'playlist' || type === 'album' || type === 'artist') {
                    const folderName = sanitizeFilename(name);
                    outputPath = path.join(BASE_DOWNLOAD_PATH, folderName);
                    
                    // Create folder if it doesn't exist
                    if (!fs.existsSync(outputPath)) {
                        fs.mkdirSync(outputPath, { recursive: true });
                    }
                    
                    // Use enhanced download for albums/playlists/artists
                    if (spotifyAccessToken) {
                        await handleEnhancedDownload(url, outputPath, type, name, spotifyAccessToken);
                    } else {
                        console.log('No access token available, using standard download');
                        await queueDownload(url, outputPath, type, name);
                    }
                }
                
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: true, message: `${type} download completed` }));
                
            } catch (error) {
                console.error('Server error:', error);
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: false, error: error.message }));
            }
        });
    } else {
        res.writeHead(404);
        res.end('Not found');
    }
});

server.listen(PORT, () => {
    console.log(`Spotify Download Server running on http://localhost:${PORT}`);
    console.log(`Base download path: ${BASE_DOWNLOAD_PATH}`);
    console.log('Ready to receive download requests...');
});

// Handle graceful shutdown
process.on('SIGINT', () => {
    console.log('\nShutting down server...');
    server.close(() => {
        console.log('Server closed.');
        process.exit(0);
    });
});
