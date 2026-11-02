import { TheatreCeiling } from './TheatreCeiling'
import { TheatreFloor } from './TheatreFloor'
import { TheatreLighting } from './TheatreLighting'
import { TheatreScreen } from './TheatreScreen'
import { TheatreSeats } from './TheatreSeats'
import { TheatreWalls } from './TheatreWalls'

export function Theatre() {
  return (
    <>
      <TheatreLighting />
      <TheatreFloor />
      <TheatreWalls />
      <TheatreCeiling />
      <TheatreScreen />
      <TheatreSeats />
    </>
  )
}
