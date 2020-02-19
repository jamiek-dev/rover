const Electron = require('electron'),
      fs = require('fs'),
      path = require('path');

class Rover {
  constructor(directory) {
    if(directory) {
      this.directory = directory;
    }
  }

  /**
   * Set the target directory of the current Rover object
   * @param   string     directory      Target, system directory
   * @return  Void
   */
  setDirectory(directory) {
    this.directory = directory;
  }

  /**
   * Get the target directory of the current Rover object
   * @return  string     this.direcotry      The target, system directory
   */
  getDirectory() {
    return this.directory;
  }

  /**
   * Get the list of files in the current target directory. Exclude directories and hidden files
   * @return  string     --      Html list of files or a failed message notification
   */
  getFileList() {
    if(this.directory) {
      let dir = this.directory,
          fileString = [];

      // Get all of the files in the directory
      // -------------------------------------------------------------------------------
      let files = fs.readdirSync(dir);

      // Loop thorugh each file and only get non-hidden files
      // -------------------------------------------------------------------------------
      files.forEach(function(file, index) {
        let isHidden = (/(^|\/)\.[^\/\.]/g).test(file), // Might possibly have issues with Windows here
            isDirectory = fs.lstatSync(`${dir}/${file}`).isDirectory();

        // Also ignore directories
        if(!isDirectory && !isHidden) {
          fileString.push(file);
        }
      });

      return fileString;
    } else {
      return 'A directory hasn\'t been set';
    }
  }

  /**
   * Either actually rename files or generate a preview if it's a dry-run
   * @param   object     data          Object of control logic settings
   * @return  array      fileData      Array of HTML file names if it's a dry-run
   * @return  int        counter       Number of files that were updated if it's a legit run
   */
  maybeRenameFiles(data) {
    let dir = this.directory,
        files = fs.readdirSync(dir),
        counter = 0,
        fileNumber = 0,
        fileData = [];

    // Loop through and maybe update each file name
    // -------------------------------------------------------------------------------
    files.forEach(function(file, index) {
      let theFile = file,
          ext = path.extname(theFile),
          basename = path.basename(theFile, ext),
          needle = data.searchFor,
          replacement = data.replaceWith,
          newFileName,
          updatedFileName,
          newFileNameToTest;

      // Support Regex
      // -------------------------------------------------------------------------------
      if(data.regex) {
        let flags = '';

        // Build our flags string
        for(let i=0; i<data.regexFlags.length; i++) {
          flags += data.regexFlags[i];
        }

        // Define a new Regex instance
        let regex = new RegExp(needle, flags)

        updatedFileName = basename.replace(regex, replacement)
      } else {
        updatedFileName = basename.replace(needle, replacement);
      }


      // If the file name will be updated, do the thing. Otherwise just return a
      // grayed-out file name to indicate that it was ignored.
      // -------------------------------------------------------------------------------
      if(basename != updatedFileName) {
        counter++;

        // Append a file number if told to do so
        if(data.appendNumber) {
          fileNumber++;

          // Check if there needs to be a leading zero
          if(data.leadingZero) {
            updatedFileName += fileNumber < 10 ? '-' + '0' + fileNumber : '-' + fileNumber;
          } else {
            updatedFileName += '-' + fileNumber;
          }
        }

        // Update the file name and tack on the extension
        newFileNameToTest = updatedFileName + ext;

        // Check for duplicates and continue to add "copy" until it's no longer a duplicate
        if(fs.existsSync(newFileNameToTest)) {
          updatedFileName += '_copy';
          newFileNameToTest = updatedFileName + ext;

          while(fs.existsSync(newFileNameToTest)) {
            updatedFileName += ' copy';
            newFileNameToTest = updatedFileName + ext;
          }
        }

        // Create the new file name
        newFileName = theFile.replace(theFile, (updatedFileName + ext));

        // If a dry-run, then show the old file name vs the new
        if(data.dryRun) {
          fileData.push(`<span class="old-filename">${theFile}</span> -> <span class="new-filename">${newFileName}</span>`);
        } else {
          // If not a dry-run, then actually update the file name
          fs.renameSync(`${dir}/${theFile}`, `${dir}/${newFileName}`);
        }
      } else {
        if(data.dryRun) {
          fileData.push(`<span class="ignored-file">${theFile}</span>`);
        }
      }
    });

    // If it's a dry-run then return the preview of what will be changed. Otherwise,
    // return the number of files that were updated.
    // -------------------------------------------------------------------------------
    if(data.dryRun) {
      return fileData;
    } else {
      return counter;
    }
  }
}

module.exports = Rover;
