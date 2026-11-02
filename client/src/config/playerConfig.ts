export const playerConfig = {
  eyeHeight: 1.7,
  walkSpeed: 4,
  mouseSensitivity: 1,
  // Higher values reach full speed, and stop, more quickly.
  movementResponse: 12,
  // How quickly the eyes follow changes in floor height, such as aisle steps.
  heightResponse: 10,
  // Long frames are capped so a stutter can't jump the player forward.
  maxFrameDelta: 0.1,
} as const
