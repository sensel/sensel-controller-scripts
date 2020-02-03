# by amounra 1018: http://www.aumhaa.com
# written against Live 10.0.4

from __future__ import with_statement, print_function, unicode_literals
import Live
import time
import math
import logging
logger = logging.getLogger(__name__)
from functools import partial
from itertools import izip, izip_longest, product

from ableton.v2.base import group, listens, liveobj_valid #flatten, slicer, to_slice, liveobj_changed,
from ableton.v2.control_surface import DeviceDecoratorFactory, BankingInfo
from ableton.v2.control_surface.elements.button import ButtonElement
from ableton.v2.control_surface.elements.button_matrix import ButtonMatrixElement
from ableton.v2.control_surface.control_surface import ControlSurface
from ableton.v2.control_surface.component import Component as ControlSurfaceComponent
from ableton.v2.control_surface.elements.encoder import EncoderElement
from ableton.v2.control_surface.input_control_element import *
from ableton.v2.control_surface.components.mixer import MixerComponent, SimpleTrackAssigner
from ableton.v2.control_surface.components.channel_strip import ChannelStripComponent
from ableton.v2.control_surface.components.session import SessionComponent
from ableton.v2.control_surface.components.transport import TransportComponent
from ableton.v2.control_surface.components.session_navigation import SessionNavigationComponent
from ableton.v2.control_surface.mode import AddLayerMode, LayerMode, ModesComponent, ModeButtonBehaviour #, DelayMode
from ableton.v2.control_surface.resource import PrioritizedResource, ExclusiveResource
from ableton.v2.control_surface.skin import Skin
from ableton.v2.control_surface import DeviceBankRegistry
from ableton.v2.control_surface.components.device import DeviceComponent
from ableton.v2.control_surface.components.device_parameters import DeviceParameterComponent
from ableton.v2.control_surface.layer import Layer
from ableton.v2.control_surface.components.drum_group import DrumGroupComponent
from ableton.v2.control_surface.components.view_control import ViewControlComponent
from ableton.v2.control_surface.components.session_recording import SessionRecordingComponent
from ableton.v2.control_surface.components.playable import PlayableComponent
from ableton.v2.control_surface.components.background import BackgroundComponent
from ableton.v2.control_surface.components.session_ring import SessionRingComponent
from ableton.v2.control_surface.components.scroll import *
from ableton.v2.base.event import *
from ableton.v2.base.task import *
from ableton.v2.control_surface.default_bank_definitions import BANK_DEFINITIONS
from ableton.v2.control_surface import ParameterInfo
from ableton.v2.control_surface.components import AutoArmComponent
from .parameter_mapping_sensitivities import parameter_mapping_sensitivity
from _Generic.Devices import *


def debug(*a, **k):
	pass

import imp

try:
	imp.find_module('aumhaa')
	found = True
except ImportError:
	found = False

if found:
	from aumhaa.v2.base.debug import initialize_debug
	debug = initialize_debug()

from Map import *

MIDI_NOTE_TYPE = 0
MIDI_CC_TYPE = 1
MIDI_PB_TYPE = 2
MIDI_MSG_TYPES = (MIDI_NOTE_TYPE, MIDI_CC_TYPE, MIDI_PB_TYPE)
MIDI_NOTE_ON_STATUS = 144
MIDI_NOTE_OFF_STATUS = 128
MIDI_CC_STATUS = 176
MIDI_PB_STATUS = 224

CHECK_MAPS = tuple([240, 0, 2, 29, 0, 112, 3, 1, 69, 0, 32, 0, 0, 0, 0, 0, 0, 0, 247])
MAGNET_VALUES_CALL = tuple([240, 0, 2, 29, 0, 112, 3, 1, 114, 2, 247])
PIANO_OVERLAY = tuple([240, 0, 2, 29, 0, 3, 0, 0, 1, 1, 247])
PRODUCTION_OVERLAY = tuple([240, 0, 2, 29, 0, 4, 0, 0, 1, 1, 247])
DRUM_OVERLAY = tuple([240, 0, 2, 29, 0, 5, 0, 0, 1, 1, 247])
THUNDER_OVERLAY = tuple([240, 0, 2, 29, 0, 16, 0, 0, 1, 1, 247])
NO_OVERLAY = tuple([240, 0, 2, 29, 0, 14, 0, 0, 1, 1, 247])


