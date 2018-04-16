# by amounra 0118 : http://www.aumhaa.com
# written against Live 10

from __future__ import with_statement, print_function, unicode_literals
import Live
import time
import math
import logging
logger = logging.getLogger(__name__)
from functools import partial
from itertools import izip, izip_longest, product

from ableton.v2.base import slicer, to_slice, liveobj_changed, group, flatten, listens, liveobj_valid
from ableton.v2.control_surface.component import Component
from ableton.v2.control_surface.compound_component import CompoundComponent
from ableton.v2.control_surface.elements.button import ButtonElement
from ableton.v2.control_surface.elements.button_matrix import ButtonMatrixElement
from ableton.v2.control_surface.components.channel_strip import ChannelStripComponent
from ableton.v2.control_surface.compound_component import CompoundComponent
from ableton.v2.control_surface.control_element import ControlElement
from ableton.v2.control_surface.control_surface import ControlSurface
from ableton.v2.control_surface.component import Component as ControlSurfaceComponent
from ableton.v2.control_surface.elements.encoder import EncoderElement
from ableton.v2.control_surface.input_control_element import *
from ableton.v2.control_surface.components.mixer import MixerComponent, simple_track_assigner
from ableton.v2.control_surface.components.session import SessionComponent
from ableton.v2.control_surface.components.transport import TransportComponent
from ableton.v2.control_surface.components.session_navigation import SessionNavigationComponent
from ableton.v2.control_surface.mode import AddLayerMode, LayerMode, ModesComponent, ModeButtonBehaviour, DelayMode
from ableton.v2.control_surface.resource import PrioritizedResource
from ableton.v2.control_surface.skin import Skin
from ableton.v2.control_surface import DeviceBankRegistry
from ableton.v2.control_surface.components.device import DeviceComponent
from ableton.v2.control_surface.layer import Layer
from ableton.v2.control_surface.components.drum_group import DrumGroupComponent
from ableton.v2.control_surface.components.view_control import ViewControlComponent
from ableton.v2.control_surface.components.session_recording import SessionRecordingComponent
from ableton.v2.control_surface.components.playable import PlayableComponent
from ableton.v2.control_surface.elements.combo import ComboElement, DoublePressElement, MultiElement, DoublePressContext
from ableton.v2.control_surface.components.background import BackgroundComponent
from ableton.v2.control_surface.components.session_ring import SessionRingComponent
from ableton.v2.base.event import *
from ableton.v2.base.task import *
from ableton.v2.control_surface.percussion_instrument_finder import PercussionInstrumentFinder, find_drum_group_device

from pushbase.auto_arm_component import AutoArmComponent

from _Generic.Devices import *

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

class MorphButtonElement(ButtonElement):


	def set_enabled(self, enabled = True):
		self._is_enabled = enabled
		self._request_rebuild()
	

class MorphEncoderElement(EncoderElement):


	def set_enabled(self, enabled = True):
		self._is_enabled = enabled
		self._request_rebuild()
	


class TranslationComponent(CompoundComponent):


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
	


class MorphDeviceComponent(DeviceComponent):


	def _on_device_changed(self, device):
		super(MorphDeviceComponent, self)._on_device_changed(device)
		debug('DeviceComponent._on_device_changed:', device)
		if device:
			debug(device.name)
	

	def set_parameter_controls(self, controls):
		super(MorphDeviceComponent, self).set_parameter_controls(controls)
		debug('DeviceComponent.set_parameter_controls:', controls)
		if controls:
			debug(len(controls))
	


class MorphDrumGroup(DrumGroupComponent):


	def set_bank_up_button(self, button):
		self._bank_up_button_value.subject = button
	

	def set_bank_down_button(self, button):
		self._bank_down_button_value.subject = button
	

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
	

class MorphKeysGroup(PlayableComponent):


	def _set_button_control_properties(self, button):
		identifier, channel = self._note_translation_for_button(button)
		button.identifier = identifier
		button.channel = channel
		debug('setting:', button, identifier, channel)
	


