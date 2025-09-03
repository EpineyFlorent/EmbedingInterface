const { app, BrowserWindow, ipcMain, dialog } = require('electron')
const ElectronStore = require('electron-store')
const path = require('path')
const { spawn } = require('child_process')

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
        const pythonProcess = spawn('python', ['app.py', JSON.stringify(config)])
        let output = ''
        let error = ''

        pythonProcess.stdout.on('data', (data) => {
            output += data.toString()
        })

        pythonProcess.stderr.on('data', (data) => {
            console.error('Erreur Python:', data.toString())
            error += data.toString()
        })

        pythonProcess.on('close', (code) => {
            if (code === 0 && output) {
                resolve(output)
            } else {
                reject(error || 'Erreur inconnue')
            }
        })
    })
})

ipcMain.handle('query', async (event, query) => {
return new Promise((resolve, reject) => {
  const process = spawn('python', ['app.py', JSON.stringify({ command: 'query', query: query })])
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
      resolve(output)
    } else {
      reject(error)
    }
  })
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