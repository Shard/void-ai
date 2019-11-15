// Room Designations
export const D_HQ = 'HQ'
export const D_FORT = 'FORT'
export const D_FARM = 'FARM'
export const D_HIGHWAY = 'HIGHWAY'
export const D_OUTPOST = 'OUTPOST'
type RoomDesignation = 'HQ' | 'FORT' | 'FARM' | 'HIGHWAY' | 'OUTPOST'

export const designateRoom = (r:Room): RoomDesignation => {
  // @TODO find a flag and parse from that
  return D_HQ;
}

const wallChokes = (r:Room) => {}
const wallExits = (r:Room) => {}
const wallClose = (r:Room) => {}

const planRoom = ( r: Room ) => {
  // Plan mining setup
  // Plan spawner placement
  // Determine Safe points to be protected from invasions
  // Plan wall designs to protect safe points
  // Plan tower placement
}

const buildMines = ( r: Room ) => {
  const sources = r.find(FIND_SOURCES)
  for(const id in sources){
    const source = sources[id]
  }
}

const buildDefense = ( r: Room ) => {}
const buildHighway = ( r: Room ) => {}
const planExtensions = ( r: Room ) => {}
const planSpawner = ( r: Room ) => {}
const planExtractor = ( r: Room ) => {}
