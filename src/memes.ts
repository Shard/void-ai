import _ from 'lodash'

const names = [
  'Jesus Rambo',
  'Joe',
  'Hank',
  'Matt',
  'Mike',
  'Sven',
]

export const getName = () => names[_.random(0,names.length-1)]

export enum Role {
  pleb = 'pleb'
}
