
//const QUERYSURFACE = 'F0 7E 7F 06 01 F7';

loadAPI(1);
 
host.defineController("Sensel", "Morph", "1.0", "6cb72762-5cb1-11e8-9c2d-fa7ae01bbebc");

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
var VERSION = '1.0';
var VERBOSE = false;

load("Prototypes.js");

function MorphDrumRackComponent(name, _color)
{
	var self = this;
	this._name = name;
	this.pad_color = !_color ? colors.WHITE : _color;
	if(!this.pad_color){this.pad_color = colors.BLUE;}
	this.width = function(){return  !this._grid ? 0 : this._grid.width();}
	this.height = function(){return !this._grid ? 0 : this._grid.height();}
	this._grid;
	this._last_pressed_button;
	this._held_notes = [];
	this._split_column = 4;
	this._update_request = false;
	var cursorTrack = host.createCursorTrackSection(0, 0);
	
	//var cursorDevice = host.createCursorDevice();
	this._drumPadBank = cursorDevice.createDrumPadBank(16);


	this._scrollPosition = new Parameter(this._name + '_Scroll_Position', {range:128});

	var monitorScroll = function(args)
	{
		post('drumPadBank.channelScrollPositionObserver', args);
	}
	
	//this._drumPadBank.addChannelScrollPositionObserver(this._scrollPosition.receive, -1);

	this._navUp = new ToggledParameter(this._name + '_NavUp', {num:0, javaObj:this._drumPadBank, action:'scrollChannelsPageUp'});
	this._navDn = new ToggledParameter(this._name + '_NavDown', {num:1, javaObj:this._drumPadBank, action:'scrollChannelsPageDown'});


	this._flushNotes = function()
	{
		//how the hell we gonna do this?
		if(self._update_request)
		{
			self._update();
		}
	}

	this._button_press = function(button)
	{
		if(button.pressed())
		{
			self._held_notes.unshift(button);
		}
		else
		{
			var item = self._held_notes.indexOf(button);
			if(item > -1)
			{
				self._held_notes.splice(item, 1);
				if(self._update_request){self._request_update();}
			}
		}
	}

	this._update = function()
	{
		post('morph drumrack update');
		self._update_request = false;
		if(self._grid instanceof Grid)
		
		{	
			var selected = self._stepsequencer && self._select._value ? self._stepsequencer.key_offset._value : -1;
			var select_only = self._select_only._value;
			var offset = self._noteOffset._value;
			var width = self.width();
			var height = self.height();
			var division = self._split_column;
			for(var column=0;column<width;column++)
			{
				for(var row=0;row<height;row++)
				{
					var x_val = width;
					var y_val = height;
					var note = (column%division) + (Math.abs(row-(height-1))*division) + offset + (Math.floor(column/division)*16);
					var button = self._grid.get_button(column, row);
					if(!select_only){button.set_translation(note%127);}
					else{button._translation = note%127}  //you slimy bastard....
				}
			}
		}
	}

	this._request_update = function()
	{
		self._update_request = true;
		if(!self._held_notes.length)
		{
			self._update();
		}
	}

	this._noteOffsetCallback = function(obj)
	{
		post('_noteOffsetCallback:', obj, obj._value);
		//self._flush_notes();
		//self._octaveOffset._value = obj._value;
		self._noteOffset._value = obj._value;
	}

	this._noteOffset = new OffsetComponent(this._name + '_Note_Offset', 0, 119, 36, this._request_update, colors.CYAN, colors.OFF, 4);
	//this._octaveOffset = new OffsetComponent(this._name + '_Note_Offset', 0, 119, 36, this._request_update, colors.YELLOW, colors.OFF, 16);

	this._noteOffset.add_listener(self._noteOffsetCallback);
	//this._octaveOffset.add_listener(self._noteOffsetCallback);

	//this._drumPadBank.addChannelScrollPositionObserver(this._noteOffsetCallback, -1);

	this._shift = new ToggledParameter(this._name + '_Shift');
	this._shift.add_listener(this._update);
	this._select = new ToggledParameter(this._name + '_Select', {value:1});
	this._select_only = new ToggledParameter(this._name + '_SelectOnly', {value:0});
}

MorphDrumRackComponent.prototype.assign_grid = function(grid)
{
	post('morph drumrack assign grid');
	if(this._grid instanceof Grid)
	{
		this._grid.clear_translations();
		this._grid.remove_listener(this._button_press);
	}
	//this._stepsequencer.assign_grid();
	this._grid = grid;
	if(this._grid instanceof Grid)
	{	
		this._grid.add_listener(this._button_press);
		if(!(this._last_pressed_button instanceof Button))
		{
			this._last_pressed_button = this._grid.get_button(0, this._grid.height()-1);
		}
	}
	post('about to update...');
	this._update();
}

