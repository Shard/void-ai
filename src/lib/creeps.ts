import { getName, log } from './util'

export const ROLE_PLEB = 'Pleb'
export const ROLE_MINER = 'Miner'
export const ROLE_HAULER = 'Hauler'
export const ROLE_UPGRADER = 'Upgrader'
export const ROLE_ALL = [ROLE_PLEB, ROLE_MINER, ROLE_HAULER, ROLE_UPGRADER]

export const T_IDLE = 'IDLE'
export const T_BUILD = 'BUILD'
export const T_MINE = 'MINE'
export const T_WITHDRAW = 'WITHDRAW'
export const T_PICKUP = 'PICKUP'
export const T_UPGRADE = 'UPGRADE'
export const T_TRANSFER = 'TRANSFER'
export const T_REPAIR = 'REPAIR'
export const T_RESERVE = 'RESERVE'
export const T_CLAIM = 'CLAIM'
export const T_ATTACK = 'ATTACK'
export const T_RECYCLE = 'RECYCLE'
export type TASK = 'IDLE' | 'MINE' | 'WITHDRAW'
  | 'PICKUP' | 'UPGRADE' | 'TRANSFER' | 'REPAIR'
  | 'RESERVE' | 'CLAIM' | 'ATTACK' | 'RECYCLE' | 'BUILD'

// Utility functions

const taskToIcon = (t: TASK) => {
  switch(t){
    case T_WITHDRAW: return '💰'
    case T_MINE: return '⛏️'
    case T_IDLE: return '💤'
    case T_REPAIR: return '🛠️'
    case T_TRANSFER: return '📦'
    case T_UPGRADE: return '👍'
    case T_ATTACK: return '⚔️'
    case T_RESERVE: return '🚀'
    case T_CLAIM: return '⛳'
    case T_RECYCLE: return '♻️'
    default: return t
  }
}

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

const isIdle = (c:Creep): Boolean => c.memory.task === T_IDLE || c.memory.assigned === T_IDLE

// Spawning functions
export const makePleb = ( spawn: StructureSpawn ) => spawn.spawnCreep(
  [WORK,WORK,WORK,CARRY,CARRY,MOVE,MOVE], // remove dis
  'Pleb ' + getName(),
  { memory: {role: ROLE_PLEB, assigned: T_IDLE, task: T_IDLE} }
)

export const makeMiner = ( spawn: StructureSpawn ) => spawn.spawnCreep(
  [WORK,WORK,WORK,WORK,WORK,WORK,CARRY,CARRY,MOVE,MOVE],
  'Miner ' + getName(),
  { memory: {role: ROLE_MINER, assigned: T_IDLE, task: T_IDLE, payload: { node: getMiningNode(spawn.room).id }} }
)

export const makeHauler = ( spawn: StructureSpawn ) => spawn.spawnCreep(
  [CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,MOVE,MOVE,MOVE,MOVE,MOVE],
  'Hauler ' + getName(),
  { memory: { role: ROLE_HAULER, assigned: T_IDLE, task: T_IDLE } }
)

export const makeUpgrader = ( spawn: StructureSpawn ) => spawn.spawnCreep(
  [CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,WORK,WORK,MOVE,MOVE,MOVE,MOVE],
  'Upgrader ' + getName(),
  { memory: { role: ROLE_UPGRADER, assigned: T_IDLE, task: T_IDLE } }
)

////////////////
// Assignment //
////////////////
const assign = (id:string, task:TASK) => (c:Creep) => {
  c.memory.assigned = id
  c.memory.task = task
  c.say(taskToIcon(c.memory.task as TASK))
  return c
}
const assignIdle = assign(T_IDLE, T_IDLE)

const reAssign = (c:Creep) => workCreep(assignCreep(assignIdle(c)))

const whereLowEnergyTower = (t:StructureTower) => t.structureType === STRUCTURE_TOWER
  && t.energy < t.energyCapacity - 200

