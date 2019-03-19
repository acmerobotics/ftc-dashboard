const GamepadType = {
  GENERIC: 'GENERIC',
  LOGITECH_F310: 'LOGITECH_F310',
  XBOX_360: 'XBOX_360',
  UNKNOWN: 'UNKNOWN'
};

export default Object.freeze({
  ...GamepadType,

  getFromGamepad: (gamepad) => {
    if (gamepad.id.search('Logitech Gamepad F310') !== -1) {
      return GamepadType.LOGITECH_F310;
    } else if (gamepad.mapping === 'standard') {
      return GamepadType.GENERIC;
    } else {
      return GamepadType.UNKNOWN;
    }
  },

  getJoystickDeadzone: (gamepadType) => {
    switch (gamepadType) {
    case GamepadType.LOGITECH_F310:
      return 0.06;
    case GamepadType.XBOX_360:
      return 0.15;
    default:
      return 0.2;
    }
  },

  isSupported: (gamepadType) => 
    gamepadType !== GamepadType.UNKNOWN
});
