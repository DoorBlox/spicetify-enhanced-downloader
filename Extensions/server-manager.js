const { spawn, exec } = require('child_process');
const path = require('path');
const fs = require('fs');
const http = require('http');

const serverPath = path.join(__dirname, 'download-server.js');
const pidFile = path.join(__dirname, 'server.pid');

class ServerManager {
    constructor() {
        this.serverProcess = null;
        this.checkInterval = null;
    }

    async isServerRunning() {
        try {
            const response = await fetch('http://localhost:3001/health');
            return response.ok;
        } catch (e) {
            return false;
        }
    }

    isSpotifyRunning() {
        return new Promise((resolve) => {
            exec('tasklist /FI "IMAGENAME eq Spotify.exe" /FO CSV', (error, stdout) => {
                if (error) {
                    resolve(false);
                    return;
                }
                const isRunning = stdout.includes('Spotify.exe');
                resolve(isRunning);
            });
        });
    }

    async startServer() {
        if (await this.isServerRunning()) {
            console.log('Server already running');
            return;
        }

        console.log('Starting Spotify Download Server...');
        
        this.serverProcess = spawn('node', [serverPath], {
            detached: true,
            stdio: 'ignore'
        });

        // Save PID
        fs.writeFileSync(pidFile, this.serverProcess.pid.toString());
        
        // Detach process
        this.serverProcess.unref();
        
        console.log(`Server started with PID: ${this.serverProcess.pid}`);
        console.log('Server will continue running in background');
    }

    async stopServer() {
        if (fs.existsSync(pidFile)) {
            const pid = fs.readFileSync(pidFile, 'utf8');
            try {
                process.kill(parseInt(pid), 'SIGTERM');
                fs.unlinkSync(pidFile);
                console.log('Server stopped');
            } catch (e) {
                console.log('Server was already stopped');
                fs.unlinkSync(pidFile);
            }
        }
        
        if (this.checkInterval) {
            clearInterval(this.checkInterval);
            this.checkInterval = null;
        }
    }

    startMonitoring() {
        // Check every 30 seconds if Spotify is still running
        this.checkInterval = setInterval(async () => {
            const spotifyRunning = await this.isSpotifyRunning();
            if (!spotifyRunning) {
                console.log('Spotify closed, stopping server...');
                await this.stopServer();
                process.exit(0);
            }
        }, 30000);
    }
}

// Handle command line arguments
const args = process.argv.slice(2);
const manager = new ServerManager();

if (args.includes('--start')) {
    manager.startServer();
} else if (args.includes('--stop')) {
    manager.stopServer();
} else if (args.includes('--status')) {
    manager.isServerRunning().then(running => {
        console.log(`Server status: ${running ? 'Running' : 'Stopped'}`);
        process.exit(0);
    });
} else {
    // Default: start server (without monitoring for command line usage)
    manager.startServer().then(() => {
        if (!args.includes('--no-monitor')) {
            // Keep the process alive for monitoring
            setInterval(() => {}, 1000);
        }
    });
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
    console.log('\nShutting down server manager...');
    await manager.stopServer();
    process.exit(0);
});

process.on('SIGTERM', async () => {
    await manager.stopServer();
    process.exit(0);
});