class MomentaryBehaviour(ModeButtonBehaviour):


	def press_immediate(self, component, mode):
		debug('momentary press')
		component.push_mode(mode)


	def release_immediate(self, component, mode):
		debug('momentary release immediate')
		if len(component.active_modes) > 1:
			component.pop_mode(mode)


	def release_delayed(self, component, mode):
		debug('momentary release delayed')
		if len(component.active_modes) > 1:
			component.pop_mode(mode)


class MorphButtonElement(ButtonElement):


	def set_enabled(self, enabled = True):
		self._is_enabled = enabled
		self.suppress_script_forwarding = not enabled
		self._request_rebuild()


class MorphEncoderElement(EncoderElement):


	def set_enabled(self, enabled = True):
		self._is_enabled = enabled
		self.suppress_script_forwarding = not enabled
		self._request_rebuild()


class TranslationComponent(ControlSurfaceComponent):


	def __init__(self, controls = [], channel = 0, *a, **k):
		super(TranslationComponent, self).__init__()
		self._controls = controls
		self._channel = channel or 0
		self._color = 0


	def update(self):
		if self.is_enabled():
			for control in self._controls:
				if control:
					control.release_parameter()
					control.set_channel(self._channel)
					control.set_enabled(False)
		else:
			for control in self._controls:
				if control:
					control.use_default_message()
					control.set_enabled(True)


class MorphChannelStripComponent(ChannelStripComponent):


	def set_stop_button(self, button):
		self._on_stop_value.subject = button


	@listens('value')
	def _on_stop_value(self, value):
		if self._track:
			self._track.stop_all_clips()


class MorphMixerComponent(MixerComponent):


	def _create_strip(self):
		return MorphChannelStripComponent()


class MorphDeviceComponent(DeviceComponent):

	def _create_parameter_info(self, parameter, name):
		return ParameterInfo(parameter=parameter, name=name, default_encoder_sensitivity=parameter_mapping_sensitivity(parameter, self.device().class_name))


class MorphDrumGroup(DrumGroupComponent, ScrollComponent, Scrollable):


	def set_bank_up_button(self, button):
		self._bank_up_button_value.subject = button


	def set_bank_down_button(self, button):
		self._bank_down_button_value.subject = button


	def can_scroll_up(self):
		return 0 <= self.position <= 27


	def can_scroll_down(self):
		return 1 <= self.position <=28


	def scroll_up(self):
		self.position += 1
		#self._update_note_translations()


	def scroll_down(self):
		self.position += -1
		#self._update_note_translations()


	@listens('value')
	def _bank_up_button_value(self, value):
		debug('_bank_up_button_value:', value)
		debug(self._drum_group_device.view.drum_pads_scroll_position if liveobj_valid(self._drum_group_device) else None)
		if value:
			if 0 <= self.position <= 27 and liveobj_valid(self._drum_group_device):
				debug('here')
				self._drum_group_device.view.drum_pads_scroll_position = (self.position + 1)


	@listens('value')
	def _bank_down_button_value(self, value):
		debug('_bank_down_button_value:', value)
		debug(self._drum_group_device.view.drum_pads_scroll_position if liveobj_valid(self._drum_group_device) else None)
		if value:
			if 1 <= self.position <= 28 and liveobj_valid(self._drum_group_device):
				debug('here')
				self._drum_group_device.view.drum_pads_scroll_position = (self.position - 1)


