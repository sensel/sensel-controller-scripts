// 0718 amounra : http://www.aumhaa.com
var VERSION = "1.1.4";

loadAPI(7);
host.setShouldFailOnDeprecatedUse(false);

host.defineController("Sensel", "MorphMPE", VERSION, "aa49a7eb-d170-4b07-8a75-257278da7ca8");
host.defineMidiPorts(1, 1);

if (host.platformIsWindows())
	host.addDeviceNameBasedDiscoveryPair(["Sensel MIDI"], ["Sensel MIDI"]);
else if (host.platformIsMac())
	host.addDeviceNameBasedDiscoveryPair(["Sensel Morph"], ["Sensel Morph"]);
else if (host.platformIsLinux())
	host.addDeviceNameBasedDiscoveryPair(["Sensel Morph MIDI 1"], ["Sensel Morph MIDI 1"]);


/*for ( var m = 1; m < 9; m++)
{
	host.addDeviceNameBasedDiscoveryPair(["Controls" + m + " (Morph)"], ["Controls" + m + " (Morph)"]);
}*/


var script = this;
var session;

var DEBUG = false;	//post() doesn't work without this
var VERBOSE = false;
var MPE_BEND_RANGE = 48;

var CHECK_MAPS =          "F0 00 02 1D 00 70 03 01 45 00 20 00 00 00 00 00 00 00 00 F7";
var MAGNET_VALUES_CALL =  "F0 00 02 1D 00 70 03 01 72 02 F7";
var PIANO_OVERLAY = 			"F0 00 02 1D 00 03 00 00 01 01 F7";
var PRODUCTION_OVERLAY = 	"F0 00 02 1D 00 04 00 00 01 01 F7";
var DRUM_OVERLAY = 				"F0 00 02 1D 00 05 00 00 01 01 F7";
var THUNDER_OVERLAY = 		"F0 00 02 1D 00 10 00 00 01 01 F7";
var NO_OVERLAY = 					"F0 00 02 1D 00 0E 00 00 01 01 F7";
var INNOVATOR_OVERLAY = 	"F0 00 02 1D 00 0F 00 00 01 01 F7";

var override_noteInput = false;


var ALLOFFMAP = [];
for(var i = 0;i<128;i++){
	ALLOFFMAP.push(-1);
}




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

	//this._noteOffset._scroll_hold = false;

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
					//post('setting scale trans:', button._name, button._translation)
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
		//self._flushNotes();
		//self._octaveOffset._value = obj._value;
		self._noteOffset._value = obj._value;
	}

	this._vertOffset = new OffsetComponent(this._name + '_Vertical_Offset', 0, 119, 4, self._request_update, colors.MAGENTA);
	this._scaleOffset = new OffsetComponent(this._name + '_Scale_Offset', 0, SCALES.length, 3, self._request_update, colors.BLUE);
	this._noteOffset = new OffsetComponent(this._name + '_Note_Offset', 0, 108, 60, self._request_update, colors.CYAN, colors.OFF, 12);
	//this._octaveOffset = new OffsetComponent(this._name + '_Note_Offset', 0, 108, 36, self._request_update, colors.YELLOW, colors.OFF, 12);
	//this._octaveOffset._scroll_hold = false;
	//this._noteOffset._scroll_hold = false;

	this._noteOffset.add_listener(self._noteOffsetCallback);
	//this._octaveOffset.add_listener(self._noteOffsetCallback);

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


