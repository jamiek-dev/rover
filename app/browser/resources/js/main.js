document.addEventListener('DOMContentLoaded', function() {
  const Electron = require('electron'),
        { ipcRenderer, remote } = Electron,
        { dialog } = remote,
        DataStore = require('../../class-datastore'),
        fs = require('fs'),
        $getDirBtn = document.querySelector('#get-directory-btn'),
        $setDirBtn = document.querySelector('#set-directory-btn'),
        $dirField = document.querySelector('#directory'),
        $selectedDirectory = document.querySelector('#selected-directory'),
        $fileListHolder = document.querySelector('#file-list'),
        $searchFor = document.querySelector('#search-for'),
        $replaceWith = document.querySelector('#replace-with'),
        $replaceBtn = document.querySelector('#replace-btn'),
        $resultMessage = document.querySelector('#result-message'),
        $modeContainer = document.querySelector('#mode'),
        $modeToggle = document.querySelector('#mode-toggle'),
        $modifiers = document.querySelectorAll('.modifier'),
        $regexFlags = document.querySelector('#regex-flags'),
        $checkboxes = document.querySelectorAll('#regex-flags > div, .setting'),
        $closeSettings = document.querySelector('#close-settings'),
        $funTidbit = document.querySelector('#fun-tidbit p'),
        funTidbits = [
          'When you look into the night sky, you are looking back in time',
          'There\'s a giant cloud of alcohol in Sagittarius B',
          'It takes 225 million years for our Sun to travel round the galaxy',
          'Our solar system\'s biggest mountain is on Mars',
          'A year on Venus is shorter than its day',
          'Neutron stars are the fastest spinning objects known in the universe',
          'The Hubble telescope allows us to look back billions of years into the past',
          'A spoonful of a neutron star weighs about a billion tons',
          'The Voyager 1 spacecraft is the most distant human-made object from Earth',
          'Scientists are looking for evidence of extraterrestrial life on Earth',
          'It is estimated there are 400 billion stars in our galaxy',
          'There could be 500 million planets capable of supporting life in our galaxy',
          'There are probably more than 170 billion galaxies in the observable universe',
          'The human brain is the most complex object in the known universe',
          'We are all made of stardust',
          'One Million Earths Could Fit Inside The Sun',
          'A space suit costs $12,000,000',
          'Space smells like seared steak, hot metal and welding fumes'
        ];

  // Randomly load in a fun tidbit when the app loads
  // -------------------------------------------------------------------------------
  let rand = Math.floor(Math.random() * (funTidbits.length - 1));
  $funTidbit.innerHTML = funTidbits[rand];

  // Create a new instance of the DataStore object. We don't need to set defaults
  // because we won't be doing any setting from the renderer process. Just getting
  // -------------------------------------------------------------------------------
  const dataStore = remote.getGlobal('dataStore');

  // If promptBeforeQuit is set then set it to active in settings on load
  // -------------------------------------------------------------------------------
  if(dataStore.get('promptBeforeQuit')) {
    let promptBeforeQuitSetting = document.querySelector('[data-setting="promptBeforeQuit"]');

    if(dataStore.get('promptBeforeQuit') == true) {
      promptBeforeQuitSetting.parentNode.classList.add('active');
    }
  }

  /**
   * Clear the list of files on the screen
   * @param   Object     listItems      DOM elements to target and remove
   * @return  Void
   */
  function clearFileList(listItems) {
    // Clear the file list to prep for new list elements
    for(i=0; i<listItems.length; i++) {
      listItems[i].remove();
    }
  }

  /**
   * Show a default confirmation message for quitting the application and send
   * the answer to the main process
   * @return  Void
   */
  function promptForQuit() {
    let answer = confirm('Are you sure you want to quit?');
    ipcRenderer.send('answerQuitRequest', answer);
  }

  // Add an event to the directory select button. Display the selected direcotries
  // full path to the user.
  // -------------------------------------------------------------------------------
  $getDirBtn.addEventListener('click', () => {
    let directoryList = dialog.showOpenDialog({properties: ['openDirectory']}),
        directory = directoryList ? directoryList[0] : '';

    $resultMessage.innerHTML = '';

    // Display the target directory
    $selectedDirectory.value = directory;
  });

  // Send the target directory over to Electron and set it in the Rover object
  // -------------------------------------------------------------------------------
  $setDirBtn.addEventListener('click', () => {
    $resultMessage.innerHTML = '';

    ipcRenderer.send('shareDirectory', $selectedDirectory.value);
  });

  // When the main process returns a file list, display it
  // -------------------------------------------------------------------------------
  ipcRenderer.on('shareDirectoryFileList', (e, fileList) => {
    let listItems = document.querySelectorAll('#file-list li');

    clearFileList(listItems);

    // Append the new list items
    if(Array.isArray(fileList)) {
      fileList.forEach(function(file, index) {
        let li = document.createElement('li');

        li.appendChild(document.createTextNode(file));
        $fileListHolder.appendChild(li)
      });

      // If things are good, then enable all buttons/fields. Otherwise, disable buttons/fields
      // until the user selects a valid directory.
      $searchFor.removeAttribute('disabled');
      $replaceWith.removeAttribute('disabled');
      $replaceBtn.removeAttribute('disabled');
    } else {
      $resultMessage.setAttribute('class', 'error');
      $resultMessage.innerHTML = fileList;
      $searchFor.setAttribute('disabled', true);
      $replaceWith.setAttribute('disabled', true);
      $replaceBtn.setAttribute('disabled', true);
    }
  });

  // Add event to the "Execute" button to send all instructions over to the main
  // process; Electron.
  // -------------------------------------------------------------------------------
  $replaceBtn.addEventListener('click', () => {
    let flags = [];

    // Add the regex case-insensitive flag
    if(document.querySelector('#case-insensitive').classList.contains('active')) {
      flags.push('i');
    }

    // Add the regex global flag
    if(document.querySelector('#global').classList.contains('active')) {
      flags.push('g');
    }

    // Setup settings data for Rover to process
    let data = {
      dryRun: $modeToggle.classList.contains('legit') ? false : true,
      regex: document.querySelector('#regex').classList.contains('active') ? true : false,
      appendNumber: document.querySelector('#numbers').classList.contains('active') ? true : false,
      leadingZero: document.querySelector('#zero-index').classList.contains('active') ? true : false,
      regexFlags: flags,
      searchFor: $searchFor.value,
      replaceWith: $replaceWith.value ? $replaceWith.value : ''
    }

    // Clear out the result text in preparation for a new message
    $resultMessage.innerHTML = '';

    // Send all data to the main process so it can pass it to Rover
    ipcRenderer.send('sendSearchAndReplace', data);
  });

  // Receive the main process results and display everything to the user
  // -------------------------------------------------------------------------------
  ipcRenderer.on('sendUpdateFileResults', (e, fileData) => {
    // If an array is returned then we know it was a dry-run. FI actually
    // updating, then display the success message
    if(Array.isArray(fileData)) {
      let listItems = document.querySelectorAll('#file-list li');

      clearFileList(listItems);

      // Append the new list items
      fileData.forEach(function(file, index) {
        let li = document.createElement('li');

        li.innerHTML = file;
        $fileListHolder.appendChild(li)
      });
    } else {
      let fileWord = fileData == 1 ? 'file was' : 'files were';

      $resultMessage.setAttribute('class', 'success');
      $resultMessage.innerHTML = `${fileData} ${fileWord} updated`;
    }
  });

  // When trying to quit from the main process, ask the user if they really want to
  // and send an answer back to the main process.
  // -------------------------------------------------------------------------------
  ipcRenderer.on('askToQuit', (e) => {
    // Check if the user wants a prompt before quitting
    if(dataStore.get('promptBeforeQuit') && dataStore.get('promptBeforeQuit') == true) {
      promptForQuit();
    } else {
      ipcRenderer.send('answerQuitRequest', true);
    }
  });

  // Toggle the app between Dry-Run or Legit mode
  // -------------------------------------------------------------------------------
  $modeToggle.addEventListener('click', function() {
    if(this.classList.contains('legit')) {
      this.classList.remove('legit');
      $modeContainer.classList.remove('legit');
      $modeContainer.querySelector('span').innerHTML = 'Dry-Run';
      $modeContainer.querySelector('span').setAttribute('class', '');
    } else {
      this.classList.add('legit');
      $modeContainer.classList.add('legit');
      $modeContainer.querySelector('span').innerHTML = 'Legit';
      $modeContainer.querySelector('span').setAttribute('class', 'legit');
    }
  });

  // Add event listeners to all modifier buttons
  // -------------------------------------------------------------------------------
  for(let i=0; i<$modifiers.length; i++) {
    $modifiers[i].addEventListener('click', function() {
      // If the modifier is already active, make it inactive. Otherwise make it active.
      if(this.classList.contains('active')) {
        this.classList.remove('active');

        // If deactivating the regex modifier, then hide the flag options
        if(this.id == 'regex') {
          $regexFlags.setAttribute('class', '');
        }

        // If deactivating the numbers option, then deactivate the zero-index option
        if(this.id == 'numbers') {
          document.querySelector('#zero-index').classList.remove('active');
        }
      } else {
        this.classList.add('active');

        // If activating the regex modifier, then show the flag options
        if(this.id == 'regex') {
          $regexFlags.setAttribute('class', 'active');
        }

        // If activating the zero-index option, then activate the numbers option
        if(this.id == 'zero-index') {
          document.querySelector('#numbers').classList.add('active');
        }
      }
    });
  }

  // Toggle the regex flags checkboxes when clicked
  // -------------------------------------------------------------------------------
  for(let i=0; i<$checkboxes.length; i++) {
    $checkboxes[i].addEventListener('click', function() {
      if(this.classList.contains('active')) {
        this.classList.remove('active');
      } else {
        this.classList.add('active');
      }
    });
  }

  // Main Process Window Functionality
  // -------------------------------------------------------------------------------
  if(document.querySelector('body#main')) {
    var inputControls = document.querySelectorAll('.input-control');

    // Only enable the Replace button if the "What to Find" field has data
    for(var i=0; i<inputControls.length; i++) {
      inputControls[i].addEventListener('input', function() {
        if($searchFor.value) {
          $replaceBtn.removeAttribute('disabled');
        } else {
          $replaceBtn.setAttribute('disabled', true);
        }
      });
    }
  }
});
