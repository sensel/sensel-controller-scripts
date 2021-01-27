# Sensel Controller Scripts

Scripts to be used in Music Software to extend functionality and provide auto mapping. You can download the current files of this repository either by pulling this repo from a github client or just [downloading the zip.](https://github.com/sensel/sensel-controller-scripts/archive/master.zip)

## Ableton
A complete script for Ableton Live. Learn more in our [guide](http://guide.sensel.com/morph_software/#ableton-live-control-surface)

* Guides - images that describe how to use all the buttons and controls on the Music Overlays.
* Installer - installer files for Mac and Windows.
* Overlays - Use the SenselApp to load these maps on the Morph. Modifies MIDI out to work with the Ableton script.
* Project - A sample project with some great sound content to get to know the workflow.
* Sensel_Morph - The python files installed into Live to make the control surface script work.

### Manual Install
The Installer directory in the repo has Mac and Windows Installers. If you need to install manually:
In Live 10.1.13 and above
* Manually create a folder called “Remote Scripts” within your User Library. Default path is:
  * Windows: \Users\[username]\Documents\Ableton\User Library
  * Mac: Macintosh HD/Users/[username]/Music/Ableton/User Library
* Place the `Sensel_Morph` remote script folder from this repo's `Abelton` directory into the "Remote Scripts" folder you just created.
* Use the [SenselApp](https://sensel.com/pages/support/#downloads) to flash the .senselmap files found in this repo's `Overlays` directory to the Morph.

## Ableton Live 11 MPE
A complete script for Live 11, with MPE support. This has very different maps from the Ableton Live 10 script. The scripts and maps are not interchangeable.
This is a first beta release, and the mappings may change! The functions are extremely similar to the Bitwig scripts - you can refer to the guides in the Bitwig folder for now.

Preset 8 can be used with the Sarah Belle Reid Sound Worlds preset Pack. Preset 9 can be used with sonicLAB Fundamental.

## Bitwig
A complete script for Bitwig Studio. Learn more in our [guide](http://guide.sensel.com/morph_software/#bitwig-studio-control-surface)

* Guides - images that describe how to use all the buttons and controls on the Music Overlays.
* Overlays - Use the SenselApp to load these maps on the Morph. Modifies MIDI out to work with the Bitwig script. There are MPE and regular MIDI maps in here.
* SenselMorph - The javascript files used by Bitwig to make the control surface script work.
* TestScripts - Original, basic scripts.

### Manual Install
The Installer directory in the repo has Mac and Windows Installers. If you need to install manually:
* Navigate to your user folder: 
  * Windows: Documents\Bitwig Studio\Controller Scripts
  * Mac: Documents/Bitwig Studio/Controller Scripts/
  * Linux: Documents/Bitwig Studio/Controller Scripts/
* Place the `SenselMorph` remote script folder from this repo's `Bitwig` directory into this Controller Scripts directory
* Use the [SenselApp](https://sensel.com/pages/support/#downloads) to flash the .senselmap files found in this repo's Overlays directory to the Morph.
* Run Bitwig Studio