const assignPleb = (pleb: Creep): Creep => {
  // Get Energy
  if(pleb.carry.energy === 0){
    if(typeof pleb.room.storage !== 'undefined' && pleb.room.storage.store.energy > 100){
      return assign(pleb.room.storage.id, T_WITHDRAW)(pleb)
    } else {
      return assign(getMiningNode(pleb.room).id, T_MINE)(pleb)
    }
  }

  // Check if controller is below lvl 3 or decaying
  if(pleb.room.controller && pleb.room.controller.ticksToDowngrade < 35000){
    return assign(pleb.room.controller.id, T_UPGRADE)(pleb)
  }

  // Supply Extensions
  const extension = pleb.pos.findClosestByRange(FIND_STRUCTURES, {
    filter: (s: StructureExtension) => s.structureType === STRUCTURE_EXTENSION && s.energyCapacity > s.energy
  })
  if(extension){ return assign(extension.id, T_TRANSFER)(pleb) }

  // Supply Tower
  const tower = _.find(Game.structures, whereLowEnergyTower) as StructureTower
  if(tower){ return assign(tower.id, T_TRANSFER)(pleb) }

  // Try and build a site
  const site = pleb.pos.findClosestByRange(FIND_MY_CONSTRUCTION_SITES)
  if(site){ return assign(site.id, T_BUILD)(pleb) }

  // Repair Walls
  const wall = pleb.room.find(FIND_STRUCTURES, {
    filter: s => s.structureType === STRUCTURE_WALL && s.hits < 400000
  })
  if(wall[0]){ return assign(wall[0].id, T_REPAIR)(pleb) }

  // All else upgrade controller
  if(typeof pleb.room.controller === 'undefined'){ return pleb; }
  return assign(pleb.room.controller.id, T_UPGRADE)(pleb)
}

const assignMiner = (c: Creep): Creep => {
  if(c.carry.energy >= c.carryCapacity){
    const container = c.pos.findClosestByRange(FIND_STRUCTURES, { filter: { structureType: STRUCTURE_CONTAINER } }) as StructureContainer
    return assign(container.id, T_TRANSFER)(c)
  }
  return assign(c.memory.payload.node, T_MINE)(c)
}

const assignHauler = (hauler: Creep): Creep => {
  // Move from containers to storage
  if(hauler.carry.energy < hauler.carryCapacity / 2){
    // const dropped = hauler.room.find(FIND_DROPPED_RESOURCES)
    // if(dropped[0]){ return assign(dropped[0].id, 'pickup')(hauler) }
    const containers = (hauler.room
      .find(FIND_STRUCTURES, { filter: { structureType: STRUCTURE_CONTAINER }}) as StructureStorage[])
      .sort((a,b) => a.store[RESOURCE_ENERGY] < b.store[RESOURCE_ENERGY] ? 1 : -1)
    return assign(containers[0].id, T_WITHDRAW)(hauler)
  }

  const tower = _.find(Game.structures, whereLowEnergyTower) as StructureTower
  if(tower){ return assign(tower.id, T_TRANSFER)(hauler) }

  const extension = hauler.pos.findClosestByRange(FIND_MY_STRUCTURES, {
    filter: (s: StructureExtension) => s.structureType === STRUCTURE_EXTENSION && s.store.getFreeCapacity(RESOURCE_ENERGY) !== 0
  }) as StructureExtension | null
  if(extension){ return assign(extension.id, T_TRANSFER)(hauler) }

  const store = hauler.room.storage
  if(typeof store !== 'undefined'){
    return assign(store.id, T_TRANSFER)(hauler)
  }
  // Supply towers and extensions
  return hauler
}

const assignUpgrader = (u: Creep) => {
  if(!u.room.storage || !u.room.controller){ return assign('urself', T_RECYCLE)(u) }
  if(u.carry.energy === 0){ return assign(u.room.storage.id, T_WITHDRAW)(u) }
  return assign(u.room.controller.id, T_UPGRADE)(u)
}

