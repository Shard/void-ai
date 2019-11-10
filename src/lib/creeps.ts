import { getName, taskToIcon, log } from './util'

export const ROLE_PLEB = 'Pleb'
export const ROLE_MINER = 'Miner'
export const ROLE_HAULER = 'Hauler'
export const ROLE_UPGRADER = 'Upgrader'
export const ROLE_ALL = [ROLE_PLEB, ROLE_MINER, ROLE_HAULER, ROLE_UPGRADER]

export const T_IDLE = 'IDLE'
export const T_MINE = 'MINE'
export const T_WITHDRAW = 'WITHDRAW'
export const T_PICKUP = 'PICKUP'
export const T_UPGRADE = 'UPGRADE'
export const T_TRANSFER = 'TRANSFER'
export const T_REPAIR = 'REPAIR'
export const T_RESERVE = 'RESERVE'
export const T_CLAIM = 'CLAIM'
export const T_ATTACK = 'ATTACK'

// Utility functions

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

// Spawning functions
export const makePleb = ( spawn: StructureSpawn ) => spawn.spawnCreep(
  [WORK,WORK,WORK,CARRY,CARRY,MOVE,MOVE], // remove dis
  'Pleb ' + getName(),
  { memory: {role: ROLE_PLEB, assigned: 'init', task: 'idle'} }
)

export const makeMiner = ( spawn: StructureSpawn ) => spawn.spawnCreep(
  [WORK,WORK,WORK,WORK,WORK,WORK,CARRY,CARRY,MOVE,MOVE],
  'Miner ' + getName(),
  { memory: {role: ROLE_MINER, assigned: getMiningNode(spawn.room).id, task: 'mine'} }
)

export const makeHauler = ( spawn: StructureSpawn ) => spawn.spawnCreep(
  [CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,MOVE,MOVE,MOVE,MOVE,MOVE],
  'Hauler ' + getName(),
  { memory: { role: ROLE_HAULER, assigned: 'init', task: 'idle' } }
)

export const makeUpgrader = ( spawn: StructureSpawn ) => spawn.spawnCreep(
  [CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,WORK,WORK,MOVE,MOVE,MOVE,MOVE],
  'Upgrader ' + getName(),
  { memory: { role: ROLE_UPGRADER, assigned: 'init', task: 'idle' } }
)

// Assignment

const assign = (id:string, task:string) => (c:Creep) => {
  c.memory.assigned = id
  c.memory.task = task
  return c
}
const assignIdle = assign('bored', 'idle')

const whereLowEnergyTower = (t:StructureTower) => t.structureType === STRUCTURE_TOWER
  && t.energy < t.energyCapacity - 200

