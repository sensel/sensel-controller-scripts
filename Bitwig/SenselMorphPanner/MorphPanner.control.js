
//const QUERYSURFACE = 'F0 7E 7F 06 01 F7';

//loadAPI(1);
//loadAPI(4);
loadAPI(5);
host.setShouldFailOnDeprecatedUse(false);

host.defineController("Sensel", "MorphPanner", "1.0", "a3c14cbc-269e-451f-bc84-65644a28a467");

var PRODUCT = "1";

//var LIVIDRESPONSE = "F0 7E ?? 06 02 00 01 61 01 00 "+PRODUCT+" 00 ?? ?? ?? ?? F7";
                     //F0 7E 00 06 02 00 01 61 01 00 10          00 05 00 01 00 F7
//host.defineSysexDiscovery("F0 7E 7F 06 01 F7", LIVIDRESPONSE);
host.defineMidiPorts(1, 1);
host.addDeviceNameBasedDiscoveryPair(["Sensel Morph"], ["Sensel Morph"]);
host.addDeviceNameBasedDiscoveryPair(["Sensel Morph"], ["Sensel Morph"]);


/*for ( var m = 1; m < 9; m++)
{
	host.addDeviceNameBasedDiscoveryPair(["Controls" + m + " (Morph)"], ["Controls" + m + " (Morph)"]);
}*/



var script = this;
var session;

var DEBUG = true;	//post() doesn't work without this
var VERSION = '1 .0';
var VERBOSE = false;



load("Prototypes.js");


function init()
{

	////////////////////////////////////////////////////////////////////////////////
	application = host.createApplication();
	cursorDevice = host.createCursorDevice();
	cursorTrack = host.createCursorTrack(8, 1);
	masterTrack = host.createMasterTrack(8);
	transport = host.createTransport();
	trackBank = host.createMainTrackBank(15, 8, 4);
	returnBank = host.createEffectTrackBank(8, 4);
	////////////////////////////////////////////////////////////////////////////////

	post('MorphPanner1 script loading ------------------------------------------------');

	host.getMidiInPort(0).setMidiCallback(onMidi);
	host.getMidiInPort(0).setSysexCallback(onSysex);
	initialize_noteInput();
	initialize_prototypes();
	initialize_surface();
	setup_controls();
	setup_mixer();
	resetAll();
	setup_tasks();
	setup_usermodes();
	setup_modes();
	setup_notifications();
	setup_listeners();
	setupTests();
	MainModes.change_mode(0, true);
	post('MorphPanner script loaded! ------------------------------------------------');
	notifier.show_message('MorphPanner Script version ' + VERSION +' loaded.');
}

function initialize_noteInput()
{
	noteInput = host.getMidiInPort(0).createNoteInput("Morph", "8?????", "9?????", "D?????", "E?????");
	noteInput.setShouldConsumeEvents(false);

}


function initialize_surface()
{

}


var MAIN_CHANNEL = 1;

function setup_controls()
{
	script['xslider'] = [];
	for (var i = 0; i<15; i++)
	{
		xslider[i] = new Slider(i*8, 'XSlider_'+i);
	}
	script['yslider'] = [];
	for (var i = 0; i<15; i++)
	{
		yslider[i] = new Slider((i*8)+1, 'YSlider_'+i);
	}
	script['zslider'] = [];
	for (var i = 0; i<15; i++)
	{
		zslider[i] = new Slider((i*8)+2, 'ZSlider_'+i);
	}
	post('setup_controls successful');
}


function setup_mixer()
{
	mixer = new MixerComponent('Mixer', 15, 8, trackBank, returnBank, cursorTrack, masterTrack);
	var panners = [];
	for(var i in mixer._channelstrips){
		mixer._channelstrips[i]._panner = new Panner('Panner_'+i, mixer._channelstrips[i]);
	}
}

function setup_notifications()
{
	notifier = new NotificationDisplayComponent();
}

function setup_tasks()
{
	tasks = new TaskServer(script, 100);
}

function setup_usermodes()
{
	// user1Input = host.getMidiInPort(0).createNoteInput("MorphUser1", "80????", "90????", "D0????", "E0????");
	// userbank1 = new UserBankComponent('UserBank1', 48, user1Input);
	// user1Input.setShouldConsumeEvents(false);
}

function setup_modes()
{


	//Page 0: Mute and Solos
	mainPage = new Page('MainPage');
	mainPage.enter_mode = function()
	{
		post('mainPage entered');
		mainPage.active = true;
		for(var i=0;i<15;i++){
			mixer.channelstrip(i)._panner._quadX.set_control(xslider[i]);
			mixer.channelstrip(i)._panner._quadY.set_control(yslider[i]);
		}
	}
	mainPage.exit_mode = function()
	{
		post('mainPage exited');
	}
	mainPage.update_mode = function()
	{
		post('mainPage updated');
		if(mainPage._shifted)
		{
			post('is_shifted');
		}
		else
		{
			mainPage.enter_mode();
		}
	}


	script["MainModes"] = new PageStack(1, "Main Modes");

	MainModes.add_mode(0, mainPage);
	//MainModes.set_mode_cycle_button(button[7]);

}

function setup_fixed_controls()
{
}

