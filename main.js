const Electron = require('electron'),
      { app, ipcMain, Menu } = Electron,
      OS = process.platform,
      ENV = process.env.NODE_ENV,
      AppWindow = require('./app/class-app-window'),
      Rover = require('./app/class-rover'),
      DataStore = require('./app/class-datastore');

let mainWindow,
    quitWindow,
    rover,
    showQuitPrompt = true;

// Create a new instance of the DataStore object
// -------------------------------------------------------------------------------
global.dataStore = new DataStore({
  // We'll call our data file 'user-preferences'
  configName: 'user-preferences',
  defaults: {
    // 1260x768 is the default size of our window
    windowBounds: {
      width: 1260,
      height: 768
    },
    windowPosition: {
      x: 0,
      y: 0
    }
  }
});

// Set the app name so hopefully when deployed "Electron" is changed to "Rover"
// -------------------------------------------------------------------------------
app.setName('Rover');

// Close the app completely if all windows are closed. We don't need to check if
// it's a Mac because it's a one window app.
// -------------------------------------------------------------------------------
app.on('window-all-closed', function(){
  app.quit();
});

// Wait for the app to load
// -------------------------------------------------------------------------------
app.on('ready', () => {
  let { width, height } = dataStore.get('windowBounds'),
      x,
      y;

  // Pre-set our window settings so we can attempt to add x and y to it before window creation
  let windowData = {
    width: width,
    height: height,
    title: 'Rover',
    // frame: false,
    icon: `file://${__dirname}/app/browser/resources/img/rover.icns`
  };

  // Attempt to add x and y to the main window settings
  if(dataStore.get('windowPosition')) {
    windowData.x = dataStore.get('windowPosition').x;
    windowData.y = dataStore.get('windowPosition').y;
  }

  // Create the application main process window
  mainWindow = new AppWindow(
    windowData,
    `file://${__dirname}/app/browser/ui/main.html`
  );

  // Create a new instance of the Rover object
  rover = new Rover({});

  // Prompt the user when they try to close the app using the browser bar
  mainWindow.on('close', (e) => {
    if(showQuitPrompt) {
      e.preventDefault();
      mainWindow.webContents.send('askToQuit');
    }
  });

  // The BrowserWindow class extends the node.js core EventEmitter class, so we use that API
  // to listen to events on the BrowserWindow. The resize event is emitted when the window size changes.
  mainWindow.on('resize', () => {
    // The event doesn't pass us the window size, so we call the `getBounds` method which returns an object with
    // the height, width, and x and y coordinates.
    let { width, height } = mainWindow.getBounds();
    // Now that we have them, save them using the `set` method.
    dataStore.set(
      'windowBounds',
      {
        width: width,
        height: height
      }
    );
  });

  // Save the window position for the user when they move it
  mainWindow.on('move', () => {
    // The event doesn't pass us the window size, so we call the `getBounds` method which returns an object with
    // the height, width, and x and y coordinates.
    let { x, y } = mainWindow.getBounds();
    // Now that we have them, save them using the `set` method.
    dataStore.set(
      'windowPosition',
      {
        x: x,
        y: y
      }
    );
  });

  // Set up the custom application menu.
  const mainMenu = Menu.buildFromTemplate(mainMenuTemplate);
  Menu.setApplicationMenu(mainMenu);
});

