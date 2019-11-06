import { ErrorMapper } from "utils/ErrorMapper"
import { getName } from './memes'
import _ from 'lodash'

const random = _.random

const log = (o:any) => console.log('log', JSON.stringify(o)) || o

const ROLE_PLEB = 'Pleb'
const ROLE_MINER = 'Miner'
const ROLE_HAULER = 'Hauler'


// Return a mining node using round robin with room memory
const getMiningNode = ( room: Room ) => {
  const nodes = room.find(FIND_SOURCES)
  let found = false
  for(const i in nodes){
    if(nodes[i].id === room.memory.lastMined){ found = true;continue; }
    if(found){ room.memory.lastMined = nodes[i].id; return nodes[i] }
  }
  room.memory.lastMined = nodes[0].id
  return nodes[0]
}

const makePleb = ( spawn: StructureSpawn ) => spawn.spawnCreep(
  [WORK,WORK,CARRY,MOVE],
  'Pleb ' + getName(),
  { memory: {role: ROLE_PLEB, assigned: 'init', task: 'idle'} }
)

const makeMiner = ( spawn: StructureSpawn ) => spawn.spawnCreep(
  [WORK,WORK,WORK,WORK,WORK,CARRY,CARRY,MOVE,MOVE],
  'Miner ' + getName(),
  { memory: {role: ROLE_MINER, assigned: getMiningNode(spawn.room).id, task: 'mine'} }
)

const makeHauler = ( spawn: StructureSpawn ) => spawn.spawnCreep(
  [CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,MOVE,MOVE,MOVE,MOVE],
  'Hauler' + getName(),
  { memory: { role: ROLE_HAULER, assigned: 'init', task: 'idle' } }
)

const assign = (id:string, task:string) => (c:Creep) => {
  c.memory.assigned = id
  c.memory.task = task
  return c
}
const assignIdle = assign('bored', 'idle')

const assignPleb = (pleb: Creep): Creep => {
  // Get Energy
  if(pleb.carry.energy === 0){
    return assign(getMiningNode(pleb.room).id, 'mine')(pleb)
  }

  // Check if controller is below lvl 3 or decaying
  if(pleb.room.controller && pleb.room.controller.ticksToDowngrade < 35000){
    return assign(pleb.room.controller.id, 'upgrade')(pleb)
  }

  // Supply Extensions
  const extension = _.find(Game.structures, (s: StructureExtension) => s.structureType === STRUCTURE_EXTENSION && s.energyCapacity > s.energy)
  if(extension){
    return assign(extension.id, 'supply')(pleb)
  }

  // Supply Tower
  const tower = _.find(Game.structures, {structureType: STRUCTURE_TOWER}) as StructureTower
  if(tower && tower.energy < tower.energyCapacity){
    return assign(tower.id, 'supply')(pleb)
  }

  // Try and build a site
  const sites = Object.keys(Game.constructionSites)
  if(sites.length > 0){
    const site = Game.constructionSites[sites[random(0,sites.length-1)]]
    return assign(site.id, 'build')(pleb)
  }

  // Repair Walls
  const wall = pleb.room.find(FIND_STRUCTURES, {
    filter: s => s.structureType === STRUCTURE_WALL && s.hits < 200000
  })
  if(wall[0]){ return assign(wall[0].id, 'repair')(pleb) }

  // All else upgrade controller
  if(typeof pleb.room.controller === 'undefined'){ return pleb; }
  return assign(pleb.room.controller.id, 'upgrade')(pleb)
}

const assignHauler = (hauler: Creep): Creep => {
  // Move from containers to storage
  // Supply towers and extensions
  return hauler
}

const workPleb = ( creep: Creep ) => {

  let pleb = creep
  if(pleb.memory.assigned === 'idle' || pleb.memory.task === 'idle'){
    pleb = assignPleb(pleb)
    if(pleb.memory.task === 'mine') console.log(pleb.memory.assigned)
    pleb.say(pleb.memory.task)
  }

  // Carry out work
  const full = pleb.carry.energy >= pleb.carryCapacity
  switch(pleb.memory.task){
    case 'mine':
      if(full) { return assignIdle(pleb) }
      const source = Game.getObjectById(pleb.memory.assigned) as Source
      pleb.moveTo(source)
      pleb.harvest(source)
      break;
    case 'build':
      if(pleb.carry.energy === 0){ return assignIdle(pleb) }
      const site = Game.getObjectById(pleb.memory.assigned) as ConstructionSite
      if(!site){ return assignIdle(pleb) }
      pleb.moveTo(site)
      pleb.build(site)
      break;
    case 'upgrade':
      if(pleb.carry.energy === 0){ return assignIdle(pleb) }
      const controller = Game.getObjectById(pleb.memory.assigned) as StructureController
      pleb.moveTo(controller)
      pleb.upgradeController(controller)
      break;
    case 'supply':
      const dest = Game.getObjectById(pleb.memory.assigned) as StructureTower
      if(dest.energy >= dest.energyCapacity || pleb.carry.energy === 0){ return assignIdle(pleb) }
      pleb.moveTo(dest)
      pleb.transfer(dest, RESOURCE_ENERGY)
      break;
    case 'repair':
      const wall = Game.getObjectById(pleb.memory.assigned) as StructureWall
      if(wall.hits >= wall.hitsMax || pleb.carry.energy === 0){ return assignIdle(pleb) }
      pleb.moveTo(wall)
      pleb.repair(wall)
      break;
  }
  return pleb

}

const workMiner = ( c: Creep ) => {

}

const workHauler = ( c: Creep ) => {

}

const workTower = ( t: StructureTower ) => {
  const enemies = t.room.find(FIND_CREEPS, {
    filter: { my: false }
  })
  if(enemies[0]){
    t.attack(enemies[0])
    return;
  }

  const structs = t.room.find(FIND_STRUCTURES, {
    filter: {structureType: STRUCTURE_ROAD}
  })
  for(const name in structs){
    const s = structs[name]
    if(s.hits < s.hitsMax){
      const result = t.repair(s)
      if(result === ERR_NOT_ENOUGH_ENERGY){
        console.log('Tower is low on energy')
      }else if(result !== 0){
        console.log('Tower Repair Error', result)
      } else { break }
    }
  }
}

console.log('init?')

// ErrorMapper fixes error numbers in screeps console
export const loop = ErrorMapper.wrapLoop(() => {
  //console.log(`Current game tick is ${Game.time}`);

  const Spawn = Game.spawns['Spawn1']

  // Get WorldState
  const ws:WorldState = {
    counts: { pleb: 0 }
  }

  // Creep Role code
  for(const name in Game.creeps){
    const creep = Game.creeps[name]
    ws.counts[creep.memory.role]++
    switch(creep.memory.role){
      case 'pleb':
        // @TODO does memory need to be recommited?
        Memory.creeps[creep.name] = workPleb(creep).memory
        break;
      default: log('Missing Worker: ' + name + '(' + creep.memory.role + ')')
    }
  }

  // Create workers
  const action = ws.counts.pleb < 9 ? makePleb : null
  if (action !== null) action(Spawn)

  // Towers
  const towers = _.filter(Game.structures, {structureType: STRUCTURE_TOWER}) as StructureTower[]
  towers.map(workTower)

  // Automatically delete memory of missing creeps
  for (const name in Memory.creeps) {
    if (!(name in Game.creeps)) { delete Memory.creeps[name] }
  }

});
