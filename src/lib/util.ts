export const log = (label:string, o:any) => console.log(label, JSON.stringify(o)) || o

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
  'Duke',
  'Doc',
  'Brother',
  'Viper'
]

const lastNames = [
  'Hill',
  'Rambo',
  'Harambe',
  'Davic',
  'Goldstien',
  'Doot',
  'Enoch',
  'Striker',
  'Curry'
]

export const getName = () =>
  names[_.random(0,names.length-1)] +
  ' ' +
  lastNames[_.random(0,lastNames.length-1)]
