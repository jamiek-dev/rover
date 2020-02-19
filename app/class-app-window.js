const Electron = require('electron'),
      { BrowserWindow } = Electron;

class AppWindow extends BrowserWindow {
  constructor(options, fileToLoad, hideOnBlur) {
    super(options);

    // Load the file into the new window
    this.loadURL(fileToLoad);

    // Check if the window should hide on blur
    // The reason for calling .bind(this) is beacause we're telling the app that the functions
    // will be called sometime in the future. If we don't bind "this", then "this" will not be
    // defined when the function is called.
    let autoHide = hideOnBlur || false;
    if(autoHide) {
      this.on('blur', this.hideWindow.bind(this))
    }
  }

  // Hide the window
  hideWindow() {
    this.hide();
  }
}

module.exports = AppWindow;
