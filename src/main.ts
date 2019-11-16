import {
  assignCreep,
  makeCreep,
  ROLE_ALL,
  ROLE_PLEB,
  ROLE_MINER,
  ROLE_HAULER,
  ROLE_BUILDER,
  ROLE_UPGRADER,
  ROLE_CLAIMER,
  workCreep,
  workTower
} from 'lib/creeps'
import { log, initDraw } from 'lib/util'
import _ from 'lodash'
import { ErrorMapper } from "utils/ErrorMapper"

console.log('New script loaded')

const initWorldState = () => ROLE_ALL.reduce((a,x) => {a[x] = 0;return a}, {}) as CreepCounts

const getDesiredCounts = (r:Room): CreepCounts => {
  const counts = initWorldState()
  if(!r.controller){ return counts }

  if(r.controller.level < 4 || r.energyCapacityAvailable < 1000 || !r.storage){
    // Bootstraping
    counts.Pleb = 6
  } else {
    counts.Pleb = 1
    counts.Miner = r.find(FIND_SOURCES).length
    counts.Hauler = 1
    // Determine how to scale builders/upgraders with energy available
    if(r.find(FIND_CONSTRUCTION_SITES).length){ counts.Builder = 3 }
    if(r.storage.store.energy > 800000){
      const flag = Game.flags['claim']
      if(flag){
        counts.Claimer = 1
      }
    }
    if(r.storage.store.energy > 900000){ counts.Upgrader = 6 }
  }
  return counts
}
// : (StructureSpawn -> ScreepReturnCode)
const getSpawnerAction = ( s:StructureSpawn ) => {
  const current = s.room.memory.counts
  const desired = getDesiredCounts(s.room)
  const spawnOrder: CreepRole[] = [ROLE_PLEB, ROLE_MINER,ROLE_HAULER,ROLE_CLAIMER,ROLE_BUILDER,ROLE_UPGRADER]
  for(const r of spawnOrder){
    if(current[r] < desired[r]){
      return makeCreep(r as CreepRole)
    }
  }
  return null
}

export const loop = ErrorMapper.wrapLoop(() => {
  // console.log(`Current game tick is ${Game.time}`);

  // Generate Room States
  for(const name in Game.rooms){
    const room = Game.rooms[name]
    room.memory.counts = initWorldState()
    room.memory.desiredCreeps = getDesiredCounts(room)
  }

  // Update Room-Creep state and do creep logic
  for(const name in Game.creeps){
    const creep = Game.creeps[name]
    creep.room.memory.counts[creep.memory.role]++
    workCreep(assignCreep(creep))
  }

  // Spawner Logic
  for(const name in Game.spawns){
    const spawner = Game.spawns[name]
    if(spawner.spawning || !spawner.my){ continue; }
    const spawnAction = getSpawnerAction(spawner)
    if(spawnAction){ spawnAction(spawner) }
  }

  // Towers
  const towers = _.filter(Game.structures, {
    structureType: STRUCTURE_TOWER
  }) as StructureTower[]
  towers.map(workTower)

  // Visuals
  for(const name in Game.rooms){
    const room = Game.rooms[name]
    const draw = initDraw(room)
    draw(`Room Type: ${room.memory.designation}`)
    draw(`Spawner Energy: ${room.energyAvailable}/${room.energyCapacityAvailable}`)
    ROLE_ALL.map(r => draw(`${r}: ${room.memory.counts[r]}/${room.memory.desiredCreeps[r]}`))
    draw('')
    draw(`CPU: ${Math.floor(Game.cpu.getUsed())}/${Game.cpu.tickLimit}`)
  }

  // Automatically delete memory of missing creeps
  for (const name in Memory.creeps) {
    if (!(name in Game.creeps)) { delete Memory.creeps[name] }
  }

});