class MorphKeysGroup(PlayableComponent, ScrollComponent, Scrollable):

	_position = 5
	_channel_offset = 0
	_hi_limit = 9

	def __init__(self, *a, **k):
		super(MorphKeysGroup, self).__init__(*a, **k)


	@property
	def position(self):
		return self._position


	@position.setter
	def position(self, index):
		assert(0 <= index <= 28)
		self._position = index
		#self.notify_position()


	def can_scroll_up(self):
		return self._position < self._hi_limit


	def can_scroll_down(self):
		return self._position > 1


	def scroll_up(self):
		self.position = self.position + 1
		self._update_note_translations()


	def scroll_down(self):
		self.position = self.position - 1
		self._update_note_translations()


	def _note_translation_for_button(self, button):
		return (button.identifier, button.channel)


	def _update_note_translations(self):
		for button in self.matrix:
			if self._button_should_be_enabled(button):
				self._set_button_control_properties(button)
				button.enabled = True
			else:
				button.enabled = False


	def _set_button_control_properties(self, button):
		if button and hasattr(button, '_control_element') and button._control_element:
			#debug('control info:', button._control_element if hasattr(button, '_control_element') else 'no _control_element')
			button.identifier = button._control_element.original_identifier() + ((self.position - 5) * 12)
			button.channel = button._control_element.original_channel() + self._channel_offset
			#debug('setting:', button, button.identifier , button.channel)


