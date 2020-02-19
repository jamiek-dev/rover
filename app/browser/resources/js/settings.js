document.addEventListener('DOMContentLoaded', function() {
  const Electron = require('electron'),
        { ipcRenderer } = Electron,
        $body = document.querySelector('body'),
        $settingElements = document.querySelectorAll('.setting .checkbox')
        $themeSelector = document.querySelector('.setting #theme-selector');

  // Update the theme of the app
  // -------------------------------------------------------------------------------
  ipcRenderer.on('renderTheme', (e, theme) => {
    $body.setAttribute('class', theme == 'dark' ? '' : 'theme-' + theme);
  });
});
