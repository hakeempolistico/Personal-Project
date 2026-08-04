const { app, BrowserWindow, ipcMain, Tray, Menu, nativeImage, Notification } = require('electron')
const path = require('path')
const log = require('electron-log')
const { setupIpcHandlers } = require('./ipc-handlers')

// Configure logging
log.transports.file.level = 'info'
log.transports.console.level = 'debug'
log.info('Application starting...')

// Global exception handlers
process.on('uncaughtException', (error) => {
  log.error('Uncaught Exception:', error)
})

process.on('unhandledRejection', (reason, promise) => {
  log.error('Unhandled Rejection at:', promise, 'reason:', reason)
})

let mainWindow = null
let tray = null

const isDev = !app.isPackaged

function createWindow() {
  log.info('Creating main window...')
  
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    title: 'MeetingTranscriber',
    backgroundColor: '#111827',
    webPreferences: {
      preload: path.join(__dirname, '../preload/preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: true
    }
  })

  // Load the app
  if (isDev) {
    mainWindow.loadURL('http://localhost:5173')
    mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadFile(path.join(__dirname, '../../dist/index.html'))
  }

  mainWindow.on('closed', () => {
    mainWindow = null
  })

  mainWindow.on('close', (event) => {
    if (!app.isQuitting) {
      event.preventDefault()
      mainWindow.hide()
    }
  })

  log.info('Main window created successfully')
}

function createTray() {
  // Create a simple tray icon
  const iconPath = path.join(__dirname, '../../assets/icon.png')
  let trayIcon
  
  try {
    trayIcon = nativeImage.createFromPath(iconPath)
  } catch (e) {
    // Create a simple colored icon if file doesn't exist
    trayIcon = nativeImage.createEmpty()
  }
  
  tray = new Tray(trayIcon.isEmpty() ? nativeImage.createFromDataURL('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAAGHSURBVFhH7ZY9TsNAEIW/SQoKKCg4AhQcgIoDQEFFwQFQUnEEFBwBR4CCgoLgCBQUFBT8gC4cA0Ls2En2euN4fW3Jeuz1Ov+M7O3sLCCE/AF4BHAF4I3sXgI8APiz8xDAHcC5s4q/BXj17QjAHcA1gLN/AuDW5xOAa78PANz4fATgxu8E4NqvAW79VgA+kvUVwB2AG78fAJ4BPJr1PYB7n08BPCr7O4B7AA9+3wI4t+srgAeAx34L4D5qXwE8+n0L4N6ubwHcK/t7gHu/h34L4J7sbwHcK/t7gDsAT34PATz5LQBcK/t7gHsAj34PATwB+EjaNwAuyP4WwD2AO78F8Kjs7wDcK/s7gDu/h34L4I7sbwDc+30L4N6ubwDcKvs7gDu/h34L4I7sbwDcK/s7gDu/h34L4I7sbwDcK/s7gDu/h34L4I7sbwDcK/s7gDu/h34L4I7sbwDcK/s7gDu/h34L4I7sbwDcK/s7gDu/h34L4I7sbwDc+30L4J6sA/hM1gHcK/s7gDu/h34L4I7sbwDcK/s7gDu/h34L4I7sbwDcK/t7gDsAj34PATwB+EjaNwAuyP4WwD2AO78F8Kjs7wDcK/s7gDu/h34L4M7n+wT+C8wT0q3X7AAAAABJRU5ErkJggg==') : trayIcon)
  
  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Show App',
      click: () => {
        mainWindow.show()
      }
    },
    {
      label: 'Start Recording',
      click: () => {
        mainWindow.webContents.send('tray-start-recording')
      }
    },
    {
      label: 'Stop Recording',
      click: () => {
        mainWindow.webContents.send('tray-stop-recording')
      }
    },
    { type: 'separator' },
    {
      label: 'Quit',
      click: () => {
        app.isQuitting = true
        app.quit()
      }
    }
  ])

  tray.setToolTip('MeetingTranscriber')
  tray.setContextMenu(contextMenu)
  
  tray.on('click', () => {
    mainWindow.show()
  })
}

function createAppMenu() {
  const template = [
    {
      label: 'MeetingTranscriber',
      submenu: [
        { role: 'about' },
        { type: 'separator' },
        { role: 'quit' }
      ]
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectall' }
      ]
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'toggledevtools' },
        { type: 'separator' },
        { role: 'resetzoom' },
        { role: 'zoomin' },
        { role: 'zoomout' },
        { type: 'separator' },
        { role: 'togglefullscreen' }
      ]
    },
    {
      label: 'Window',
      submenu: [
        { role: 'minimize' },
        { role: 'zoom' },
        { type: 'separator' },
        { role: 'close' }
      ]
    }
  ]

  const menu = Menu.buildFromTemplate(template)
  Menu.setApplicationMenu(menu)
}

app.whenReady().then(() => {
  log.info('App is ready, initializing...')
  
  createAppMenu()
  createWindow()
  createTray()
  
  // Setup IPC handlers
  setupIpcHandlers(ipcMain, mainWindow)
  
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    } else {
      mainWindow.show()
    }
  })
  
  log.info('Application initialized successfully')
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('before-quit', () => {
  app.isQuitting = true
})
