const { app, BrowserWindow } = require('electron')
const path = require('path')

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    show: false,
    autoHideMenuBar: true,
    icon: path.join(__dirname, '../public/icon-512.png'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
  })

  // Dev: Vite dev server | Production: built static files
  if (process.env.VITE_DEV_SERVER_URL) {
    win.loadURL(process.env.VITE_DEV_SERVER_URL)
  } else {
    win.loadFile(path.join(__dirname, '../dist/index.html'))
  }

  win.once('ready-to-show', () => win.show())
}

app.whenReady().then(createWindow)

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