function MorphDeviceComponent(name, size, Device)
{
	var self = this;
	this._name = name;
	this._size = size;
	this._device = Device;
	this._remote_controls = Device.createCursorRemoteControlsPage(size);
	//this._shared_controls = [];
	//this._macro_controls = [];
	this._parameter_controls = [];
	this._parameter = [];
	this._macro = [];
	for(var i=0;i<size;i++)
	{
		this._parameter[i] = new RangedParameter(this._name + '_Parameter_' + i, {num:i, javaObj:this._remote_controls.getParameter(i), range:128});
		/*this._parameter[i]._javaObj.setIndication(true);
		this._parameter[i].displayed_name = new Parameter('Parameter_' + i, {num:i, javaObj:this._device.getParameter(i)});
		this._parameter[i].displayed_name._javaObj.addNameObserver(10, 'None', this._parameter[i].displayed_name.receive);
		this._parameter[i].displayed_value = new Parameter('Value_'+i, {num:i, javaObj:this._device.getParameter(i)});
		this._parameter[i].displayed_value._javaObj.addValueDisplayObserver(10, 'None', this._parameter[i].displayed_value.receive);*/
		//this._macro[i] = new RangedParameter(this._name + '_Macro_' + i, {num:i, javaObj:this._device.getMacro(i).getAmount(), range:128});
	}

	/*this._navUp = new Parameter(this._name + '_NavUp', {num:0, value:1, javaObj:this._device, action:'nextParameterPage', monitor:'addNextParameterPageEnabledObserver', onValue:colors.CYAN});
	this._navDn = new Parameter(this._name + '_NavDown', {num:1, value:1, javaObj:this._device, action:'previousParameterPage', monitor:'addPreviousParameterPageEnabledObserver', onValue:colors.CYAN});
	this._navLt = new Parameter(this._name + '_NavLeft', {num:2, value:1, javaObj:this._device, action:'selectNext', monitor:'addCanSelectNextObserver', onValue:colors.BLUE});
	this._navRt = new Parameter(this._name + '_NavRight', {num:3, value:1, javaObj:this._device, action:'selectPrevious', monitor:'addCanSelectPreviousObserver', onValue:colors.BLUE});
	this._enabled = new ToggledParameter(this._name + '_Enabled', {javaObj:this._device, action:'toggleEnabledState', monitor:'addIsEnabledObserver', onValue:colors.RED});*/
	this._mode = new ToggledParameter(this._name + '_Mode', {onValue:colors.BLUE, offValue:colors.CYAN});

	this._device_name = new Parameter(this._name + 'Device ', {javaObj:this._device});
	this._device_name._javaObj.addNameObserver(10, 'None', this._device_name.receive);

	/*this._selected_page = new Parameter(this._name + '_Page', {javaObj:this._device});
	this._selected_page._javaObj.addSelectedPageObserver(0, this._selected_page.receive);
	this._page_names = new ArrayParameter(this._name + '_Page_Names', {javaObj:this._device, value:[]});
	this._page_names._javaObj.addPageNamesObserver(this._page_names.receive);
	this._bank_name = new Parameter(this._name + 'Bank ', {value:'None'});
	this._on_selected_page_changed = function(obj)
	{
		if((obj._value > -1)&&(self._page_names._value instanceof Array)&&(self._page_names._value.length > obj._value))
		{
			self._bank_name.receive(self._page_names._value[obj._value]);
		}
	}
	this._selected_page.add_listener(this._on_selected_page_changed);*/

	/*this._nextPreset = new Parameter(this._name + '_Next_Preset', {javaObj:this._device, action:'switchToNextPreset'});
	this._previousPreset = new Parameter(this._name + '_Previous_Preset', {javaObj:this._device, action:'switchToPreviousPreset'});
	this._preset_creators = new ArrayParameter(this._name + '_Preset_Creators', {javaObj:this._device, value:[], monitor:'addPresetCreatorsObserver'});
	this._preset_creator = new Parameter(this._name + '_Preset_Creator', {javaObj:this._device, monitor_text:'addPresetCreatorObserver'});
	this._preset_name = new Parameter(this._name + '_Preset_Name', {javaObj:this._device, monitor_text:'addPresetNameObserver'});*/


	//this._preset_creators.add_listener(function(obj){post('------preset_creators:', obj._value)});
	//this._selected_page.add_listener(function(obj){post('------selected_page:', obj._value)});

	this._update = function()
	{
		for(var i in self._parameter)
		{
			self._parameter[i].set_control();
			self._parameter[i]._javaObj.setIndication(false);
			//self._macro[i].set_control();
			//self._macro[i]._javaObj.setIndication(false);
		}
		if(self._size == self._parameter_controls.length)
		{
			for(var i=0;i<self._size;i++)
			{
				if(self._parameter_controls[i] instanceof Control)
				{
					self._parameter[i].set_control(self._parameter_controls[i]);
					self._parameter[i]._javaObj.setIndication(true);
				}
			}
		}
	}

	this._mode.add_listener(this._update);

	/*this._report = function(val)
	{
		post('report!', val);
	}
	this._report2 = function(val)
	{
		post('report2!', val);
	}
	this._device.addSelectedPageObserver(-1, this._report);
	this._device.addPageNamesObserver(this._report2);*/
}

MorphDeviceComponent.prototype.set_nav_buttons = function(button0, button1, button2, button3)
{
	this._navLt.set_control(button0);
	this._navDn.set_control(button1);
	this._NavUp.set_control(button2);
	this._navRt.set_control(button3);
	if(button0 instanceof Button){button0.send(colors.CYAN);}
	if(button1 instanceof Button){button1.send(colors.CYAN);}
	if(button2 instanceof Button){button2.send(colors.BLUE);}
	if(button3 instanceof Button){button3.send(colors.BLUE);}
}

MorphDeviceComponent.prototype.set_shared_controls = function(controls)
{
	var controls = (controls instanceof Array) ? controls : [];
	this._shared_controls = controls;
	this._update();
}

MorphDeviceComponent.prototype.set_parameter_controls = function(controls)
{
	var controls = (controls instanceof Array) ? controls : [];
	this._parameter_controls = controls;
	this._update();
}

MorphDeviceComponent.prototype.set_macro_controls = function(controls)
{
	var controls = (controls instanceof Array) ? controls : [];
	this._macro_controls = controls;
	this._update();
}

MorphDeviceComponent.prototype.set_verbose = function(val)
{
	val = val > 0;
	for(var i in this._parameter)
	{
		this._parameter[i]._display_value = val;
	}
	for(var i in this._macro)
	{
		this._macro[i]._display_value = val;
	}
	this._navLt._display_value = val;
	this._navDn._display_value = val;
	this._navUp._display_value = val;
	this._navRt._display_value = val;
	this._enabled._display_value = val;
	this._mode._display_value = val;
}


