import _ from 'lodash'

const names = [
  'Jesus',
  'Joe',
  'Hank',
  'Matt',
  'Mike',
  'Sven',
  'Andrew',
  'Bolvar',
  'Firebolt',
  'BagofDoom',
  'Moggers',
  'Urist',
  'Blake',
  'Tyrone',
  'Duke',
  'Doot'
]

const lastNames = [
  'Hill',
  'Rambo',
  '',
  'Davic',
  'Goldstien',
  'Brown'
]

export const getName = () =>
  names[_.random(0,names.length-1)] +
  ' ' +
  lastNames[_.random(0,lastNames.length-1)]

export enum Role {
  pleb = 'pleb'
}
