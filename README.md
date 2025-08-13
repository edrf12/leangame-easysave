# Easy Save for Lean Game Server

This UserScript adds a save and load button to the games on the Lean Game Server (https://adam.math.hhu.de), allowing for easy GitHub synchronization of your progress.

## Installation

To install this you must have a User Script Manager in your browser, there are many but this script was created using [TamperMonkey](https://www.tampermonkey.net)

After you have installed the extension you may click the link below.

[Install](https://github.com/edrf12/leangame-easysave/raw/main/EasySaveLGS.user.js)

## Usage

Using this script is pretty simple, there are three functionalities: [Login](#login), [Save](#save) and [Load](#load).

### Login

- Open a game in the [Lean Game Server](https://adam.math.hhu.de);
- Click the Login button;
- You will be asked for the name of the repository you wish to save your progress to;
- A device code will be copied to your clipboard and will be shown on your screen, if you want you can make sure it is copied;
- Once the alert is closed a login window will be opened, enter the device code when prompted;
- When the Login button changes to Logout you are logged in.

### Save

- Go to the game's homepage;
- Click the save button;
- You will be asked for the commit message of this save;
- The script will let you know once the save has occured.

### Load

- Go to the game's homepage;
- Click the load button;
- Once the load is complete the page will reload.