function init()
{

	////////////////////////////////////////////////////////////////////////////////
	application = host.createApplication();
	cursorTrack = host.createCursorTrack(6, 1);
	cursorDevice = cursorTrack.createCursorDevice();
	masterTrack = host.createMasterTrack(8);
	transport = host.createTransport();
	trackBank = host.createMainTrackBank(4, 6, 4);
	returnBank = host.createEffectTrackBank(6, 4);
	////////////////////////////////////////////////////////////////////////////////

	post('Morph script loading ------------------------------------------------');

	host.getMidiInPort(0).setMidiCallback(onMidi);
	host.getMidiInPort(0).setSysexCallback(onSysex);
	initialize_noteInput();
	initialize_discrete_ports();
	initialize_morph_prototypes();
	initialize_settings();
	initialize_surface();
	setup_controls();
	resetAll();
	setup_session();
	setup_piano_session();
	setup_mixer();
	setup_device();
	setup_drumrack();
	setup_scales();
	setup_pianoscales();
	setup_empty_note_scales();
	setup_transport();
	setup_tasks();
	setup_usermodes();
	setup_discrete_modes();
	setup_modes();
	setup_notifications();
	setup_listeners();
	setupTests();
	MainModes.change_mode(1, true);
	post('Morph script loaded! ------------------------------------------------');
	notifier.show_message('Morph Script version ' + VERSION +' loaded.');
}

function initialize_noteInput()
{
	//noteInput = host.getMidiInPort(0).createNoteInput("Morph", "8?????", "9?????", "D?????", "E?????");
	noteInput = host.getMidiInPort(0).createNoteInput("Morph", "??????");
	noteInput.setUseExpressiveMidi(true, 0, MPE_BEND_RANGE);
	noteInput.setShouldConsumeEvents(false);

}

function initialize_discrete_ports()
{
	post('initialize_discrete_ports'); // productionDiscretePort._value, keysDiscretePort._value, drumDiscretePort._value, thunderDiscretePort._value);
	/*productionInput = {'setKeyTranslationTable':function(){}};
	keysInput = {'setKeyTranslationTable':function(){}};
	drumInput = {'setKeyTranslationTable':function(){}};
	thunderInput = {'setKeyTranslationTable':function(){}};*/
	initialize_production_port();
	initialize_keys_port();
	initialize_drum_port();
	initialize_thunder_port();
	initialize_innovator_port();
}

function initialize_production_port()
{
	/*post('initialize_production_port', productionDiscretePort._value);
	if(productionDiscretePort._value=='enabled')
	{*/
		post('creating Production Discrete Port...');
		productionInput = host.getMidiInPort(0).createNoteInput("Production", "??????");
		productionInput.setUseExpressiveMidi(true, 0, MPE_BEND_RANGE);
		productionInput.setShouldConsumeEvents(false);
		productionInput.setKeyTranslationTable(ALLOFFMAP);
	//}
}

function initialize_keys_port()
{
	/*post('initialize_keys_port', keysDiscretePort._value);
	if(keysDiscretePort._value=='enabled')
	{*/
		post('creating Keys Discrete Port...');
		keysInput = host.getMidiInPort(0).createNoteInput("Keys", "??????");
		keysInput.setUseExpressiveMidi(true, 0, MPE_BEND_RANGE);
		keysInput.setShouldConsumeEvents(false);
		keysInput.setKeyTranslationTable(ALLOFFMAP);
	//}
}

function initialize_drum_port()
{
	/*post('initialize_drum_port', drumDiscretePort._value);
	if(drumDiscretePort._value=='enabled')
	{*/
		post('creating Drum Discrete Port...');
		drumInput = host.getMidiInPort(0).createNoteInput("Drum", "??????");
		drumInput.setUseExpressiveMidi(true, 0, MPE_BEND_RANGE);
		drumInput.setShouldConsumeEvents(false);
		drumInput.setKeyTranslationTable(ALLOFFMAP);
	//}
}

function initialize_thunder_port()
{
	/*post('initialize_thunder_port', thunderDiscretePort._value);
	if(thunderDiscretePort._value=='enabled')
	{*/
		post('creating Thunder Discrete Port...');
		thunderInput = host.getMidiInPort(0).createNoteInput("Thunder", "??????");
		thunderInput.setUseExpressiveMidi(true, 0, MPE_BEND_RANGE);
		thunderInput.setShouldConsumeEvents(false);
		thunderInput.setKeyTranslationTable(ALLOFFMAP);
	//}
}

function initialize_innovator_port()
{
	/*post('initialize_thunder_port', thunderDiscretePort._value);
	if(thunderDiscretePort._value=='enabled')
	{*/
		post('creating Innovator Discrete Port...');
		innovatorInput = host.getMidiInPort(0).createNoteInput("Innovator", "??????");
		innovatorInput.setUseExpressiveMidi(true, 0, 24);
		innovatorInput.setShouldConsumeEvents(false);
		innovatorInput.setKeyTranslationTable(ALLOFFMAP);
	//}
}

function initialize_settings()
{
	restartButton = new Setting('Script', 'signal', {category:'Global', action:'Restart'});
	restartButton.set_callback(function(){host.restart();});
	enableNotifications = new Setting('Notifications', 'enum', {category:'Global', options:['on', 'off'], initialValue:'on'});
	enableNotifications.set_callback(update_notification_enabled);

	enableUserModeMP = new Setting('Production', 'enum', {category:'CC User Mode', options:['on', 'off'], initialValue:'off'});
	enableUserModeMP.set_callback(update_main_modes);
	enableUserModeThunder = new Setting('Thunder', 'enum', {category:'CC User Mode', options:['on', 'off'], initialValue:'off'});
	enableUserModeThunder.set_callback(update_main_modes);

	productionDiscretePort = new Setting('Production', 'enum', {category:'Exclusive Ports', options:['on', 'off'], initialValue:'off'});
	productionDiscretePort.set_callback(update_main_modes);
	keysDiscretePort = new Setting('Keys', 'enum', {category:'Exclusive Ports', options:['on', 'off'], initialValue:'off'});
	keysDiscretePort.set_callback(update_main_modes);
	drumDiscretePort = new Setting('Drum', 'enum', {category:'Exclusive Ports', options:['on', 'off'], initialValue:'off'});
	drumDiscretePort.set_callback(update_main_modes);
	thunderDiscretePort = new Setting('Thunder', 'enum', {category:'Exclusive Ports', options:['on', 'off'], initialValue:'off'});
	thunderDiscretePort.set_callback(update_main_modes);
	innovatorDiscretePort = new Setting('Innovator', 'enum', {category:'Exclusive Ports', options:['on', 'off'], initialValue:'off'});
	innovatorDiscretePort.set_callback(update_main_modes);

	selectClipSlotOnTrackChange = new Setting('AutoClipSlotSelect', 'enum', {category:'Miscellaneous', options:['on', 'off'], initialValue:'on'});
	selectClipSlotOnTrackChange.set_callback(update_selected_clipslot_on_selected_track_change);

	mpeBendRange = new Setting('MPEBendRange', 'enum', {category:'Global', options:['0', '24', '48'], initialValue:MPE_BEND_RANGE.toString()});
	mpeBendRange.set_callback(update_mpeBendRange);

}