const assignPleb = (pleb: Creep): Creep => {
  // Get Energy
  if(pleb.carry.energy === 0){
    if(typeof pleb.room.storage !== 'undefined' && pleb.room.storage.store.energy > 100){
      return assign(pleb.room.storage.id, 'withdraw')(pleb)
    } else {
      return assign(getMiningNode(pleb.room).id, 'mine')(pleb)
    }
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
  const tower = _.find(Game.structures, whereLowEnergyTower) as StructureTower
  if(tower){ return assign(tower.id, 'supply')(pleb) }

  // Try and build a site
  const site = pleb.pos.findClosestByRange(FIND_MY_CONSTRUCTION_SITES)
  if(site){ return assign(site.id, 'build')(pleb) }

  // Repair Walls
  const wall = pleb.room.find(FIND_STRUCTURES, {
    filter: s => s.structureType === STRUCTURE_WALL && s.hits < 400000
  })
  if(wall[0]){ return assign(wall[0].id, 'repair')(pleb) }

  // All else upgrade controller
  if(typeof pleb.room.controller === 'undefined'){ return pleb; }
  return assign(pleb.room.controller.id, 'upgrade')(pleb)
}

const assignMiner = (miner: Creep): Creep => {
  return miner
}

const assignHauler = (hauler: Creep): Creep => {
  // Move from containers to storage
  if(hauler.carry.energy < hauler.carryCapacity / 2){
    // const dropped = hauler.room.find(FIND_DROPPED_RESOURCES)
    // if(dropped[0]){ return assign(dropped[0].id, 'pickup')(hauler) }
    const containers = (hauler.room
      .find(FIND_STRUCTURES, { filter: { structureType: STRUCTURE_CONTAINER }}) as StructureStorage[])
      .sort((a,b) => a.store[RESOURCE_ENERGY] < b.store[RESOURCE_ENERGY] ? 1 : -1)
    return assign(containers[0].id, 'withdraw')(hauler)
  }

  const tower = _.find(Game.structures, whereLowEnergyTower) as StructureTower
  if(tower){ return assign(tower.id, 'supply')(hauler) }

  const extension = hauler.pos.findClosestByRange(FIND_MY_STRUCTURES, {
    filter: (s: StructureExtension) => s.structureType === STRUCTURE_EXTENSION && s.store.getFreeCapacity(RESOURCE_ENERGY) !== 0
  }) as StructureExtension | null
  if(extension){ return assign(extension.id, 'supply')(hauler) }

  const store = hauler.room.storage
  if(typeof store !== 'undefined'){
    return assign(store.id, 'supply')(hauler)
  }
  // Supply towers and extensions
  return hauler
}

const assignUpgrader = (u: Creep) => {
  if(!u.room.storage || !u.room.controller){ return assign('urself', 'kill')(u) }
  if(u.carry.energy === 0){ return assign(u.room.storage.id, 'withdraw')(u) }
  return assign(u.room.controller.id, 'upgrade')(u)
}

const workPleb = ( creep: Creep ) => {

  let pleb = creep
  if(pleb.memory.assigned === 'idle' || pleb.memory.task === 'idle'){
    pleb = assignPleb(pleb)
    pleb.say(taskToIcon(pleb.memory.task))
  }

  // Carry out work
  const full = pleb.carry.energy >= pleb.carryCapacity
  switch(pleb.memory.task){
    case 'withdraw':
      const con = Game.getObjectById(pleb.memory.assigned) as StructureTower
      if(pleb.carry.energy >= pleb.carryCapacity){ return workPleb(assignIdle(pleb)) }
      pleb.moveTo(con)
      pleb.withdraw(con, RESOURCE_ENERGY)
      break;
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

const workUpgrader = ( c: Creep ) => {

  let u = c
  if(u.memory.assigned === 'idle' || u.memory.task === 'idle'){
    u = assignUpgrader(u)
    u.say(taskToIcon(u.memory.task))
  }

  switch(u.memory.task){
    case 'withdraw':
      const con = Game.getObjectById(u.memory.assigned) as StructureTower
      if(u.carry.energy >= u.carryCapacity){ return workUpgrader(assignIdle(u)) }
      u.moveTo(con)
      u.withdraw(con, RESOURCE_ENERGY)
      break;
    case 'upgrade':
      if(u.carry.energy === 0){ return assignIdle(u) }
      const controller = Game.getObjectById(u.memory.assigned) as StructureController
      u.moveTo(controller)
      u.upgradeController(controller)
      break;
  }

}

const workMiner = ( c: Creep ) => {
  const full = c.carry.energy >= c.carryCapacity
  switch(c.memory.task){
    case 'mine':
      if(full){ return workMiner(assign(c.memory.assigned, 'supply')(c)) }
      const source = Game.getObjectById(c.memory.assigned) as Source
      c.moveTo(source)
      c.harvest(source)
      break;
    case 'supply':
      if(c.carry.energy === 0){ return workMiner(assign(c.memory.assigned, 'mine')(c)) }
      const containers = c.pos.findInRange(FIND_STRUCTURES, 3, {filter: { structureType: STRUCTURE_CONTAINER }})
      if(!containers[0]){ console.log('ERROR: CANNOT FIND CONTAINER'); return c; }
      c.moveTo(containers[0])
      c.transfer(containers[0], RESOURCE_ENERGY)
      break;
  }
  return c
}

const workHauler = ( c: Creep ) => {

  let hauler = c
  if(hauler.memory.assigned === 'idle' || hauler.memory.task === 'idle'){
    hauler = assignHauler(hauler)
    hauler.say(taskToIcon(hauler.memory.task))
  }

  const full = hauler.carry.energy >= hauler.carryCapacity
  switch(hauler.memory.task){
    case 'withdraw':
      const source = Game.getObjectById(hauler.memory.assigned) as StructureContainer | StructureStorage
      if(hauler.carry.energy >= hauler.carryCapacity){ return workHauler(assignIdle(hauler)) }
      hauler.moveTo(source)
      hauler.withdraw(source, RESOURCE_ENERGY)
      break;
    case 'supply':
      const dest = Game.getObjectById(hauler.memory.assigned) as StructureExtension | StructureTower
      if(hauler.carry.energy === 0 || dest.store.getFreeCapacity(RESOURCE_ENERGY) === 0){
        return assignIdle(hauler)
      }
      hauler.moveTo(dest)
      hauler.transfer(dest, RESOURCE_ENERGY)
  }
  return hauler
}

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

export const workCreep = (c: Creep): Creep => {
  switch(c.memory.role){
    case ROLE_PLEB: return workPleb(c)
    case ROLE_MINER: return workMiner(c)
    case ROLE_HAULER: return workHauler(c)
    case ROLE_UPGRADER: return workUpgrader(c)
    default: log('Missing Worker: ' + c.name); return c
  }
}
