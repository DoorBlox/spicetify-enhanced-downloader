const fs = require('fs');
const path = require('path');
const readline = require('readline');
const os = require('os');

console.log('🎵 Spicetify Enhanced Downloader - Setup');
console.log('=====================================\n');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

function askQuestion(question) {
    return new Promise((resolve) => {
        rl.question(question, resolve);
    });
}

function getDefaultDownloadPath() {
    const homeDir = os.homedir();
    const platform = os.platform();
    
    if (platform === 'win32') {
        return path.join(homeDir, 'Music', 'Spotify Downloads');
    } else if (platform === 'darwin') {
        return path.join(homeDir, 'Music', 'Spotify Downloads');
    } else {
        return path.join(homeDir, 'Music', 'Spotify Downloads');
    }
}

async function main() {
    console.log('This setup will configure your download preferences.\n');
    
    const defaultPath = getDefaultDownloadPath();
    const downloadPath = await askQuestion(`Enter download directory (default: ${defaultPath}): `);
    const finalPath = downloadPath.trim() || defaultPath;
    
    const concurrentDownloads = await askQuestion('Number of simultaneous downloads (default: 3): ');
    const maxConcurrent = parseInt(concurrentDownloads) || 3;
    
    const serverPort = await askQuestion('Server port (default: 3001): ');
    const port = parseInt(serverPort) || 3001;
    
    // Create download directory if it doesn't exist
    if (!fs.existsSync(finalPath)) {
        try {
            fs.mkdirSync(finalPath, { recursive: true });
            console.log(`✅ Created download directory: ${finalPath}`);
        } catch (error) {
            console.error(`❌ Failed to create directory: ${error.message}`);
            process.exit(1);
        }
    }
    
    const config = {
        downloadDirectory: finalPath,
        maxConcurrentDownloads: maxConcurrent,
        serverPort: port,
        apiLimit: 300,
        fileNamingFormat: "{title} - {artist}.{ext}",
        createArtistFolders: true,
        createAlbumFolders: true,
        createPlaylistFolders: true,
        autoStartServer: true
    };
    
    // Write configuration
    try {
        fs.writeFileSync('config.json', JSON.stringify(config, null, 2));
        console.log('\n✅ Configuration saved to config.json');
        console.log('\nSettings:');
        console.log(`📁 Download Directory: ${finalPath}`);
        console.log(`⚡ Max Concurrent Downloads: ${maxConcurrent}`);
        console.log(`🌐 Server Port: ${port}`);
        console.log('\nNext steps:');
        console.log('1. Run: npm run install-extension');
        console.log('2. Restart Spotify');
        console.log('3. Right-click on any track/album/playlist/artist and select "Download"');
        
    } catch (error) {
        console.error(`❌ Failed to save configuration: ${error.message}`);
        process.exit(1);
    }
    
    rl.close();
}

main().catch(console.error);