function initialize_surface()
{
	sendSysex(CHECK_MAPS);
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
var MORPH_PIANOBUTTONS = [9, 10, 11, 12];
var MORPH_PIANOKEYS = [60, 61, 62, 63, 64, 65, 66, 67, 68, 69, 70, 71, 72, 73, 74, 75, 76, 77, 78, 79, 80, 81, 82, 83, 84];
var MORPH_EMPTY_NOTE_ASSIGNMENTS = [13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 52, 53, 54, 55, 56, 57, 58, 59, 85, 86, 87, 88, 89, 90, 91, 92, 93, 94, 95, 96, 97, 98, 99, 100, 101, 102, 103, 104, 105, 106, 107, 108, 109, 110, 111, 112, 113, 114, 115, 116, 117, 118, 119, 120, 121, 122, 123, 124, 125];
var MORPH_EMPTY_NOTE_BUTTONS = [126, 127];
var MORPH_THUNDER_DIALS = [21, 22, 23, 24, 25, 26, 27, 28];

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
	/*script['key'] = [];
	script['keygrid'] = new Grid(13, 1, 'KeyGrid');
	for (var i = 0; i< 13;i++)
	{
		key[i] = new Button(MORPH_KEYS[i], 'Key_'+i);
		keygrid.add_control(i, 0, key[i]);
	}*/
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
	script['pianobutton'] = [];
	for (var i = 0; i < 4; i++)
	{
		pianobutton[i] = new Button(MORPH_PIANOBUTTONS[i], 'PianoButton_'+i);
	}
	script['pianokey'] = [];
	script['pianogrid'] = new Grid(25, 1, 'PianoKeyGrid');
	for (var i = 0; i < 25; i++)
	{
		pianokey[i] = new Button(MORPH_PIANOKEYS[i], 'PianoKey_'+i);
		pianogrid.add_control(i, 0, pianokey[i]);
	}

  script['empty'] = [];
  script['emptygrid'] = new Grid(MORPH_EMPTY_NOTE_ASSIGNMENTS.length, 1, 'EmptyGrid');
  for (var i  = 0; i< MORPH_EMPTY_NOTE_ASSIGNMENTS.length;i++)
  {
    empty[i] = new Button(MORPH_EMPTY_NOTE_ASSIGNMENTS[i], 'Empty_'+i);
    emptygrid.add_control(i, 0, empty[i]);
  }
  script['emptybutton'] = [];
	for (var i = 0; i< 2; i++)
	{
		emptybutton[i] = new Button(MORPH_EMPTY_NOTE_BUTTONS[i], 'EmptyButton_'+i);
	}
	script['thunderdial'] = [];
	for (var i = 0; i< 8 ; i++)
	{
		thunderdial[i] = new Slider(MORPH_THUNDER_DIALS[i], 'ThunderDial_'+i);
	}
	script['thunderbuttons'] = NOTE_OBJECTS.slice(12, 127);
	script['thunderbuttongrid'] = new Grid(73, 1, 'ThunderButtonGrid');
	for (var i = 0; i<thunderbuttons.length; i++)
	{
		if(thunderbuttons[i] instanceof Button)
		{
			thunderbuttongrid.add_control(i, 0, thunderbuttons[i]);
		}
	}

	post('setup_controls successful');
}

function setup_session()
{
	session = new SessionComponent('Session', 4, 4, trackBank);
}

function setup_piano_session()
{
	pianosession = new SessionComponent('PianoSession', 4, 4, trackBank);
}

function setup_mixer()
{
	mixer = new MixerComponent('Mixer', 4, 4, trackBank, returnBank, cursorTrack, masterTrack);
}

function setup_device()
{
	device = new MorphDeviceComponent('Device', 8, cursorDevice);
	device._mode.set_value(0);
}

function setup_drumrack()
{
	drumrack = new MorphDrumRackComponent('DrumRack');
}

function setup_scales()
{
	scales = new MorphScaleComponent('Scales');
	scales._scaleOffset.set_value(1);
}

function setup_pianoscales()
{
	pianoscales = new MorphScaleComponent('PianoScales');
	pianoscales._scaleOffset.set_value(1);
	pianoscales._noteOffset._max = 96;
}

