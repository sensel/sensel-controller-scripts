loadAPI(4);

// Remove this if you want to be able to use deprecated methods without causing script to stop.
// This is useful during development.
host.setShouldFailOnDeprecatedUse(true);

//for MP overlay:
var DEVICE_START_CC = 9;
var DEVICE_END_CC = 16;

//CCs used as buttons for function controls:
var FCN_START_CC = 112;
var FCN_END_CC = 119;

var NUM_TRACKS = 4;
var NUM_SENDS = 2;
var NUM_SCENES = 4;

host.defineController("Sensel", "Sensel Morph - Basic MPE", "0.1", "f47ebb13-8281-44d7-a44b-7ca7a6778bf4", "Peter Nyboer");
host.defineMidiPorts(1, 0);
host.setShouldFailOnDeprecatedUse(true);

if (host.platformIsWindows())
{
   // TODO: Set the correct names of the ports for auto detection on Windows platform here
   // and uncomment this when port names are correct.
   // host.addDeviceNameBasedDiscoveryPair(["Input Port 0"], ["Output Port 0", "Output Port -1"]);
}
else if (host.platformIsMac())
{
   // TODO: Set the correct names of the ports for auto detection on Mac OSX platform here
   // and uncomment this when port names are correct.
    //host.addDeviceNameBasedDiscoveryPair(["Sensel Morph"], ["Sensel Morph"]);
}
else if (host.platformIsLinux())
{
   // TODO: Set the correct names of the ports for auto detection on Linux platform here
   // and uncomment this when port names are correct.
   // host.addDeviceNameBasedDiscoveryPair(["Input Port 0"], ["Output Port 0", "Output Port -1"]);
}

function init() {
   transport = host.createTransport();
   host.getMidiInPort(0).setMidiCallback(onMidi0);
   host.getMidiInPort(0).setSysexCallback(onSysex0);
   noteInput = host.getMidiInPort(0).createNoteInput("", "??????");
   noteInput.setUseExpressiveMidi(true, 0, 24);
   noteInput.setShouldConsumeEvents(false);

   //observer for Clip overdub
   transport.isClipLauncherOverdubEnabled().markInterested();

   // Map CC 9 - 16 to device parameters
   cursorTrack = host.createCursorTrack(3, 0);
   cursorDevice = cursorTrack.createCursorDevice();
   remoteControls = cursorDevice.createCursorRemoteControlsPage(8);
   for ( var i = 0; i < 8; i++)
   {
     var p = remoteControls.getParameter(i).getAmount();
     p.setIndication(true);
     p.setLabel("P" + (i + 1));
   }

    //observe current track
    cursorTrack.position().markInterested();

  println("Sensel Morph MPE Extended script.");
}

function isInDeviceParametersRange(cc)
{  return cc >= DEVICE_START_CC && cc <= DEVICE_END_CC;
}

function isInFcnRange(cc)
{  return cc >= FCN_START_CC && cc <= FCN_END_CC;
}

// Called when a short MIDI message is received on MIDI input port 0.
function onMidi0(status, data1, data2) {
  if (isChannelController(status))
   {
     if (isInDeviceParametersRange(data1))
     {
       var index = data1 - DEVICE_START_CC;
       remoteControls.getParameter(index).getAmount().value().set(data2, 128);
     }
     //reserved for assigning top buttons CCs, and using for different functions
     else if (isInFcnRange(data1))
     {
       if(data1==FCN_START_CC){
         //implement a function
       }
       if(data1==(FCN_START_CC+1)){
         //implement a function
       }
       if(data1==(FCN_START_CC+2)){
         //implement a function
       }
       if(data1==(FCN_START_CC+3)){
         //implement a function
       }
       if(data1==(FCN_START_CC+4)){
         //implement a function
       }
       if(data1==(FCN_START_CC+5)){
         //implement a function
       }
       if(data1==(FCN_START_CC+6)){
         //implement a function
       }
       if(data1==(FCN_START_CC+7)){
         //implement a function
       }
     }
   }
}
// Called when a MIDI sysex message is received on MIDI input port 0.
function onSysex0(data) {
   // MMC Transport Controls:
   switch (data) {
      case "f07f7f0605f7":
         transport.rewind();
         break;
      case "f07f7f0604f7":
         transport.fastForward();
         break;
      case "f07f7f0601f7":
         transport.stop();
         break;
      case "f07f7f0602f7":
         transport.play();
         break;
      case "f07f7f0606f7":
         transport.record();
         break;
      //using MMC code for "record exit" on the "loop" button
      case "f07f7f0607f7":
         transport.isClipLauncherOverdubEnabled().toggle()
         break;
   }
}

function flush() {
   // TODO: Flush any output to your controller here.
}

function exit() {

}
