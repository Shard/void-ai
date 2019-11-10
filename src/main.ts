import _ from 'lodash'
import {
  ROLE_ALL,
  makePleb,
  makeMiner,
  makeHauler,
  makeUpgrader,
  workCreep,
  workTower
} from 'lib/creeps'
import { log } from 'lib/util'
import { ErrorMapper } from "utils/ErrorMapper"

console.log('New script loaded')

const planMines = ( r: Room ) => {
  const sources = r.find(FIND_SOURCES)
  for(const id in sources){
    const source = sources[id]
  }
}

// ErrorMapper fixes error numbers in screeps console
export const loop = ErrorMapper.wrapLoop(() => {
  // console.log(`Current game tick is ${Game.time}`);

  const Spawn = Game.spawns.Spawn1

  // Get WorldState
  const ws:WorldState = {
    counts: ROLE_ALL.reduce((a,x) => {a[x] = 0;return a}, {})
  }

  // Creep Role code
  for(const name in Game.creeps){
    const creep = Game.creeps[name]
    ws.counts[creep.memory.role]++
    workCreep(creep)
  }

  // Create workers
  let action =
      ws.counts.Pleb < 3 ? makePleb
    : ws.counts.Miner < 2 ? makeMiner
    : ws.counts.Hauler < 1 ? makeHauler
    : null
  if(!action && Spawn.room.storage && Spawn.room.storage.store.energy > 800000 && ws.counts.Upgrader < 8){
    action = makeUpgrader
  }
  if (action !== null){ action(Spawn) }

  // Towers
  const towers = _.filter(Game.structures, {
    structureType: STRUCTURE_TOWER
  }) as StructureTower[]
  towers.map(workTower)

  // Automatically delete memory of missing creeps
  for (const name in Memory.creeps) {
    if (!(name in Game.creeps)) { delete Memory.creeps[name] }
  }

});
