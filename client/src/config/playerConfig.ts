export const playerConfig = {
  eyeHeight: 1.7,
  // Collision capsule. Narrow enough to walk along a row of seats.
  bodyHeight: 1.8,
  bodyRadius: 0.25,
  walkSpeed: 4,
  mouseSensitivity: 1,
  // Higher values reach full speed, and stop, more quickly.
  movementResponse: 12,
  // How quickly the eyes follow changes in floor height, such as aisle steps.
  heightResponse: 10,
  // Long frames are capped so a stutter can't jump the player forward.
  maxFrameDelta: 0.1,
  gravity: 9.81,
  maxFallSpeed: 30,
  // Keeps the player on the floor when walking down the seating slope.
  snapToGroundDistance: 0.45,
  // Gap the physics engine keeps between the player and solid objects.
  collisionOffset: 0.01,
} as const