class Morph(ControlSurface):


	_model_name = 'Morph'
	bank_definitions = BANK_DEFINITIONS

	def __init__(self, c_instance, *a, **k):
		self.log_message = logger.info
		super(Morph, self).__init__(c_instance, *a, **k)
		self._skin = Skin(MorphColors)
		with self.component_guard():
			self._setup_controls()
			self._setup_background()
			#self._setup_button_background()
			self._setup_drum_group()
			self._setup_keys_group()
			self._setup_piano_group()
			self._setup_autoarm()
			self._setup_device()
			self._setup_session()
			self._setup_session2()
			self._setup_mixer()
			self._setup_transport()
			self._setup_viewcontrol()
			self._setup_recorder()
			self._setup_translations()
			self._setup_modes()
		self._on_device_changed.subject = self._device_provider
		self.log_message('<<<<<<<<<<<<<<<<<<<<<<<<< Morph '+VERSION+' log opened >>>>>>>>>>>>>>>>>>>>>>>>>')
		self.show_message('Morph '+VERSION+' Control Surface Loaded')
		self.schedule_message(2, self._init_surface)
		#debug('device:', self._device._get_device())


	def _init_surface(self):
		#self._main_modes.selected_mode = 'Main'
		self._send_midi(CHECK_MAPS)
		self._send_midi(MAGNET_VALUES_CALL)


	def port_settings_changed(self):
		super(Morph, self).port_settings_changed()
		self._init_surface()


	def _setup_controls(self):
		is_momentary = True
		optimized = False
		resource = ExclusiveResource #PrioritizedResource
		self._pad = [[ButtonElement(is_momentary = is_momentary, msg_type = MIDI_NOTE_TYPE, channel = CHANNEL, identifier = MORPH_PADS[row][column], name = 'Pad_' + str(column) + '_' + str(row), skin = self._skin, resource_type = resource) for column in range(4)] for row in range(4)]
		for row in self._pad:
			for pad in row:
				pad.enabled = False
		self._button = [ButtonElement(is_momentary = is_momentary, msg_type = MIDI_NOTE_TYPE, channel = CHANNEL, identifier = MORPH_BUTTONS[index], name = 'Button_' + str(index), skin = self._skin, resource_type = resource) for index in range(8)]
		for button in self._button:
			button.set_enabled = False
		self._key = [MorphButtonElement(is_momentary = is_momentary, msg_type = MIDI_NOTE_TYPE, channel = KEY_CHANNEL, identifier = MORPH_KEYS[index], name = 'Key_' + str(index), skin = self._skin, resource_type = resource) for index in range(25)]
		self._dials = [MorphEncoderElement(msg_type = MIDI_CC_TYPE, channel = CHANNEL, identifier = MORPH_DIALS[index], map_mode = Live.MidiMap.MapMode.absolute, name = 'Dial_' + str(index), resource_type = resource) for index in range(8)]
		self._slider = [MorphEncoderElement(msg_type = MIDI_CC_TYPE, channel = CHANNEL, identifier = MORPH_SLIDERS[index], map_mode = Live.MidiMap.MapMode.absolute, name = 'Slider_' + str(index), resource_type = resource) for index in range(2)]
		self._send_pressure = [MorphEncoderElement(msg_type = MIDI_CC_TYPE, channel = CHANNEL, identifier = MORPH_SEND_PRESSURE[index], map_mode = Live.MidiMap.MapMode.absolute, name = 'SendPressure_' + str(index), resource_type = resource) for index in range(2)]
		self._thunder_slider = [MorphEncoderElement(msg_type = MIDI_CC_TYPE, channel = CHANNEL, identifier = MORPH_THUNDER_SLIDERS[index], map_mode = Live.MidiMap.MapMode.absolute, name = 'Slider_' + str(index), resource_type = resource) for index in range(6)]

		self._pad_matrix = ButtonMatrixElement(name = 'PadMatrix', rows = self._pad)
		self._dial_matrix = ButtonMatrixElement(name = 'DialMatrix', rows = [self._dials])
		self._button_matrix = ButtonMatrixElement(name = 'ButtonMatrix', rows = [self._button])
		self._key_matrix = ButtonMatrixElement(name = 'KeyMatrix', rows = [self._key[:14]])
		self._key_shift_matrix = ButtonMatrixElement(name = 'KeyShiftMatrix', rows = [self._key[2:11]])
		self._slider_matrix = ButtonMatrixElement(name = 'SliderMatrix', rows = [self._slider])
		self._send_pressure_matrix = ButtonMatrixElement(name = 'SendAMatrix', rows = [self._send_pressure])
		self._thunder_slider_matrix = ButtonMatrixElement(name = 'ThunderSliderMatrix', rows = [self._thunder_slider])
		#self._shift_send_pressure_matrix = ButtonMatrixElement(name = 'ShiftSendMatrix', rows = [ [None, None, self._send_pressure[0], self._send_pressure[1]] ])

		self._piano_button = [MorphButtonElement(is_momentary = is_momentary, msg_type = MIDI_NOTE_TYPE, channel = CHANNEL, identifier = PIANO_BUTTONS[index], name = 'PianoButton_' + str(index), skin = self._skin, resource_type = resource) for index in range(4)]
		for button in self._piano_button:
			button.enabled = False
		#self._piano_key = [MorphButtonElement(is_momentary = is_momentary, msg_type = MIDI_NOTE_TYPE, channel = PIANO_CHANNEL, identifier = PIANO_KEYS[index], name = 'PianoKey_' + str(index), skin = self._skin, resource_type = resource) for index in range(25)]

		self._piano_matrix = ButtonMatrixElement(name = 'PianoMatrix', rows = [self._key])
		self._piano_session_matrix = ButtonMatrixElement(name = 'PianoSessionMatrix', rows = [self._key[0:4], self._key[4:8], self._key[8:12], self._key[12:16]])


	def _setup_background(self):
		self._background = BackgroundComponent()
		self._background.layer = Layer(priority = 1, pads = self._pad_matrix, buttons = self._button_matrix, keys = self._key_matrix, dials = self._dial_matrix, sliders = self._slider_matrix)
		self._background.set_enabled(False)


	def _setup_drum_group(self):
		self._drum_group = MorphDrumGroup(set_pad_translations = self.set_pad_translations, translation_channel = DRUM_TRANSLATION_CHANNEL)
		self._drum_group.main_layer = AddLayerMode(self._drum_group, Layer(priority = 2, matrix = self._pad_matrix))
		self._drum_group.nav_layer = AddLayerMode(self._drum_group, Layer(priority = 2, scroll_up_button = self._key[1], scroll_down_button = self._key[0]))
		self._drum_group.set_enabled(False)


	def _setup_keys_group(self):
		self._keys_group = MorphKeysGroup()
		self._keys_group.main_layer = AddLayerMode(self._keys_group, Layer(priority = 2, matrix = self._key_matrix))
		self._keys_group.shift_layer = AddLayerMode(self._keys_group, Layer(priority = 2, matrix = self._key_shift_matrix, scroll_up_button = self._key[12], scroll_down_button = self._key[11]))
		self._keys_group.set_enabled(False)


	def _setup_piano_group(self):
		self._piano_group = MorphKeysGroup()
		self._piano_group._hi_limit = 8
		self._piano_group.main_layer = AddLayerMode(self._piano_group, Layer(priority = 2, matrix = self._piano_matrix, scroll_up_button = self._piano_button[1], scroll_down_button = self._piano_button[0]))
		#self._piano_group.shift_layer = AddLayerMode(self._piano_group, Layer(matrix = self._piano_shift_matrix, scroll_up_button = self._pian0[12], scroll_down_button = self._key[11]))
		self._piano_group.set_enabled(False)


	def _setup_autoarm(self):
		self._auto_arm = AutoArmComponent(name='Auto_Arm')
		self._auto_arm.can_auto_arm_track = self._can_auto_arm_track
		self._auto_arm._update_notification = lambda: None


	def _setup_transport(self):
		self._transport = TransportComponent(name = 'Transport')
		self._transport.layer = Layer(priority = 2, play_button = self._button[4], stop_button = self._button[5], overdub_button = self._button[6])
		self._transport.set_enabled(False)


	def _setup_translations(self):
		self._translations = TranslationComponent(name='Translations',
													channel=USER_CHANNEL,
													controls = self._dials + self._slider)
		self._translations.set_enabled(False)


	def _setup_device(self):
		self._device = MorphDeviceComponent(device_decorator_factory = DeviceDecoratorFactory(), banking_info = BankingInfo(self.bank_definitions), device_provider = self._device_provider, device_bank_registry = DeviceBankRegistry())
		self._device_parameters = DeviceParameterComponent(self._device)
		self._device_parameters.layer = Layer(priority = 2, parameter_controls = self._dial_matrix)
		self._device.set_enabled(False)
		self._device_parameters.set_enabled(False)

		self._device2 = MorphDeviceComponent(device_decorator_factory = DeviceDecoratorFactory(), banking_info = BankingInfo(self.bank_definitions), device_provider = self._device_provider, device_bank_registry = DeviceBankRegistry())
		self._device_parameters2 = DeviceParameterComponent(self._device2)
		self._device_parameters2.layer = Layer(priority = 2, parameter_controls = self._thunder_slider_matrix)
		self._device2.set_enabled(False)
		self._device_parameters2.set_enabled(False)


	def _setup_session(self):
		self._session_ring = SessionRingComponent(name = 'Session_Ring', num_tracks = 4, num_scenes = 4)

		self._session = SessionComponent(name = 'Session', session_ring = self._session_ring, auto_name = True)
		self._session.layer = Layer(priority = 2, clip_launch_buttons = self._pad_matrix,) # stop_all_clips_button = self._button[5])
		self._session.set_enabled(False)

		self._session_navigation = SessionNavigationComponent(name = 'Session_Navigation', session_ring = self._session_ring)
		self._session_navigation.layer = Layer(priority = 2, left_button = self._button[0], right_button = self._button[1])
		self._session_navigation.set_enabled(False)


	def _setup_session2(self):
		self._session2 = SessionComponent(name = 'Session2', session_ring = self._session_ring, auto_name = True)
		self._session2.layer = Layer(priority = 2, clip_launch_buttons = self._piano_session_matrix)
		self._session2.set_enabled(False)

		#self._session_navigation2 = SessionNavigationComponent(name = 'Session_Navigation2', session_ring = self._session_ring)
		#self._session_navigation2.layer = Layer(priority = 2, left_button = self._button[0], right_button = self._button[1])
		#self._session_navigation2.set_enabled(False)


	def _setup_mixer(self):
		self._mixer = MorphMixerComponent(tracks_provider = self._session_ring, track_assigner = SimpleTrackAssigner(), auto_name = True, invert_mute_feedback = False, channel_strip_component_type = MorphChannelStripComponent)
		self._mixer._selected_strip.main_layer = AddLayerMode(self._mixer._selected_strip, Layer(priority = 2, send_controls = self._send_pressure_matrix))
		self._mixer._selected_strip.shift_layer = AddLayerMode(self._mixer._selected_strip, Layer(priority = 2, stop_button = self._button[5]))
		#self._mixer._selected_strip.shift_layer = AddLayerMode(self._mixer, Layer(send_controls = self._shift_send_pressure_matrix.submatrix[:,]))


	def _setup_viewcontrol(self):
		self._viewcontrol = ViewControlComponent()
		self._viewcontrol.layer = Layer(priority = 2, prev_track_button = self._button[0], next_track_button = self._button[1])
		self._viewcontrol.set_enabled(False)


	def _setup_recorder(self):
		self._recorder = SessionRecordingComponent(view_controller = ViewControlComponent())
		self._recorder.layer = Layer(priority = 2, record_button = self._button[6])
		self._recorder.set_enabled(False)


	def _assign_crossfader(self):
		self._slider[1].connect_to(self.song.master_track.mixer_device.crossfader)
		debug('_assign_crossfader:', self._slider[1]._parameter_to_map_to)


	def _deassign_crossfader(self):
		self._slider[1].release_parameter()
		debug('_assign_crossfader:', self._slider[1]._parameter_to_map_to)


	def _setup_modes(self):
		self._production_modes = ModesComponent(name = 'ProductionModes')
		self._production_modes.add_mode('Main', [self._mixer, self._mixer._selected_strip.main_layer, self._viewcontrol, self._drum_group, self._drum_group.main_layer, self._keys_group, self._keys_group.main_layer, self._device, self._device_parameters, self._transport, self._assign_crossfader])
		self._production_modes.add_mode('Shift', [self._mixer, self._mixer._selected_strip.shift_layer, self._session, self._session_navigation,  self._drum_group, self._drum_group.nav_layer, self._keys_group, self._keys_group.shift_layer, self._deassign_crossfader, self._recorder, self._translations], behaviour = MomentaryBehaviour())
		self._production_modes.layer = Layer(Shift_button = self._button[7])
		self._production_modes.selected_mode = 'Main'
		self._production_modes.set_enabled(False)

		self._piano_modes = ModesComponent(name = 'PianoModes')
		self._piano_modes.add_mode('Main', [self._piano_group, self._piano_group.main_layer, self._mixer, self._mixer._selected_strip.main_layer, self._viewcontrol,  self._device, self._device_parameters, self._transport, self._assign_crossfader])
		self._piano_modes.add_mode('Shift', [self._mixer, self._mixer._selected_strip.shift_layer, self._session2, self._session_navigation, self._recorder], behaviour = MomentaryBehaviour())
		self._piano_modes.layer = Layer(Shift_button = self._button[7])
		self._piano_modes.selected_mode = 'Main'
		self._piano_modes.set_enabled(False)

		self._drumpad_modes = ModesComponent(name = 'DrumpadModes')
		self._drumpad_modes.add_mode('Main', [self._mixer, self._mixer._selected_strip.main_layer, self._viewcontrol, self._drum_group, self._drum_group.main_layer, self._transport, self._assign_crossfader])
		self._drumpad_modes.add_mode('Shift', [self._mixer, self._mixer._selected_strip.shift_layer,  self._drum_group, self._drum_group.nav_layer, self._recorder], behaviour = MomentaryBehaviour())
		self._drumpad_modes.layer = Layer(Shift_button = self._button[7])
		self._drumpad_modes.selected_mode = 'Main'
		self._drumpad_modes.set_enabled(False)

		self._thunder_modes = ModesComponent(name = 'ThunderModes')
		self._thunder_modes.add_mode('Main', [self._mixer, self._mixer._selected_strip.main_layer, self._viewcontrol,  self._transport, self._assign_crossfader, self._device2, self._device_parameters2])
		self._thunder_modes.add_mode('Shift', [self._mixer, self._mixer._selected_strip.shift_layer, self._recorder, self._device2, self._device_parameters2], behaviour = MomentaryBehaviour())
		self._thunder_modes.layer = Layer(Shift_button = self._button[7])
		self._thunder_modes.selected_mode = 'Main'
		self._thunder_modes.set_enabled(False)

		self._main_modes = ModesComponent(name = 'MainModes')
		self._main_modes.add_mode('disabled', self._background)
		self._main_modes.add_mode('ProductionMode', [self._production_modes])
		self._main_modes.add_mode('PianoMode', [self._piano_modes])
		self._main_modes.add_mode('DrumpadMode', [self._drumpad_modes])
		self._main_modes.add_mode('ThunderMode', [self._thunder_modes])

		self._report_mode.subject = self._main_modes
		self._main_modes.selected_mode = 'disabled'


	@listens('selected_mode')
	def _report_mode(self, *a, **k):
		debug('Modes:', self._main_modes.selected_mode, self._production_modes.selected_mode, self._piano_modes.selected_mode, self._drumpad_modes.selected_mode, self._thunder_modes.selected_mode)


	def _can_auto_arm_track(self, track):
		routing = track.current_input_routing
		return routing == 'Ext: All Ins' or routing == 'All Ins' or routing.startswith('Sensel') or routing.startswith('Morph')


	@listens('device')
	def _on_device_changed(self):
		debug('_on_device_changed:', self._device_provider.device)
		self._drum_group.set_drum_group_device(self._device_provider.device)


	def disconnect(self):
		self.log_message('<<<<<<<<<<<<<<<<<<<<<<<<< Morph log closed >>>>>>>>>>>>>>>>>>>>>>>>>')
		super(Morph, self).disconnect()


	def process_midi_bytes(self, midi_bytes, midi_processor):
		super(Morph, self).process_midi_bytes(midi_bytes, midi_processor)
		if midi.is_sysex(midi_bytes):
			self.handle_sysex(midi_bytes)


	def handle_sysex(self, midi_bytes):
		debug('sysex: ', str(midi_bytes))
		#debug('matching:', midi_bytes[1:5], 'to', tuple([0, 1, 97]  + [self._sysex_id]))
		if len(midi_bytes)==9 and midi_bytes[1:5] == tuple([0, 1, 97]  + [self._sysex_id]):
			if not self._connected:
				#debug('connecting from sysex...')
				self._connected = True
				self._initialize_hardware()
				self._initialize_script()
		if len(midi_bytes)==11:
			if midi_bytes == PIANO_OVERLAY:
				debug('piano overlay...')
				self._main_modes.selected_mode = 'PianoMode'
			elif midi_bytes == PRODUCTION_OVERLAY:
				debug('production overlay...')
				self._main_modes.selected_mode = 'ProductionMode'
			elif midi_bytes == DRUM_OVERLAY:
				debug('drum overlay...')
				self._main_modes.selected_mode = 'DrumpadMode'
			elif midi_bytes == THUNDER_OVERLAY:
				debug('thunder overlay...')
				self._main_modes.selected_mode = 'ThunderMode'
			elif midi_bytes == NO_OVERLAY:
				debug('no overlay...')
				self._main_modes.selected_mode = 'disabled'


#a
