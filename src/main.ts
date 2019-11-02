import { ErrorMapper } from "utils/ErrorMapper"
import { Role, getName } from './memes'
import _ from 'lodash'

const random = _.random

const log = (o:any) => console.log('log', JSON.stringify(o))

const makePleb = ( spawn: StructureSpawn ) => spawn.spawnCreep(
  [WORK,CARRY,CARRY,MOVE],
  'Pleb ' + getName(),
  {memory: {role: Role.pleb, assigned: 'init', task: 'idle'}}
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
    const nodes = pleb.room.find(FIND_SOURCES)
    // @need to come up with some kind of better way to assign plebs correctly
    return assign(nodes[random(0,nodes.length-1)].id, 'mine')(pleb)
  }

  // Try and build a site
  const sites = Object.keys(Game.constructionSites)
  if(sites.length > 0){
    const site = Game.constructionSites[sites[random(0,sites.length-1)]]
    return assign(site.id, 'build')(pleb)
  }

  // Supply Tower
  const tower = _.find(Game.structures, {structureType: STRUCTURE_TOWER}) as StructureTower
  if(tower && tower.energy < tower.energyCapacity){
    return assign(tower.id, 'supply')(pleb)
  }

  // All else upgrade controller
  if(typeof pleb.room.controller === 'undefined'){ return pleb; }
  return assign(pleb.room.controller.id, 'upgrade')(pleb)
}

const workPleb = ( creep: Creep ) => {

  let pleb = creep
  if(pleb.memory.assigned === 'idle' || pleb.memory.task === 'idle'){
    console.log(pleb.name + ' was ' + pleb.memory.task)
    pleb = assignPleb(pleb)
    console.log(pleb.name + ' assigned ' + pleb.memory.task)
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
  }
  return pleb

}

const workBuilder = ( c: Creep ) => {

}

// ErrorMapper fixes error numbers in screeps console
export const loop = ErrorMapper.wrapLoop(() => {
  console.log(`Current game tick is ${Game.time}`);

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
  const action = ws.counts.pleb < 7 ? makePleb : null
  if (action !== null) action(Spawn)

  // Towers
  const tower = _.find(Game.structures, {structureType: STRUCTURE_TOWER}) as StructureTower
  if(tower){
    for(const name in Game.structures){
      const s = Game.structures[name]
      if(s.hits < s.hitsMax){
        tower.repair(s)
      }
    }
  }

  // Automatically delete memory of missing creeps
  for (const name in Memory.creeps) {
    if (!(name in Game.creeps)) { delete Memory.creeps[name] }
  }

});
