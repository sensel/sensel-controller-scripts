loadAPI(2);
host.setShouldFailOnDeprecatedUse(true);

host.defineController("Sensel", "MP Overlay", "1.0", "7c74caf0-375b-11e7-9598-0800200c9a66");
host.defineMidiPorts(1, 0);
host.setShouldFailOnDeprecatedUse(true);

var LOWEST_CC = 1;
var HIGHEST_CC = 64;

//for MP overlay:
var DEVICE_START_CC = 9;
var DEVICE_END_CC = 16;

function init()
{
  host.getMidiInPort(0).setMidiCallback(onMidi);
  host.getMidiInPort(0).setSysexCallback(onSysex);
  generic = host.getMidiInPort(0).createNoteInput("", "??????");
  generic.setShouldConsumeEvents(false);

  transport = host.createTransport();

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

	// Make the rest freely mappable
	userControls = host.createUserControls(HIGHEST_CC - LOWEST_CC + 1 - 8);

	for ( var i = LOWEST_CC; i < HIGHEST_CC; i++)
	{
		if (!isInDeviceParametersRange(i))
		{
			var index = userIndexFromCC(i);
			userControls.getControl(index).setLabel("CC" + i);
		}
	}
}

function isInDeviceParametersRange(cc)
{
	return cc >= DEVICE_START_CC && cc <= DEVICE_END_CC;
}

function userIndexFromCC(cc)
{
	if (cc > DEVICE_END_CC)
	{
		return cc - LOWEST_CC - 8;
	}

	return cc - LOWEST_CC;
}

function onMidi(status, data1, data2)
{
	if (isChannelController(status))
	{
		if (isInDeviceParametersRange(data1))
		{
			var index = data1 - DEVICE_START_CC;
			remoteControls.getParameter(index).getAmount().value().set(data2, 128);
		}
		else if (data1 >= LOWEST_CC && data1 <= HIGHEST_CC)
		{
			var index = data1 - LOWEST_CC;
			userControls.getControl(index).value().set(data2, 128);
		}
	}
}

function onSysex(data) {
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
   }
}

function exit()
{
}
