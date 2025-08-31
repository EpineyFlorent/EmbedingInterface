const { app, BrowserWindow, dialog, ipcMain } = require('electron')
const path = require('path')
const { spawn } = require('child_process')

let pythonProcess = null

function startPythonServer() {
  pythonProcess = spawn('python', ['server.py'])

  pythonProcess.stdout.on('data', (data) => {
    console.log(`Server: ${data}`)
  })

  pythonProcess.stderr.on('data', (data) => {
    console.error(`Server Error: ${data}`)
  })

  pythonProcess.on('close', (code) => {
    console.log(`Server stopped with code ${code}`)
  })
}
function createWindow() {
  const win = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  })

  // Démarre le serveur Python
  startPythonServer()

  // Configuration des événements IPC
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

  win.loadFile('templates/index.html')
}

app.whenReady().then(createWindow)

app.on('window-all-closed', () => {
  // Arrête le serveur Python
  if (pythonProcess) {
    pythonProcess.kill()
  }

  if (process.platform !== 'darwin') {
    app.quit()
  }
})


app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })