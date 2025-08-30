/**
 * Notes on the PS4 gamepad:
 *
 * Dualshock 4 controller seems to report itself as "Wireless Controller (STANDARD GAMEPAD Vendor: 054c Product: xxxx)"
 * The ID prepends "DUALSHOCK 4" only on bluetooth. The product ID seems to differ between Gen 1 & 2 of the controller.
 * The values listed in gamepad-tester.com seem to correspond with the values listed here: https://wiki.gentoo.org/wiki/Sony_DualShock
 * 05c4 for Gen 1 and 09cc for Gen 2
 * However, gamepad-tester.com also has a number of variants that don't follow the naming scheme but still contain strings
 * in their ID's that correspond to the vendor/product ID for the Dualshocks
 * So it's probably best to identify by checking if PID/VID is in the gamepad.id
 * 
 * Dualsense (PS5) also reports itself as "Wireless Controller (STANDARD GAMEPAD Vendor: 054c Product: xxxx)"
 * The product ID for the Dualsense is 0ce6 as reported by gamepad-tester.com and in the list above.
 * The Dualsense controller can be treated the same as the Dualshock 4 controller as it has the same button layout.
 */

import { Values } from '@/typeHelpers';

const GamepadType = {
  LOGITECH_DUAL_ACTION: 'LOGITECH_DUAL_ACTION',
  STANDARD: 'STANDARD', // Standard as defined by W3C Gamepad spec (https://www.w3.org/TR/gamepad/#remapping)
  SONY_DUALSHOCK_4: 'SONY_DUALSHOCK_4',
  UNKNOWN: 'UNKNOWN',
} as const;

const SONY_VID = '054c';
const DUALSHOCK_GEN_1_PID = '09cc';
const DUALSHOCK_GEN_2_PID = '05c4';
const DUALSENSE_PID = '0ce6';

// https://github.com/OpenFTC/Extracted-RC/blob/6720cf8b4296c90b6ea4638752c2df4a52b043b9/Hardware/src/main/java/com/qualcomm/hardware/sony/SonyGamepadPS4.java#L145
const ETPACK_VID = '7545';
const ETPACK_PID = '104';

export default {
  ...GamepadType,

  getFromGamepad: (gamepad: Gamepad) => {
    if (gamepad.id.search('Logitech Dual Action') !== -1) {
      return GamepadType.LOGITECH_DUAL_ACTION;
    } else if (
      gamepad.id.search(SONY_VID) !== -1 &&
      gamepad.id.search(
        new RegExp(`${DUALSHOCK_GEN_1_PID}|${DUALSHOCK_GEN_2_PID}|${DUALSENSE_PID}`, 'i'),
      ) !== -1
    ) {
      return GamepadType.SONY_DUALSHOCK_4;
    } else if (
      gamepad.id.search(
        new RegExp(`(?=.*${ETPACK_VID})(?=.*${ETPACK_PID})`, 'i'),
      ) !== -1
    ) {
      return GamepadType.SONY_DUALSHOCK_4;
    } else if (gamepad.mapping.search('standard') !== -1 
      || gamepad.id.search('Xbox 360') !== -1
      || gamepad.id.toLowerCase().search('xinput') !== -1) {
      return GamepadType.STANDARD;
    } else {
      return GamepadType.UNKNOWN;
    }
  },

  getJoystickDeadzone: (gamepadType: Values<typeof GamepadType>) => {
    switch (gamepadType) {
      case GamepadType.LOGITECH_DUAL_ACTION:
        return 0.06;
      case GamepadType.STANDARD:
        return 0.15;
      case GamepadType.SONY_DUALSHOCK_4:
        return 0.04;
      default:
        return 0.2;
    }
  },

  isSupported: (gamepadType: Values<typeof GamepadType>) =>
    gamepadType !== GamepadType.UNKNOWN,
} as const;
