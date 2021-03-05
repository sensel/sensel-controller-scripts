# by amounra 0118 : http://www.aumhaa.com
# written against Live 10

from __future__ import absolute_import, print_function
from ableton.v2.control_surface.capabilities import *
from .Morph import Morph


def get_capabilities():
	return {CONTROLLER_ID_KEY: controller_id(vendor_id=2536, product_ids=[115], model_name='Sensel Morph Live'),
	 PORTS_KEY: [inport(props=[HIDDEN, NOTES_CC, SCRIPT, REMOTE]), 
					inport(props = []),
					outport(props=[HIDDEN, NOTES_CC, SCRIPT, REMOTE]),
					outport(props=[])],
	 TYPE_KEY: 'push',
	 AUTO_LOAD_KEY: False}


def create_instance(c_instance):
	""" Creates and returns the Morph script """
	return Morph(c_instance)

