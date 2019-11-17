import { getName, log } from './util'
import { Position } from 'source-map/source-map';

export const ROLE_PLEB = 'Pleb'
export const ROLE_MINER = 'Miner'
export const ROLE_HAULER = 'Hauler'
export const ROLE_UPGRADER = 'Upgrader'
export const ROLE_BUILDER = 'Builder'
export const ROLE_CLAIMER = 'Claimer'
export const ROLE_ALL = [ROLE_PLEB, ROLE_MINER, ROLE_HAULER, ROLE_UPGRADER, ROLE_BUILDER, ROLE_CLAIMER] as CreepRole[]

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
export const T_TRAVEL = 'TRAVEL'

// Utility functions
const taskToIcon = (t: CreepTask) => {
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
  if(nodes.length === 1){ return nodes[0] }
  let found = false
  for(const i in nodes){
    if(nodes[i].id === room.memory.lastMined){ found = true;continue; }
    if(found){ room.memory.lastMined = nodes[i].id; return nodes[i] }
  }
  room.memory.lastMined = nodes[0].id
  return nodes[0]
}

const isIdle = (c:Creep): Boolean => c.memory.task === T_IDLE || c.memory.assigned === T_IDLE
const isFull = (c:Creep): Boolean => c.carry.energy === c.carryCapacity

const initMemory = (role: CreepRole, room: Room) => {
  const mem = {role, assigned: T_IDLE, task: T_IDLE, home: room.name} as CreepMemory
  return (obj:any): CreepMemory => ({...mem, ...obj}) as CreepMemory
}

// Spawning functions
export const makePleb = ( spawn: StructureSpawn, room :Room ) => spawn.spawnCreep(
  [WORK,WORK,WORK,CARRY,CARRY,MOVE,MOVE,MOVE],
  'Pleb ' + getName(),
  { memory: initMemory(ROLE_PLEB, room)({}) }
)

export const makeMiner = ( spawn: StructureSpawn, room: Room ) => spawn.spawnCreep(
  [WORK,WORK,WORK,WORK,WORK,WORK,CARRY,CARRY,MOVE,MOVE],
  'Miner ' + getName(),
  { memory: initMemory(ROLE_MINER, room)({ payload: {node: getMiningNode(spawn.room).id }}) }
)

export const makeHauler = ( spawn: StructureSpawn, room: Room ) => spawn.spawnCreep(
  [CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,MOVE,MOVE,MOVE,MOVE,MOVE],
  'Hauler ' + getName(),
  { memory: initMemory(ROLE_HAULER, room)({}) }
)

export const makeUpgrader = ( spawn: StructureSpawn, room: Room ) => spawn.spawnCreep(
  [CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,WORK,WORK,WORK,WORK,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE],
  'Upgrader ' + getName(),
  { memory: initMemory(ROLE_UPGRADER, room)({}) }
)

export const makeBuilder = ( spawn: StructureSpawn, room: Room ) => spawn.spawnCreep(
  [CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,WORK,WORK,WORK,WORK,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE],
  'Builder ' + getName(),
  { memory: initMemory(ROLE_BUILDER, room)({}) }
)

export const makeClaimer = ( spawn: StructureSpawn, room: Room ) => spawn.spawnCreep(
  [CLAIM,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE],
  'Claimer ' + getName(),
  { memory: {
    assigned: room.name, // Home room, move into home prop
    home: room.name,
    role: ROLE_CLAIMER,
    task: T_IDLE,
    payload: {
      flagPos: Game.flags.claim.pos, //  Rally flag
      home: spawn.room.name
    }
  } }
)

export const makeCreep = ( role: CreepRole, room: Room | null = null ) => ( spawner: StructureSpawn ) => {
  if(room === null){ room = spawner.room }
  switch(role){
    case ROLE_PLEB: return makePleb(spawner, room)
    case ROLE_MINER: return makeMiner(spawner, room)
    case ROLE_HAULER: return makeHauler(spawner, room)
    case ROLE_UPGRADER: return makeUpgrader(spawner, room)
    case ROLE_BUILDER: return makeBuilder(spawner, room)
    case ROLE_CLAIMER: return makeClaimer(spawner, room)
    default: return ERR_INVALID_ARGS
  }
}