// Custom menu that's gross and should be in a separate file
// -------------------------------------------------------------------------------
const mainMenuTemplate = [
  {
    label: 'File',
    submenu: [
      {
        label: 'Quit',
        accelerator: OS == 'darwin' ? 'Command+Q' : 'Ctrl+Q',
        click() {
          // Check if the user wants a prompt before quitting
          if(dataStore.get('promptBeforeQuit') && dataStore.get('promptBeforeQuit') == true) {
            mainWindow.webContents.send('askToQuit');
          } else {
            app.quit();
          }
        }
      }
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
      { role: 'pasteandmatchstyle' },
      { role: 'delete' },
      { role: 'selectall' },
      { type: 'separator' },
      {
        label: 'Speech',
        submenu: [
          { role: 'startspeaking' },
          { role: 'stopspeaking' }
        ]
      }
    ]
  },
  {
    label: 'View',
    submenu: [
      { role: 'reload' },
      { role: 'forcereload' },
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
    label: 'Settings',
    submenu: [
      {
        label: 'Prompt Before Quit',
        type: 'checkbox',
        checked: dataStore.get('promptBeforeQuit') ? dataStore.get('promptBeforeQuit') : false,
        click() {
          if(dataStore.get('promptBeforeQuit')) {
            dataStore.set('promptBeforeQuit', dataStore.get('promptBeforeQuit') == true ? false : true);
          } else {
            dataStore.set('promptBeforeQuit', true);
          }
        }
      },
      {
        label: 'Theme',
        submenu: [
          {
            label: 'Dark',
            type: 'radio',
            checked: dataStore.get('theme') == 'dark' ? true : false,
            click() {
              dataStore.set('theme', 'dark');
              mainWindow.webContents.send('renderTheme', 'dark');
            }
          },
          {
            label: 'Light',
            type: 'radio',
            checked: dataStore.get('theme') == 'light' ? true : false,
            click() {
              dataStore.set('theme', 'light');
              mainWindow.webContents.send('renderTheme', 'light');
            }
          }
        ]
      }
    ]
  },
  {
    role: 'window',
    submenu: [
      { role: 'minimize' },
      { role: 'close' }
    ],
    submenu: [
      { role: 'close' },
      { role: 'minimize' },
      { role: 'zoom' },
      { type: 'separator' },
      { role: 'front' }
    ]
  },
  {
    role: 'help',
    submenu: [
      {
        label: 'Learn More About Electron',
        click () { require('electron').shell.openExternal('https://electronjs.org') }
      }
    ]
  }
];

// Quit the app if the user says yes
// -------------------------------------------------------------------------------
ipcMain.on('answerQuitRequest', (e, answer) => {
  if(answer) {
    showQuitPrompt = false;
    app.quit();
  }
});

// Close the app if told to do so
// -------------------------------------------------------------------------------
ipcMain.on('answerQuitRequest', (e, answer) => {
  if(answer) {
    app.quit();
  }
});

// Minimize the mainWindow
// -------------------------------------------------------------------------------
ipcMain.on('minimize', (e) =>  {
  mainWindow.minimize();
});

// Maximize the mainWindow
// -------------------------------------------------------------------------------
ipcMain.on('maximize', (e) =>  {
  if(mainWindow.isFullScreen()) {
    mainWindow.setFullScreen(false);
  } else {
    mainWindow.setFullScreen(true);
  }
});

// If on MAC, then add a first menu item so ours isn't hidden
// -------------------------------------------------------------------------------
if(OS == 'darwin') {
  mainMenuTemplate.unshift(
    {
      label: app.getName(),
      submenu: [
        { role: 'about' },
        { type: 'separator' },
        { role: 'services' },
        { type: 'separator' },
        { role: 'hide' },
        { role: 'hideothers' },
        { role: 'unhide' },
        { type: 'separator' },
        {
          label: 'Quit',
          accelerator: OS == 'darwin' ? 'Command+Q' : 'Ctrl+Q',
          click() {
            // Check if the user wants a prompt before quitting
            if(dataStore.get('promptBeforeQuit') && dataStore.get('promptBeforeQuit') == true) {
              mainWindow.webContents.send('askToQuit');
            } else {
              app.quit();
            }
          }
        }
      ]
    }
  );
}

// Get a directory from the renderer process and set the Rover object's target
// directory. Then, return the full file list to the renderer process.
// -------------------------------------------------------------------------------
ipcMain.on('shareDirectory', (e, directory) => {
  // Set the directory of the Rover object
  rover.setDirectory(directory);

  // Send the current directory file list to the renderer process
  mainWindow.webContents.send('shareDirectoryFileList', rover.getFileList());
});

// Get instructions from the renderer process and attempt to update the files.
// -------------------------------------------------------------------------------
ipcMain.on('sendSearchAndReplace', (e, data) => {
  let maybeUpdateFiles = rover.maybeRenameFiles(data);

  // Send results back to the renderer process. If it's a dry-run the just send back
  // a preview. If it's legit, then send back the new file list and a success message.
  if(data.dryRUn) {
    mainWindow.webContents.send('sendUpdateFileResults', maybeUpdateFiles);
  } else {
    mainWindow.webContents.send('shareDirectoryFileList', rover.getFileList());
    mainWindow.webContents.send('sendUpdateFileResults', maybeUpdateFiles);
  }
});
