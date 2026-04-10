/**
 * @author Luuxis
 * @contributor QFSLive
 * Luuxis License v1.0 (see LICENSE file for details in FR/EN)
 */

const { ipcRenderer, shell } = require('electron');
const pkg = require('../package.json');
const os = require('os');
import { config, database } from './utils.js';
const nodeFetch = require("node-fetch");


class Splash {
    constructor() {
        this.splash = document.querySelector(".splash");
        this.splashMessage = document.querySelector(".splash-message");
        this.splashAuthor = document.querySelector(".splash-author");
        this.message = document.querySelector(".message");
        this.progress = document.querySelector(".progress");
        document.addEventListener('DOMContentLoaded', async () => {
            let databaseLauncher = new database();
            let configClient = await databaseLauncher.readData('configClient');
            let theme = configClient?.launcher_config?.theme || "auto"
            let isDarkTheme = await ipcRenderer.invoke('is-dark-theme', theme).then(res => res)
            document.body.className = isDarkTheme ? 'dark global' : 'light global';
            if (process.platform == 'win32') ipcRenderer.send('update-window-progress-load')
            this.startAnimation()
        });
    }

    async startAnimation() {
        let splashes = [
            { "message": "Loading QFS3 Assets...", "author": "QFS3 Team" },
            { "message": "Ha Ha Ha. What are you doing?...", "author": "QFS3 Team" },
            { "message": "Decrypting Purgatory_Logs.bin...", "author": "SYSTEM" },
            { "message": "Intercepting secrets...", "author": "QFS3-SYS" },
            { "message": "Bypassing Cucurucho's f1rewall... status: NOMINAL", "author": "ADMIN" },
            { "message": "Syncing with the Federation...", "author": "???" },
            { "message": "Compiling r3ality.exe...", "author": "SYSTEM" },
            { "message": "Enjoy the island. :)", "author": "Cucurucho" },
            { "message": "Applying mandatory happiness protocols...", "author": "The Federation" },
            { "message": "Recording activity for your safety...", "author": "Federation-SYS" },
            { "message": "Evaluating resident performance...", "author": "Cucurucho" },
            { "message": "Scanning for illegal entities...", "author": "Federation-ADMIN" },
            { "message": "[!] ERROR: BINARY_ENTITY_DETECTED", "author": "01000011" },
            { "message": "Sending r$*c)# signal... [SIGNAL LOST]", "author": "???" },
            { "message": "R3PR0GRAMM1NG R3AL1TY...", "author": "---" },
            { "message": "Checking egg vitals...", "author": "Federation-Med" },
            { "message": "Analyzing Warp Train coordinates...", "author": "QFS3-SYS" },
            { "message": "Searching for the missing pieces...", "author": "The Way" },
            { "message": "Monitoring Purgatory gates...", "author": "Eye-of-the-Storm" }
        ];
        let splash = splashes[Math.floor(Math.random() * splashes.length)];
        this.splashMessage.textContent = splash.message;
        this.splashAuthor.children[0].textContent = "@" + splash.author;
        await sleep(100);
        document.querySelector("#splash").style.display = "block";
        await sleep(500);
        this.splash.classList.add("opacity");
        await sleep(500);
        this.splash.classList.add("translate");
        this.splashMessage.classList.add("opacity");
        this.splashAuthor.classList.add("opacity");
        this.message.classList.add("opacity");
        await sleep(1000);
        this.checkUpdate();
    }

    async checkUpdate() {
        this.setStatus(`Checking for updates...`);

        ipcRenderer.invoke('update-app').then().catch(err => {
            return this.shutdown(`Error while checking for updates:<br>${err.message}`);
        });

        ipcRenderer.on('updateAvailable', () => {
            this.setStatus(`Update available!`);
            if (os.platform() == 'win32') {
                this.toggleProgress();
                ipcRenderer.send('start-update');
            }
            else return this.dowloadUpdate();
        })

        ipcRenderer.on('error', (event, err) => {
            if (err) return this.shutdown(`${err.message}`);
        })

        ipcRenderer.on('download-progress', (event, progress) => {
            ipcRenderer.send('update-window-progress', { progress: progress.transferred, size: progress.total })
            this.setProgress(progress.transferred, progress.total);
        })

        ipcRenderer.on('update-not-available', () => {
            console.error("No update available");
            this.maintenanceCheck();
        })
    }

    getLatestReleaseForOS(os, preferredFormat, asset) {
        return asset.filter(asset => {
            const name = asset.name.toLowerCase();
            const isOSMatch = name.includes(os);
            const isFormatMatch = name.endsWith(preferredFormat);
            return isOSMatch && isFormatMatch;
        }).sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0];
    }

    async dowloadUpdate() {
        const repoURL = pkg.repository.url.replace("git+", "").replace(".git", "").replace("https://github.com/", "").split("/");
        const githubAPI = await nodeFetch('https://api.github.com').then(res => res.json()).catch(err => err);

        const githubAPIRepoURL = githubAPI.repository_url.replace("{owner}", repoURL[0]).replace("{repo}", repoURL[1]);
        const githubAPIRepo = await nodeFetch(githubAPIRepoURL).then(res => res.json()).catch(err => err);

        const releases_url = await nodeFetch(githubAPIRepo.releases_url.replace("{/id}", '')).then(res => res.json()).catch(err => err);
        const latestRelease = releases_url[0].assets;
        let latest;

        if (os.platform() == 'darwin') latest = this.getLatestReleaseForOS('mac', '.dmg', latestRelease);
        else if (os == 'linux') latest = this.getLatestReleaseForOS('linux', '.appimage', latestRelease);


        this.setStatus('Update available!<br><div class="download-update">Download</div>');
        document.querySelector(".download-update").addEventListener("click", () => {
            shell.openExternal(latest.browser_download_url);
            return this.shutdown("Downloading update...");
        });
    }


    async maintenanceCheck() {
        config.GetConfig().then(res => {
            if (res.maintenance) return this.shutdown(res.maintenance_message);
            this.startLauncher();
        }).catch(e => {
            console.error(e);
            return this.shutdown("No internet connection detected,<br>please try again later.");
        })
    }

    startLauncher() {
        this.setStatus(`Starting the launcher`);
        ipcRenderer.send('main-window-open');
        ipcRenderer.send('update-window-close');
    }

    shutdown(text) {
        this.setStatus(`${text}<br>Closing in 5s`);
        let i = 4;
        setInterval(() => {
            this.setStatus(`${text}<br>Closing in ${i--}s`);
            if (i < 0) ipcRenderer.send('update-window-close');
        }, 1000);
    }

    setStatus(text) {
        this.message.innerHTML = text;
    }

    toggleProgress() {
        if (this.progress.classList.toggle("show")) this.setProgress(0, 1);
    }

    setProgress(value, max) {
        this.progress.value = value;
        this.progress.max = max;
    }
}

function sleep(ms) {
    return new Promise(r => setTimeout(r, ms));
}

document.addEventListener("keydown", (e) => {
    if (e.ctrlKey && e.shiftKey && e.keyCode == 73 || e.keyCode == 123) {
        ipcRenderer.send("update-window-dev-tools");
    }
})
new Splash();