function setup_listeners()
{

}

function exit()
{
	//resetAll();
}

//instead of fixing the non-channelized nature of the hashtable implementation for the prototypes,
//we're going to just use an offset and use the existing hashtable.  This is a total hack.
//since we're only using CC's 10, 11, 12, we're going to address them in the hashtable as 0, 1, 2,
//and spread them by 8 inside the table.  So MPE touch 1 is 0, 1, 2, MPE touch 2 is 8, 9, 10, etc.
//this is also hacked in the corresponding create_controls() entry, but should be benign elsewhere.
function onMidi(status, data1, data2)
{
	//printMidi(status, data1, data2)
	if (isChannelController(status)) //&& MIDIChannel(status) == alias_channel)   //removing status check to include MasterFader
	{
		var chMult = (status-177)*8;
		//post('CC: ' + status + ' ' + data1 + ' ' + data2);
		if(data1==10){
			CC_OBJECTS[chMult].receive(data2);
			//post(CC_OBJECTS[chMult]._name + ' ' + data2);
		}
		else if(data1==11){
			CC_OBJECTS[chMult+1].receive(data2);
		}
		else if(data1==12){
			CC_OBJECTS[chMult+2].receive(data2);
		}
	}
	else if (isNoteOn(status)) //&& MIDIChannel(status) == alias_channel)
	{
		//post('NOTE: ' + status + ' ' + data1 + ' ' + data2);
		NOTE_OBJECTS[data1].receive(data2);
	}
	else if (isNoteOff(status)) //&& MIDIChannel(status) == alias_channel)
	{
		//post('NOTE: ' + status + ' ' + data1 + ' ' + data2);
		NOTE_OBJECTS[data1].receive(data2);
	}
}

function onSysex(data)
{
	//printSysex(data);
}

function display_mode(){}

function setupTests()
{
	//tasks.addTask(function(){post('dial[0]._value:', dial[0]._value);}, undefined, 1, true, 'dial_test');
}

function morphFlush()
{
	//tasks._run();
	//post('morphFlush')
	for(var type in midiBuffer)
	{
		var buf = midiBuffer[type];
		for(var index in buf)
		{
			var Event = buf[index];
			Event[0]._send(Event[1]);
		}
	}
	midiBuffer = {NONE_TYPE:{},CC_TYPE:{},NOTE_TYPE:{}};
	if(recalculate_translation_map)
	{
		post('recalculate_translation_map:');
		if(override_noteInput)
		{
			post('recalculate_translation_map: mode:', MainModes.current_mode());
			switch(MainModes.current_mode())
			{
				case 1:
					productionInput.setKeyTranslationTable(Note_Translation_Table);
					productionInput.setVelocityTranslationTable(Velocity_Translation_Table);
					break;
				case 2:
					keysInput.setKeyTranslationTable(Note_Translation_Table);
					keysInput.setVelocityTranslationTable(Velocity_Translation_Table);
					break;
				case 3:
					drumInput.setKeyTranslationTable(Note_Translation_Table);
					drumInput.setVelocityTranslationTable(Velocity_Translation_Table);
					break;
				case 4:
					thunderInput.setKeyTranslationTable(Note_Translation_Table);
					thunderInput.setVelocityTranslationTable(Velocity_Translation_Table);
					break;
			}
			recalculate_translation_map = false;
		}
		else
		{
			//post('Note_Translation_Table:', Note_Translation_Table, override_noteInput);
			noteInput.setKeyTranslationTable(Note_Translation_Table);
			noteInput.setVelocityTranslationTable(Velocity_Translation_Table);
			recalculate_translation_map = false;
		}
	}
}

//this function initializes all the prototype core processes.  It should be called during init().
function initialize_morph_prototypes()
{
	registerControlDicts();
	//tasks = new TaskServer(script, 100);
	//flash = new FlashTask();
	//tasks.addTask(flash.update, null, 1, true, 'Flash');
 	//host.scheduleTask(flush, null, 100);
	host.scheduleTask(doObject(this, morphFlush), 100);
}

function Panner(name, channelstrip){
	var self = this;
	this._name = name;
	this._channelstrip = channelstrip;
	this._quadX = new RangedParameter(this._name + '_QuadX', {range:128});
	this._quadY = new RangedParameter(this._name + '_QuadY', {range:128});

	this._update_quad_sends = function(){
		var x = (self._quadX._value/64) - 1;
		var y = (self._quadY._value/64) - 1;
		var a = clip(127 - clip(127 * -x) - clip (127 * -y));
		var b = clip(127 - clip(127 * x) - clip (127 * -y));
		var c = clip(127 - clip(127 * -x) - clip (127 * y));
		var d = clip(127 - clip(127 * x) - clip (127 * y));
		self._channelstrip._send[4]._Callback({_value:b});
		self._channelstrip._send[5]._Callback({_value:a});
		self._channelstrip._send[6]._Callback({_value:d});
		self._channelstrip._send[7]._Callback({_value:c});
		//post('vals:', a, b, c, d);
	}

	this._quadX.add_listener(this._update_quad_sends);
	this._quadY.add_listener(this._update_quad_sends);
}

function clip(i){
	return Math.max(0, Math.min(127, i));
}