////////////////
// Assignment //
////////////////
const assign = (id:string, task:CreepTask) => (c:Creep) => {
  c.memory.assigned = id
  c.memory.task = task
  c.say(taskToIcon(c.memory.task), true)
  return c
}
const assignIdle = assign(T_IDLE, T_IDLE)

const reAssign = (c:Creep) => workCreep(assignCreep(assignIdle(c)))

const whereLowEnergyTower = (t:StructureTower) => t.structureType === STRUCTURE_TOWER
  && t.energy < t.energyCapacity - 200

const assignPleb = (pleb: Creep): Creep => {
  if(pleb.room.name !== pleb.memory.home){
    return assign(pleb.memory.home, T_TRAVEL)(pleb)
  }
  // Get Energy
  if(pleb.carry.energy === 0){
    if(typeof pleb.room.storage !== 'undefined' && pleb.room.storage.store.energy > 100){
      return assign(pleb.room.storage.id, T_WITHDRAW)(pleb)
    } else {
      return assign(getMiningNode(pleb.room).id, T_MINE)(pleb)
    }
  }

  // Check if controller is below lvl 3 or decaying
  if(pleb.room.controller && pleb.room.controller.ticksToDowngrade < 5000){
    return assign(pleb.room.controller.id, T_UPGRADE)(pleb)
  }

  // Supply Extensions
  const extension = pleb.pos.findClosestByRange(pleb.room.find(FIND_STRUCTURES, {
    filter: (s: StructureExtension) =>
      s.structureType === STRUCTURE_EXTENSION
      && s.energyCapacity > s.energy
      && s.room.name === pleb.room.name
  }))
  if(extension){ return assign(extension.id, T_TRANSFER)(pleb) }

  // Supply Tower
  const tower = pleb.pos.findClosestByRange(pleb.room.find(FIND_STRUCTURES,{filter: whereLowEnergyTower}))
  // const tower = _.find(Game.structures, whereLowEnergyTower) as StructureTower
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

const assignBuilder = (c:Creep): Creep => {
  if(!c.room.storage){ return assign('urself', T_RECYCLE)(c) }
  if(c.carry.energy === 0){ return assign(c.room.storage.id, T_WITHDRAW)(c) }
  const site = c.pos.findClosestByRange(FIND_MY_CONSTRUCTION_SITES)
  if(site){ return assign(site.id, T_BUILD)(c) }
  const repair = c.pos.findClosestByRange(FIND_STRUCTURES, {
    filter: s => s.structureType === STRUCTURE_WALL && s.hits < 500000
  })
  if(repair){ return assign(repair.id, T_REPAIR)(c) }
  return assign('urself', T_RECYCLE)(c)
}

const assignMiner = (c: Creep): Creep => {
  if(c.carry.energy >= c.carryCapacity){
    const container = c.pos.findClosestByRange(FIND_STRUCTURES,
      { filter: { structureType: STRUCTURE_CONTAINER } }) as StructureContainer
    if(!container && c.room.storage){ return assign(c.room.storage.id, T_TRANSFER)(c) }
    return assign(container.id, T_TRANSFER)(c)
  }
  return assign(c.memory.payload.node, T_MINE)(c)
}

const assignHauler = (hauler: Creep): Creep => {
  if(!hauler.room.storage){ return assign('urlself', T_RECYCLE)(hauler) }
  // Move from containers to storage
  if(hauler.carry.energy < hauler.carryCapacity / 2){
    // const dropped = hauler.room.find(FIND_DROPPED_RESOURCES)
    // if(dropped[0]){ return assign(dropped[0].id, 'pickup')(hauler) }
    const containers = (hauler.room
      .find(FIND_STRUCTURES, { filter: { structureType: STRUCTURE_CONTAINER }}) as StructureStorage[])
      .sort((a,b) => a.store[RESOURCE_ENERGY] < b.store[RESOURCE_ENERGY] ? 1 : -1)
    if(containers[0]){ return assign(containers[0].id, T_WITHDRAW)(hauler) }
    return assign(hauler.room.storage.id, T_WITHDRAW)(hauler)
  }

  const tower = _.find(Game.structures, whereLowEnergyTower) as StructureTower
  if(tower){ return assign(tower.id, T_TRANSFER)(hauler) }

  const extension = hauler.pos.findClosestByRange(FIND_MY_STRUCTURES, {
    filter: (s: StructureExtension) => s.structureType === STRUCTURE_EXTENSION && s.store.getFreeCapacity(RESOURCE_ENERGY) !== 0
  }) as StructureExtension | null
  if(extension){ return assign(extension.id, T_TRANSFER)(hauler) }
  return assign(hauler.room.storage.id, T_TRANSFER)(hauler)
}

const assignUpgrader = (u: Creep) => {
  if(!u.room.storage || !u.room.controller){ return assign('urself', T_RECYCLE)(u) }
  if(u.carry.energy === 0){ return assign(u.room.storage.id, T_WITHDRAW)(u) }
  return assign(u.room.controller.id, T_UPGRADE)(u)
}

const assignClaimer = (c: Creep) => {
  const flagPos = c.memory.payload.flagPos as RoomPosition
  if(flagPos.roomName === c.room.name){
    if(!c.room.controller){ console.log('ERROR: No controller to upgrade'); return c }
    return assign(c.room.controller.id, T_CLAIM)(c)
  } else {
    return assign(c.memory.assigned, T_TRAVEL)(c)
  }
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
  if(c.carry.energy >= c.carryCapacity / 2){ return reAssign(c) }
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

const taskTravel = (c:Creep) => {
  const flag = c.memory.payload && c.memory.payload.flagPos
  const target = flag
    ? new RoomPosition(flag.x, flag.y, flag.roomName)
    : new RoomPosition(10,10,c.memory.assigned)
  if(c.room.name === target.roomName){ return reAssign(c) }
  c.moveTo(target)
  return c
}

const taskClaim = (c:Creep) => {
  if(!c.room.controller){ console.log('no controller');return c }
  if(c.room.controller.my){ return assign('urself', T_RECYCLE)(c) }
  const target = c.room.controller.pos
  c.moveTo(target)
  c.claimController(c.room.controller)
  return c
}

const taskRecycle = (c:Creep) => {
  c.suicide()
  return c
}

/**
 * Worker definitions
 *
 */

export const assignCreep = (c: Creep): Creep => {
  if(!isIdle(c)){ return c }
  switch(c.memory.role){
    case ROLE_PLEB: return assignPleb(c)
    case ROLE_MINER: return assignMiner(c)
    case ROLE_HAULER: return assignHauler(c)
    case ROLE_UPGRADER: return assignUpgrader(c)
    case ROLE_BUILDER: return assignBuilder(c)
    case ROLE_CLAIMER: return assignClaimer(c)
    default: log('Missing Worker: ', c.name); return c
  }
}

export const workCreep = (c:Creep) => {
  switch(c.memory.task as CreepTask){
    case T_WITHDRAW: return taskWithdraw(c)
    case T_MINE: return taskMine(c)
    case T_BUILD: return taskBuild(c)
    case T_UPGRADE: return taskUpgrade(c)
    case T_TRANSFER: return taskTransfer(c)
    case T_REPAIR: return taskRepair(c)
    case T_TRAVEL: return taskTravel(c)
    case T_CLAIM: return taskClaim(c)
    case T_RECYCLE: return taskRecycle(c)
    default: log('Cannot find task', c.memory.task)
  }
  return c
}

// Tower
export const workTower = ( t: StructureTower ) => {
  const enemies = t.room.find(FIND_CREEPS, {
    filter: { my: false }
  })
  if(enemies[0]){
    t.attack(enemies[0])
    return t;
  }

  const structure = t.pos.findClosestByRange(FIND_STRUCTURES, {
    filter: s =>
      ([STRUCTURE_CONTAINER,STRUCTURE_ROAD,STRUCTURE_RAMPART,STRUCTURE_WALL] as any).includes(s.structureType)
      && s.hits < (s.hitsMax < 300000 ? s.hitsMax : 300000)
  })
  if(!structure){ return t; }
  const result = t.repair(structure)
  if(result === ERR_NOT_ENOUGH_ENERGY){
    console.log('Tower is low on energy')
  }else if(result !== 0){
    console.log('Tower Repair Error', result)
  }
  return t

}
