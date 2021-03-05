# by amounra 0118 : http://www.aumhaa.com
# written against Live 10.1.7


from ableton.v2.control_surface.elements.color import Color

class MonoColor(Color):


	def draw(self, interface):
		try:
			interface.set_darkened_value(0)
			super(MonoColor, self).draw(interface)
		except:
			super(MonoColor, self).draw(interface)


class LividRGB:

	OFF = MonoColor(0)
	WHITE = MonoColor(1)
	YELLOW = MonoColor(2)
	CYAN = MonoColor(3)
	MAGENTA = MonoColor(4)
	RED = MonoColor(5)
	GREEN = MonoColor(6)
	BLUE = MonoColor(7)


VERSION = '1.2'

CHANNEL = 0

KEY_TRANSLATION_CHANNEL = 2

PIANO_TRANSLATION_CHANNEL = 0

PAD_TRANSLATION_CHANNEL = 1

DRUM_TRANSLATION_CHANNEL = 9

USER_CHANNEL = 14

MORPH_PADS = [[48, 49, 50, 51], [44, 45, 46, 47], [40, 41, 42, 43], [36, 37, 38, 39]]

MORPH_KEYS = [note for note in range(60, 85)]

MORPH_BUTTONS = [index for index in range(1,9)]

MORPH_SLIDERS = [17, 18]

MORPH_THUNDER_SLIDERS = [21, 22, 23, 24, 25, 26]

MORPH_DIALS = [index for index in range(9, 17)]

MORPH_SEND_PRESSURE = [19, 20]

PIANO_BUTTONS = [9, 10, 11, 12]

#PIANO_KEYS = [note for note in range(60, 85)]

CHANNELS = ['Ch. 2', 'Ch. 3', 'Ch. 4', 'Ch. 5', 'Ch. 6', 'Ch. 7', 'Ch. 8', 'Ch. 9', 'Ch. 10', 'Ch. 11', 'Ch. 12', 'Ch. 13', 'Ch. 14']

#PAD_TRANSLATION = 	((0, 0, 0, 9), (0, 1, 1, 9), (0, 2, 2, 9), (0, 3, 3, 9),
#					(1, 0, 4, 9), (1, 1, 5, 9), (1, 2, 6, 9), (1, 3, 7, 9),
#					(2, 0, 8, 9), (2, 1, 9, 9), (2, 2, 10, 9), (2, 3, 11, 9),
#					(3, 0, 12, 9), (3, 1, 13, 9), (3, 2, 14, 9), (3, 3, 15, 9))

class MorphColors:


	class DefaultButton:
		On = LividRGB.WHITE
		Off = LividRGB.OFF
		Disabled = LividRGB.OFF
		Alert = LividRGB.WHITE


	class Transport:
		OverdubOn = LividRGB.RED
		OverdubOff = LividRGB.RED
		PlayOff = LividRGB.GREEN
		PlayOn = LividRGB.GREEN
		StopOn = LividRGB.BLUE
		StopOff = LividRGB.OFF


	class Session:
		StopClipTriggered = LividRGB.BLUE
		StopClip = LividRGB.BLUE
		Scene = LividRGB.CYAN
		NoScene = LividRGB.OFF
		SceneTriggered = LividRGB.BLUE
		ClipTriggeredPlay = LividRGB.GREEN
		ClipTriggeredRecord = LividRGB.RED
		RecordButton = LividRGB.OFF
		ClipEmpty = LividRGB.OFF
		ClipStopped = LividRGB.WHITE
		ClipStarted = LividRGB.GREEN
		ClipRecording = LividRGB.RED
		NavigationButtonOn = LividRGB.BLUE
		PageNavigationButtonOn = LividRGB.CYAN
		Empty = LividRGB.OFF


	class LoopSelector:
		Playhead = LividRGB.YELLOW
		OutsideLoop = LividRGB.BLUE
		InsideLoopStartBar = LividRGB.CYAN
		SelectedPage = LividRGB.WHITE
		InsideLoop = LividRGB.CYAN
		PlayheadRecord = LividRGB.RED


	class DrumGroup:
		PadAction = LividRGB.WHITE
		PadFilled = LividRGB.GREEN
		PadFilledAlt = LividRGB.MAGENTA
		PadSelected = LividRGB.WHITE
		PadSelectedNotSoloed = LividRGB.WHITE
		PadEmpty = LividRGB.OFF
		PadMuted = LividRGB.YELLOW
		PadSoloed = LividRGB.CYAN
		PadMutedSelected = LividRGB.BLUE
		PadSoloedSelected = LividRGB.BLUE
		PadInvisible = LividRGB.OFF
		PadAction = LividRGB.RED


	class Mixer:
		SoloOn = LividRGB.CYAN
		SoloOff = LividRGB.OFF
		MuteOn = LividRGB.YELLOW
		MuteOff = LividRGB.OFF
		ArmSelected = LividRGB.GREEN
		ArmSelectedImplicit = LividRGB.MAGENTA
		ArmUnselected = LividRGB.RED
		ArmOff = LividRGB.OFF
		StopClip = LividRGB.BLUE
		SelectedOn = LividRGB.BLUE
		SelectedOff = LividRGB.OFF


	class Recording:
		On = LividRGB.RED
		Off = LividRGB.RED
		Transition = LividRGB.RED


	class Recorder:
		On = LividRGB.WHITE
		Off = LividRGB.BLUE
		NewOn = LividRGB.YELLOW
		NewOff = LividRGB.YELLOW
		FixedOn = LividRGB.CYAN
		FixedOff = LividRGB.CYAN
		RecordOn = LividRGB.GREEN
		RecordOff = LividRGB.GREEN
		FixedAssigned = LividRGB.MAGENTA
		FixedNotAssigned = LividRGB.OFF
		OverdubOn = LividRGB.RED
		OverdubOff = LividRGB.RED


	class Device:
		NavOn = LividRGB.MAGENTA
		NavOff = LividRGB.OFF
		BankOn = LividRGB.YELLOW
		BankOff = LividRGB.OFF
		ChainNavOn = LividRGB.RED
		ChainNavOff = LividRGB.OFF
		ContainNavOn = LividRGB.CYAN
		ContainNavOff = LividRGB.OFF




## a