function setup_empty_note_scales()
{
	empty_note_scales = new MorphScaleComponent('EmptyNoteScales');
	empty_note_scales._scaleOffset.set_value(1);
	empty_note_scales._noteOffset._max = 72;
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
	notifier.add_subject(scales._noteOffset, 'ScaleOffset', undefined, 6, 'Main');
	notifier.add_subject(pianoscales._noteOffset, 'PianoOffset', undefined, 6, 'Piano');
	notifier.add_subject(MainModes, 'Mode', ['Main', 'Shift'], 2);
}

function update_notification_enabled()
{
	notifier.set_enabled(enableNotifications._value=='on')
}

function update_selected_clipslot_on_selected_track_change()
{
	session._selected_track.remove_listener(session._updateSelectedSlot);
	if(selectClipSlotOnTrackChange._value=='on'){
		session._selected_track.add_listener(session._updateSelectedSlot);
	}
}

function setup_tasks()
{
	tasks = new TaskServer(script, 100);
}

function setup_discrete_modes()
{
	productionDiscreetPage = new Page('productionDiscreetPage');
	productionDiscreetPage.enter_mode = function()
	{
		if(productionDiscretePort._value=='on')
		{
			post('setting production discrete enabled')
			override_noteInput = true;
			productionInput.setKeyTranslationTable(Note_Translation_Table);
			noteInput.setKeyTranslationTable(ALLOFFMAP);
		}
		post('productionDiscreetPage entered');
	}
	productionDiscreetPage.exit_mode = function()
	{
		override_noteInput = false;
		productionInput.setKeyTranslationTable(ALLOFFMAP);
		noteInput.setKeyTranslationTable(Note_Translation_Table);
		post('productionDiscreetPage exited');

	}

	keysDiscreetPage = new Page('keysDiscreetPage');
	keysDiscreetPage.enter_mode = function()
	{
		if(keysDiscretePort._value=='on')
		{
			override_noteInput = true;
			keysInput.setKeyTranslationTable(Note_Translation_Table);
			noteInput.setKeyTranslationTable(ALLOFFMAP);
		}
		post('keysDiscreetPage entered');


	}
	keysDiscreetPage.exit_mode = function()
	{
		override_noteInput = false;
		keysInput.setKeyTranslationTable(ALLOFFMAP);
		noteInput.setKeyTranslationTable(Note_Translation_Table);
		post('keysDiscreetPage exited');

	}

	drumDiscreetPage = new Page('drumDiscreetPage');
	drumDiscreetPage.enter_mode = function()
	{
		if(drumDiscretePort._value=='on')
		{
			override_noteInput = true;
			drumInput.setKeyTranslationTable(Note_Translation_Table);
			noteInput.setKeyTranslationTable(ALLOFFMAP);
		}
		post('drumDiscreetPage entered');


	}
	drumDiscreetPage.exit_mode = function()
	{
		override_noteInput = false;
		drumInput.setKeyTranslationTable(ALLOFFMAP);
		noteInput.setKeyTranslationTable(Note_Translation_Table);
		post('drumDiscreetPage exited');

	}

	thunderDiscreetPage = new Page('thunderDiscreetPage');
	thunderDiscreetPage.enter_mode = function()
	{
		if(thunderDiscretePort._value=='on')
		{
			override_noteInput = true;
			thunderInput.setKeyTranslationTable(Note_Translation_Table);
			noteInput.setKeyTranslationTable(ALLOFFMAP);
		}
		post('thunderDiscreetPage entered');


	}
	thunderDiscreetPage.exit_mode = function()
	{
		override_noteInput = false;
		thunderInput.setKeyTranslationTable(ALLOFFMAP);
		noteInput.setKeyTranslationTable(Note_Translation_Table);
		post('thunderDiscreetPage exited');
	}

	innovatorDiscreetPage = new Page('innovatorDiscreetPage');
	innovatorDiscreetPage.enter_mode = function()
	{
		if(innovatorDiscretePort._value=='on')
		{
			override_noteInput = true;
			innovatorInput.setKeyTranslationTable(Note_Translation_Table);
			noteInput.setKeyTranslationTable(ALLOFFMAP);
		}
		post('innovatorDiscreetPage entered');


	}
	innovatorDiscreetPage.exit_mode = function()
	{
		override_noteInput = false;
		innovatorInput.setKeyTranslationTable(ALLOFFMAP);
		noteInput.setKeyTranslationTable(Note_Translation_Table);
		post('innovatorDiscreetPage exited');
	}

}

function setup_usermodes()
{
	// userInput = host.getMidiInPort(0).createNoteInput("ProductionUser", "80????", "90????", "D0????", "E0????");
	script['userbank'] = new UserBankComponent('UserBank', 18);
	// userInput.setUseExpressiveMidi(true, 0, 24);
	// userInput.setShouldConsumeEvents(false);

	userPage = new Page('UserPage');
	userPage.enter_mode = function()
	{
		post('userPage entered');
		for(var i=0;i<8;i++)
		{
			userbank.set_control(i, dial[i]);
		}
		for(var i=0;i<2;i++)
		{
			userbank.set_control(i+8, slider[i]);
		}
		userbank.set_enabled(true);
	}
	userPage.exit_mode = function()
	{
		post('userPage exited');
		// userbank.set_enabled(false);
		for(var i=0;i<10;i++)
		{
			userbank.set_control(i);
		}
		userbank.set_enabled(false);
	}

	// thunderInput = host.getMidiInPort(0).createNoteInput("ThunderUser", "??????");
	// script['thunderbank'] = new UserBankComponent('ThunderBank', 8, thunderInput);
	// thunderInput.setUseExpressiveMidi(true, 0, 24);
	// thunderInput.setShouldConsumeEvents(false);


	thunderUserPage = new Page('ThunderUserPage');
	thunderUserPage.enter_mode = function()
	{
		post('thunderUserPage entered');
		for(var i=0;i<8;i++)
		{
			userbank.set_control(i+10, thunderdial[i]);
		}
		userbank.set_enabled(true);
	}
	thunderUserPage.exit_mode = function()
	{
		post('thunderUserPage exited');
		// thunderbank.set_enabled(false);
		for(var i=0;i<8;i++)
		{
			userbank.set_control(i+10);
		}
		userbank.set_enabled(false);
	}




}

