const { app, BrowserWindow, ipcMain, dialog } = require('electron')
const ElectronStore = require('electron-store')
const path = require('path')
const { spawn } = require('child_process')
const isDev = !app.isPackaged;
const pythonExe = isDev
    ? path.join(__dirname, 'dist', 'app.exe')
    : path.join(process.resourcesPath, 'app.exe');
const { execFile } = require('child_process');


// Initialisation du store
const store = new ElectronStore({
    defaults: {
        appConfig: {
            data_dir: '',
            embeddings_file: '',
            model: ''
        }
    }
})

function createWindow() {
  const win = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  })


  ipcMain.handle('select-directory', async () => {
    const result = await dialog.showOpenDialog(win, {
      properties: ['openDirectory']
    })
    return result.filePaths[0]
  })

  ipcMain.handle('select-file', async () => {
    const result = await dialog.showOpenDialog(win, {
      properties: ['openFile'],
      filters: [
        { name: 'JSON', extensions: ['json'] }
      ]
    })
    return result.filePaths[0]
  })

  ipcMain.handle('index-documents', async (event, config) => {
    return new Promise((resolve, reject) => {
        const pythonProcess = spawn(pythonExe, [JSON.stringify({
            command: 'index',
            directory: store.get('appConfig.data_dir'), // Use stored data_dir
            embeddings_file: store.get('appConfig.embeddings_file') // Use stored embeddings_file
        })]);

        let output = '';
        let error = '';

        pythonProcess.stdout.on('data', (data) => {
            output += data.toString();
        });

        pythonProcess.stderr.on('data', (data) => {
            error += data.toString();
        });

        pythonProcess.on('close', (code) => {
            if (code === 0 && output) {
                try {
                    const result = JSON.parse(output);
                    resolve(result);
                } catch (e) {
                    reject('Invalid JSON output: ' + output);
                }
            } else {
                reject(error || 'Process failed without output');
            }
        });
    });
});

ipcMain.handle('query', async (event, query) => {
    return new Promise((resolve, reject) => {
        const process = spawn(pythonExe, [JSON.stringify({
            command: 'query',
            data_dir: store.get('appConfig.data_dir'),
            embeddings_file: store.get('appConfig.embeddings_file'),
            model: store.get('appConfig.model'),
            query: query
        })]);
        let output = ''
        let error = ''

      process.stdout.on('data', (data) => {
        output += data.toString()
      })

      process.stderr.on('data', (data) => {
        error += data.toString()
      })

        process.on('close', (code) => {
            if (code === 0) {
                try {
                    const result = JSON.parse(output);
                    if (result.response && result.response.includes("Error: No response from Ollama")) {
                        reject("Ollama server is not responding. Make sure it's running and accessible.");
                    } else {
                        resolve(output);
                    }
                } catch (e) {
                    reject("Invalid response format");
                }
            } else {
                reject(error || "Process failed");
            }
        });
    })
})

ipcMain.handle('save-config', async (event, config) => {
    store.set('appConfig', config)
    return { status: 'success' }
})

ipcMain.handle('load-config', async () => {
    return store.get('appConfig', {
        data_dir: '',
        embeddings_file: '',
        model: ''
    })
})

  win.loadFile('templates/index.html')
}

app.whenReady().then(createWindow)

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})