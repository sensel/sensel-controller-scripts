// 0718 amounra : http://www.aumhaa.com

const NOTE_TYPE = 'NOTE_TYPE';
const CC_TYPE = 'CC_TYPE';
const NONE_TYPE = 'NONE_TYPE';
const CHANNEL = 0;
const NONE = 'NONE';

var colors = {OFF : 0, WHITE : 1, CYAN : 5, MAGENTA : 9, RED : 17, BLUE : 33, YELLOW : 65, GREEN : 127};

NOTE_OBJECTS = new Array(128);
CC_OBJECTS = new Array(128);

//var noteInput = {'setNoteKeyMap':function(){}};
var noteInput = {'setKeyTranslationTable':function(){}};
var midiBuffer = {NONE_TYPE:{},CC_TYPE:{},NOTE_TYPE:{}};
var midiNoteBuffer = {};
var midiCCBuffer = {};
var override_noteInput = false;
var recalculate_translation_map = true;

var Note_Translation_Table = [];
var Velocity_Translation_Table = [];
for (var i=0;i<128;i++) {Note_Translation_Table[i] = -1; Velocity_Translation_Table[i] = i;}


function doObject (object, f)
{
	return function ()
	{
		f.apply (object, arguments);
	};
}

//this function initializes all the prototype core processes.  It should be called during init().
function initialize_prototypes()
{
	registerControlDicts();
	tasks = new TaskServer(script, 100);
	flash = new FlashTask();
	tasks.addTask(flash.update, null, 1, true, 'Flash');
 	//host.scheduleTask(flush, null, 100);
	host.scheduleTask(doObject(this, flush), 100);
}

function FlashTask()
{
	var self = this;
	this.state = 0
	this.buffer = [];
	this.update = function()
	{
		self.state = Math.abs(self.state-1);
		//post('flash state:', self.state);
		if(self.state)
		{
			for(var i in self.buffer)
			{
				var button = self.buffer[i];
				button.send(button._last_sent_value, true);
			}
		}
		else
		{
			for(var i in self.buffer)
			{
				var button = self.buffer[i];
				button.send(button._offValue, true);
			}
		}
	}
	this.remove = function(obj)
	{
		for(var i in self.buffer)
		{
			if(self.buffer[i]===obj)
			{
				self.buffer.splice(i, 1);
			}
		}
	}
	this.add = function(obj)
	{
		if(!(obj in self.buffer))
		{
			self.buffer.unshift(obj);
		}
	}
}

function extend(destination, source)
{
	for (var k in source)
	{
		if (source.hasOwnProperty(k))
		{
			destination[k] = source[k];
		}
	}
	return destination;
}

function override(object, methodName, callback)
{
	object[methodName] = callback(object[methodName])
}

function after(extraBehavior)
{
	return function(original)
	{
		return function()
		{
			var returnValue = original.apply(this, arguments)
			extraBehavior.apply(this, arguments)
			return returnValue
		}
	}
}

var toClass = {}.toString

//simple utility function to flatten incoming arguments to a function
function arrayfromargs(args)
{
	return Array.prototype.slice.call(args, 0);
}

//use this for debug messages instead of println, it can be turned off with DEBUG flag.
function post()
{
	if(DEBUG){println('> '+arrayfromargs(arguments).join(' '));}
}

//we need to use this when adding notifier targets or listeners so that the proper context is maintained.
//it isn't necessary for certain prototype targets, but won't hurt either.  If something doesn't work, try this.
function wrap_callback(obj, func)
{
	var callback = function(control)
	{
		func.apply(obj, [control]);
	}
	return callback;
}

//this is called at init to initialize all control definitions
function registerControlDicts()
{
	NOTE_OBJECTS = new Array(128);
	for (var i=0;i<128;i++){NOTE_OBJECTS[i] = new Control(i, 'None');}
	CC_OBJECTS = new Array(128);
	for (var i=0;i<128;i++){CC_OBJECTS[i] = new Control(i, 'None');}

}

//this is called whenever a control object is created, and basically maintains a list of all NOTE_TYPES and CC_TYPES that serve as lookup tables for MIDI input.
function register_control(control)
{
	if (control._type == NOTE_TYPE)
	{
		NOTE_OBJECTS[control._id] = control;
	}
	else if(control._type == CC_TYPE)
	{
		CC_OBJECTS[control._id] = control;
	}
}


function flush()
{
	//tasks._run();
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
		//post('Note_Translation_Table:', Note_Translation_Table, override_noteInput);
		noteInput.setKeyTranslationTable(Note_Translation_Table);
		noteInput.setVelocityTranslationTable(Velocity_Translation_Table);
		recalculate_translation_map = false;
	}
}