function setup_modes()
{
	script['piano_session_sub'] = new Grid(4, 4, 'PianoSessionGrid');
	pianoSessionPage = new Page('PianoSessionPage')
	pianoSessionPage.enter_mode = function()
	{
		for(var x = 0; x < 4; x++)
		{
			for(var y = 0; y < 4; y++)
			{
				piano_session_sub.add_control(x, y, pianokey[y + (x*4)]);
			}
		}
		pianosession.assign_grid(piano_session_sub);
	}
	pianoSessionPage.exit_mode = function()
	{
		pianosession.assign_grid();
		piano_session_sub.clear_buttons();
	}

	//Page 0 : NoOverlay
	offPage = new Page('OffPage');

	//Page 1 : MusicProduction
	mainPage = new Page('MainPage');
	mainPage.enter_mode = function()
	{
		post('mainPage entered');
		mixer.set_nav_controls(button[0], button[1]);
		mixer.selectedstrip()._send[0].set_control(pressure[0]);
		mixer.selectedstrip()._send[1].set_control(pressure[1]);
		if(enableUserModeMP._value == 'off'){
			device.set_parameter_controls(dial);
		}
		else{
			userPage.enter_mode();
		}
		transport._stop.set_control(button[5]);
		transport._play.set_control(button[4]);
		transport._overdub.set_control(button[6]);
		transport._crossfader.set_control(slider[1]);
		drumrack.assign_grid(grid);
		scales.assign_grid(pianogrid);
		empty_note_scales.assign_grid(emptygrid);
		empty_note_scales._noteOffset.set_inc_dec_buttons(emptybutton[1], emptybutton[0]);
		mainPage.active = true;
		mainPage.set_shift_button(button[7]);
		productionDiscreetPage.enter_mode();
	}
	mainPage.exit_mode = function()
	{
		userPage.exit_mode();
		productionDiscreetPage.exit_mode();
		drumrack.assign_grid();
		scales.assign_grid();
		empty_note_scales._noteOffset.set_inc_dec_buttons();
		empty_note_scales.assign_grid();
		mixer.set_nav_controls();
		mixer.selectedstrip()._send[0].set_control();
		mixer.selectedstrip()._send[1].set_control();
		mixer.selectedstrip()._stop.set_control();
		device.set_parameter_controls();
		transport._stop.set_control();
		transport._play.set_control();
		transport._record.set_control();
		session._record_clip.set_control();
		transport._crossfader.set_control();
		mainPage.set_shift_button();
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
			transport._stop.set_control();
			mixer.selectedstrip()._send[0].set_control();
			mixer.selectedstrip()._send[1].set_control();
			mixer.selectedstrip()._stop.set_control(button[5]);
			transport._overdub.set_control();
			//transport._record.set_control(button[6]);
			session._record_clip.set_control(button[6]);
			session.assign_grid(grid);
			session._navLt.set_control(button[0]);
			session._navRt.set_control(button[1]);
			drumrack._noteOffset.set_inc_dec_buttons(pianokey[1], pianokey[0]);
			scales._noteOffset.set_inc_dec_buttons(pianokey[12], pianokey[11]);
			//userPage.enter_mode()

		}
		else
		{
			drumrack._noteOffset.set_inc_dec_buttons();
			scales._noteOffset.set_inc_dec_buttons();
			session._navLt.set_control();
			session._navRt.set_control();
			session.assign_grid();
			transport._record.set_control();
			transport._stop.set_control();
			mixer.selectedstrip()._stop.set_control();
			//userPage.exit_mode();
			mainPage.enter_mode();
		}
	}

	//Page 2: Keyboard
	keysPage = new Page('KeysPage');
	keysPage.enter_mode = function()
	{
		post('keysPage entered');
		keysPage.active = true;
		mixer.set_nav_controls(button[0], button[1]);
		mixer.selectedstrip()._send[0].set_control(pressure[0]);
		mixer.selectedstrip()._send[1].set_control(pressure[1]);
		transport._play.set_control(button[4]);
		transport._stop.set_control(button[5]);
		transport._overdub.set_control(button[6]);
		pianoscales.assign_grid(pianogrid);
		pianoscales._noteOffset.set_inc_dec_buttons(pianobutton[1], pianobutton[0]);
		keysPage.set_shift_button(button[7]);
		keysDiscreetPage.enter_mode();
	}
	keysPage.exit_mode = function()
	{
		keysDiscreetPage.exit_mode();
		override_noteInput = false;
		keysInput.setKeyTranslationTable(ALLOFFMAP);
		noteInput.setKeyTranslationTable(Note_Translation_Table);
		keysPage.set_shift_button();
		mixer.set_nav_controls();
		mixer.selectedstrip()._send[0].set_control();
		mixer.selectedstrip()._send[1].set_control();
		transport._play.set_control();
		transport._stop.set_control();
		transport._overdub.set_control();
		pianoscales.assign_grid();
		pianoscales._noteOffset.set_inc_dec_buttons();
		keysPage.active = false;
		post('keysPage exited');
	}
	keysPage.update_mode = function()
	{
		post('keysPage updated');
		if(keysPage._shifted)
		{
			pianoscales.assign_grid();
			pianoSessionPage.enter_mode();
			transport._stop.set_control();
			mixer.selectedstrip()._send[0].set_control();
			mixer.selectedstrip()._send[1].set_control();
			mixer.selectedstrip()._stop.set_control(button[5]);
			transport._overdub.set_control();
			//transport._record.set_control(button[6]);
			session._record_clip.set_control(button[6]);
			session._navLt.set_control(button[0]);
			session._navRt.set_control(button[1]);

		}
		else
		{
			mixer.selectedstrip()._stop.set_control();
			session._record_clip.set_control();
			session._navLt.set_control();
			session._navRt.set_control();
			pianoSessionPage.exit_mode();
			keysPage.enter_mode();
		}
	}

	//Page 3: DrumPad
	drumPage = new Page('DrumPage');
	drumPage.enter_mode = function()
	{
		post('drumPage entered');
		drumPage.active = true;
		mixer.set_nav_controls(button[0], button[1]);
		mixer.selectedstrip()._send[0].set_control(pressure[0]);
		mixer.selectedstrip()._send[1].set_control(pressure[1]);
		transport._play.set_control(button[4]);
		transport._stop.set_control(button[5]);
		transport._overdub.set_control(button[6]);
		drumrack.assign_grid(grid);
		drumPage.set_shift_button(button[7]);
		recalculate_translation_map = true;
		morphFlush();
		drumDiscreetPage.enter_mode();
	}
	drumPage.exit_mode = function()
	{
		drumDiscreetPage.exit_mode();
		drumPage.set_shift_button();
		drumrack.assign_grid();
		mixer.set_nav_controls();
		mixer.selectedstrip()._send[0].set_control();
		mixer.selectedstrip()._send[1].set_control();
		transport._play.set_control();
		transport._stop.set_control();
		transport._overdub.set_control();
		drumPage.active = false;
		post('drumPage exited');
	}
	drumPage.update_mode = function()
	{
		post('drumPage updated');
		if(drumPage._shifted)
		{
			transport._stop.set_control();
			mixer.selectedstrip()._send[0].set_control();
			mixer.selectedstrip()._send[1].set_control();
			mixer.selectedstrip()._stop.set_control(button[5]);
			transport._overdub.set_control();
			session._record_clip.set_control(button[6]);
			session._navLt.set_control(button[0]);
			session._navRt.set_control(button[1]);
		}
		else
		{
			mixer.selectedstrip()._stop.set_control();
			session._record_clip.set_control();
			session._navLt.set_control();
			session._navRt.set_control();
			drumPage.enter_mode();
		}
	}

	//Page 4: ThunderPage
	thunderPage = new Page('ThunderPage');
	thunderPage.enter_mode = function()
	{
		post('thunderPage entered');
		mixer.set_nav_controls(button[0], button[1]);
		mixer.selectedstrip()._send[0].set_control(pressure[0]);
		mixer.selectedstrip()._send[1].set_control(pressure[1]);
		transport._play.set_control(button[4]);
		transport._stop.set_control(button[5]);
		transport._overdub.set_control(button[6]);
		if(enableUserModeThunder._value == 'off'){
			device.set_parameter_controls(thunderdial);
		}
		else{
			thunderUserPage.enter_mode();
		}
		for(var i=0; i<NOTE_OBJECTS.length;i++)
		{
			if(NOTE_OBJECTS[i].set_translation)
			{
				NOTE_OBJECTS[i].set_translation(i > 12 ? i : -1);
			}
		}
		//allow data to be forwarded to thunderInput instead of noteInput
		thunderPage.set_shift_button(button[7]);
		thunderDiscreetPage.enter_mode();
		thunderPage.active = true;
	}
	thunderPage.exit_mode = function()
	{
		thunderDiscreetPage.exit_mode();
		thunderUserPage.exit_mode();
		device.set_parameter_controls();
		mixer.set_nav_controls();
		mixer.selectedstrip()._send[0].set_control();
		mixer.selectedstrip()._send[1].set_control();
		transport._play.set_control();
		transport._stop.set_control();
		transport._overdub.set_control();
		for(var i=0; i<NOTE_OBJECTS.length;i++)
		{
			if(NOTE_OBJECTS[i].set_translation)
			{
				NOTE_OBJECTS[i].set_translation(-1);
			}
		}
		thunderPage.set_shift_button();
		thunderPage.active = false;
		post('thunderPage exited');
	}
	thunderPage.update_mode = function()
	{
		post('thunderPage updated');
		if(thunderPage._shifted)
		{
			transport._stop.set_control();
			mixer.selectedstrip()._send[0].set_control();
			mixer.selectedstrip()._send[1].set_control();
			mixer.selectedstrip()._stop.set_control(button[5]);
			transport._overdub.set_control();
			session._record_clip.set_control(button[6]);
			session._navLt.set_control(button[0]);
			session._navRt.set_control(button[1]);
		}
		else
		{
			mixer.selectedstrip()._stop.set_control();
			session._record_clip.set_control();
			session._navLt.set_control();
			session._navRt.set_control();
			thunderPage.enter_mode();
		}
	}


	innovatorPage = new Page('InnovatorPage');
	innovatorPage.enter_mode = function()
	{
		post('innovatorPage entered');
		for(var i=0; i<NOTE_OBJECTS.length;i++)
		{
			if(NOTE_OBJECTS[i].set_translation)
			{
				// NOTE_OBJECTS[i].set_translation(i);
				NOTE_OBJECTS[i].set_translation(i > 12 ? i : -1);
			}
		}
		mixer.set_nav_controls(button[0], button[1]);
		mixer.selectedstrip()._send[0].set_control(pressure[0]);
		mixer.selectedstrip()._send[1].set_control(pressure[1]);
		if(enableUserModeMP._value == 'off'){
			device.set_parameter_controls(dial);
		}
		else{
			userPage.enter_mode();
		}
		transport._stop.set_control(button[5]);
		transport._play.set_control(button[4]);
		transport._overdub.set_control(button[6]);
		transport._crossfader.set_control(slider[1]);
		innovatorDiscreetPage.enter_mode();
		innovatorPage.active = true;
		innovatorPage.set_shift_button(button[7]);
	}
	innovatorPage.exit_mode = function()
	{
		innovatorDiscreetPage.exit_mode();
		for(var i=0; i<NOTE_OBJECTS.length;i++)
		{
			if(NOTE_OBJECTS[i].set_translation)
			{
				NOTE_OBJECTS[i].set_translation(-1);
			}
		}
		mixer.set_nav_controls();
		mixer.selectedstrip()._send[0].set_control();
		mixer.selectedstrip()._send[1].set_control();
		mixer.selectedstrip()._stop.set_control();
		device.set_parameter_controls();
		transport._stop.set_control();
		transport._play.set_control();
		transport._record.set_control();
		session._record_clip.set_control();
		transport._crossfader.set_control();
		innovatorPage.set_shift_button();
		innovatorPage.active = false;
		post('innovatorPage exited');
	}
	innovatorPage.update_mode = function()
	{
		post('innovatorPage updated');
		if(innovatorPage._shifted)
		{
			transport._stop.set_control();
			mixer.selectedstrip()._send[0].set_control();
			mixer.selectedstrip()._send[1].set_control();
			mixer.selectedstrip()._stop.set_control(button[5]);
			transport._overdub.set_control();
		}
		else
		{
			transport._record.set_control();
			transport._stop.set_control();
			mixer.selectedstrip()._stop.set_control();
			mainPage.enter_mode();
		}
	}


	script["MainModes"] = new PageStack(6, "Main Modes");


	MainModes.add_mode(0, offPage);
	MainModes.add_mode(1, mainPage);
	MainModes.add_mode(2, keysPage);
	MainModes.add_mode(3, drumPage);
	MainModes.add_mode(4, thunderPage);
	MainModes.add_mode(5, innovatorPage);

}