MorphDrumRackComponent.prototype.set_verbose = function(val)
{
	val = val > 0;
	this._noteOffset._display_value = val;
	this._octaveOffset._display_value = val;
}


function init()
{

	////////////////////////////////////////////////////////////////////////////////
	application = host.createApplication();
	cursorDevice = host.createCursorDevice();
	cursorTrack = host.createCursorTrack(6, 1);
	masterTrack = host.createMasterTrack(8);
	transport = host.createTransport();
	trackBank = host.createMainTrackBank(8, 6, 4);
	returnBank = host.createEffectTrackBank(6, 4);
	////////////////////////////////////////////////////////////////////////////////
	
	post('Morph script loading ------------------------------------------------');

	host.getMidiInPort(0).setMidiCallback(onMidi);
	host.getMidiInPort(0).setSysexCallback(onSysex);
	initialize_noteInput();
	initialize_prototypes();
	initialize_surface();
	setup_controls();
	resetAll();
	setup_session();
	setup_mixer();
	setup_device();
	setup_drumrack();
	setup_scales();
	setup_transport();
	setup_tasks();
	setup_usermodes();
	setup_modes();
	setup_notifications();
	setup_listeners();
	setupTests();
	MainModes.change_mode(0, true);
	post('Morph script loaded! ------------------------------------------------');
	notifier.show_message('Morph Script version ' + VERSION +' loaded.');
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
var KEY_CHANNEL = 2;
var DRUM_TRANSLATION_CHANNEL = 9;
var USER_CHANNEL = 14;
var PIANO_CHANNEL = 3;
var MORPH_PADS = [[48, 49, 50, 51], [44, 45, 46, 47], [40, 41, 42, 43], [36, 37, 38, 39]];
var MORPH_KEYS = [60, 61, 62, 63, 64, 65, 66, 67, 68, 69, 70, 71, 72];
var MORPH_BUTTONS = [1, 2, 3, 4, 5, 6, 7, 8];
var MORPH_SLIDERS = [17, 18];
var MORPH_DIALS = [9, 10, 11, 12, 13, 14, 15, 16];
var MORPH_SEND_PRESSURE = [19, 20];
var PIANO_BUTTONS = [9, 10, 11, 12];
var PIANO_KEYS = [60, 61, 62, 63, 64, 65, 66, 67, 68, 69, 70, 71, 72, 73, 74, 75, 76, 77, 78, 79, 80, 81, 82, 83, 84];
//var CHANNELS = ['Ch. 2', 'Ch. 3', 'Ch. 4', 'Ch. 5', 'Ch. 6', 'Ch. 7', 'Ch. 8', 'Ch. 9', 'Ch. 10', 'Ch. 11', 'Ch. 12', 'Ch. 13', 'Ch. 14'];

function setup_controls()
{
	script['pad'] = [];
	script['grid'] = new Grid(4, 4, 'Grid');
	for ( var i = 0; i< 4; i++)
	{
		pad[i] = [];
		for (var j = 0; j< 4; j++)
		{
			pad[i][j] = new Button(MORPH_PADS[j][i], 'Pad_'+i+'_'+j);
			grid.add_control(i, j, pad[i][j]);
		}
	}
	script['button'] = [];
	for (var i = 0; i< 8; i++)
	{
		button[i] = new Button(MORPH_BUTTONS[i], 'Button_'+i);
	}
	script['key'] = [];
	script['keygrid'] = new Grid(13, 1, 'KeyGrid');
	for (var i = 0; i< 13;i++)
	{
		key[i] = new Button(MORPH_KEYS[i], 'Key_'+i);
		keygrid.add_control(i, 0, key[i]);
	}
	script['slider'] = [];
	for (var i = 0; i<2; i++)
	{
		slider[i] = new Slider(MORPH_SLIDERS[i], 'Slider_'+i);
	}
	script['dial'] = [];
	for (var i = 0; i < 8; i++)
	{
		dial[i] = new Slider(MORPH_DIALS[i], 'Dial_'+i);
	}
	script['pressure'] = [];
	for (var i = 0; i < 2; i++)
	{
		pressure[i] = new PadPressure(MORPH_SEND_PRESSURE[i], 'Pressure_'+i);
	}
	post('setup_controls successful');
}

function setup_session()
{
	session = new SessionComponent('Session', 4, 4, trackBank);
}

function setup_mixer()
{
	mixer = new MixerComponent('Mixer', 4, 4, trackBank, returnBank, cursorTrack, masterTrack);
}

function setup_device()
{
	device = new DeviceComponent('Device', 8, cursorDevice);
	device._mode.set_value(0);
}

function setup_drumrack()
{
	drumrack = new MorphDrumRackComponent('DrumRack');
	post('drumrack offset:', drumrack._noteOffset._value);
}

function setup_scales()
{
	scales = new MorphScaleComponent('Scales');
	post('scalse offset:', scales._noteOffset._value);
}


function setup_transport()
{
	transport = new TransportComponent('Transport', host.createTransport());
}

function setup_notifications()
{
	notifier = new NotificationDisplayComponent();
	notifier.add_subject(mixer._selectedstrip._track_name, 'Selected Track', undefined, 8, 'Main');
	notifier.add_subject(device._device_name, 'Device', undefined, 6, 'Device');
	notifier.add_subject(device._bank_name, 'Bank', undefined, 6, 'Device');
	notifier.add_subject(drumrack._noteOffset, 'DrumOffset', undefined, 6, 'Main');
	notifier.add_subject(MainModes, 'Mode', ['Main', 'Shift'], 2);
}

function setup_tasks()
{
	tasks = new TaskServer(script, 100);
}

function setup_usermodes()
{
	user1Input = host.getMidiInPort(0).createNoteInput("MorphUser1", "80????", "90????", "D0????", "E0????");
	userbank1 = new UserBankComponent('UserBank1', 48, user1Input);
	user1Input.setShouldConsumeEvents(false);
}

function setup_modes()
{


	//Page 0: Mute and Solos
	mainPage = new Page('MainPage');
	mainPage.enter_mode = function()
	{
		post('mainPage entered');
		//mainPage.set_shift_button(button[7]);
		mixer.set_nav_controls(button[0], button[1]);
		mixer.selectedstrip()._send[0].set_control(pressure[0]);
		mixer.selectedstrip()._send[1].set_control(pressure[1]);
		device.set_shared_controls(dial);
		transport._stop.set_control(button[5]);
		transport._play.set_control(button[4]);
		transport._record.set_control(button[6]);
		drumrack.assign_grid(grid);
		scales.assign_grid(keygrid);
		mainPage.active = true;
	}
	mainPage.exit_mode = function()
	{
		drumrack.assign_grid();
		scales.assign_grid();
		mixer.set_nav_controls();
		mixer.selectedstrip()._send[0].set_control();
		mixer.selectedstrip()._send[1].set_control();
		device.set_parameter_controls();
		transport._stop.set_control();
		transport._play.set_control();
		transport._record.set_control();
		post('mainPage exited');
	}
	mainPage.update_mode = function()
	{
		post('mainPage updated');
		if(mainPage._shifted)
		{
			post('is_shifted');
			drumrack.assign_grid();
			scales.assign_grid();
			//mainPage.set_shift_button(button[7]);
			mixer.selectedstrip()._send[0].set_control();
			mixer.selectedstrip()._send[1].set_control();
			session.assign_grid(grid);
			session._navLt.set_control(button[0]);
			session._navRt.set_control(button[1]);
			drumrack._noteOffset.set_inc_dec_buttons(key[1], key[0]);
			scales._noteOffset.set_inc_dec_buttons(key[12], key[11]);
		}
		else
		{
			drumrack._noteOffset.set_inc_dec_buttons();
			scales._noteOffset.set_inc_dec_buttons();
			session._navLt.set_control();
			session._navRt.set_control();
			session.assign_grid();
			mainPage.enter_mode();
		}
	}

	//Page 1: altPage
	altPage = new Page('altPage');
	altPage.enter_mode = function()
	{
		post('altPage entered');
		altPage.active = true;
	}
	altPage.exit_mode = function()
	{
		altPage.active = false;
		post('altPage exited');
	}
	altPage.update_mode = function()
	{
		post('altPage updated');
		if(altPage._shifted)
		{
		}
		else
		{
			altPage.enter_mode();
		}
	}

	script["MainModes"] = new PageStack(2, "Main Modes");
	mainPage.set_shift_button(button[7]);

	MainModes.add_mode(0, mainPage);
	MainModes.add_mode(1, altPage);
	//MainModes.set_mode_cycle_button(button[7]);

}

function change_channel(num)
{
	//post('channel is:', num);
	ds1_channel = num;
	for(var i in NOTE_OBJECTS)
	{
		NOTE_OBJECTS[i]._channel = num;
	}
	for(var i in CC_OBJECTS)
	{
		CC_OBJECTS[i]._channel = num;
	}
}

function setup_fixed_controls()
{
}

function setup_listeners()
{
	//key[0].add_listener(function(obj){post('key[0]._value:', obj._value);});
}

function exit()
{
	//resetAll();
}


function onMidi(status, data1, data2)
{
	//printMidi(status, data1, data2)
	if (isChannelController(status)) //&& MIDIChannel(status) == alias_channel)   //removing status check to include MasterFader
	{
		//post('CC: ' + status + ' ' + data1 + ' ' + data2, CC_OBJECTS[data1]._name);
		CC_OBJECTS[data1].receive(data2);
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



/////////////////////////////////////////////////////////////////////////////
//Container that holds a grid and assigns it to specific note values for triggering an Instrument

function MorphScaleComponent(name, _colors)
{
	var self = this;
	this._name = name;
	this.pad_color = _colors;
	if(!this.pad_colors){this.pad_color = KEYCOLORS;}
	this.width = function(){return  !this._grid ? 0 : this._grid.width();}
	this.height = function(){return !this._grid ? 0 : this._grid.height();}
	this._grid;
	this._last_pressed_button;
	this._held_notes = [];
	this._update_request = true;
	var cursorTrack = host.createCursorTrackSection(0, 0);

	this._flushNotes = function()
	{
		//how the hell we gonna do this?
		if(self._update_request)
		{
			self._update();
		}
	}

	this._button_press = function(button)
	{
		if(button.pressed())
		{
			self._held_notes.unshift(button);
		}
		else
		{
			var item = self._held_notes.indexOf(button);
			if(item > -1)
			{
				self._held_notes.splice(item, 1);
				if(self._update_request){self._request_update();}
			}
		}
	}

	this._update = function()
	{
		self._update_request = false;
		if(self._grid instanceof Grid)
		{
			var keyoffset = -1;
			var selected = self._stepsequencer && self._select._value ? self._stepsequencer.key_offset._value : -1;
			var select_only = self._select_only._value;
			var width = self.width();
			var height = self.height();
			var offset = self._noteOffset._value;
			var vertoffset = self._vertOffset._value;
			var scale = SCALENAMES[self._scaleOffset._value];
			self._current_scale = scale;
			var scale_len = SCALES[scale].length;
			for(var column=0;column<width;column++)
			{
				for(var row=0;row<height;row++)
				{
					var note_pos = column + (Math.abs((height-1)-row))*parseInt(vertoffset);
					var note = offset + SCALES[scale][note_pos%scale_len] + (12*Math.floor(note_pos/scale_len));
					var button = self._grid.get_button(column, row);
					if(!select_only){button.set_translation(note%127);}
					else{button._translation = note%127}  //you slimy bastard....
				}
			}
		}
	}

	this._request_update = function()
	{
		self._update_request = true;
		if(!self._held_notes.length)
		{
			self._update();
		}
	}

	this._noteOffsetCallback = function(obj)
	{
		//self._flushNotes();
		self._octaveOffset._value = obj._value;
		self._noteOffset._value = obj._value;
	}

	this._vertOffset = new OffsetComponent(this._name + '_Vertical_Offset', 0, 119, 4, self._request_update, colors.MAGENTA);
	this._scaleOffset = new OffsetComponent(this._name + '_Scale_Offset', 0, SCALES.length, 3, self._request_update, colors.BLUE);
	this._noteOffset = new OffsetComponent(this._name + '_Note_Offset', 0, 119, 36, self._request_update, colors.CYAN, colors.OFF, 12);
	this._octaveOffset = new OffsetComponent(this._name + '_Note_Offset', 0, 119, 36, self._request_update, colors.YELLOW, colors.OFF, 12);


	this._noteOffset.add_listener(self._noteOffsetCallback);
	this._octaveOffset.add_listener(self._noteOffsetCallback);

	this._shift = new ToggledParameter(this._name + '_Shift');
	this._shift.add_listener(this._update);
	this._select = new ToggledParameter(this._name + '_Select', {value:1});
	this._select_only = new ToggledParameter(this._name + '_SelectOnly', {value:0});

}

MorphScaleComponent.prototype.assign_grid = function(grid)
{
	//post('scalecomponent assign grid');
	if(this._grid instanceof Grid)
	{
		this._grid.clear_translations();
		this._grid.remove_listener(this._button_press);
	}
	this._grid = grid;
	if(this._grid instanceof Grid)
	{
		this._grid.add_listener(this._button_press);
		if(!(this._last_pressed_button instanceof Button))
		{
			this._last_pressed_button = this._grid.get_button(0, this._grid.height()-1);
		}
	}
	this._update();
}

MorphScaleComponent.prototype.set_verbose = function(val)
{
	val = val > 0;
	this._vertOffset._display_value = val;
	this._scaleOffset._display_value = val;
	this._noteOffset._display_value = val;
	this._octaveOffset._display_value = val;
}



