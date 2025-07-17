# 📦 Installation Guide

## Prerequisites

Before installing, ensure you have:

1. **Spicetify** installed and working
2. **Node.js** (version 14 or higher)
3. **Python** and **pip** (for spotdl)
4. **Git** (for cloning)

## Step-by-Step Installation

### 1. Install Dependencies

```bash
# Install spotdl
pip install spotdl

# Verify installation
spotdl --version
node --version
```

### 2. Clone Repository

```bash
git clone https://github.com/yourusername/spicetify-enhanced-downloader.git
cd spicetify-enhanced-downloader
```

### 3. Install Extension

```bash
# Windows
copy Extensions\* "%APPDATA%\spicetify\Extensions\"

# Linux/macOS
cp Extensions/* ~/.config/spicetify/Extensions/
```

### 4. Configure Spicetify

```bash
# Enable the extension
spicetify config extensions song-downloader-enhanced-artist.js

# Apply changes
spicetify apply
```

### 5. Test Installation

1. Open Spotify
2. Start the download server by either:
   - Double clicking on `start-download-server.bat`
   or
   - `node server-manager.js --start`
3. Right-click on any song
4. Look for "Download" option
5. Try downloading a track

## Configuration

### Change Download Location

Edit `config.json`:

```javascript
const BASE_DOWNLOAD_PATH = 'C:\\Your\\Custom\\Path';
```
`spicetify apply`

### Adjust Performance

```javascript
// Number of simultaneous downloads
const MAX_CONCURRENT_DOWNLOADS = 5;

// API request limits
const API_LIMIT = 300;
```
`spicetify apply`

## Troubleshooting

### Extension Not Appearing
- Restart Spotify completely
- Check spicetify configuration: `spicetify config`
- Verify files are in Extensions folder

### Download Failures
- Check spotdl installation: `spotdl --version`
- Ensure spotdl is in system PATH
- Test manually: `spotdl "https://open.spotify.com/track/..."`

### Server Issues
- Check if port 3001 is available
- Restart server manually: `node server-manager.js --restart`
- Check Node.js version: `node --version`

## Uninstallation

```bash
# Remove extension
spicetify config extensions song-downloader-enhanced-artist.js-

# Apply changes
spicetify apply

# Remove files
rm -rf "%APPDATA%\spicetify\Extensions\config.json*
rm -rf "%APPDATA%\spicetify\Extensions\song-downloader-*"
rm -rf "%APPDATA%\spicetify\Extensions\download-server.js"
rm -rf "%APPDATA%\spicetify\Extensions\server-manager.js"
```

## Update

```bash
# Pull latest changes
git pull origin main

# Copy updated files
copy Extensions\* "%APPDATA%\spicetify\Extensions\"

# Restart Spotify
spicetify apply
```