function setup_fixed_controls()
{
}

function setup_listeners()
{
	//key[0].add_listener(function(obj){post('key[0]._value:', obj._value);});
	//restartButton.add_listener(});
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
		//post('NOTEOFF: ' + status + ' ' + data1 + ' ' + data2);
		NOTE_OBJECTS[data1].receive(0);
	}
}

function onSysex(data)
{
	printSysex(data);

	//currently disabled because there is no way to query the current overlay from the device
	//These functions enable mode switching based on Overlay changes in realtime

	if( (data=="f000021d000300000100f7")||(data=="f000021e000300000101f7")||(data=="f000021d000e00000101f7") )
	{
		post('detected no overlay...');
		MainModes.change_mode(5);
	}
	else if(data=="f000021d000400000101f7")
	{
		post('detected MusicProduction overlay...');
		MainModes.change_mode(1);
	}
	else if(data=="f000021d000300000101f7")
	{
		post('detected Keyboard overlay...');
		MainModes.change_mode(2);
	}
	else if(data=="f000021d000500000101f7")
	{
		post('detected Drumpad overlay...');
		MainModes.change_mode(3);
	}
	else if(data=="f000021d001000000101f7")
	{
		post('detected Thunder overlay...');
		MainModes.change_mode(4);
	}
	else if(data=="f000021d000f00000101f7")
	{
		post('detected Innovator overlay...');
		MainModes.change_mode(5);
	}
}

function display_mode(){}


function setupTests()
{
}

function update_main_modes()
{
	if(MainModes)
	{
		MainModes.restore_mode();
	}
}

function update_mpeBendRange()
{
	MPE_BEND_RANGE = mpeBendRange._value == '24' ? 24 : 48;
	noteInput.setUseExpressiveMidi(true, 0, MPE_BEND_RANGE);
	productionInput.setUseExpressiveMidi(true, 0, MPE_BEND_RANGE);
	keysInput.setUseExpressiveMidi(true, 0, MPE_BEND_RANGE);
	drumInput.setUseExpressiveMidi(true, 0, MPE_BEND_RANGE);
	thunderInput.setUseExpressiveMidi(true, 0, MPE_BEND_RANGE);
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
				case 5:
					innovatorInput.setKeyTranslationTable(Note_Translation_Table);
					innovatorInput.setVelocityTranslationTable(Velocity_Translation_Table);
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
	tasks = new TaskServer(script, 100);
	flash = new FlashTask();
	tasks.addTask(flash.update, null, 1, true, 'Flash');
 	//host.scheduleTask(flush, null, 100);
	host.scheduleTask(doObject(this, morphFlush), 100);
}