class Morph(ControlSurface):


	_model_name = 'Morph'

	def __init__(self, c_instance, *a, **k):
		self.log_message = logger.info
		super(Morph, self).__init__(c_instance, *a, **k)
		self._skin = Skin(MorphColors)
		with self.component_guard():
			self._setup_controls()
			self._setup_background()
			self._setup_drum_group()
			self._setup_keys_group()
			self._setup_autoarm()
			self._setup_device()
			self._setup_session()
			self._setup_mixer()
			self._setup_transport()
			self._setup_viewcontrol()
			self._setup_recorder()
			self._setup_translations()
			self._setup_modes() 
		self._on_device_changed.subject = self._device_provider
		self.log_message('<<<<<<<<<<<<<<<<<<<<<<<<< Morph log opened >>>>>>>>>>>>>>>>>>>>>>>>>')
		self.show_message('Morph Control Surface Loaded')
		#debug('device:', self._device._get_device())
	


	def _setup_controls(self):
		is_momentary = True
		optimized = False
		resource = PrioritizedResource
		self._pad = [[ButtonElement(is_momentary = is_momentary, msg_type = MIDI_NOTE_TYPE, channel = CHANNEL, identifier = MORPH_PADS[row][column], name = 'Pad_' + str(column) + '_' + str(row), skin = self._skin, resource_type = resource) for column in range(4)] for row in range(4)]
		for row in self._pad:
			for pad in row:
				pad.enabled = False
		self._button = [MorphButtonElement(is_momentary = is_momentary, msg_type = MIDI_NOTE_TYPE, channel = CHANNEL, identifier = MORPH_BUTTONS[index], name = 'Button_' + str(index), skin = self._skin, resource_type = resource) for index in range(8)]
		self._key = [MorphButtonElement(is_momentary = is_momentary, msg_type = MIDI_NOTE_TYPE, channel = KEY_CHANNEL, identifier = MORPH_KEYS[index], name = 'Key_' + str(index), skin = self._skin, resource_type = resource) for index in range(13)]
		self._dials = [MorphEncoderElement(msg_type = MIDI_CC_TYPE, channel = CHANNEL, identifier = MORPH_DIALS[index], map_mode = Live.MidiMap.MapMode.absolute, name = 'Dial_' + str(index), resource_type = resource) for index in range(8)]
		self._slider = [MorphEncoderElement(msg_type = MIDI_CC_TYPE, channel = CHANNEL, identifier = MORPH_SLIDERS[index], map_mode = Live.MidiMap.MapMode.absolute, name = 'Slider_' + str(index), resource_type = resource) for index in range(2)]
		self._send_pressure = [MorphEncoderElement(msg_type = MIDI_CC_TYPE, channel = CHANNEL, identifier = MORPH_SEND_PRESSURE[index], map_mode = Live.MidiMap.MapMode.absolute, name = 'SendPressure_' + str(index), resource_type = resource) for index in range(2)]

		self._pad_matrix = ButtonMatrixElement(name = 'PadMatrix', rows = self._pad)
		self._dial_matrix = ButtonMatrixElement(name = 'DialMatrix', rows = [self._dials])
		self._button_matrix = ButtonMatrixElement(name = 'ButtonMatrix', rows = [self._button])
		self._key_matrix = ButtonMatrixElement(name = 'KeyMatrix', rows = [self._key])
		self._key_shift_matrix = ButtonMatrixElement(name = 'KeyShiftMatrix', rows = [self._key[2:10]])
		self._slider_matrix = ButtonMatrixElement(name = 'SliderMatrix', rows = [self._slider])
		self._send_pressure_matrix = ButtonMatrixElement(name = 'SendAMatrix', rows = [self._send_pressure])
	

	def _setup_background(self):
		self._background = BackgroundComponent()
		self._background.layer = Layer(pads = self._pad_matrix.submatrix[:,:], buttons = self._button_matrix.submatrix[:,:], keys = self._key_matrix.submatrix[:,:], dials = self._dial_matrix.submatrix[:,:], sliders = self._slider_matrix.submatrix[:,:])
		self._background.set_enabled(True)
	

	def _setup_drum_group(self):
		self._drum_group = MorphDrumGroup(set_pad_translations = self.set_pad_translations, translation_channel = DRUM_TRANSLATION_CHANNEL)
		self._drum_group.main_layer = AddLayerMode(self._drum_group, Layer(matrix = self._pad_matrix))
		self._drum_group.nav_layer = AddLayerMode(self._drum_group, Layer(bank_up_button = self._key[2], bank_down_button = self._key[0]))
		self._drum_group.set_enabled(False)
	

	def _setup_keys_group(self):
		self._keys_group = MorphKeysGroup()
		self._keys_group.main_layer = AddLayerMode(self._keys_group, Layer(matrix = self._key_matrix))
		self._keys_group.shift_layer = AddLayerMode(self._keys_group, Layer(matrix = self._key_shift_matrix))
		self._keys_group.set_enabled(False)
	

	def _setup_autoarm(self):
		self._auto_arm = AutoArmComponent(name='Auto_Arm')
		self._auto_arm.can_auto_arm_track = self._can_auto_arm_track
		self._auto_arm._update_notification = lambda: None
	

	def _setup_transport(self):
		self._transport = TransportComponent(name = 'Transport') 
		self._transport.layer = Layer(play_button = self._button[4], stop_button = self._button[5], overdub_button = self._button[6])
		self._transport.set_enabled(False)
	

	def _setup_translations(self):
		self._translations = TranslationComponent(name='Translations', 
													channel=USER_CHANNEL, 
													controls = self._key + self._dials)
		self._translations.set_enabled(False)
	

	def _setup_device(self):
		self._device = MorphDeviceComponent(device_provider = self._device_provider, device_bank_registry = self._device_bank_registry)
		self._device.layer = Layer(parameter_controls = self._dial_matrix)
		self._device.set_enabled(False)
	

	def _setup_session(self):
		self._session_ring = SessionRingComponent(name = 'Session_Ring', num_tracks = 4, num_scenes = 4)

		self._session = SessionComponent(name = 'Session', session_ring = self._session_ring, auto_name = True)
		self._session.layer = Layer(clip_launch_buttons = self._pad_matrix, stop_all_clips_button = self._button[5])
		self._session.set_enabled(False)

		self._session_navigation = SessionNavigationComponent(name = 'Session_Navigation', session_ring = self._session_ring)
		self._session_navigation.layer = Layer(left_button = self._button[0], right_button = self._button[1])
		self._session_navigation.set_enabled(False)
	

	def _setup_mixer(self):
		self._mixer = MixerComponent(tracks_provider = self._session_ring, track_assigner = simple_track_assigner, auto_name = True, invert_mute_feedback = False)
		self._mixer._selected_strip.layer = Layer(send_controls = self._send_pressure_matrix)
	

	def _setup_viewcontrol(self):
		self._viewcontrol = ViewControlComponent()
		self._viewcontrol.layer = Layer(prev_track_button = self._button[0], next_track_button = self._button[1])
		self._viewcontrol.set_enabled(False)
	

	def _setup_recorder(self):
		self._recorder = SessionRecordingComponent(view_controller = ViewControlComponent())
		self._recorder.layer = Layer(record_button = self._button[6])
		self._recorder.set_enabled(False)
	

	def _assign_crossfader(self):
		self._slider[1].connect_to(self.song.master_track.mixer_device.crossfader)
		debug('_assign_crossfader:', self._slider[1]._parameter_to_map_to)
	

	def _deassign_crossfader(self):
		self._slider[1].release_parameter()
		debug('_assign_crossfader:', self._slider[1]._parameter_to_map_to)
	

	def _setup_modes(self):
		#self._send_modes = ModesComponent(name = 'SendModes')
		#self._send_modes.add_mode('disabled', [])
		#self._send_modes.add_mode('SendA', [self._mixer, self._mixer._selected_strip._send_a_layer])
		#self._send_modes.add_mode('SendB', [self._mixer, self._mixer._selected_strip._send_b_layer])
		#self._send_modes.layer = Layer(SendA_button = self._button[3], SendB_button = self._button[4])
		#self._send_modes.selected_mode = 'disabled'
		#self._send_modes.set_enabled(False)

		self._main_modes = ModesComponent(name = 'MainModes')
		self._main_modes.add_mode('Main', [self._mixer, self._mixer._selected_strip, self._viewcontrol, self._drum_group, self._drum_group.main_layer, self._keys_group, self._keys_group.main_layer, self._device, self._transport, self._assign_crossfader, self._report_mode])
		self._main_modes.add_mode('Session', [self._mixer, self._mixer._selected_strip, self._session, self._session_navigation, self._drum_group, self._keys_group, self._keys_group.shift_layer, self._drum_group.nav_layer, self._deassign_crossfader, self._recorder, self._translations, self._report_mode])
		self._main_modes.layer = Layer(cycle_mode_button = self._button[7])
		self._main_modes.set_enabled(True)
		self._main_modes.selected_mode = 'Main'


	

	def _report_mode(self):
		debug('Mode:', self._main_modes.selected_mode)
	


	def _can_auto_arm_track(self, track):
		routing = track.current_input_routing
		return routing == 'Ext: All Ins' or routing == 'All Ins' or routing.startswith('Sensel Morph')
	


	@listens('device')
	def _on_device_changed(self):
		debug('_on_device_changed:', self._device_provider.device)
		self._drum_group.set_drum_group_device(self._device_provider.device)
	


	def disconnect(self):
		self.log_message('<<<<<<<<<<<<<<<<<<<<<<<<< Morph log closed >>>>>>>>>>>>>>>>>>>>>>>>>')
		super(Morph, self).disconnect()
	

	def handle_sysex(self, midi_bytes):
		#debug('sysex: ', str(midi_bytes))
		#debug('matching:', midi_bytes[1:5], 'to', tuple([0, 1, 97]  + [self._sysex_id]))
		if len(midi_bytes)==9 and midi_bytes[1:5] == tuple([0, 1, 97]  + [self._sysex_id]):
			if not self._connected:
				#debug('connecting from sysex...')
				self._connected = True
				self._initialize_hardware()
				self._initialize_script()
	



#a
