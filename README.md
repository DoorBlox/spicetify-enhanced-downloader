# 🎵 Spicetify Enhanced Downloader

An advanced Spotify download extension for Spicetify with **track-level parallelism**, support for **tracks, albums, playlists, and artists**.

## ✨ Features

### 🚀 **Multi-Content Support**
- **Individual Tracks** → Downloads to root folder
- **Albums** → Downloads to `Album Name by Artist/` folder with parallel track downloads
- **Playlists** → Downloads to `Playlist Name/` folder with parallel track downloads  
- **Artists** → Downloads top 10 tracks to `Artist Name/` folder

### ⚡ **Performance**
- **Track-level parallelism** - Downloads 3 tracks simultaneously within albums/playlists, adjustable
- **Smart queueing system** - Handles unlimited downloads
- **3x faster** than sequential downloads for large collections

### 🎯 **User Experience**
- **Perfect file naming** - `Song Name - Artist.mp3` format
- **Real-time notifications** - Progress updates in Spotify
- **Automatic retries** - Handles failures gracefully

### 📁 **Folder Structure**
```
D:\HISYAM\Music\Spotify Downloads\
├── individual_song.mp3
├── Album Name by Artist/
│   ├── Track 1 - Artist.mp3
│   ├── Track 2 - Artist.mp3
│   └── Track 3 - Artist.mp3
├── Playlist Name/
│   ├── Song 1 - Artist 1.mp3
│   ├── Song 2 - Artist 2.mp3
│   └── Song 3 - Artist 3.mp3
└── Artist Name/
    ├── Popular Song 1 - Artist.mp3
    ├── Popular Song 2 - Artist.mp3
    └── Popular Song 3 - Artist.mp3
```

## 🔧 Requirements

- **Spicetify** installed and configured
- **Node.js** (for server management)
- **spotdl** (and FFmpeg) installed and accessible from PATH
- **Windows** (PowerShell support)

## 📦 Installation

1. **Clone this repository**:
   ```bash
   git clone https://github.com/DoorBlox/spicetify-enhanced-downloader
   cd spicetify-enhanced-downloader
   ```

2. **Copy extension files**:
   ```bash
   copy Extensions\* "%APPDATA%\spicetify\Extensions\"
   ```

3. **Enable the extension**:
   ```bash
   spicetify config extensions song-downloader-enhanced-artist.js
   spicetify apply
   ```

4. **Install spotdl** (if not already installed):
   ```bash
   pip install spotdl
   ```

## 🎯 Usage

1. **Open Spotify**
2. **Start the download server** by either:
   - Double clicking on `start-download-server.bat`
   or
   - `node server-manager.js --start`
3. **Right-click** on any:
   - Track → Downloads individual song
   - Album → Downloads all tracks in parallel
   - Playlist → Downloads all tracks in parallel
   - Artist → Downloads top 10 tracks
4. **Select "Download"** from context menu
5. **Watch notifications** for progress updates

## 🛠️ Server Management

The system includes automatic server management:

- **Health checks**: Automatic server status monitoring
- **Manual control**: Use batch files for manual start/stop

### Manual Server Control:
```bash
# Start server
node server-manager.js --start

# Stop server
node server-manager.js --stop

# Check status
node server-manager.js --status
```

## 📊 Server Status

Check download queue and active downloads:
```bash
# PowerShell
Invoke-RestMethod -Uri "http://localhost:3001/status" -Method Get

# Or visit: http://localhost:3001/status
```

## 🔧 Configuration

### Change Download Directory:
Edit `config.json`:
```javascript
  "downloadDirectory": "D:\\Your\\Custom\\Folder",
```
```bash
spicetify apply
```

### Adjust Parallel Downloads:
Edit `config.json`:
```javascript
  "maxConcurrentDownloads": 5, // Default: 3
```
```bash
spicetify apply
```

### Change API Limits:
Edit `download-server.js`:
```javascript
// For playlists/albums
apiUrl = `https://api.spotify.com/v1/albums/${id}/tracks?limit=500`;
```
Edit `config.json`:
```javascript
  "apiLimit": 500,
```
```bash
spicetify apply
```

## 🎵 How It Works

1. **Extension Integration**: Adds context menu to Spotify via Spicetify
2. **Metadata Extraction**: Fetches track/album/playlist info from Spotify API
3. **Enhanced Processing**: For albums/playlists, fetches individual tracks
4. **Parallel Downloads**: Queues tracks for simultaneous download
5. **File Organization**: Creates appropriate folder structure

## 🚀 Performance Comparison

| Content Type | Old Method | Enhanced Method | Speed Improvement |
|-------------|------------|-----------------|-------------------|
| Individual Track | 1 track | 1 track | Same |
| 12-track Album | Sequential | 3 parallel | **3x faster** |
| 50-track Playlist | Sequential | 3 parallel | **3x faster** |
| Artist Top 10 | Not supported | 3 parallel | **New feature** |

## 🔍 Troubleshooting

### Server Issues:
- Check if Node.js is installed: `node --version`
- Verify spotdl installation: `spotdl --version`
- Restart server: `node server-manager.js --stop && node server-manager.js --start`

### Download Failures:
- Ensure spotdl is in PATH
- Check internet connection
- Verify Spotify access token (auto-refreshed)

### Extension Not Loading:
- Restart Spotify after applying extension
- Check Spicetify configuration: `spicetify config`
- Verify extension files are in correct location

## 📁 File Structure

```
spicetify-enhanced-downloader/
├── Extensions/
│   ├── song-downloader-enhanced-artist.js (Main extension)
│   ├── download-server.js (HTTP server)
│   ├── server-manager.js (Server lifecycle)
│   ├── start-download-server.bat (Manual start)
│   └── stop-download-server.bat (Manual stop)
├── config.json
├── README.md
├── INSTALL.md
└── LICENSE
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Spicetify** team for the amazing platform
- **spotdl** developers for the download tool
- **Spotify** for the comprehensive API

## ⚠️ Disclaimer

This tool is for educational purposes only. Please respect artists' rights and Spotify's terms of service. Only download content you have the right to access.

---

**Made with ❤️ for the Spotify community**
