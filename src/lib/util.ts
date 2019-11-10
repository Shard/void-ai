export const log = (label:string, o:any) => console.log(label, JSON.stringify(o)) || o

export const taskToIcon = (s: string) =>
  s === 'mine' ? '⛏️'
  : s === 'idle' ? '💤'
  : s === 'repair' ? '🛠️'
  : s === 'supply' ? '⚡'
  : s === 'upgrade' ? '👍'
  : s

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