/**
 * Task Definitions
 *
 * All tasks take their pre-assigned tasks data from memeory and both check for
 * invalid task states and return back a new assign (usually idle). If work has
 * not yet started, workCreep can be called to find a new task for the current tick.
 */

const taskWithdraw = (c:Creep) => {
  const subject = Game.getObjectById(c.memory.assigned) as StructureContainer | StructureStorage
  if(c.carry.energy >= c.carryCapacity){ return reAssign(c) }
  return c.withdraw(subject, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE ? c.moveTo(subject) ? c : c : c
}

const taskBuild = (c:Creep) => {
  const site = Game.getObjectById(c.memory.assigned) as ConstructionSite
  if(c.carry.energy === 0 || !site){ return reAssign(c) }
  return c.build(site) === ERR_NOT_IN_RANGE ? c.moveTo(site) ? c : c : c
}

const taskUpgrade = (c:Creep) => {
  if(c.carry.energy === 0){ return assignIdle(c) }
  const controller = Game.getObjectById(c.memory.assigned) as StructureController
  // @TODO test how the new tasks work in comparison
  c.upgradeController(controller)
  c.moveTo(controller)
  return c
}

const taskRepair = (c:Creep) => {
  const wall = Game.getObjectById(c.memory.assigned) as StructureWall
  if(wall.hits >= wall.hitsMax || c.carry.energy === 0){ return reAssign(c) }
  c.moveTo(wall)
  c.repair(wall)
  return c
}

const taskTransfer = (c:Creep) => {
  const dest = Game.getObjectById(c.memory.assigned) as StructureTower | StructureExtension
  if(dest.energy >= dest.energyCapacity || c.carry.energy === 0){ return reAssign(c) }
  // dest.store.getFreeCapacity(RESOURCE_ENERGY) === 0
  c.moveTo(dest)
  c.transfer(dest, RESOURCE_ENERGY)
  return c
}

const taskMine = (c:Creep) => {
  if(c.carry.energy >= c.carryCapacity) { return reAssign(c) }
  const source = Game.getObjectById(c.memory.assigned) as Source
  c.moveTo(source)
  c.harvest(source)
  return c
}

/**
 * Worker definitions
 *
 */

export const assignCreep = (c: Creep): Creep => {
  switch(c.memory.role){
    case ROLE_PLEB: return isIdle(c) ? assignPleb(c) : c
    case ROLE_MINER: return isIdle(c) ? assignMiner(c) : c
    case ROLE_HAULER: return isIdle(c) ? assignHauler(c) : c
    case ROLE_UPGRADER: return isIdle(c) ? assignUpgrader(c) : c
    default: log('Missing Worker: ', c.name); return c
  }
}

export const workCreep = (c:Creep) => {
  switch(c.memory.task as TASK){
    case T_WITHDRAW: return taskWithdraw(c)
    case T_MINE: return taskMine(c)
    case T_BUILD: return taskBuild(c)
    case T_UPGRADE: return taskUpgrade(c)
    case T_TRANSFER: return taskTransfer(c)
    case T_REPAIR: return taskRepair(c)
    default: return assignIdle(log('Cannot find task', c))
  }
}

// Tower

export const workTower = ( t: StructureTower ) => {
  const enemies = t.room.find(FIND_CREEPS, {
    filter: { my: false }
  })
  if(enemies[0]){
    t.attack(enemies[0])
    return;
  }

  const structs = t.room.find(FIND_STRUCTURES, {
    filter: s => ([STRUCTURE_CONTAINER,STRUCTURE_ROAD] as any).includes(s.structureType)
  })
  for(const name in structs){
    const s = structs[name]
    if(s.hits < s.hitsMax){
      const result = t.repair(s)
      if(result === ERR_NOT_ENOUGH_ENERGY){
        // console.log('Tower is low on energy')
      }else if(result !== 0){
        console.log('Tower Repair Error', result)
      } else { break }
    }
  }
}