function flush()
{
	//tasks._run();
	//post('flush')
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

//this sends reset() to all controls that are defined with register_control()
function resetAll()
{
	for (var index in CC_OBJECTS)
	{
		CC_OBJECTS[index].reset();
	}
	for (var index in NOTE_OBJECTS)
	{
		NOTE_OBJECTS[index].reset();
	}
}

function displayMessage(message)
{
	host.showPopupNotification(message);
}


var SETTING_TYPES = {'enum':{func:'getEnumSetting', observer:'addValueObserver', params:['_options', '_initialValue']},
 					'number':{func:'getNumberSetting', observer:'addRawValueObserver', params:['_minValue', '_maxValue', '_stepResolution', '_unit', '_initialValue']},
					'signal':{func:'getSignalSetting', observer:'addSignalObserver', params:['_action']},
					'string':{func:'getStringSetting', observer:'addValueObserver', params:['_numChars', '_initialText']},
					'boolean':{func:'getBooleanSetting', observer:'addValueObserver', params:['_initialValue']},
					'color':{func:'getColorSetting', observer:'addValueObserver', params:['_initialColor']}};

function Setting(name, type, args)
{
	post('Setting:', name, type, args);
	var self = this;
	this._name = name;
	this._category = undefined;
	this._type = type;
	this._parameter = undefined;
	this._value = undefined;
	for (var i in args)
	{
		this['_'+i] = args[i];
	}
	this._Callback = function(val)
	{
		post('Value changed for', self._name, 'setting:', val);
		//add check for _parameter, forward value if value is different than parameter._value.
		self._value = val;
	}
	if(this._type in SETTING_TYPES)
	{
		var defs = SETTING_TYPES[this._type];
		var func_args = [], func = defs['func'], observer = defs['observer'], params = defs['params'];
		func_args.push(this._name);
		func_args.push(this._category);
		for(var i=0;i<params.length;i++)
		{
			if(this.hasOwnProperty(params[i]))
			{
				func_args.push(this[params[i]]);
			}
			else
			{
				post('missing parameter for creation of setting :', params[i]);
				func_args.push(undefined);
			}
		}
		var docState = host.getDocumentState();
		/*for some reason the following one-liner no longer works so were going to write really ugly code to compensate.
		this used to work :(  Now, docState[func] returns the right jObj, but
		the returned obj isn't callable via apply or call. */
		//this._setting = docState[func].apply(script, func_args);
		switch(this._type)
		{
			case 'enum':
				this._setting = docState.getEnumSetting(this._name, this._category, this._options, this._initialValue);
				break;
			case 'number':
				this._setting = docState.getNumberSetting(this._name, this._category, this._options, this._minValue, this._maxValue, this._stepResolution, this._unit, this._initialValue);
				break;
			case 'signal':
				this._setting = docState.getSignalSetting(this._name, this._category, this._action);
				break;
			case 'string':
				this._setting = docState.getStringSetting(this._name, this._category, this._numChars, this._initialText);
				break;
			case 'boolean':
				this._setting = docState.getBooleanSetting(this._name, this._category, this._initialValue);
				break;
			case 'color':
				this._setting = docState.getColorSetting(this._name, this._category, this._initialColor);
				break;
		}
		this._setting[observer](this._Callback);
	}
}

Setting.prototype.set_callback = function(callback)
{
	post(this._name, 'set_callback', callback);
	var observer = SETTING_TYPES[this._type]['observer'];
	this._setting[observer](callback);
}



function OSCDisplay(name)
{
	var self = this;
	this.controls = [];
	this._enabled = false;
}

OSCDisplay.prototype.set_enabled = function(val)
{

	for(var i in self.controls)
	{
		var control = self.controls[i];
		control.add_listener(this.Callback);
	}
}

/////////////////////////////////////////////////////////////////////////
//This is the root object to be used for all controls, or objects that
//will serve as notifiers to other objects.  It maintains a list of listeners as well as a
//"target_stack" that can be used to push/pop targets to be notified when its value changes
//(only the first target in the stack is notified).  Notifier is "subclassed" by many other prototypes.

function Notifier(name)
{
	var self = this;
	this._name = name;
	this._value = -1;
	this._listeners = [];
	this._target_heap = [];
	this._enabled = true;
	this._display_value = false;
	this._is_setting = false;
	this.instance = function(){return self;}
}

Notifier.prototype.get_target = function(){return this._target_heap[0];}

Notifier.prototype.set_target = function(target)
{
	if (target)
	{
		if (target in this._target_heap)
		{
			//post('target was present for' + this._name, 'placing at front');
			this._target_heap.unshift(this._target_heap.splice(this._target_heap.indexOf(target), 1));
		}
		else
		{
			this._target_heap.unshift(target);
			//post('target added to heap for ' + this._name);
		}
	}
	else
	{
		this.remove_target();
	}
}

Notifier.prototype.remove_target = function(target)
{
	if (target)
	{
		for(var item in this._target_heap)
		{
			if(target === this._target_heap[item])
			{
				this._target_heap.splice(item, 1);
				break;
			}
		}
	}
	else
	{
		this._target_heap.shift();
	}
}

Notifier.prototype.clear_targets = function()
{
	this._target_heap = [];
}

Notifier.prototype.add_listener = function(callback)
{
	//if(!(callback in this._listeners))
	//{
	//	this._listeners.unshift(callback);
	//}
	var add = true;
	if (callback)
	{
		for(var item in this._listeners)
		{
			if(callback == this._listeners[item])
			{
				add = false;
				break;
			}
		}
	}
	if(add)
	{
		this._listeners.unshift(callback);
	}
}

Notifier.prototype.remove_listener = function(callback)
{
	//if(callback in this._listeners){this._listeners.slice(this._listeners.indexOf(callback), 1);}
	if (callback)
	{
		for(var item in this._listeners)
		{
			if(callback === this._listeners[item])
			{
				this._listeners.splice(callback, 1);
			}
		}
	}
}

Notifier.prototype.notify = function(obj)
{
	if(!obj)
	{
		var obj = this;
	}
	//post('notify', this._name, obj._name);
	if(this._target_heap[0])
	{
		var cb = this._target_heap[0];
		try
		{
			cb(obj);
		}
		catch(err)
		{
			post('target callback exception:', err);
			post('-> for', this._name,' : ',cb);
		}
	}
	for (var i in this._listeners)
	{
		var cb = this._listeners[i];
		try
		{
			cb(obj);
		}
		catch(err)
		{
			post('listener callback exception:', err);
			post('-> for', this._name,' : ',cb);
		}
	}
	if(this._display_value>0)
	{
		displayMessage(this._name + ' : ' + this._value);
	}
	if(this._is_setting>0)
	{
	}
}

Notifier.prototype.set_enabled = function(val)
{
	this._enabled = (val>0);
}

//////////////////////////////////////////////////////////////////////////
//A Notifier representing a physical control that can send and receive MIDI

function Control(identifier, name)
{
	Notifier.call( this, name );
	var self = this;
	this._type = NONE_TYPE;
	this._id = identifier;
	this._channel = CHANNEL;
	this._grid = {};
	this._last_sent_value = 0;
	this.receive = function(value)
	{
		if(self._enabled)
		{
			self._value = value;
			self.notify();
		}
	}
	this.receive_notifier = function(notification)
	{
		if(self._enabled){self.send(notification._value);}
	}
	this._x = function(grid){if(self._grid[grid._name]!=undefined){return(self._grid[grid._name].x)}}
	this._y = function(grid){if(self._grid[grid._name]!=undefined){return(self._grid[grid._name].y)}}
}

Control.prototype = new Notifier();

Control.prototype.constructor = Control;

Control.prototype.identifier = function(){return this._id;}

Control.prototype._send = function(value){}//this should be overridden by subclass

Control.prototype.send = function(value)
{
	midiBuffer[this._type][this._id] = [this, value];
	this._last_sent_value = value;
}

Control.prototype.reset = function()
{
	this.send(0);
}


function MPEControl(identifier, name)
{
	MPEControl.call( this, name );
	var self = this;
	this._mpe_channel = 1;
	this.receive = function(value)
	{
		if(self._enabled)
		{
			self._value = value;
			self.notify();
		}
	}
}

MPEControl.prototype = new Control();

MPEControl.prototype.constructor = MPEControl;


function Button(identifier, name)
{
	Control.call( this, identifier, name );
	var this_button = this;
	this._type = NOTE_TYPE;
	this._onValue = 127;
	this._offValue = 0;
	this._translation = -1;
	this._flash = false;
	this._grid = [];
	register_control(this);
}

Button.prototype = new Control();

Button.prototype.constructor = Button;

Button.prototype.pressed = function()
{
	return this._value > 0;
}

Button.prototype.send = function(value, flash)
{
	midiBuffer[this._type][this._id] = [this, value];
	this.flash(flash);
	this._last_sent_value = value;
}

Button.prototype._send = function(value)
{
	sendNoteOn(this._channel, this._id, value);
}

Button.prototype.turn_on = function()
{
	this.send(this._onValue);
}

Button.prototype.turn_off = function()
{
	this.send(this._offValue);
}

Button.prototype.set_on_off_values = function(onValue, offValue)
{
	this._onValue = onValue||127;
	this._offValue = offValue||0;
}

Button.prototype.set_translation = function(newID)
{
	//post(this._name, 'set translation', this._id, newID);
	this._translation = newID;
	Note_Translation_Table[this._id] = this._translation;
	recalculate_translation_map = true;
}

Button.prototype.flash = function(val)
{
	if(val!=this._flash)
	{
		this._flash = val;
		if(!val)
		{
			flash.remove(this);
		}
		else
		{
			flash.add(this);
		}
	}
}

Button.prototype.get_coords= function(grid)
{
	if(grid instanceof Grid && this._grid[grid._name])
	{
		return([this._grid[grid._name].x, this._grid[grid._name].y]);
	}
}


function PadPressure(identifier, name)
{
	Control.call( this, identifier, name);
	this._type = CC_TYPE;
	register_control(this);
}

PadPressure.prototype = new Control();

PadPressure.prototype.constructor = PadPressure;

PadPressure.prototype.pressed = function()
{
	return this._value > 0;
}


function Slider(identifier, name)
{
	Control.call( this, identifier, name );
	this._type = CC_TYPE;
	register_control(this);
}

Slider.prototype = new Control();

Slider.prototype.constructor = Slider;

Slider.prototype._send = function(value)
{
	sendChannelController(this._channel, this._id, value);
}


function Encoder(identifier, name)
{
	Control.call( this, identifier, name );
	this._type = CC_TYPE;
	register_control(this);
}

Encoder.prototype = new Control();

Encoder.prototype.constructor = Encoder;

Encoder.prototype._send = function(value)
{
	sendChannelController(this._channel, this._id, value);
}


function TouchFader(identifier, name)
{
	Slider.call( this, identifier, name );
	this._color = 0;
}

TouchFader.prototype = new Slider();

TouchFader.prototype.constructor = TouchFader;

TouchFader.prototype.set_color = function(color){}//not implemented

TouchFader.prototype.set_mode = function(mode){}//not implemented


function DisplayElement(identifier, name)
{
	Control.call( this, identifier, name );
	this._type = CC_TYPE;
	register_control(this);
}

DisplayElement.prototype = new Control();

DisplayElement.prototype.constructor = DisplayElement;

DisplayElement.prototype._send = function(value)
{
	sendChannelController(this._channel, this._id, value);
}


function DisplaySection(name, width, base_id, map, def)
{
	this._width = width;
	var self = this;
	this._value = '';
	this._elements = [];
	this._base_id = 0;
	this._character_map = map||{};
	this._default = this._character_map[def] || 0;
	for(var i = 0;i < this._width; i++)
	{
		this._elements[i] = new DisplayElement(base_id + i, this._name + '_DisplayElement_' + i);
	}
}

DisplaySection.prototype.set_character_map = function(map)
{
	this._character_map = map;
}

DisplaySection.prototype._send = function(value)
{
	value = value+'';
	var dif = this._width - value.length;
	if(dif>0)
	{
		dif--;
		do{
			value = ' '+value;
		}while(dif--);
	}
	/*if(value.length<this._width)
	{
		value = ' ' + value;
	}*/
	if(value.length>this._width){value.length = this._width;}
	this._value = value;
	for(var i=0;i<this._width;i++)
	{
		var ch = this._character_map[this._value.charAt(i)] || this._default;
		this._elements[i]._send(ch);
	}
}

DisplaySection.prototype.set_default = function(def)
{
	this._character_map[def] || 0;
}

/////////////////////////////////////////////////////////////////////////////
//A notifier that collects a grid of buttons

function Grid(width, height, name)
{
	Notifier.call( this, name );
	var self = this;
	this.width = function(){return width;}
	this.height = function(){return height;}
	this.size = function(){return width * height;}
	this._name = name;
	var contents = [];
	for(var i = 0; i < width; i++)
	{
		contents[i] = [];
		for(var j = 0; j < height; j++)
		{
			contents[i][j] = undefined;
		}
	}
	this._grid = contents;
	this.receive = function(button){self.notify(button);}
}

Grid.prototype = new Notifier();

Grid.prototype.constructor = Grid;

Grid.prototype.controls = function()
{
	var buttons = [];
	for(var x in this._grid)
	{
		for(var y in this._grid[x])
		{
			//if(this._grid[x][y] instanceof Notifier)
			//{
				buttons.push(this._grid[x][y]);
			//}
		}
	}
	return buttons;
}

Grid.prototype.add_control = function(x, y, button)
{
	if(x < this.width())
	{
		if(y < this.height())
		{
			if(button instanceof Notifier)
			{
				this._grid[x][y] = button;
				button._grid[this._name] = {x:x, y:y, obj:this};
				button.add_listener(this.receive);
			}
		}
	}
}

Grid.prototype.send = function(x, y, value)
{
	this._grid[x][y].send(value);
}

Grid.prototype.get_button = function(x, y)
{
	var button = undefined;
	if(this._grid[x])
	{
		if(this._grid[x][y])
		{
			button = this._grid[x][y];
		}
	}
	return button;
}

Grid.prototype.reset = function()
{
	var buttons = this.controls();
	for (index in buttons)
	{
		if(buttons[index] instanceof Notifier)
		{
			buttons[index].reset();
		}
	}
}

Grid.prototype.clear_buttons = function()
{
	var buttons = this.controls();
	for (var i in buttons)
	{
		if(buttons[i] instanceof Notifier)
		{
			buttons[i].remove_listener(this.receive);
			delete buttons[i]._grid[this._name];
		}
	}
	var contents = [];
	for(var i = 0; i < this.width(); i++)
	{
		contents[i] = [];
		for(var j = 0; j < this.height(); j++)
		{
			contents[i][j] = undefined;
		}
	}
	this._grid = contents;
}

Grid.prototype.sub_grid = function(subject, x_start, x_end, y_start, y_end)
{
	for(var x=0;x<(x_end-x_start);x++)
	{
		for(var y=0;y<(y_end-y_start);y++)
		{
			var button = subject.get_button(x+x_start, y+y_start);
			//post('adding button', button._name);
			this.add_control(x, y, button);
		}
	}
	return this;
}

Grid.prototype.clear_translations = function()
{
	var buttons = this.controls();
	for(var index in buttons)
	{
		if(buttons[index])
		{
			buttons[index].set_translation(-1);
		}
	}
}

/////////////////////////////////////////////////////////////////////////////
//Mode is a notifier that automatically updates buttons when its state changes

function Mode(number_of_modes, name)
{
	Notifier.call( this, name);
	var self = this;
	this._value = 0;
	this._mode_callbacks = new Array(number_of_modes);
	this.mode_buttons = [];
	this.mode_cycle_button = undefined;
	this.mode_cycle_value = function(button)
	{
		if(button.pressed())
		{
			self.change_mode((self._value + 1) % self._mode_callbacks.length)
			self.notify();
		}
	}
	this.mode_value = function(button)
	{
		if(button.pressed())
		{
			self.change_mode(self.mode_buttons.indexOf(button));
			self.notify();
		}
	}
	this.toggle_value = function(button)
	{
		self.change_mode(button._value);
		self.notify();
	}
	this.mode_toggle = new ToggledParameter(this._name + '_Mode_Toggle', {'onValue':colors.BLUE, 'offValue':colors.CYAN, 'value':0});
	this.mode_toggle.add_listener(self.toggle_value);
}

Mode.prototype = new Notifier();

Mode.prototype.constructor = Mode;

Mode.prototype.change_mode = function(value, force)
{
	if (value < (this._mode_callbacks.length))
	{
		if((this._value != value)||(force))
		{
			this._value = value;
			this.update();
		}
	}
}

Mode.prototype.update = function()
{
	var callback = this._mode_callbacks[this._value];
	if(callback)
	{
		try
		{
			callback();
		}
		catch(err)
		{
			post('callback error:', err, 'for mode index', this._value,'for', this._name, 'mode component');
		}
	}
	for(var i in this.mode_buttons)
	{
		if (i == this._value)
		{

			this.mode_buttons[i].turn_on();
		}
		else
		{
			this.mode_buttons[i].turn_off();
		}
	}
}

Mode.prototype.add_mode = function(mode, callback)
{
	if (mode < this._mode_callbacks.length)
	{
		this._mode_callbacks[mode] = callback;
	}
}

Mode.prototype.set_mode_buttons = function(buttons)
{
	if (((buttons == undefined)||(buttons.length == this._mode_callbacks.length))&&(buttons != this.mode_buttons))
	{
		for (var i in this.mode_buttons)
		{
			this.mode_buttons[i].remove_target(this.mode_value);
		}
		if(!buttons)
		{
			buttons = [];
		}
		this.mode_buttons = [];
		for (var i in buttons)
		{
			this.mode_buttons.push(buttons[i]);
			buttons[i].set_target(this.mode_value);
		}
		//post('mode buttons length: ' + this._name + ' ' + this.mode_buttons.length)
	}
}

Mode.prototype.set_mode_cycle_button = function(button)
{
	if(this.mode_cycle_button)
	{
		this.mode_cycle_button.remove_target(this.mode_cycle_value);
	}
	this.mode_cycle_button = button;
	if(button)
	{
		button.set_target(this.mode_cycle_value);
	}
}

Mode.prototype.current_mode = function()
{
	return(this._value)
}

/////////////////////////////////////////////////////////////////////////////
//Parameter is a notifier that automatically updates its listeners when its state changes
//It can either reflect an internal state or a JavaObject's value, and can be assigned a control

function Parameter(name, args)
{
	Notifier.call( this, name );
	var self = this;
	this._name = name;
	this._parameter = undefined;
	this._num = 0;
	this._value = 0;
	this._onValue = 127;
	this._offValue = 0;
	this._text_length = 10;
	this._unassigned = 'None';
	for (var i in args)
	{
		this['_'+i] = args[i];
	}
	this.receive = function(value)
	{
		self._value = value;
		self.update_control();
		self.notify();
	}
	this.set_value = function(value)
	{
		self.receive(value);
	}
	this.update_control = function(){if(self._control){self._control.send(Math.floor(self._value));}}
	this._Callback = function(obj){if(obj){self.receive(obj._value);}}
	this.set_control = function(control)
	{
		if (control instanceof(Notifier) || !control)
		{
			if(self._control)
			{
				self._control.remove_target(self._Callback);
			}
			self._control = control;
			if(self._control)
			{
				self._control.set_target(self._Callback);
				//self.receive(self._value);
				self.update_control();
			}
		}
	}
	if(this._javaObj)
	{
		if(this._action){this._Callback = function(obj){if(obj._value){self._javaObj[self._action]();}}}
		if(this._monitor){this._javaObj[this._monitor](this.receive);}
		if(this._monitor_text){this._javaObj[this._monitor_text](this._text_length, this._unassigned, this.receive);}
	}
}

Parameter.prototype = new Notifier();

Parameter.prototype.constructor = Parameter;

Parameter.prototype.set_on_off_values = function(onValue, offValue)
{
	this._onValue = onValue||127;
	this._offValue = offValue||0;
}


function ArrayParameter(name, args)
{
	Parameter.call( this, name );
	var self = this;
	for (var i in args)
	{
		this['_'+i] = args[i];
	}
	this.receive = function(value)
	{
		post('array change', arguments, arrayfromargs(arguments));
		if(arguments.length>1)
		{
			self._value = arrayfromargs(arguments);
		}
		else
		{
			self._value = value;
		}
		self.update_control();
		self.notify();
	}
}

ArrayParameter.prototype = new Parameter();

ArrayParameter.prototype.constructor = ArrayParameter;


function ToggledParameter(name, args)
{
	Parameter.call( this, name, args );
	var self = this;
	this._Callback = function(obj)
	{
		if(obj._value)
		{
			if(self._javaObj)
			{
				self._javaObj[self._action]();
			}
			else
			{
				self.receive(Math.abs(self._value - 1));
			}
		}
	}
	this.update_control = function(value)
	{
		if(self._control){self._control.send(self._value ? self._onValue : self._offValue);}
	}
}

ToggledParameter.prototype = new Parameter();

ToggledParameter.prototype.constructor = ToggledParameter;


function RangedParameter(name, args)
{
	Parameter.call( this, name, args );
	var self = this;
	this._range = this._range||128;
	this._Callback = function(obj)
	{
		if(obj._value!=undefined)
		{
			if(self._javaObj)
			{
				//post('Callback', self._name, obj._value);
				self._javaObj.set(obj._value, self._range);
			}
			else
			{
				self.receive(Math.floor((obj._value/127)*self._range));
			}
		}
	}
	if(this._javaObj)
	{
		this._javaObj.addValueObserver(this._range, this.receive);
	}
	else
	{
		this.update_control = function(){if(self._control){self._control.send(Math.floor((self._value/self._range)*127));}}
	}
}

RangedParameter.prototype = new Parameter();

RangedParameter.prototype.constructor = RangedParameter;


function DelayedRangedParameter(name, args)
{
	this._delay = 1;
	RangedParameter.call( this, name, args );
	var self = this;
	this.receive = function(value)
	{
		self._value = value;
		self.update_control();
		tasks.addTask(self.delayed_receive, [value], self._delay);
	}
	this.delayed_receive = function(value)
	{
		if(value == self._value)
		{
			self.notify();
		}
	}
}

DelayedRangedParameter.prototype = new RangedParameter();

DelayedRangedParameter.prototype.constructor = DelayedRangedParameter;

/////////////////////////////////////////////////////////////////////////////
//Notifier that uses two buttons to change an offset value

function OffsetComponent(name, minimum, maximum, initial, callback, onValue, offValue, increment)
{
	Notifier.call(this, name)
	var self = this;
	this._min = minimum?minimum:0;
	this._max = maximum?maximum:127;
	this._value = initial?initial:0;
	this._increment = increment?increment:1;
	this._incButton;
	this._decButton;
	this._onValue = onValue||127;
	this._offValue = offValue||0;
	this._displayValues = [this._onValue, this._offValue];
	this._scroll_hold = true;
	this.incCallback = function(obj)
	{
		if((self._enabled)&&(obj._value>0))
		{
			self._value = Math.min(self._value + self._increment, self._max);
			self._update_buttons();
			self.notify();
			if(self._scroll_hold)
			{
				tasks.addTask(self.incCallback, [obj], 1, false, self._name+'_UpHoldKey');
			}
		}
	}
	this.decCallback = function(obj)
	{
		if((self._enabled)&&(obj._value>0))
		{
			self._value = Math.max(self._value - self._increment, self._min);
			self._update_buttons();
			self.notify();
			if(self._scroll_hold)
			{
				tasks.addTask(self.decCallback, [obj], 1, false, self._name+'_DnHoldKey');
			}
		}
	}
	this.set_value = function(value)
	{
		self._value = Math.max(Math.min(value, self._max), self._min);
		self._update_buttons();
		self.notify();
	}
	this._update_buttons = function()
	{
		if(self._incButton)
		{
			if((self._value<self._max)&&(self._enabled))
			{
				self._incButton.send(self._onValue);
			}
			else
			{
				self._incButton.send(self._offValue);
			}
		}
		if(self._decButton)
		{
			if((self._value>self._min)&&(self._enabled))
			{
				self._decButton.send(self._onValue);
			}
			else
			{
				self._decButton.send(self._offValue);
			}
		}
	}
	if(callback!=undefined)
	{
		this.set_target(callback);
	}
}

OffsetComponent.prototype = new Notifier();

OffsetComponent.prototype.constructor = OffsetComponent;

OffsetComponent.prototype.set_inc_dec_buttons = function(incButton, decButton)
{
	if (incButton instanceof(Notifier) || !incButton)
	{
		if(this._incButton)
		{
			this._incButton.remove_target(this.incCallback)
		}
		this._incButton = incButton;
		if(this._incButton)
		{
			this._incButton.set_target(this.incCallback)
		}
	}
	if (decButton instanceof(Notifier) || !decButton)
	{
		if(this._decButton)
		{
			this._decButton.remove_target(this.decCallback)
		}
		this._decButton = decButton;
		if(this._decButton)
		{
			this._decButton.set_target(this.decCallback)
		}
	}
	this._update_buttons();
}

OffsetComponent.prototype.set_enabled = function(val)
{
	this._enabled = (val>0);
	this._update_buttons();
}


/////////////////////////////////////////////////////////////////////////////
//Notifier that uses two buttons to change an offset value

function RadioComponent(name, minimum, maximum, initial, callback, onValue, offValue)
{
	Notifier.call(this, name)
	var self = this;
	this._min = minimum||0;
	this._max = maximum||1;
	this._value = initial||0;
	this._buttons = [];
	this._onValue = onValue||127;
	this._offValue = offValue||0;
	this._displayValues = [this._onValue, this._offValue];
	this._Callback = function(obj)
	{
		if(obj._value)
		{
			var val = self._buttons.indexOf(obj);
			self.set_value(val);
		}
	}
	this.receive = function(value)
	{
		self.set_value(value);
	}
	this.set_controls = function(control)
	{
		control = (control instanceof Array) ? control : [];
		for(var i in self._buttons)
		{
			self._buttons[i].remove_target(self._Callback);
		}
		self._buttons = control;
		if(self._buttons)
		{
			for(var i in self._buttons)
			{
				self._buttons[i].set_target(self._Callback);
			}
			self.update_controls();
		}
	}
	this.set_value = function(value)
	{
		self._value = Math.max(Math.min(value, self._max), self._min);
		self.update_controls();
		self.notify();
	}
	this.update_controls = function()
	{
		for(var i in self._buttons)
		{
			self._buttons[i].send(self._buttons.indexOf(self._buttons[i])==self._value ? self._onValue : self._offValue);
		}
	}
	if(callback!=undefined)
	{
		this.set_target(callback);
	}
}

RadioComponent.prototype = new Notifier();

RadioComponent.prototype.constructor = Notifier;

RadioComponent.prototype.set_enabled = function(val)
{
	this._enabled = (val>0);
	this._update_controls();
}


/////////////////////////////////////////////////////////////////////////////
//PageStack is a Mode subclass that handles entering/leaving pages automatically

function PageStack(number_of_modes, name)
{
	Mode.call( this, number_of_modes, name);
	this._pages = new Array(number_of_modes);
}

PageStack.prototype = new Mode();

PageStack.prototype.constructor = PageStack;

PageStack.prototype.add_mode = function(mode, page)
{
	if ((page instanceof Page) && (mode < this._mode_callbacks.length))
	{
		this._pages[mode] = page;
	}
	else
	{
		post('Invalid add_mode assignment for', this._name, mode, ':', page);
	}
}

PageStack.prototype.change_mode = function(value, force)
{
	if (value < (this._mode_callbacks.length))
	{
		if((this._value != value)||(force))
		{
			this._pages[this._value].exit_mode();
			this._value = value;
			this._pages[this._value].enter_mode();
			this.update();
		}
	}
}

PageStack.prototype.current_page = function()
{
	return(this._pages[this.current_mode()]);
}

PageStack.prototype.restore_mode = function()
{
	this.change_mode(this._value, true);
}


/////////////////////////////////////////////////////////////////////////////
//Page holds a controls dict that can hash a control to an internal function

function Page(name)
{
	var self = this;
	this._name = name;
	this._this = this;
	this._controls = {};
	this.active = false;
	this._shifted = false;
	this.controlInput = function(control){self.control_input(control);}
	this._shiftValue = function(obj)
	{
		post(this._name, '_shiftValue:', obj, obj._value);
		var new_shift = false;
		if(obj)
		{
			new_shift = obj._value > 0;
		}
		if(new_shift != self._shifted)
		{
			self._shifted = new_shift;
			self.update_mode();
		}
	}
}

Page.prototype.enter_mode = function()
{
	post(this._name, ' entered!');
}

Page.prototype.exit_mode = function()
{
	post(this._name, ' exited!');
}

Page.prototype.update_mode = function()
{
	post(this._name, ' updated!');
}

Page.prototype.refresh_mode = function()
{
	this.exit_mode();
	this.enter_mode();
}

Page.prototype.set_shift_button = function(button)
{
	if ((button != this._shift_button)&&(button instanceof(Notifier) || !button))
	{
		if(this._shift_button)
		{
			this._shift_button.remove_target(this._shiftValue);
			this._shifted = false;
		}
		this._shift_button = button;
		if(this._shift_button)
		{
			this._shift_button.set_target(this._shiftValue);
		}
	}
}

Page.prototype.control_input = function(control)
{
	post('Page: ', this._name, 'recieved control input ', control._name);
	if(control in this._controls)
	{
		this._controls[control](control);
	}
}

Page.prototype.register_control = function(control, target)
{
	if (control instanceof Grid)
	{
		var grid_controls = control.controls();
		for(index in grid_controls)
		{
			this._controls[grid_controls[index]] = target;
		}
		post('grid added to ', this._name, 's control dict');
	}
	else if(control instanceof FaderBank)
	{
		post('faderbank found......');
		var faderbank_controls = control.controls();
		for(index in faderbank_controls)
		{
			this._controls[faderbank_controls[index]] = target;
		}
		post('faderbank added to ', this._name, 's control dict');
	}
	else if(control instanceof Control)
	{
		this._controls[control] = target;
		post('control: ', control._name, ' added to ', this._name, 's control dict');
	}
}


/////////////////////////////////////////////////////////////////////////////
//Storage objects contained in ClipLaunchComponent

function ClipSlotComponent(name, args)
{
	Parameter.call( this, name, args )
	var self = this;
	this._session = this._clipLauncher._session;
	this.hasContent = false;
	this.isPlaying = false;
	this.isQeued = false;
	this.isRecording = false;
	this.isSelected = false;
}

ClipSlotComponent.prototype = new Parameter();

ClipSlotComponent.prototype.constructor = ClipSlotComponent;

ClipSlotComponent.prototype.update = function()
{
	this._value = this.isRecording ? this._session.colors().isRecordingColor :
		this.isPlaying ? this._session.colors().isPlayingColor :
		this.isQueued ? this._session.colors().isQueuedColor :
		this.hasContent ? this._session.colors().hasContentColor :
		this._session.colors().isEmptyColor;
	this.notify();
}


/////////////////////////////////////////////////////////////////////////////
//Clip controller for each track contained in SessionComponent

function ClipLaunchComponent(name, height, clipLauncher, session)
{
	Notifier.call( this, name )
	var self = this;
	this._name = name;
	this._session = session;
	this._clipLauncher = clipLauncher;
	this._selected_slot = 0;
	this._playing_slot = 0;
	//this._clipLauncher.setIndication(true);
	this._clipslots = new Array(height);
	this.launch = function(clipslot)
	{
		clipLauncher.launch(clipslot);
		//clipLauncher.select(clipslot);
	}
	this._hasContentListener = function(clipslot, value)
	{
		var clipslot = 	self._clipslots[clipslot];
		if(clipslot)
		{
			clipslot.hasContent = value;
			clipslot.update();
		}
	}
	this._isPlayingListener = function(clipslot, value)
	{
		if(value)
		{
			self._playing_slot = clipslot;
		}
		var clipslot = 	self._clipslots[clipslot];
		if(clipslot)
		{
			clipslot.isPlaying = value;
			clipslot.update();
		}
	}
	this._isQueuedListener = function(clipslot, value)
	{
		var clipslot = 	self._clipslots[clipslot];
		if(clipslot)
		{
			clipslot.isQueued = value;
			clipslot.update();
		}
	}
	this._isRecordingListener = function(clipslot, value)
	{
		var clipslot = 	self._clipslots[clipslot];
		if(clipslot)
		{
			clipslot.isRecording = value;
			clipslot.update();
		}
	}
	this._isSelectedListener = function(clipslot, value)
	{
		if(value)
		{
			self._selected_slot = clipslot;
		}
		var clipslot = 	self._clipslots[clipslot];
		if(clipslot)
		{
			clipslot.isSelected = value;
			clipslot.update();
		}
	}

	this.set_indication = function(val)
	{
		self._clipLauncher.setIndication(val>0);
	}

	for (var c = 0; c < height; c++)
	{
		this._clipslots[c] = new ClipSlotComponent(this._name + '_ClipSlot_' + c, {clipLauncher:this});
		this._clipLauncher.addHasContentObserver(this._hasContentListener);
		this._clipLauncher.addIsPlayingObserver(this._isPlayingListener);
		this._clipLauncher.addIsQueuedObserver(this._isQueuedListener);
		this._clipLauncher.addIsRecordingObserver(this._isRecordingListener);
		this._clipLauncher.addIsSelectedObserver(this._isSelectedListener);
	}
}

ClipLaunchComponent.prototype = new Notifier();

ClipLaunchComponent.prototype.constructor = ClipLaunchComponent;

ClipLaunchComponent.prototype.get_clipslot = function(slot)
{
	return this._clipslots[slot];
}


/////////////////////////////////////////////////////////////////////////////
//Component containing tracks and scenes, assignable to grid

function SessionComponent(name, width, height, trackBank, _colors, mastertrack)
{
	var self = this;
	this._name = name;
	this._grid = undefined;
	this._colors = _colors||{'hasContentColor': colors.WHITE,
					'isPlayingColor':colors.GREEN,
					'isQueuedColor' : colors.YELLOW,
					'isRecordingColor' : colors.RED,
					'isEmptyColor' : colors.OFF,
					'navColor' : colors.BLUE};
	this._trackBank = trackBank;
	this._sceneBank = trackBank.sceneBank();
	this._indication_depends_on_grid_assignment = true;

	this._tracks = [];
	this.width = function(){return width}
	this.height = function(){return height}
	for (var t = 0; t < width; t++)
	{
		var track = trackBank.getChannel(t);
		this._tracks[t] = new ClipLaunchComponent(this._name + '_ClipLauncher_' + t, height, track.getClipLauncherSlots(), this);
	}
	var masterTrack = masterTrack ? masterTrack : host.createMasterTrackSection(height);
	//post('type:', masterTrack.type);
	this._tracks[width] = new ClipLaunchComponent(this._name + '_ClipLauncher_Master', height, masterTrack.getClipLauncherSlots(), this);

	this.receive_grid = function(button){if(button.pressed()){self._tracks[button._x(self._grid)].launch(button._y(self._grid));}}


	this._nav_up_listener = function(obj){post('obj:', obj._value);if(obj._value){self._sceneOffset.set_value(self._sceneOffset._value +=1)};}
	this._nav_dn_listener = function(obj){post('obj:', obj._value);if(obj._value){self._sceneOffset.set_value(self._sceneOffset._value -=1)};}
	this._nav_lt_listener = function(obj){if(obj._value){self._trackOffset.set_value(self._trackOffset._value -=1)};}
	this._nav_rt_listener = function(obj){if(obj._value){self._trackOffset.set_value(self._trackOffset._value +=1)};}

	this._navUp = new ToggledParameter(this._name + '_NavUp', {num:0, javaObj:this._sceneBank, action:'scrollPageForwards', onValue:this._colors.navColor});

	this._navDn = new ToggledParameter(this._name + '_NavDown', {num:1, javaObj:this._sceneBank, action:'scrollPageBackwards', onValue:this._colors.navColor});

	this._navLt = new ToggledParameter(this._name + '_NavLeft', {num:2, javaObj:this._trackBank, action:'scrollPageBackwards', onValue:this._colors.navColor});

	this._navRt = new ToggledParameter(this._name + '_NavRight', {num:3, javaObj:this._trackBank, action:'scrollPageForwards', onValue:this._colors.navColor});

	//this._zoom = new SessionZoomComponent('SessionZoomTrackBank', this, width, height);

	this._offsetUpdate = function(i){post('ZoomUpdate', self._trackOffset._value, self._sceneOffset._value);}

	this._trackOffset = new Parameter(this._name + '_trackOffset', {javaObj:this._trackBank});
	this._trackOffset._javaObj.addTrackScrollPositionObserver(this._trackOffset.receive, 0);
	this._trackOffset.add_listener(this._offsetUpdate);

	this._sceneOffset = new Parameter(this._name + '_sceneOffset', {javaObj:this._trackBank});
	this._sceneOffset._javaObj.addSceneScrollPositionObserver(this._sceneOffset.receive, 0);
	this._sceneOffset.add_listener(this._offsetUpdate);

	this._onSceneLaunch = function(obj)
	{
		self._trackBank.launchScene(obj._value);
	}
	this._scene_launch = new RadioComponent(this._name + '_SceneLaunch', 0, height, 0, this._onSceneLaunch, colors.BLUE, colors.BLUE);

	this._cursorTrack = host.createCursorTrackSection(0, 256);

	this._selectedTrack = new ClipLaunchComponent(this._name + '_SelectedClipLauncher', height, this._cursorTrack.getClipLauncherSlots(), this);
	this._onSlotChange = function(obj)
	{
		self._slot_select._value = self._selectedTrack._clipLauncher._selected_slot;
	}

	this._selectedSlot = new Parameter(this._name + '_SelectedSlot', {javaObj:this._selectedTrack._clipLauncher});
	this._selectedSlot.add_listener(this._onSlotChange);

	this._selectNewSlot = function(obj)
	{
		//post('select new slot', obj._value);
		self._selectedSlot._javaObj.select(obj._value);
		self._selectedSlot._javaObj.showInEditor(obj._value);
		if(self._selectedTrack._clipslots[obj._value] && self._selectedTrack._clipslots[obj._value].hasContent)
		{
			self._selectedSlot._javaObj.launch(obj._value);
		}
		else
		{
			self._selectedSlot._javaObj.stop();
		}
	}
	this._slot_select = new OffsetComponent(this._name + '_SelectedSlot', 0, 256, 0, this._selectNewSlot, colors.YELLOW);

	this._track_up = new Parameter(this._name + '_Track_Up', {javaObj:this._cursorTrack, action:'selectNext', onValue:colors.YELLOW});
	this._track_down = new Parameter(this._name + '_Track_Dn', {javaObj:this._cursorTrack, action:'selectPrevious', onValue:colors.YELLOW});

	this._recordClip_listener = function(obj)
	{
		if(obj._value){self._selectedSlot._javaObj.launch(self._selectedTrack._selected_slot);}
	}
	this._record_clip = new Parameter(this._name + '_RecordClip', {onValue:colors.RED, offValue:colors.RED});
	this._record_clip.update_control = function(){if(self._record_clip._control){self._record_clip._control.send(self._record_clip._value ? self._record_clip._onValue : self._record_clip._offValue);}}
	this._record_clip.add_listener(this._recordClip_listener);

	this._preset_clip_length = new OffsetComponent(this._name + '_PresetClipLength', 1, 64, 4, undefined, colors.BLUE);

	this._createClip_listener = function(obj)
	{
		if(obj._value){self._selectedSlot._javaObj.createEmptyClip(self._selectedTrack._selected_slot, self._preset_clip_length._value);}
	}
	this._create_clip = new Parameter(this._name + '_CreateClip', {onValue:colors.GREEN, offValue:colors.GREEN});
	this._create_clip.update_control = function(){if(self._create_clip._control){self._create_clip._control.send(self._create_clip._value ? self._create_clip._onValue : self._create_clip._offValue);}}
	this._create_clip.add_listener(this._createClip_listener);

	this._updateSelectedSlot = function()
	{
		post('update selected slot');
		var slot = self._selectedTrack._selected_slot;
		self._selectedSlot._value = slot;
		if(tasks){tasks.addTask(self._delayed_update_selected_slot, [slot], 1, false, 'select_slot');}
		//if(tasks){tasks.addTask(self._selectedSlot._javaObj.showInEditor, [slot], 1, false, 'display_slot');}
		//self._selectedSlot._javaObj.select(slot);
		//self._selectedSlot._javaObj.showInEditor(slot);
	}
	this._selected_track = new Parameter('selected_track_listener', {javaObj:this._cursorTrack, monitor:'addIsSelectedObserver'});
	this._selected_track.add_listener(this._updateSelectedSlot);

	this._selected_track_is_group = new Parameter('selected_track_is_group_listener', {javaObj:this._cursorTrack, monitor:'addIsGroupObserver'});
	this.select_playing_clip = function()
	{
		//post('select_playing_clip');
		var isPlaying = false;
		var hasSelection = false;
		for(var i in self._selectedTrack._clipslots)
		{
			if(self._selectedTrack._clipslots[i].isPlaying)
			{
				self._cursorTrack.getClipLauncherSlots().select(i);
				isPlaying = true;
				break;
			}
		}
		if(!isPlaying)
		{
			for(var i in self._selectedTrack._clipslots)
			{
				if(self._selectedTrack._clipslots[i].hasContent)
				{
					self._cursorTrack.getClipLauncherSlots().select(i);
				}
			}
		}
	}

	this._delayed_update_selected_slot = function(slot)
	{
		if(!self._selected_track_is_group._value)
		{
			self._selectedSlot._javaObj.select(slot);
			self._selectedSlot._javaObj.showInEditor(slot);
		}
		else
		{
			post('cant update slot because selected track is group, there is a bug in the BWAPI');
			//self._selectedSlot._javaObj.select(slot);
			//self._selectedSlot._javaObj.showInEditor(slot);
		}
	}
}

SessionComponent.prototype.set_indication = function(value)
{
	for (var track in this._tracks)
	{
		this._tracks[track].set_indication(value);
	}
}

SessionComponent.prototype.assign_grid = function(new_grid)
{
	if(this._grid!=undefined)
	{
		this._grid.remove_target(this.receive_grid);
		for (var track in this._tracks)
		{
			this._indication_depends_on_grid_assignment ? this._tracks[track].set_indication(false) : {};
			this._tracks[track].set_indication(false);
			for(var slot in this._tracks[track]._clipslots)
			{
				var button = this._grid.get_button(track, slot);
				if(button)
				{
					var clipslot = this._tracks[track]._clipslots[slot];
					clipslot.remove_target(button.receive_notifier);
				}
			}
		}
		this._grid = undefined;
	}
	if (new_grid instanceof Grid)
	{
		this._grid = new_grid;
		this._grid.set_target(this.receive_grid);
		for (var track in this._tracks)
		{
			this._indication_depends_on_grid_assignment ? this._tracks[track].set_indication(true) : {};
			this._tracks[track].set_indication(true);
			for(var slot in this._tracks[track]._clipslots)
			{
				var button = this._grid.get_button(track, slot);
				if(button)
				{
					var clipslot = this._tracks[track]._clipslots[slot];
					clipslot.set_target(button.receive_notifier);
					clipslot.update();
				}
			}
		}
	}
}

SessionComponent.prototype.display_pane = function(state)
{
	state = state||false;
	for (var track in this._tracks)
	{
		this._tracks[track].set_indication(state);
	}
}

SessionComponent.prototype.colors = function()
{
	return this._colors;
}

SessionComponent.prototype.set_nav_buttons = function(button0, button1, button2, button3)
{
	this._navUp.set_control(button0);
	this._navDn.set_control(button1);
	this._navLt.set_control(button2);
	this._navRt.set_control(button3);
}

SessionComponent.prototype.set_verbose = function(val)
{
	val = val > 0;
	this._navUp._display_value = val;
	this._navDn._display_value = val;
	this._navLt._display_value = val;
	this._navRt._display_value = val;
	this._create_clip._display_value = val;
	this._record_clip._display_value = val;
	this._track_up._display_value = val;
	this._track_down._display_value = val;
	this._slot_select._display_value = val;
	this._scene_launch._display_value = val;
}

/////////////////////////////////////////////////////////////////////////////
//Component for navigating the SessionComponent while shifted

function SessionZoomComponent(name, session, width, height, _colors)
{
	var self = this;
	this._name = name;
	this._session = session;
	this.width = function(){return width}
	this.height = function(){return height}
	this._grid = undefined;
	this._colors = _colors||{'hasContentColor': colors.WHITE,
					'isPlayingColor':colors.GREEN,
					'isQueuedColor' : colors.YELLOW,
					'isRecordingColor' : colors.RED,
					'isEmptyColor' : colors.OFF,
					'navColor' : colors.BLUE};
	this._trackBank = host.createMainTrackBankSection(width*width, 0, height*height);

	this._update = function()
	{
		post('ZoomUpdate', this._trackOffset._value, this._sceneOffset._value);
	}

	this._trackOffset = new Parameter(this._name + '_trackOffset', {num:0, javaObj:this._trackBank, monitor:'addTrackScrollPositionObserver'});
	this._sceneOffset = new Parameter(this._name + '_sceneOffset', {num:0, javaObj:this._trackBank, monitor:'addSceneScrollPositionObserver'});

	this.receive_grid = function(button){if(button.pressed()){/*self._tracks[button._x(self._grid)].launch(button._y(self._grid));*/}}

}

SessionZoomComponent.prototype.assign_grid = function(new_grid)
{
	if(this._grid!=undefined)
	{
		this._grid.remove_target(this.receive_grid);
		/*for (var track in this._tracks)
		{
			for(var slot in this._tracks[track]._clipslots)
			{
				var clipslot = this._tracks[track]._clipslots[slot];
				var button = this._grid.get_button(track, slot);
				clipslot.remove_target(button.receive_notifier);
			}
		}*/
		this._grid = undefined;
	}
	if ((new_grid instanceof Grid) && (new_grid.width() == this.width()) && (new_grid.height() == this.height()))
	{
		this._grid = new_grid;
		this._grid.set_target(this.receive_grid);
		/*for (var track in this._tracks)
		{
			for(var slot in this._tracks[track]._clipslots)
			{
				var clipslot = this._tracks[track]._clipslots[slot];
				var button = this._grid.get_button(track, slot);
				clipslot.set_target(button.receive_notifier);
				clipslot.update();
			}
		}*/
	}
}


/////////////////////////////////////////////////////////////////////////////
//Component containing tracks from trackbank and their corresponding ChannelStrips

function MixerComponent(name, num_channels, num_returns, trackBank, returnBank, cursorTrack, masterTrack, _colors)
{
	var self = this;
	this._name = name;

	this._trackBank = trackBank;
	if(!this._trackBank){this._trackBank = host.createMainTrackBank(num_channels, num_returns, 0);}

	this._cursorTrack = cursorTrack;
	if(!this._cursorTrack){this._cursorTrack = host.createCursorTrackSection(num_channels, 0);}

	this._returnBank = returnBank;
	if(!this._returnBank){this._returnBank = host.createEffectTrackBankSection(num_returns, 0);}

	this._masterTrack = masterTrack;
	if(!this._masterTrack){this._masterTrack = host.createMasterTrackSection(0);}

	this._channelstrips = [];
	this._returnstrips = [];
	for (var cs = 0;cs < num_channels; cs++)
	{
		this._channelstrips[cs] = new ChannelStripComponent(this._name + '_ChannelStrip_' + cs, cs, this._trackBank.getChannel(cs), num_returns, _colors);
	}
	for (var rs = 0;rs < num_returns; rs++)
	{
		this._returnstrips[rs] = new ChannelStripComponent(this._name + '_ReturnStrip_' + rs, rs, this._returnBank.getChannel(rs), 0, _colors);
	}
	this._selectedstrip = new ChannelStripComponent(this._name + '_SelectedStrip', -1, this._cursorTrack, num_returns, _colors);
	this._selectedstrip._clip_navigator = new OffsetComponent(this._name + '_clip_navigator', 0, 119, 4, this._update, colors.MAGENTA);
	this._masterstrip = new ChannelStripComponent(this._name + '_MasterStrip', -2, this._masterTrack, 0, _colors);

	//this._nav_lt_listener = function(obj){if(obj._value){self._trackOffset.set_value(self._trackOffset._value -=1)};}
	//this._nav_rt_listener = function(obj){if(obj._value){self._trackOffset.set_value(self._trackOffset._value +=1)};}

	this._navLt = new ToggledParameter(this._name + '_NavLeft', {num:0, javaObj:this._cursorTrack, action:'selectPrevious'});
	this._navRt = new ToggledParameter(this._name + '_NavRight', {num:1, javaObj:this._cursorTrack, action:'selectNext'});

}

MixerComponent.prototype.channelstrip = function(num)
{
	if(num < this._channelstrips.length)
	{
		return this._channelstrips[num];
	}
}

MixerComponent.prototype.returnstrip = function(num)
{
	if(num < this._returnstrips.length)
	{
		return this._returnstrips[num];
	}
}

MixerComponent.prototype.selectedstrip = function()
{
	return this._selectedstrip;
}

MixerComponent.prototype.set_nav_controls = function(navLt, navRt)
{
	this._navLt.set_control(navLt);
	this._navRt.set_control(navRt);
}

MixerComponent.prototype.assign_volume_controls = function(controls)
{
	if((controls instanceof(FaderBank))&&(controls.controls().length == this._channelstrips.length))
	{
		for (var i in this._channelstrips)
		{
			this._channelstrips[i]._volume.set_control(controls.get_fader(i));
		}
	}
	else
	{
		for (var i in this._channelstrips)
		{
			this._channelstrips[i]._volume.set_control();
		}
	}
}

MixerComponent.prototype.assign_return_controls = function(controls)
{
	for (var i in this._channelstrips)
	{
		this._returnstrips[i]._volume.set_control();
	}
}

MixerComponent.prototype.set_return_control = function(num, controls){}

MixerComponent.prototype.set_verbose = function(val)
{
	val = val>0;
	for(var i in this._channelstrips)
	{
		this._channelstrips[i].set_verbose(val);
	}
	for(var i in this._returnstrips)
	{
		this._returnstrips[i].set_verbose(val);
	}
	//this._selectedstrip.set_verbose(val);
	this._masterstrip.set_verbose(val);
}

/////////////////////////////////////////////////////////////////////////////
//Component containing tracks from trackbank and their corresponding controls, values

function ChannelStripComponent(name, num, track, num_sends, _colors)
{
	var self = this;
	this._name = name;
	this._num = num;
	this._num_sends = num_sends;
	this._track = track;
	//this._device = track.getPrimaryDevice();  //incompatible with API 2+
	this._device = track.createCursorDevice();
	this._eqdevice;

	this._colors = _colors||{'muteColor': colors.YELLOW,
					'soloColor':colors.CYAN,
					'armColor' : colors.RED,
					'selectColor' : colors.WHITE};

	this._exists = new Parameter(this._name + '_Exists', {javaObj:this._track.exists(), monitor:'addValueObserver'});

	this._isGroup = new Parameter(this._name + '_Is_Group', {javaObj:self._track, monitor:'addIsGroupObserver'});

	this._trackType = new Parameter(this._name + '_Track_Type', {javaObj:self._track.trackType(), monitor:'addValueObserver'});

	this._volume = new RangedParameter(this._name + '_Volume', {javaObj:this._track.getVolume(), range:128});

	this._pan = new RangedParameter(this._name + '_Pan', {javaObj:this._track.getPan(), range:128});

	this._mute = new ToggledParameter(this._name + '_Mute', {javaObj:this._track.getMute(), action:'toggle', monitor:'addValueObserver', onValue:colors.OFF, offValue:this._colors.muteColor});
	this._mute.update_control = function(value)
	{
		if(self._mute._control)
		{
			self._mute._control.send(!self._exists._value ? colors.OFF : self._mute._value ? self._mute._onValue :  self._mute._offValue );
		}
	}

	this._solo = new ToggledParameter(this._name + '_Solo', {javaObj:this._track.getSolo(), action:'toggle', monitor:'addValueObserver', onValue:this._colors.soloColor});
	this._solo.update_control = function(value)
	{
		if(self._solo._control)
		{
			self._solo._control.send(!self._exists._value ? colors.OFF : self._solo._value ? self._solo._onValue :  self._solo._offValue );
		}
	}

	this._arm = new ToggledParameter(this._name + '_Arm', {javaObj:this._track.getArm(), action:'toggle', monitor:'addValueObserver', onValue:this._colors.armColor});
	this._arm.update_control = function(value)
	{
		if(self._arm._control)
		{
			self._arm._control.send(!self._exists._value ? colors.OFF : self._arm._value ? self._arm._onValue :  self._arm._offValue );
		}
	}

	this._select = new ToggledParameter(this._name + '_Select', {javaObj:self._track, action:'select', monitor:'addIsSelectedObserver', onValue:this._colors.selectColor});
	//this._select._Callback = function(obj){if(obj._value){self._track.select();}}
	this._select._Callback = function(obj){
		if(obj._value){
			//if(tasks){tasks.addTask(self._delayed_select, [], 1, false, 'select_track');}
			if(self._isGroup._value)
			{
				//post(self._name, 'is group....');
				self._track.select();
			}
			else
			{
				self._track.select();
			}
		}
	}
	this._select.update_control = function(value)
	{
		if(self._select._control)
		{
			self._select._control.send(!self._exists._value ? colors.OFF : self._select._value ? self._select._onValue :  self._select._offValue );
		}
	}

	this._delayed_select = function()
	{
		self._track.select();
	}

	this._stop = new ToggledParameter(this._name + '_Stop', {javaObj:self._track, onValue:colors.BLUE, offValue:colors.BLUE});
	this._stop._Callback = function(obj){if(obj._value){self._track.stop();}}
	this._stop.update_control = function(value)
	{
		if(self._stop._control)
		{
			self._stop._control.send(!self._exists._value ? colors.OFF : self._stop._value ? self._stop._onValue : self._stop._offValue);
		}
	}

	this._track_name = new Parameter(this._name + '_Name', {javaObj:self._track});
	this._track_name._javaObj.addNameObserver(10, 'None', this._track_name.receive);

	this._send = [];
	this._send_exists = [];
	for(var i=0;i<num_sends;i++)
	{
		this._send[i] = new RangedParameter(this._name + '_Send_' + i, {num:i, javaObj:this._track.getSend(i), range:128});
		this._send_exists[i] = new Parameter(this._name + '_Send_Exists', {num:i, javaObj:this._track.getSend(i).exists(), monitor:'addValueObserver'});
	}

	this.updateControls = function()
	{
		//post('vals:', self._volumeValue, self._muteValue, self._soloValue, self._armValue);
		self.volumeListener(self._volumeValue);
		self.muteListener(self._muteValue);
		self.soloListener(self._soloValue);
		self.armListener(self._armValue);
	}

	this.createEQDeviceComponent = function(size)
	{
		self._device = new EQDeviceComponent(this);
	}

	this.createChannelDeviceComponent = function(size)
	{
		self._device = new ChannelDeviceComponent(this._name+'_channelDevice', size, this);
	}

}

ChannelStripComponent.prototype.set_verbose = function(val)
{
	val = val > 0;
	this._volume._display_value = val;
	this._pan._display_value = val;
	this._mute._display_value = val;
	this._solo._display_value = val;
	this._arm._display_value = val;
	this._select._display_value = val;
	this._stop._display_value = val;
	for(var i in this._send)
	{
		this._send[i]._diosplay_val = val;
	}
}

/////////////////////////////////////////////////////////////////////////////
//Component to control the first three Macros of a channelstrip

function EQDeviceComponent(channelstrip)
{
	var self = this;
	this._name = channelstrip._name + '_EQDevice';
	this._device = channelstrip._track.getPrimaryDevice();
	this._hi_control, this._mid_control, this._lo_control;

	this._onDeviceNameChanged = function(val)
	{
		post(self._name, '\'s Device is:', self._deviceNameObserver._value);
	}

	this._deviceNameObserver = new Parameter(this._name + '_Device_Name', {javaObj:this._device});
	this._deviceNameObserver._javaObj.addNameObserver(8, '', this._deviceNameObserver.receive);
	this._deviceNameObserver.add_listener(this._onDeviceNameChanged);
	this._hi = new RangedParameter(this._name + '_Hi', {javaObj:this._device.getMacro(0).getAmount(), range:128});
	this._mid = new RangedParameter(this._name + '_Mid', {javaObj:this._device.getMacro(1).getAmount(), range:128});
	this._lo = new RangedParameter(this._name + '_Lo', {javaObj:this._device.getMacro(2).getAmount(), range:128});

	this._update = function()
	{
		self._hi.set_control(self._hi_control);
		self._mid.set_control(self._mid_control);
		self._lo.set_control(self._lo_control);
	}

	//post('DeviceType:', channelstrip._track.getPrimaryDevice().DeviceType);
	this._canAssignListener = function(val)
	{
		post('canAssignListener:', self._name, val);
	}
	this._canAssign = new Parameter(this._name + '_Can_Assign_EQ_Observer', {javaObj:this._device});
	//this._canAssign._javaObj.addCanSwitchToDeviceObserver(this._device.DeviceType.ANY, this._device.ChainLocation.FIRST, this._canAssign.receive);
	//this._canAssign.add_listener(this._canAssignListener);

}

EQDeviceComponent.prototype.set_controls = function(hi_control, mid_control, lo_control)
{
	this._hi_control = hi_control;
	this._mid_control = mid_control;
	this._lo_control = lo_control;
	this._update();
}


/////////////////////////////////////////////////////////////////////////////
//Component containing controls for currently controlled cursorDevice

function DeviceComponent(name, size, Device)
{
	var self = this;
	this._name = name;
	this._size = size;
	this._device = Device;
	this._shared_controls = [];
	this._macro_controls = [];
	this._parameter_controls = [];
	this._parameter = [];
	this._macro = [];
	for(var i=0;i<size;i++)
	{
		this._parameter[i] = new RangedParameter(this._name + '_Parameter_' + i, {num:i, javaObj:this._device.getParameter(i), range:128});
		this._parameter[i]._javaObj.setIndication(true);
		this._parameter[i].displayed_name = new Parameter('Parameter_' + i, {num:i, javaObj:this._device.getParameter(i)});
		this._parameter[i].displayed_name._javaObj.addNameObserver(10, 'None', this._parameter[i].displayed_name.receive);
		this._parameter[i].displayed_value = new Parameter('Value_'+i, {num:i, javaObj:this._device.getParameter(i)});
		this._parameter[i].displayed_value._javaObj.addValueDisplayObserver(10, 'None', this._parameter[i].displayed_value.receive);
		this._macro[i] = new RangedParameter(this._name + '_Macro_' + i, {num:i, javaObj:this._device.getMacro(i).getAmount(), range:128});
	}

	this._navUp = new Parameter(this._name + '_NavUp', {num:0, value:1, javaObj:this._device, action:'nextParameterPage', monitor:'addNextParameterPageEnabledObserver', onValue:colors.CYAN});
	this._navDn = new Parameter(this._name + '_NavDown', {num:1, value:1, javaObj:this._device, action:'previousParameterPage', monitor:'addPreviousParameterPageEnabledObserver', onValue:colors.CYAN});
	this._navLt = new Parameter(this._name + '_NavLeft', {num:2, value:1, javaObj:this._device, action:'selectNext', monitor:'addCanSelectNextObserver', onValue:colors.BLUE});
	this._navRt = new Parameter(this._name + '_NavRight', {num:3, value:1, javaObj:this._device, action:'selectPrevious', monitor:'addCanSelectPreviousObserver', onValue:colors.BLUE});
	this._enabled = new ToggledParameter(this._name + '_Enabled', {javaObj:this._device, action:'toggleEnabledState', monitor:'addIsEnabledObserver', onValue:colors.RED});
	this._mode = new ToggledParameter(this._name + '_Mode', {onValue:colors.BLUE, offValue:colors.CYAN});

	this._device_name = new Parameter(this._name + 'Device ', {javaObj:this._device});
	this._device_name._javaObj.addNameObserver(10, 'None', this._device_name.receive);

	this._selected_page = new Parameter(this._name + '_Page', {javaObj:this._device});
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
	this._selected_page.add_listener(this._on_selected_page_changed);

	this._nextPreset = new Parameter(this._name + '_Next_Preset', {javaObj:this._device, action:'switchToNextPreset'});
	this._previousPreset = new Parameter(this._name + '_Previous_Preset', {javaObj:this._device, action:'switchToPreviousPreset'});
	this._preset_creators = new ArrayParameter(this._name + '_Preset_Creators', {javaObj:this._device, value:[], monitor:'addPresetCreatorsObserver'});
	this._preset_creator = new Parameter(this._name + '_Preset_Creator', {javaObj:this._device, monitor_text:'addPresetCreatorObserver'});
	this._preset_name = new Parameter(this._name + '_Preset_Name', {javaObj:this._device, monitor_text:'addPresetNameObserver'});


	//this._preset_creators.add_listener(function(obj){post('------preset_creators:', obj._value)});
	//this._selected_page.add_listener(function(obj){post('------selected_page:', obj._value)});

	this._update = function()
	{
		for(var i in self._parameter)
		{
			self._parameter[i].set_control();
			self._parameter[i]._javaObj.setIndication(false);
			self._macro[i].set_control();
			self._macro[i]._javaObj.setIndication(false);
		}
		if(self._shared_controls.length > 0)
		{
			var param = self._mode._value ? self._macro : self._parameter;
			if(self._size == self._shared_controls.length)
			{
				for(var i=0;i<self._size;i++)
				{
					param[i].set_control(self._shared_controls[i]);
					param[i]._javaObj.setIndication(true);
				}
			}
		}
		else
		{
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
			if(self._size == self._macro_controls.length)
			{
				for(var i=0;i<self._size;i++)
				{
					if(self._macro_controls[i] instanceof Control)
					{
						self._macro[i].set_control(self._macro_controls[i]);
						self._macro[i]._javaObj.setIndication(true);
					}
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

DeviceComponent.prototype.set_nav_buttons = function(button0, button1, button2, button3)
{
	this._navUp.set_control(button0);
	this._navDn.set_control(button1);
	this._navLt.set_control(button2);
	this._navRt.set_control(button3);
	if(button0 instanceof Button){button0.send(colors.CYAN);}
	if(button1 instanceof Button){button1.send(colors.CYAN);}
	if(button2 instanceof Button){button2.send(colors.BLUE);}
	if(button3 instanceof Button){button3.send(colors.BLUE);}
}

DeviceComponent.prototype.set_shared_controls = function(controls)
{
	var controls = (controls instanceof Array) ? controls : [];
	this._shared_controls = controls;
	this._update();
}

DeviceComponent.prototype.set_parameter_controls = function(controls)
{
	var controls = (controls instanceof Array) ? controls : [];
	this._parameter_controls = controls;
	this._update();
}

DeviceComponent.prototype.set_macro_controls = function(controls)
{
	var controls = (controls instanceof Array) ? controls : [];
	this._macro_controls = controls;
	this._update();
}

DeviceComponent.prototype.set_verbose = function(val)
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
	this._navUp._display_value = val;
	this._navDn._display_value = val;
	this._navLt._display_value = val;
	this._navRt._display_value = val;
	this._enabled._display_value = val;
	this._mode._display_value = val;
}


/////////////////////////////////////////////////////////////////////////////
//Component containing controls for currently controlled primaryDevice for a track

function ChannelDeviceComponent(name, size, channelstrip)
{
	var self = this;
	size = size||8;
	this._name = name;
	this._size = size;
	this._device = channelstrip._track.createCursorDevice('Primary');
	this._device.selectFirstInChannel(this._device.getChannel());
	this._parameter = [];
	this._macro = [];
	for(var i=0;i<size;i++)
	{
		this._parameter[i] = new RangedParameter(this._name + '_Parameter_' + i, {num:i, javaObj:this._device.getParameter(i), range:128});
		this._macro[i] = new RangedParameter(this._name + '_Macro_' + i, {num:i, javaObj:this._device.getMacro(i).getAmount(), range:128});
	}

	this._navLt = new Parameter(this._name + '_NavLeft', {num:0, value:1, javaObj:this._device, action:'selectNext', onValue:colors.BLUE});
	this._navRt = new Parameter(this._name + '_NavRight', {num:1, value:1, javaObj:this._device, action:'selectPrevious', onValue:colors.BLUE});
	this._enabled = new ToggledParameter(this._name + '_Enabled', {javaObj:this._device, action:'toggleEnabledState', monitor:'addIsEnabledObserver', onValue:colors.RED});
	this._name_callback = function(value)
	{
		post(self._name, 'device name is:', value);
	}

	this._device.addNameObserver(32, '', this._name_callback);

}

ChannelDeviceComponent.prototype.set_verbose = function(val)
{
	val = val > 0;
	for(var i in this._parameter)
	{
		this._parameter[i]._display_value = val;
	}
}


const _NOTENAMES = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];
var NOTENAMES = [];
for(var i=0;i<128;i++)
{
	NOTENAMES[i]=(_NOTENAMES[i%12] + ' ' + (Math.floor(i/12)-2) );
}

const WHITEKEYS = {0:0, 2:2, 4:4, 5:5, 7:7, 9:9, 11:11, 12:12};
const NOTES = [24, 25, 26, 27, 28, 29, 30, 31, 16, 17, 18, 19, 20, 21, 22, 23, 8, 9, 10, 11, 12, 13, 14, 15, 0, 1, 2, 3, 4, 5, 6, 7];
const DRUMNOTES = [12, 13, 14, 15, 28, 29, 30, 31, 8, 9, 10, 11, 24, 25, 26, 27, 4, 5, 6, 7, 20, 21, 22, 23, 0, 1, 2, 3, 16, 17, 18, 19];
const SCALENOTES = [36, 38, 40, 41, 43, 45, 47, 48, 24, 26, 28, 29, 31, 33, 35, 36, 12, 14, 16, 17, 19, 21, 23, 24, 0, 2, 4, 5, 7, 9, 11, 12];
const KEYCOLORS = [colors.BLUE, colors.CYAN, colors.MAGENTA, colors.RED, colors.GREEN, colors.GREEN, colors.GREEN, colors.GREEN];
const SCALES = 	{'DrumPad':[0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15],
			'Chromatic':[0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24],
			'Major':[0,2,4,5,7,9,11],
			'Minor':[0,2,3,5,7,8,10],
			'Dorian':[0,2,3,5,7,9,10],
			'Mixolydian':[0,2,4,5,7,9,10],
			'Lydian':[0,2,4,6,7,9,11],
			'Phrygian':[0,1,3,5,7,8,10],
			'Locrian':[0,1,3,4,7,8,10],
			'Diminished':[0,1,3,4,6,7,9,10],
			'Whole-half':[0,2,3,5,6,8,9,11],
			'Whole Tone':[0,2,4,6,8,10],
			'Minor Blues':[0,3,5,6,7,10],
			'Minor Pentatonic':[0,3,5,7,10],
			'Major Pentatonic':[0,2,4,7,9],
			'Harmonic Minor':[0,2,3,5,7,8,11],
			'Melodic Minor':[0,2,3,5,7,9,11],
			'Dominant Sus':[0,2,5,7,9,10],
			'Super Locrian':[0,1,3,4,6,8,10],
			'Neopolitan Minor':[0,1,3,5,7,8,11],
			'Neopolitan Major':[0,1,3,5,7,9,11],
			'Enigmatic Minor':[0,1,3,6,7,10,11],
			'Enigmatic':[0,1,4,6,8,10,11],
			'Composite':[0,1,4,6,7,8,11],
			'Bebop Locrian':[0,2,3,5,6,8,10,11],
			'Bebop Dominant':[0,2,4,5,7,9,10,11],
			'Bebop Major':[0,2,4,5,7,8,9,11],
			'Bhairav':[0,1,4,5,7,8,11],
			'Hungarian Minor':[0,2,3,6,7,8,11],
			'Minor Gypsy':[0,1,4,5,7,8,10],
			'Persian':[0,1,4,5,6,8,11],
			'Hirojoshi':[0,2,3,7,8],
			'In-Sen':[0,1,5,7,10],
			'Iwato':[0,1,5,6,10],
			'Kumoi':[0,2,3,7,9],
			'Pelog':[0,1,3,4,7,8],
			'Spanish':[0,1,3,4,5,6,8,10]};

const SCALEABBREVS = {'DrumPad':'_D', 'Chromatic':'12', 'Major':'M-','Minor':'m-','Dorian':'II','Mixolydian':'V',
			'Lydian':'IV','Phrygian':'IH','Locrian':'VH','Diminished':'d-','Whole-half':'Wh','Whole Tone':'WT','Minor Blues':'mB',
			'Minor Pentatonic':'mP','Major Pentatonic':'MP','Harmonic Minor':'mH','Melodic Minor':'mM','Dominant Sus':'D+','Super Locrian':'SL',
			'Neopolitan Minor':'mN','Neopolitan Major':'MN','Enigmatic Minor':'mE','Enigmatic':'ME','Composite':'Cp','Bebop Locrian':'lB',
			'Bebop Dominant':'DB','Bebop Major':'MB','Bhairav':'Bv','Hungarian Minor':'mH','Minor Gypsy':'mG','Persian':'Pr',
			'Hirojoshi':'Hr','In-Sen':'IS','Iwato':'Iw','Kumoi':'Km','Pelog':'Pg','Spanish':'Sp'}

var SCALENAMES = [];
var i = 0;
for (var name in SCALES){SCALENAMES[i] = name;i++};

const DEFAULT_SCALE = 'Major';

const SPLIT_SCALES = {}; //{'DrumPad':1, 'Major':1};

/////////////////////////////////////////////////////////////////////////////
//Container that holds a grid and assigns it to specific note values for triggering a DrumRack

function DrumRackComponent(name, _color)
{
	var self = this;
	this._name = name;
	this.pad_color = !_color ? colors.WHITE : _color;
	if(!this.pad_color){this.pad_color = colors.BLUE;}
	this.width = function(){return  !this._grid ? 0 : this._grid.width();}
	this.height = function(){return !this._grid ? 0 : this._grid.height();}
	this._stepsequencer;
	this._grid;
	this._last_pressed_button;
	this._held_notes = [];
	this._split_column = 4;
	this._update_request = false;
	this._notes_in_step = Array.apply(null, new Array(128)).map(Number.prototype.valueOf, 0);
	this._noteMap = new Array(128);
	for(var i=0;i<128;i++)
	{
		this._noteMap[i] = [];
	}
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

	this._onNote = function(val, num, extra)
	{
		var buf = self._noteMap[num];
		for(var i in buf)
		{
			var scale_color = buf[i].scale_color;
			if(scale_color != colors.GREEN)
			{
				buf[i].send(val ? colors.YELLOW : scale_color);
			}
		}
	}
	cursorTrack.addNoteObserver(this._onNote);

	this._button_press = function(button)
	{
		if(button.pressed())
		{
			var seq = self._stepsequencer;
			self._held_notes.unshift(button);
			if(seq)
			{
				if(seq._flip._value)
				{
					seq.toggle_note(button);
				}
				self._set_seq_offset(button);
				self._update();
			}
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

	this.notes_in_step = function(){return (self._stepsequencer && self._stepsequencer._edit_step._value> -1) ? self._stepsequencer.notes_in_step() : self._notes_in_step;}

	this._set_seq_offset = function(button)
	{
		var seq = self._stepsequencer;
		if(self._select._value && seq && !seq.notes_in_step().length)
		{
			self._last_pressed_button = button;
			seq.key_offset.set_value(button._translation);
		}
	}

	this._update = function()
	{
		self._update_request = false;
		self._noteMap = new Array(128);
		for(var i=0;i<128;i++)
		{
			self._noteMap[i] = [];
		}
		if(self._grid instanceof Grid)
		{
			//post('original upate', this.caller);
			var notes_in_step = self.notes_in_step();
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
					self._noteMap[note%127].push(button);
					button.scale_color = notes_in_step[note%127] ? colors.GREEN : note == selected ? colors.WHITE : column < self._split_column ? colors.BLUE : colors.CYAN;
					button.send(button.scale_color);
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
		//self._flush_notes();
		self._octaveOffset._value = obj._value;
		self._noteOffset._value = obj._value;
		if(self._stepsequencer instanceof StepSequencerComponent && self._last_pressed_button instanceof Button)
		{
			self._stepsequencer.key_offset.set_value(self._last_pressed_button._translation);
		}
	}

	this._noteOffset = new OffsetComponent(this._name + '_Note_Offset', 0, 119, 36, this._request_update, colors.CYAN, colors.OFF, 4);
	this._octaveOffset = new OffsetComponent(this._name + '_Note_Offset', 0, 119, 36, this._request_update, colors.YELLOW, colors.OFF, 16);

	this._noteOffset.add_listener(self._noteOffsetCallback);
	this._octaveOffset.add_listener(self._noteOffsetCallback);

	this._drumPadBank.addChannelScrollPositionObserver(this._noteOffsetCallback, -1);

	this._shift = new ToggledParameter(this._name + '_Shift');
	this._shift.add_listener(this._update);
	this._select = new ToggledParameter(this._name + '_Select', {value:1});
	this._select_only = new ToggledParameter(this._name + '_SelectOnly', {value:0});
}

DrumRackComponent.prototype.assign_grid = function(grid)
{
	post('drumrack assign grid');
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
	this._update();
	if((this._grid instanceof Grid)&&(this._stepsequencer instanceof StepSequencerComponent)&&(this._last_pressed_button._translation > -1))
	{
		this._stepsequencer.key_offset.set_value(this._last_pressed_button._translation);
	}
}

DrumRackComponent.prototype.set_stepsequencer = function(stepsequencer)
{
	if(this._stepsequencer instanceof StepSequencerComponent)
	{
		this._stepsequencer.remove_listener(this._update);
	}
	this._stepsequencer = stepsequencer;
	if(this._stepsequencer instanceof StepSequencerComponent)
	{
		this._stepsequencer._edit_step.add_listener(this._update);
	}
	this.assign_grid(this._grid);
}

DrumRackComponent.prototype.set_verbose = function(val)
{
	val = val > 0;
	this._noteOffset._display_value = val;
	this._octaveOffset._display_value = val;
}

/////////////////////////////////////////////////////////////////////////////
//Container that holds a grid and assigns it to specific note values for triggering an Instrument

function ScaleComponent(name, _colors)
{
	var self = this;
	this._name = name;
	this.pad_color = _colors;
	if(!this.pad_colors){this.pad_color = KEYCOLORS;}
	this.width = function(){return  !this._grid ? 0 : this._grid.width();}
	this.height = function(){return !this._grid ? 0 : this._grid.height();}
	this._stepsequencer;
	this._grid;
	this._last_pressed_button;
	this._held_notes = [];
	this._update_request = true;
	this._notes_in_step = Array.apply(null, new Array(128)).map(Number.prototype.valueOf, 0);
	this._noteMap = new Array(128);
	for(var i=0;i<128;i++)
	{
		this._noteMap[i] = [];
	}
	var cursorTrack = host.createCursorTrackSection(0, 0);

	this._flushNotes = function()
	{
		//how the hell we gonna do this?
		if(self._update_request)
		{
			self._update();
		}
	}

	this._onNote = function(val, num, extra)
	{
		var buf = self._noteMap[num];
		for(var i in buf)
		{
			var scale_color = buf[i].scale_color;
			if(scale_color != colors.GREEN)
			{
				buf[i].send(val ? color.YELLOW : scale_color);
			}
		}
	}
	cursorTrack.addNoteObserver(this._onNote);

	this._button_press = function(button)
	{
		if(button.pressed())
		{
			var seq = self._stepsequencer;
			self._held_notes.unshift(button);
			if(seq)
			{
				if(seq._flip._value)
				{
					seq.toggle_note(button);
				}
				self._set_seq_offset(button);
				self._update();
			}
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

	this.notes_in_step = function(){return (self._stepsequencer && self._stepsequencer._edit_step._value> -1) ? self._stepsequencer.notes_in_step() : self._notes_in_step;}

	this._set_seq_offset = function(button)
	{
		var seq = self._stepsequencer;
		if(self._select._value && seq && !seq.notes_in_step().length)
		{
			self._last_pressed_button = button;
			seq.key_offset.set_value(button._translation);
		}
	}

	this._update = function()
	{
		self._update_request = false;
		self._noteMap = [];
		for(var i=0;i<128;i++)
		{
			self._noteMap[i] = [];
		}
		if(self._grid instanceof Grid)
		{
			var keyoffset = -1;
			var notes_in_step = self.notes_in_step();
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
					self._noteMap[note%127].push(button);
					//post('note', note, 'keyoffset', keyoffset, note == keyoffset, note === keyoffset);
					button.scale_color = notes_in_step[note%127] ? colors.GREEN : note == selected ? colors.WHITE : KEYCOLORS[((note%12) in WHITEKEYS) + (((note_pos%scale_len)==0)*2)];// + ((notes_in_step[note%127])*4)];
					button.send(button.scale_color);
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
		if(self._stepsequencer instanceof StepSequencerComponent && self._last_pressed_button instanceof Button)
		{
			self._stepsequencer.key_offset.set_value(self._last_pressed_button._translation);
		}
	}

	this._vertOffset = new OffsetComponent(this._name + '_Vertical_Offset', 0, 119, 4, self._request_update, colors.MAGENTA);
	this._scaleOffset = new OffsetComponent(this._name + '_Scale_Offset', 0, SCALES.length, 3, self._request_update, colors.BLUE);
	this._noteOffset = new OffsetComponent(this._name + '_Note_Offset', 0, 119, 36, self._request_update, colors.CYAN);
	this._octaveOffset = new OffsetComponent(this._name + '_Note_Offset', 0, 119, 36, self._request_update, colors.YELLOW, colors.OFF, 12);


	this._noteOffset.add_listener(self._noteOffsetCallback);
	this._octaveOffset.add_listener(self._noteOffsetCallback);

	this._shift = new ToggledParameter(this._name + '_Shift');
	this._shift.add_listener(this._update);
	this._select = new ToggledParameter(this._name + '_Select', {value:1});
	this._select_only = new ToggledParameter(this._name + '_SelectOnly', {value:0});

}

ScaleComponent.prototype.assign_grid = function(grid)
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
	if((this._grid instanceof Grid)&&(this._stepsequencer instanceof StepSequencerComponent)&&(this._last_pressed_button._translation > -1))
	{
		this._stepsequencer.key_offset.set_value(this._last_pressed_button._translation);
	}
}

ScaleComponent.prototype.set_stepsequencer = function(stepsequencer)
{
	if(this._stepsequencer instanceof StepSequencerComponent)
	{
		this._stepsequencer.remove_listener(this._update);
	}
	this._stepsequencer = stepsequencer;
	if(this._stepsequencer instanceof StepSequencerComponent)
	{
		this._stepsequencer._edit_step.add_listener(this._update);
	}
	this.assign_grid(this._grid);
}

ScaleComponent.prototype.set_verbose = function(val)
{
	val = val > 0;
	this._vertOffset._display_value = val;
	this._scaleOffset._display_value = val;
	this._noteOffset._display_value = val;
	this._octaveOffset._display_value = val;
}


/////////////////////////////////////////////////////////////////////////////
//Component for step sequencing

function StepSequencerComponent(name, steps)
{
	post('stepsequencer', name, steps);
	var self = this;
	var SEQ_BUFFER_STEPS = steps;
	var STEP_SIZE = {STEP_1_4 : 0, STEP_1_8 : 1, STEP_1_16 : 2, STEP_1_32 : 3, STEP_1_64 : 4, STEP_1_128 : 5, STEP_1_256 : 6};
	var velocities = [127, 100, 80, 50];
	this.velocityStep = 2;
	this.velocity = velocities[this.velocityStep];
	this._stepSet = initArray(false, steps*128);
	this.detailMode = false;
	this.activeStep = 0;
	this.playingStep = -1;
	this.stepSize = STEP_SIZE.STEP_1_16;

	this.Colors = {'Selected': colors.GREEN, 'PlayingOn':colors.RED, 'PlayingOff':colors.MAGENTA, 'On':colors.YELLOW, 'Off':colors.OFF, 'Flipped':colors.WHITE};
	this.ZoomColors = {'CurrentPlaying': colors.RED, 'Playing': colors.BLUE, 'Current': colors.YELLOW, 'InLoop': colors.WHITE, 'Out': colors.OFF};

	this._name = name;
	this.width = function(){return  !self._grid ? 0 : self._grid.width();}
	this.height = function(){return !self._grid ? 0 : self._grid.height();}
	this._velocity = 100;
	this._shifted = false;
	this._grid;
	this._zoom_grid;
	this._last_grid_size = 1;
	this._cursorClip = host.createCursorClipSection(SEQ_BUFFER_STEPS, 128);

	this.receive_grid = function(button)
	{
		if(!self._flip._value)
		{
			if(button.pressed())
			{
				//post('sequencer button pressed:', button._name);
				var step = self._offset._value + button._x(self._grid) + self.width()*button._y(self._grid);  // + this.viewOffset();
				self._cursorClip.toggleStep(step, self.key_offset._value, self._velocity_offset._value);
				//post('toggling:', step, self.key_offset._value, self._velocity_offset._value);
			}
		}
		else
		{
			if(button.pressed())
			{
				//post('flip sequencer button pressed:', button._name);
				var step = self._offset._value + button._x(self._grid) + self.width()*button._y(self._grid);
				self._edit_step.set_value(step);
			}
			else
			{
				self._edit_step.set_value(-1);
			}
		}
	}
	this.receive_zoom_grid = function(button)
	{
		//post('receive zoom grid', button._value, button.pressed());
		if(button.pressed())
		{
			self._follow.set_value(0);
			var zoom_size = self._grid instanceof Grid ?  self._grid.size() : self._last_grid_size;
			self._offset.set_value(zoom_size*(button._x(self._zoom_grid) + (button._y(self._zoom_grid)*self._zoom_grid.width())));

		}
	}
	this.toggle_note = function(button)
	{
		//post('note toggle in stepsequencer', button._translation);
		if(self._edit_step._value>-1)
		{
			self._cursorClip.toggleStep(self._edit_step._value, button._translation, self._velocity_offset._value);
		}
	}

	this._onStepExists = function(column, row, state)
	{
		//post('onStepExists', column, row, state);
		self._stepSet[column*128 + row] = state;
		self._edit_step.notify();
		self.update();
	}
	this._onStepPlay = function(step)
	{
		self.playingStep = step;
		if(self._follow._value&&(self._grid||self._zoom_grid))
		{
			var size = self._grid instanceof Grid ? self._grid.size() : self._last_grid_size;
			self._offset.set_value(Math.floor(self.playingStep/size)*size)

		}
		self.update();
	}
	this._on_shift = function(){}

	this._onOffsetChange = function(obj)
	{
		//post('offset change', obj._value);
		self.update();
	}
	this._onSizeChange = function(val)
	{
		//post('on size change', self._size_offset._value);
		self.stepSize = self._size_offset._value;
		var stepInBeatTime = Math.pow(0.5, self.stepSize) * (self._triplet._value ? 1 : .66667);
		self._cursorClip.setStepSize(stepInBeatTime);
	}
	this._onVelocityChange = function()
	{
	}
	this._onKeyChange = function(obj)
	{
		//post('onKeyChange', obj._value);
		//self._cursorClip.scrollToKey(self.key_offset._value);		//don't use this method here, it adds an offset to note creation.
		self.update();
	}
	this._onFlipChange = function(obj)
	{
		self._edit_step.set_value(-1);
	}

	this.update = function()
	{
		if(self._grid instanceof Grid)
		{
			var buttons = self._grid.controls();
			var size = buttons.length;
			var key = self.key_offset._value;
			for(var i=0;i<size;i++)
			{
				var button = buttons[i];
				//post('button is', button._name);
				var step = self._offset._value + button._x(self._grid) + (button._y(self._grid)*self.width());
				var isSet = self._stepSet[step * 128 + key];
				var isPlaying = step == self.playingStep;
				var isSelected = step == self._edit_step._value;
				var color = isSelected ? self.Colors.Selected : isSet ?
					(isPlaying ? self.Colors.PlayingOn : self.Colors.On) :
					(isPlaying ? self.Colors.PlayingOff : self._flip._value ? self.Colors.Flipped : self.Colors.Off);

				button.send(color);

			}
		}
		if(self._zoom_grid instanceof Grid)
		{
			var buttons = self._zoom_grid.controls();
			var size = self._zoom_grid.size();
			var key = self.key_offset._value;
			var zoom_size = self._grid instanceof Grid ?  self._grid.size() : self._last_grid_size;
			var current_pane = Math.floor(self._offset._value/zoom_size);
			var playing_pane = Math.floor(self.playingStep/zoom_size)
			for(var i=0;i<size;i++)
			{
				var loop_length = 16;
				var button = buttons[i];
				var button_coord = button._x(self._zoom_grid) + (button._y(self._zoom_grid)*self._zoom_grid.width());
				var color = (button_coord == current_pane && button_coord ==playing_pane) ? self.ZoomColors.CurrentPlaying :
					button_coord == current_pane ? self.ZoomColors.Playing :
					button_coord == playing_pane ? self.ZoomColors.Current :
					button_coord < loop_length ? self.ZoomColors.InLoop :
					self.ZoomColors.Out;
				button.send(color);
			}
		}
	}

	this.notes_in_step = function()
	{
		var start = self._edit_step._value*128;
		return self._stepSet.slice(start, start+128);
	}

	this._cursorClip.addStepDataObserver(this._onStepExists);
	this._cursorClip.addPlayingStepObserver(this._onStepPlay);

	this.key_offset = new OffsetComponent(this._name + 'Key_Offset', 0, 127, 0, this._onKeyChange, colors.CYAN);
	this._follow = new ToggledParameter(this._name + '_Follow', {value:1, onValue:colors.MAGENTA});
	this._offset = new OffsetComponent(this._name + '_Offset', 0, 256, 0, this._onOffsetChange, colors.RED);
	this._size_offset = new OffsetComponent(this._name + '_Size_Offset', 0, 4, 2, this._onSizeChange, colors.MAGENTA);
	this._velocity_offset = new OffsetComponent(this._name + '_Velocity_Offset', 0, 127, 100, this._onVelocityChange, colors.RED, colors.OFF, 10);
	this._flip = new ToggledParameter(this._name + '_Flip', {value:0, onValue:colors.CYAN});
	this._edit_step = new RangedParameter(this._name + '_Edit_Step', {value:-1});
	this._triplet = new ToggledParameter(this._name + '_Triplet_Enable', {value:1, onValue:colors.OFF, offValue:colors.RED});

	this._triplet.add_listener(this._onSizeChange);
	this._flip.add_listener(this.update);
	this._edit_step.add_listener(this.update);

	this._shuffleEnabled = new ToggledParameter(this._name + '_Shuffle_Enabled', {javaObj:this._cursorClip.getShuffle(), monitor:'addValueObserver', action:'toggle'});
	this._accent = new RangedParameter(this._name + '_Accent', {javaObj:this._cursorClip.getAccent(), range:128});
	//this._cursorClip.scrollToKey(this.key_offset._value);

}

StepSequencerComponent.prototype.assign_grid = function(grid)
{
	if(this._grid instanceof Grid)
	{
		this._grid.remove_target(this.receive_grid);
	}
	this._grid = grid;
	if (this._grid instanceof Grid)
	{
		this._grid.clear_translations();
		this._grid.set_target(this.receive_grid);
		this._last_grid_size = this._grid.controls().length;
		this.update();
	}

}

StepSequencerComponent.prototype.assign_zoom_grid = function(grid)
{
	if(this._zoom_grid instanceof Grid)
	{
		this._zoom_grid.remove_target(this.receive_zoom_grid);
	}
	this._zoom_grid = grid;
	if (this._zoom_grid instanceof Grid)
	{
		this._zoom_grid.clear_translations();
		this._zoom_grid.set_target(this.receive_zoom_grid);
		this.update();
	}

}

StepSequencerComponent.prototype.set_nav_buttons = function(button0, button1, button2, button3)
{
	this._size_offset.set_inc_dec_buttons(button0, button1);
	this._velocity_offset.set_inc_dec_buttons(button2, button3);
}

StepSequencerComponent.prototype.set_verbose = function(val)
{
	val = val > 0;
	this._follow._display_value = val;
	this._size_offset._display_value = val;
	this._velocity_offset._display_value = val;
	this._flip._display_value = val;
	this._triplet._display_value = val;

}

/////////////////////////////////////////////////////////////////////////////
//Component for combining the StepSequencer with different instrument components

function AdaptiveInstrumentComponent(name, sizes, lcd)
{
	var self = this;
	this._name = name;
	this._lcd = lcd;
	this._stepsequencer = new StepSequencerComponent(this._name+'_stepsequencer', 128);
	this._drums = new DrumRackComponent(this._name+'_drumrack');
	this._keys = new ScaleComponent(this._name+'_keys');
	this._drums.set_stepsequencer(self._stepsequencer);
	this._keys.set_stepsequencer(self._stepsequencer);

	this._vert_up_button, this._vert_dn_button;
	this._note_up_button, this._note_dn_button;
	this._scale_up_button, this._scale_dn_button;
	this._octave_up_button, this._octave_dn_button;

	this._sizes = sizes;
	if(!this._sizes){this._sizes = {'drum':[0, 0, 0, 0], 'keys':[0, 0, 0, 0], 'drumseq':[0, 0, 0, 0], 'keysseq':[0, 0, 0, 0]};}
	this._drum_sub = new Grid(this._sizes.drum[0], this._sizes.drum[1], this._name+('_drum_sub'));
	this._keys_sub = new Grid(this._sizes.keys[0], this._sizes.keys[1], this._name+('_keys_sub'));
	this._drumseq_sub = new Grid(this._sizes.drumseq[0], this._sizes.drumseq[1], this._name+('_drumseq_sub'));
	this._keysseq_sub = new Grid(this._sizes.keysseq[0], this._sizes.keysseq[1], this._name+('_keysseq_sub'));

	this._explicit_drum_grid;
	this._explicit_keys_grid;
	this._explicit_drumseq_grid;
	this._explicit_keysseq_grid;
	this._explicit_grid_assignments = false;


	this._noteMap = new Array(128);
	for(var i=0;i<128;i++)
	{
		this._noteMap[i] = [];
	}

	this._splitMode = new ToggledParameter(this._name + '_ScaleSplit', {value:1});

	this._on_quantization_changed = function(obj)
	{
		if(self._stepsequencer instanceof StepSequencerComponent)
		{
			self._stepsequencer._size_offset.set_value(obj._value);
		}
	}
	this._quantization = new RadioComponent(this._name + '_Quantization', 0, 6, 3, this._on_quantization_changed, colors.YELLOW, colors.OFF);

	this._primary_instrument = new Parameter(this._name + '_PrimaryInstrumentListener', {javaObj:cursorTrack.getPrimaryInstrument()});
	cursorTrack.getPrimaryInstrument().addNameObserver(11, 'None', this._primary_instrument.receive);

	this._lcd_listener = function(obj)
	{
		if(self._stepsequencer&&self._lcd)
		{
			var val = obj._name == (self._stepsequencer._name + '_Scale_Offset') ? SCALEABBREVS[SCALENAMES[obj._value]] : obj._name == (self._stepsequencer._name) + '_Velocity_Offset' ? Math.floor((obj._value/127)*99) : obj._value;
			//post('lcd val:', self._stepsequencer._name + '_Velocity_Offset', self._stepsequencer._name + '_Velocity_Offset' == obj._name, val);
			self._lcd._send(val);
			tasks.addTask(display_mode, [], 10, false, 'display_mode');
		}
	}

	if(this._lcd instanceof DisplayElement)
	{
		this._stepsequencer._size_offset.add_listener(this._lcd_listener);
		this._stepsequencer._velocity_offset.add_listener(this._lcd_listener);
	}

	this.update = function()
	{
		if(self._lcd instanceof DisplayElement)
		{
			self._drums._noteOffset.remove_listener(self._lcd_listener);
			self._keys._vertOffset.remove_listener(self._lcd_listener);
			self._keys._noteOffset.remove_listener(self._lcd_listener);
			self._keys._scaleOffset.remove_listener(self._lcd_listener);
		}
		if(self._drums instanceof DrumRackComponent)
		{
			self._drums._noteOffset.set_inc_dec_buttons();
			self._drums._octaveOffset.set_inc_dec_buttons();
			self._drums.assign_grid();
		}
		if(self._keys instanceof ScaleComponent)
		{
			self._keys._vertOffset.set_inc_dec_buttons();
			self._keys._noteOffset.set_inc_dec_buttons();
			self._keys._octaveOffset.set_inc_dec_buttons();
			self._keys._scaleOffset.set_inc_dec_buttons();
			self._keys.assign_grid();
		}
		if(self._stepsequencer instanceof StepSequencerComponent)
		{
			self._stepsequencer.assign_grid();
			self._stepsequencer.assign_zoom_grid();
		}
		self._drum_sub.clear_buttons();
		self._keys_sub.clear_buttons();
		self._drumseq_sub.clear_buttons();
		self._keysseq_sub.clear_buttons();
		if((self._grid instanceof Grid)||(self._explicit_grid_assignments))
		{
			var sizes = self._sizes;
			post('PINS:::::::', self._primary_instrument._value);
			post('Scale::::::', self._keys._scaleOffset._value);
			if(self._primary_instrument._value == 'DrmMachine'||self._keys._scaleOffset._value == 0)
			{
				self._drums._noteOffset.add_listener(self._lcd_listener);
				self._drums._noteOffset.set_inc_dec_buttons(self._note_up_button, self._note_dn_button);
				self._drums._octaveOffset.set_inc_dec_buttons(self._octave_up_button, self._octave_dn_button);
				self._keys._scaleOffset.set_inc_dec_buttons(self._scale_up_button, self._scale_dn_button);
				if(!self._splitMode._value)
				{
					var grid = self._explicit_drum_grid instanceof Grid ? self._explicit_drum_grid : self._grid;
					self._drums.assign_grid(self._grid);
				}
				else
				{
					var grid = self._explicit_drum_grid instanceof Grid ? self._explicit_drum_grid : self._drum_sub.sub_grid(self._grid, sizes.drum[2], sizes.drum[0]+sizes.drum[2], sizes.drum[3], sizes.drum[1]+sizes.drum[3]);
					self._drums.assign_grid(grid);
					var seq_grid = self._explicit_drumseq_grid instanceof Grid ? self._explicit_drumseq_grid : self._drumseq_sub.sub_grid(self._grid, sizes.drumseq[2], sizes.drumseq[0]+sizes.drumseq[2], sizes.drumseq[3], sizes.drumseq[1]+sizes.drumseq[3]);
					self._shift._value ?  self._stepsequencer.assign_zoom_grid(seq_grid) : self._stepsequencer.assign_grid(seq_grid);
				}
			}
			else
			{
				self._keys._vertOffset.add_listener(self._lcd_listener);
				self._keys._noteOffset.add_listener(self._lcd_listener);
				self._keys._scaleOffset.add_listener(self._lcd_listener);
				self._keys._vertOffset.set_inc_dec_buttons(self._vert_up_button, self._vert_dn_button);
				self._keys._noteOffset.set_inc_dec_buttons(self._note_up_button, self._note_dn_button);
				self._keys._scaleOffset.set_inc_dec_buttons(self._scale_up_button, self._scale_dn_button);
				self._keys._octaveOffset.set_inc_dec_buttons(self._octave_up_button, self._octave_dn_button);
				if(!self._splitMode._value)
				{
					var grid = self._explicit_keys_grid instanceof Grid ? self._explicit_keys_grid : self._grid;
					self._keys.assign_grid(grid);
				}
				else
				{
					var grid = self._explicit_keys_grid instanceof Grid ? self._explicit_keys_grid : self._keys_sub.sub_grid(self._grid, sizes.keys[2], sizes.keys[0]+sizes.keys[2], sizes.keys[3], sizes.keys[1]+sizes.keys[3]);
					self._keys.assign_grid(grid);
					var seq_grid = self._explicit_keysseq_grid instanceof Grid ? self._explicit_keysseq_grid : self._keysseq_sub.sub_grid(self._grid, sizes.keysseq[2], sizes.keysseq[0]+sizes.keysseq[2], sizes.keysseq[3], sizes.keysseq[1]+sizes.keysseq[3]);
					self._shift._value ? self._stepsequencer.assign_zoom_grid(seq_grid) :  self._stepsequencer.assign_grid(seq_grid);
				}
			}
		}
	}

	this._on_primary_instrument_changed = function(new_name){post('primary instrument changed', new_name); self.update();}
	this._primary_instrument.add_listener(this._on_primary_instrument_changed);

	this._shift = new ToggledParameter(this._name + '_Shift');
	this._shift.add_listener(this.update);

	this._selectListener = function(obj)
	{
		if(self._keys){self._keys._select.set_value(obj._value);}
		if(self._drums){self._drums._select.set_value(obj._value);}
	}
	this._select = new ToggledParameter(this._name + '_Select');
	this._select.add_listener(this._selectListener);

	this._selectOnlyListener = function(obj)
	{
		if(self._keys){self._keys._select_only.set_value(obj._value);}
		if(self._drums){self._drums._select_only.set_value(obj._value);}
	}
	this._select_only = new ToggledParameter(this._name + '_SelectOnly');
	this._select_only.add_listener(this._selectOnlyListener);

}

AdaptiveInstrumentComponent.prototype.set_sizes = function(sizes)
{
	this._sizes = sizes;
	this._drum_sub, this._keys_sub, this._drumseq_sub, this._keysseq_sub;
	if(sizes.drum){this._drum_sub = new Grid(this._name+('_drum_sub'), sizes.drum[0], sizes.drum[1]);}
	if(sizes.keys){this._keys_sub = new Grid(this._name+('_keys_sub'), sizes.keys[0], sizes.keys[1]);}
	if(sizes.drumseq){this._drumseq_sub = new Grid(this._name+('_drumseq_sub'), sizes.drumseq[0], sizes.drumseq[1]);}
	if(sizes.keysseq){this._keysseq_sub = new Grid(this._name+('_keysseq_sub'), sizes.keysseq[0], sizes.keysseq[1]);}
	this.update();
}

AdaptiveInstrumentComponent.prototype.assign_grid = function(grid)
{
	this._grid = grid;
	this.update();
}

AdaptiveInstrumentComponent.prototype.assign_explicit_grids = function(drum_grid, keys_grid, drumseq_grid, keysseq_grid)
{
	var subs = [this._drum_sub, this._keys_sub, this._drumseq_sub, this._keysseq_sub];
	for(var i in subs)
	{
		subs[i].clear_translations();
		subs[i].clear_buttons();
	}
	this._explicit_grid_assignments = false;
	this._explicit_drum_grid = undefined;
	this._explicit_keys_grid = undefined;
	this._explicit_drumseq_grid = undefined;
	this._explicit_keysseq_grid = undefined;
	if(drum_grid instanceof Grid)
	{
		this._explicit_drum_grid = drum_grid;
		this._explicit_grid_assignments = true;
	}
	if(keys_grid instanceof Grid)
	{
		this._explicit_keys_grid = keys_grid;
		this._explicit_grid_assignments = true;
	}
	if(drumseq_grid instanceof Grid)
	{
		this._explicit_drumseq_grid = drumseq_grid;
		this._explicit_grid_assignments = true;
	}
	if(keysseq_grid instanceof Grid)
	{
		this._explicit_keysseq_grid = keysseq_grid;
		this._explicit_grid_assignments = true;
	}
	this.update();
}

AdaptiveInstrumentComponent.prototype.set_vert_offset_buttons = function(_vert_up, _vert_dn)
{
	this._keys._vertOffset.set_inc_dec_buttons();
	this._vert_up_button = _vert_up;
	this._vert_dn_button = _vert_dn;
}

AdaptiveInstrumentComponent.prototype.set_note_offset_buttons = function(_note_up, _note_dn)
{
	this._drums._noteOffset.set_inc_dec_buttons();
	this._keys._noteOffset.set_inc_dec_buttons();
	this._note_up_button = _note_up;
	this._note_dn_button = _note_dn;
}

AdaptiveInstrumentComponent.prototype.set_scale_offset_buttons = function(_scale_up, _scale_dn)
{
	this._keys._scaleOffset.set_inc_dec_buttons();
	this._scale_up_button = _scale_up;
	this._scale_dn_button = _scale_dn;
}

AdaptiveInstrumentComponent.prototype.set_octave_offset_buttons = function(_octave_up, _octave_dn)
{
	this._drums._octaveOffset.set_inc_dec_buttons();
	this._keys._octaveOffset.set_inc_dec_buttons();
	this._octave_up_button = _octave_up;
	this._octave_dn_button = _octave_dn;
}

AdaptiveInstrumentComponent.prototype.set_verbose = function(val)
{
	val = val > 0;
	this._stepsequencer.set_verbose(val);
	this._keys.set_verbose(val);
	this._drums.set_verbose(val);
}

/////////////////////////////////////////////////////////////////////////////
//Component for step sequencing

function FunSequencerComponent(name, steps)
{
	StepSequencerComponent.call( this, name, steps )
	var self = this;
	this._pitch_range = 12;
	this._pitches = [];

	for(var i = 0; i<steps; i++)
	{
		this._pitches[i] = new RangedParameter(this._name + '_Pitch_'+i, {range:128});
	}
	this.key_offset_dial = new RangedParameter(this._name + '_KeyDial', {range:128});
	this._on_key_offset_dial_change = function(obj)
	{
		var val = obj._value
		self.key_offset.set_value(val);
	}
	this.receive_grid = function(button)
	{
		if(button.pressed())
		{
			//post('sequencer button pressed:', button._name);
			var key = self.key_offset._value;
			post('key is:', key);
			var pos = button._x(self._grid) + self.width()*button._y(self._grid);  // + this.viewOffset();
			var step = key + pos;
			var isSet = 0;
			for(var j=0;j<self._pitch_range;j++)
			{
				isSet = self._stepSet[step * 128 + (key + j)]||isSet;
			}
			var step_pitch = (Math.floor((self._pitches[pos]._value/127)*self._pitch_range));
			if(!isSet)
			{
				for(var i=0;i<self._pitch_range;i++)
				{
					var pitch = i + self.key_offset._value;
					var reg = self._stepSet[step * 128 + (key + i)];
					//if(((i==step_pitch)&&(!reg))||((i!=step_pitch)&&(reg)))
					//{
					//	self._cursorClip.toggleStep(step, pitch, self._velocity_offset._value);
					//	//post('toggling:', step, pitch, self._velocity_offset._value);
					//}
					if((i!=step_pitch)&&(reg))
					{
						self._cursorClip.clearStep(step, pitch);
						//post('toggling:', step, pitch, self._velocity_offset._value);
					}
				}
				self._cursorClip.setStep(step, step_pitch, self._velocity_offset._value, .25);
			}
			else
			{
				for(var i=0;i<self._pitch_range;i++)
				{
					var pitch = i + self.key_offset._value;
					var reg = self._stepSet[step * 128 + (key + i)];
					if(reg)
					{
						//self._cursorClip.toggleStep(step, pitch, self._velocity_offset._value);
						self._cursorClip.clearStep(step, pitch);
						//post('toggling:', step, pitch, self._velocity_offset._value);
					}
				}
			}
		}
	}
	this.update = function()
	{
		if(self._grid instanceof Grid)
		{
			var buttons = self._grid.controls();
			var size = buttons.length;
			var key = self.key_offset._value;
			for(var i=0;i<size;i++)
			{
				var button = buttons[i];
				var step = self._offset._value + button._x(self._grid) + (button._y(self._grid)*self.width());
				var isSet = 0;
				for(var j=0;j<self._pitch_range;j++)
				{
					isSet = self._stepSet[step * 128 + (key + j)]||isSet;
				}
				var isPlaying = step == self.playingStep;
				var color = isSet ?
					(isPlaying ? self.Colors.PlayingOn : self.Colors.On) :
					(isPlaying ? self.Colors.PlayingOff : self.Colors.Off);

				button.send(color);
			}
		}
	}
	this.toggle_note = function(button)
	{
		//self._cursorClip.toggleStep(self._edit_step._value, button._translation, self._velocity_offset._value);
	}
	this._on_pitch_change = function(obj)
	{
		var key = self.key_offset._value;
		var step = key + self._pitches.indexOf(obj);
		var isSet = 0;
		for(var j=0;j<self._pitch_range;j++)
		{
			isSet = self._stepSet[step * 128 + (key + j)]||isSet;
		}
		if(isSet)
		{
			var step_pitch = (Math.floor((self._pitches[step]._value/128)*self._pitch_range));
			for(var i=0;i<=self._pitch_range;i++)
			{
				var pitch = i + key;
				var reg = self._stepSet[(step * 128) + pitch];
				//if(((i==step_pitch)&&(!reg))||((i!=step_pitch)&&(reg)))
				//{
				//	self._cursorClip.toggleStep(step, pitch, self._velocity_offset._value);
				//	post('toggling:', step, pitch, self._velocity_offset._value);
				//}
				if((i!=step_pitch)&&(reg))
				{
					self._cursorClip.clearStep(step, pitch);
					//post('toggling:', step, pitch, self._velocity_offset._value);
				}
			}
			self._cursorClip.setStep(step, step_pitch, self._velocity_offset._value, .25);
		}
	}
	for(var i = 0; i<steps; i++)
	{
		this._pitches[i].add_listener(this._on_pitch_change);
	}
	this.key_offset_dial.add_listener(this._on_key_offset_dial_change);
}

//FunSequencerComponent.prototype = new StepSequencerComponent()

//FunSequencerComponent.prototype.constructor = FunSequencerComponent;

function FunSequencerComponent(name, steps)
{
	var self = this;
	var SEQ_BUFFER_STEPS = steps;
	var STEP_SIZE = {STEP_1_4 : 0, STEP_1_8 : 1, STEP_1_16 : 2, STEP_1_32 : 3, STEP_1_64 : 4, STEP_1_128 : 5, STEP_1_256 : 6};
	var velocities = [127, 100, 80, 50];
	this.velocityStep = 2;
	this.velocity = velocities[this.velocityStep];
	this._stepSet = initArray(false, steps*128);
	this.detailMode = false;
	this.activeStep = 0;
	this.playingStep = -1;
	this.stepSize = STEP_SIZE.STEP_1_16;

	this.Colors = {'Selected': colors.GREEN, 'PlayingOn':colors.RED, 'PlayingOff':colors.MAGENTA, 'On':colors.YELLOW, 'Off':colors.OFF, 'Flipped':colors.WHITE};
	this.ZoomColors = {'CurrentPlaying': colors.RED, 'Playing': colors.BLUE, 'Current': colors.YELLOW, 'InLoop': colors.WHITE, 'Out': colors.OFF};

	this._name = name;
	this.width = function(){return  !self._grid ? 0 : self._grid.width();}
	this.height = function(){return !self._grid ? 0 : self._grid.height();}
	this._velocity = 100;
	this._shifted = false;
	this._grid;
	this._zoom_grid;
	this._last_grid_size = 1;
	this._cursorClip = host.createCursorClipSection(steps, 128);

	this._pitch_range = 12;
	this._pitches = [];

	for(var i = 0; i<steps; i++)
	{
		this._pitches[i] = new DelayedRangedParameter(this._name + '_Pitch_'+i, {range:127});
	}
	this.octave_offset_dial = new RangedParameter(this._name + '_KeyDial', {range:8});
	this._on_octave_offset_dial_change = function(obj)
	{
		var val = obj._value;
		self.key_offset.set_value(val*12);
	}
	this.key_offset_dial = new RangedParameter(this._name + '_KeyDial', {range:127});
	this._on_key_offset_dial_change = function(obj)
	{
		var val = obj._value
		self.key_offset.set_value(val);
	}
	this.receive_grid = function(button)
	{
		if(button.pressed())
		{
			//post('sequencer button pressed:', button._name);
			var key = self.key_offset._value;
			var offset = self._offset._value;
			//post('key is:', key);
			var pos = button._x(self._grid) + self.width()*button._y(self._grid);  // + this.viewOffset();
			var step = offset + pos;
			var isSet = 0;
			for(var j=0;j<self._pitch_range;j++)
			{
				isSet = self._stepSet[step * 128 + (key + j)]||isSet;
			}
			var step_pitch = (Math.floor((self._pitches[pos]._value/127)*self._pitch_range));;
			if(!isSet)
			{
				for(var i=0;i<self._pitch_range;i++)
				{
					var pitch = i + key;
					var reg = self._stepSet[step * 128 + (key + i)];
					if((i!=step_pitch)&&(reg))
					{
						self._cursorClip.clearStep(step, pitch);
						self._stepSet[step * 128 + (key + i)] = 0;
						//post('turning off:', step, pitch, self._velocity_offset._value);
					}
				}
				self._cursorClip.setStep(step, step_pitch+key, self._velocity_offset._value, .25);
				self._stepSet[(step * 128) + (step_pitch+key)] = 1;
			}
			else
			{
				for(var i=0;i<self._pitch_range;i++)
				{
					var pitch = i + self.key_offset._value;
					var reg = self._stepSet[step * 128 + (key + i)];
					if(reg)
					{
						self._cursorClip.clearStep(step, pitch);
						self._stepSet[step * 128 + (key + i)] = 0;
					}
				}
			}
		}
	}
	this.toggle_note = function(button)
	{
		//self._cursorClip.toggleStep(self._edit_step._value, button._translation, self._velocity_offset._value);
	}
	this._on_pitch_change = function(obj)
	{
		var key = self.key_offset._value;
		var offset = self._offset._value;
		var step = offset + self._pitches.indexOf(obj);
		var offset = self._offset._value;
		var isSet = 0;
		for(var j=0;j<self._pitch_range;j++)
		{
			isSet = self._stepSet[step * 128 + (key + j)]||isSet;
		}
		if(isSet)
		{
			//var step_pitch = (Math.floor((self._pitches[step]._value/128)*self._pitch_range));
			var curScale = SCALES[SCALENAMES[self._scaleOffset._value]];
			//post('scaleOffset is:', self._scaleOffset._value, 'curScale is:', curScale);
			var step_pitch = curScale[(Math.floor((self._pitches[step]._value/128)*(curScale.length-1)))];
			for(var i=0;i<=self._pitch_range;i++)
			{
				var pitch = i + key;
				var reg = self._stepSet[(step * 128) + pitch];
				if((i!=step_pitch)&&(reg))
				{
					self._cursorClip.clearStep(step, pitch);
					self._stepSet[(step * 128) + pitch] = 0;
				}
			}
			self._cursorClip.setStep(step, step_pitch + key, self._velocity_offset._value, .25);
			self._stepSet[(step * 128) + (step_pitch+key)] = 1 ;
		}
	}
	for(var i = 0; i<steps; i++)
	{
		this._pitches[i].add_listener(this._on_pitch_change);
	}
	this.octave_offset_dial.add_listener(this._on_octave_offset_dial_change);
	this.key_offset_dial.add_listener(this._on_key_offset_dial_change);

	this.receive_zoom_grid = function(button)
	{
	}

	this._onStepExists = function(column, row, state)
	{
		//post('onStepExists', column, row, state);
		self._stepSet[column*128 + row] = state;
		self._edit_step.notify();
		self.update();
	}
	this._onStepPlay = function(step)
	{
		self.playingStep = step;
		if(self._follow._value&&(self._grid||self._zoom_grid))
		{
			var size = self._grid instanceof Grid ? self._grid.size() : self._last_grid_size;
			self._offset.set_value(Math.floor(self.playingStep/size)*size)

		}
		self.update();
	}
	this._on_shift = function(){}

	this._onOffsetChange = function(obj)
	{
		//post('offset change', obj._value);
		self.update();
	}
	this._onSizeChange = function(val)
	{
		//post('on size change', self._size_offset._value);
		self.stepSize = self._size_offset._value;
		var stepInBeatTime = Math.pow(0.5, self.stepSize) * (self._triplet._value ? 1 : .66667);
		self._cursorClip.setStepSize(stepInBeatTime);
	}
	this._onVelocityChange = function()
	{
	}
	this._onKeyChange = function(obj)
	{
		//post('onKeyChange', obj._value);
		//self._cursorClip.scrollToKey(self.key_offset._value);		//don't use this method here, it adds an offset to note creation.
		self.update();
	}
	this._onFlipChange = function(obj)
	{
		self._edit_step.set_value(-1);
	}

	this._onAddNote = function(obj)
	{
		if(obj._value)
		{
			var key = self.key_offset._value;
			var offset = self._offset._value;
			var pos = self.playingStep;  // + this.viewOffset();
			var step = offset + pos;
			var isSet = 0;
			for(var j=0;j<self._pitch_range;j++)
			{
				isSet = self._stepSet[step * 128 + (key + j)]||isSet;
			}
			var step_pitch = (Math.floor((self._pitches[pos]._value/127)*self._pitch_range));
			//post('add note:', obj._name, obj._value, 'key', key, 'step', step, 'pos', pos, 'isSet', isSet);
			if(!isSet)
			{
				for(var i=0;i<self._pitch_range;i++)
				{
					var pitch = i + key;
					var reg = self._stepSet[step * 128 + (key + i)];
					if((i!=step_pitch)&&(reg))
					{
						self._cursorClip.clearStep(step, pitch);
						self._stepSet[step * 128 + (key + i)] = 0;
						//post('turning off:', step, pitch, self._velocity_offset._value);
					}
				}
				self._cursorClip.setStep(step, step_pitch+key, self._velocity_offset._value, .25);
				self._stepSet[(step * 128) + (step_pitch+key)] = 1;
			}
		}
	}

	this.update = function()
	{
		if(self._grid instanceof Grid)
		{
			var buttons = self._grid.controls();
			var size = buttons.length;
			var key = self.key_offset._value;
			for(var i=0;i<size;i++)
			{
				var button = buttons[i];
				var step = self._offset._value + button._x(self._grid) + (button._y(self._grid)*self.width());
				var isSet = 0;
				for(var j=0;j<self._pitch_range;j++)
				{
					isSet = self._stepSet[step * 128 + (key + j)]||isSet;
				}
				var isPlaying = step == self.playingStep;
				var color = isSet ?
					(isPlaying ? self.Colors.PlayingOn : self.Colors.On) :
					(isPlaying ? self.Colors.PlayingOff : self.Colors.Off);

				button.send(color);
			}
		}
	}

	this.notes_in_step = function()
	{
		var start = self._edit_step._value*128;
		return self._stepSet.slice(start, start+128);
	}

	this._cursorClip.addStepDataObserver(this._onStepExists);
	this._cursorClip.addPlayingStepObserver(this._onStepPlay);

	var scaleRange = SCALENAMES.length - 1;
	this._scaleOffset = new RangedParameter(this._name + '_Scale_Offset', {range:scaleRange});

	this.key_offset = new OffsetComponent(this._name + 'Key_Offset', 0, 127, 0, this._onKeyChange, colors.CYAN);
	this._follow = new ToggledParameter(this._name + '_Follow', {value:1, onValue:colors.MAGENTA});
	this._offset = new OffsetComponent(this._name + '_Offset', 0, 256, 0, this._onOffsetChange, colors.RED);
	this._size_offset = new OffsetComponent(this._name + '_Size_Offset', 0, 4, 2, this._onSizeChange, colors.MAGENTA);
	this._velocity_offset = new OffsetComponent(this._name + '_Velocity_Offset', 0, 127, 100, this._onVelocityChange, colors.RED, colors.OFF, 10);
	this._flip = new ToggledParameter(this._name + '_Flip', {value:0, onValue:colors.CYAN});
	this._edit_step = new RangedParameter(this._name + '_Edit_Step', {value:-1});
	this._triplet = new ToggledParameter(this._name + '_Triplet_Enable', {value:1, onValue:colors.OFF, offValue:colors.RED});
	this._add_note = new Parameter(this._name + '_addNote');


	this._triplet.add_listener(this._onSizeChange);
	this._flip.add_listener(this.update);
	this._edit_step.add_listener(this.update);
	this._add_note.add_listener(this._onAddNote);

	this._shuffleEnabled = new ToggledParameter(this._name + '_Shuffle_Enabled', {javaObj:this._cursorClip.getShuffle(), monitor:'addValueObserver', action:'toggle'});
	this._accent = new RangedParameter(this._name + '_Accent', {javaObj:this._cursorClip.getAccent(), range:128});
	//this._cursorClip.scrollToKey(this.key_offset._value);

}

FunSequencerComponent.prototype.assign_knobs = function(knobs)
{
	for(var i = 0;i < this._pitches.length; i++)
	{
		this._pitches[i].set_control();
	}
	knobs = knobs||[];
	if(knobs.length <= this._pitches.length)
	{
		for(var i=0;i<knobs.length;i++)
		{
			//post('assign knob', knobs[i]._name);
			this._pitches[i].set_control(knobs[i]);
		}
	}
	this.update();
}

FunSequencerComponent.prototype.assign_grid = function(grid)
{
	//post('assign grid dammit', grid);
	if(this._grid instanceof Grid)
	{
		this._grid.remove_target(this.receive_grid);
	}
	this._grid = grid;
	if (this._grid instanceof Grid)
	{
		this._grid.clear_translations();
		this._grid.set_target(this.receive_grid);
		this._last_grid_size = this._grid.controls().length;
		this.update();
	}

}

FunSequencerComponent.prototype.set_verbose = function(val)
{
	val = val > 0;
	this._follow._display_value = val;
	this._offset._display_value = val;
	this._size_offset._display_value = val;
	this._velocity_offset._display_value = val;
	this._flip._display_value = val;
	this._triplet._display_value = val;
	for(var i = 0; i<steps; i++)
	{
		this._pitches[i]._display_value = val;
	}
}

/////////////////////////////////////////////////////////////////////////////
//Component for access to Transport functions

function TransportComponent(name, transport, _colors)
{
	var self = this;

	this._colors = _colors||{'playOnColor':colors.GREEN,
	 						'playOffColor':colors.GREEN,
							'stopOnColor':colors.BLUE,
							'stopOffColor':colors.OFF,
							'recordOnColor':colors.RED,
							'recordOffColor':colors.MAGENTA};

	if(!transport){transport = host.createTransport();}

	this._play = new ToggledParameter('play_button', {javaObj:transport, action:'play', monitor:'addIsPlayingObserver', onValue:this._colors.playOnColor, offValue:this._colors.playOffColor});
	this._play._Callback = function(obj){if(obj._value){transport.play();}}

	this._stop = new ToggledParameter('stop_button', {javaObj:transport, action:'stop', monitor:'addIsPlayingObserver', onValue:this._colors.stopOnColor, offValue:this._colors.stopOffColor});
	this._stop._Callback = function(obj){if(obj._value){transport.stop();}}

	this._record = new ToggledParameter('record_button', {javaObj:transport, action:'record', monitor:'addIsRecordingObserver', onValue:this._colors.recordOnColor, offValue:this._colors.recordOffColor});
	this._record._Callback = function(obj){if(obj._value){transport.record();}}

	this._overdub = new ToggledParameter('overdub_listener', {javaObj:transport, action:'toggleLauncherOverdub', monitor:'addLauncherOverdubObserver', onValue:colors.RED});

	this._autowrite = new ToggledParameter('autowrite_listener', {javaObj:transport, action:'toggleWriteArrangerAutomation', monitor:'addAutomationWriteModeObserver', onValue:colors.BLUE});

	this._clipautowrite = new ToggledParameter('clipautowrite_listener', {javaObj:transport, action:'toggleWriteClipLauncherAutomation', onValue:colors.BLUE});

	this._loop = new ToggledParameter('loop_listener', {javaObj:transport, action:'toggleLoop', monitor:'addIsLoopActiveObserver', onValue:colors.YELLOW});

	this._crossfader = new RangedParameter(this._name + '_Crossfader', {num:0, javaObj:transport.crossfade(), range:128});
	//this._crossfade._Callback = function(obj)(if(obj._value){

	this.update_tempo = function(obj)
	{
		transport.getTempo().set(self._tempo._value, 647);
	}
	this._tempo = new OffsetComponent(this._name + 'tempo', 20, 666, 120, this.update_tempo, 0, 127, 1);

	this._update_tempo_internal = function(value)
	{
		post('update tempo internal:', value);
		self._tempo._value = value;
	}
	transport.getTempo().addValueObserver(647, this._update_tempo_internal);
	this._rewind = new Parameter('rewind_button', {javaObj:transport, action:'rewind'});
	this._forward = new Parameter('forward_button', {javaObj:transport, action:'fastForward'});
}

TransportComponent.prototype.set_verbose = function(val)
{
	val = val > 0;
	this._play._display_value = val;
	this._stop._display_value = val;
	this._record._display_value = val;
	this._overdub._display_value = val;
	this._autowrite._display_value = val;
}

/////////////////////////////////////////////////////////////////////////////
//Component for access to Groove functions

function GrooveComponent(name, groove)
{
	var self = this;
	this._name = name

	if(!groove){groove = host.createGroove();}

	this._accentAmount = new RangedParameter(this._name + '_AccentAmount', {javaObj:groove.getAccentAmount(), range:128});

	this._accentPhase = new RangedParameter(this._name + '_AccentPhase', {javaObj:groove.getAccentPhase(), range:128});

	this._accentRate = new RangedParameter(this._name + '_AccentRate', {javaObj:groove.getAccentRate(), range:128});

	this._shuffleAmount = new RangedParameter(this._name + '_ShuffleAmount', {javaObj:groove.getShuffleAmount(), range:128});

	this._shuffleRate = new RangedParameter(this._name + '_ShuffleRate', {javaObj:groove.getShuffleRate(), range:128});

	this._enabled = new ToggledParameter(this._name + '_Enabled', {javaObj:groove.getEnabled(), range:2});
	this._enabled._Callback = function(obj)
	{
		if(obj._value>0)
		{
			self._enabled.receive(Math.abs(self._enabled._value - 1));
			self._enabled._javaObj.set(self._enabled._value, 2);
		}
	}

}

GrooveComponent.prototype.set_verbose = function(val)
{
	val = val > 0;
	this._accentAmount._display_value = val;
	this._accentPhase._display_value = val;
	this._accentRate._display_value = val;
	this._shuffleAmount._display_value = val;
	this._shuffleRate._display_value = val;
	this._enabled._display_value = val;

}


/////////////////////////////////////////////////////////////////////////////
//UserBank Component

function UserBankComponent(name, size, port)
{
	var self = this;
	this._name = name;
	this._port = port;
	this._bank = host.createUserControlsSection(size);
	this._controls = [];
	this._noteTable = [];
	this._disabledTable = [];
	this._enabled = false;
	for(var i=0;i<128;i++)
	{
		this._noteTable[i]=i;
		this._disabledTable[i]=-1;
	}
	for(var i=0;i<size;i++)
	{
		this._controls[i] = new UserControl(name + 'Control_' + i, this._bank.getControl(i));
	}
	this.set_enabled = function(val)
	{
		this._enabled = val;
		if(this._enabled)
		{
			self._port.setKeyTranslationTable(self._noteTable);
		}
		else
		{
			self._port.setKeyTranslationTable(self._disabledTable);
		}
	}

	this.set_enabled(this._enabled);
}

UserBankComponent.prototype.set_control = function(num, control)
{
	var jControl = this._controls[num];
	if(jControl!=undefined)
	{
		if(jControl._control instanceof Control)
		{
			jControl._control.remove_target(jControl._control_in);
		}
		jControl._control = control;
		if(jControl._control instanceof Control)
		{
			control.set_target(jControl._control_in);
			control.send(jControl._value);
		}
	}
}

function UserControl(name, control)
{
	var self = this;
	this._name = name;
	this._value = 0;
	this._control = undefined;
	this._javaControl= control;
	this._javaControl.setLabel(this._name);


	this._onNameChanged = function(name){}//post('onNameChanged:', self._name, name);}
	this._onValueDisplayChanged = function(value){}//post('onValueDisplayChanged:', self._name, value);}
	this._onValueChanged = function(value)
	{
		self._value = value;
		if(self._control)
		{
			//post('sending out:', self._control._name);
			self._control.send(self._value);
		}
		//post('onValueChanged:', self._name, value);
	}
	this._set = function(value){self._control.set(value);}

	this._control_in = function(obj)
	{
		if((obj)&&(self._javaControl))
		{
			//post('control_in', self._name, obj._name, obj._value);
			self._javaControl.set(obj._value, 128);
		}
	}

	this._javaControl.addNameObserver(20, 'NotAssigned', this._onNameChanged);
	this._javaControl.addValueDisplayObserver(20, ' - ', this._onValueDisplayChanged);
	this._javaControl.addValueObserver(128, this._onValueChanged);


}


/////////////////////////////////////////////////////////////////////////////
//Overlay interface to host.scheduleTask that allows singlerun tasks and removable repeated tasks

function TaskServer(script, interval)
{
	var self = this;
	this._queue = {};
	this._interval = interval || 100;
 	this._run = function()
	{
		for(var index in self._queue)
		{
			var task = self._queue[index];
			//post('run...', index, task);
			if(task.ticks == task.interval)
			{
				if(!task.repeat)
				{
					delete self._queue[index];
				}
				task.callback.apply(script, task.arguments);
				task.ticks = 0;
			}
			else
			{
				task.ticks += 1;
			}
		}
		//host.scheduleTask(self._run, null, self._interval);
		host.scheduleTask(doObject(this, self._run), self._interval);
	}
	this._run();
}

TaskServer.prototype.addTask = function(callback, arguments, interval, repeat, name)
{
//	post('addTask', arguments, interval, repeat, name);
	if(typeof(callback)==='function')
	{
		interval = interval||1;
		repeat = repeat||false;
		if(!name){name = 'task_'+this._queue.length;}
		this._queue[name] = {'callback':callback, 'arguments':arguments, 'interval':interval, 'repeat':repeat, 'ticks':0};
	}
}

TaskServer.prototype.removeTask = function(callback, arguments, name)
{
	post('removing task:', name);
	if(name)
	{
		if(this._queue[name])
		{
			delete this._queue[name];
		}
	}
	else
	{
		for(var i in this._queue)
		{
			if((this._queue[i].callback == callback)&&(this.qeue[i].arguments = arguments))
			{
				delete this._queue[i];
			}
		}
	}
}


function NotificationDisplayComponent()
{
	self = this;
	this._enabled = true;
	this._subjects = {};
	this._groups = [];
	this._scheduled_messages = [];
	this._last_priority = 0;
	this._show_message = function(obj)
	{
		if(obj._name in self._subjects)
		{
			var entry = self._subjects[obj._name];
			if(entry.priority>=self._last_priority)
			{
				self._scheduled_messages.unshift(obj._name);
				self._last_priority = entry.priority;
				self._display_messages();
				tasks.addTask(self._clear_messages_queued, undefined, 5, false, 'display_messages');
			}
		}
	}
	this._clear_messages_queued = function()
	{
		//self._display_messages();
		self._last_priority = 0;
	}
	this._display_messages = function()
	{
		//post('enabled:', self._enabled)
		if(self._enabled)
		{
			var entry_name = undefined;
			var priority = self._last_priority;
			for(var item in self._scheduled_messages)
			{
				var entry = self._subjects[self._scheduled_messages[item]];
				//post('entry is', self._scheduled_messages[item], entry.display_name, entry.priority);
				if(entry.priority>=priority)
				{
					entry_name = self._scheduled_messages[item];
					priority = entry.priority;
				}
			}
			//post('display_message', entry_name);
			var message = [];
			if(entry_name in self._subjects)
			{
				var entry = self._subjects[entry_name];
				if(entry.group != undefined)
				{
					for(var i in self._groups[entry.group])
					{
						var member = self._subjects[self._groups[entry.group][i]];
						message.push(member.display_name + ' : ' + member.parameter());
					}
				}
				else
				{
					message.push(entry.display_name + ' : ' + entry.parameter());
				}
			}
			host.showPopupNotification(message.join('   '));
			self._scheduled_messages = [];
		}
	}
	this.show_message = function(message)
	{
		if(self._enabled)
		{
			host.showPopupNotification(message);
		}
	}
}

NotificationDisplayComponent.prototype.add_subject = function(obj, display_name, parameters, priority, group)
{
	if(obj instanceof Notifier)
	{
		if(!(obj._name in this._subjects))
		{
			priority = priority||0;
			display_name = display_name||obj._name;
			parameter_function = this.make_parameter_function(obj, parameters);
			this._subjects[obj._name] = {'obj': obj, 'display_name':display_name, 'parameter':parameter_function, 'priority':priority, 'group':group};
			if(group != undefined)
			{
				if(!(group in self._groups))
				{
					self._groups[group] = [];
				}
				self._groups[group].push(obj._name);
			}
			obj.add_listener(this._show_message);
		}
	}
}

NotificationDisplayComponent.prototype.remove_subject = function(obj)
{
	if(obj instanceof Notifier)
	{
		for(var subject in this._subjects)
		{
			if(subject === obj._name)
			{
				subject.remove_listener(this._show_message);
				delete this._subjects[subject];
			}
		}
	}
}

NotificationDisplayComponent.prototype.clear_subjects = function()
{
	for(var item in this._subjects)
	{
		var obj = this._subjects[item].obj;
		if(obj instanceof Notifier)
		{
			obj.remove_listener(this._show_message);
		}
	}
	this._subjects = {};
}

NotificationDisplayComponent.prototype.make_parameter_function = function(obj, parameter_values)
{
	if((parameter_values)&&(parameter_values instanceof Array))
	{
		var parameter_function = function()
		{
			return parameter_values[obj._value%(parameter_values.length)];
		}
		return parameter_function;
	}
	else
	{
		var parameter_function = function()
		{
			return obj._value;
		}
		return parameter_function;
	}
}

NotificationDisplayComponent.prototype.set_priority = function(priority)
{
	this._last_priority = priority;
}

NotificationDisplayComponent.prototype.set_enabled = function(enabled)
{
	this._enabled = enabled;
}
