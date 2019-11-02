import { ErrorMapper } from "utils/ErrorMapper";
import { Role } from './memes';
import { SourceNode } from "source-map/source-map";
const log = (o:any) => console.log('log', JSON.stringify(o))

const makePleb = ( spawn: StructureSpawn ) => spawn.spawnCreep(
  [WORK,CARRY,CARRY,MOVE],
  'Pleb ' + Game.time,
  //{memory: { role: Role.pleb }}
  {memory: {role: Role.pleb, assigned: null}}
)

const workPleb = ( pleb: Creep ) => {
  if(pleb.carry.energy < pleb.carryCapacity && pleb.memory.assigned){
    const node = Game.getObjectById(pleb.memory.assigned) as Source
    pleb.moveTo(node)
    pleb.harvest(node)
  } else {
    pleb.memory.assigned = null
  }

  if(!pleb.memory.assigned){
    if(pleb.carry.energy > 0){
      if(typeof pleb.room.controller === 'undefined'){ return; }
      pleb.moveTo(pleb.room.controller.pos)
      pleb.upgradeController(pleb.room.controller)
    } else {
      const nodes = pleb.room.find(FIND_SOURCES)
      pleb.memory.assigned = nodes[0].id
    }
  }
}

// When compiling TS to JS and bundling with rollup, the line numbers and file names in error messages change
// This utility uses source maps to get the line numbers and file names of the original, TS source code
export const loop = ErrorMapper.wrapLoop(() => {
  console.log(`aCurrent game tick is ${Game.time}`);

  const Spawn = Game.spawns['Spawn1']

  // Get WorldState
  const ws:WorldState = {
    counts: { pleb: 0 }
  }
  log(BODYPART_COST)

  // Role code
  for(const name in Game.creeps){
    const creep = Game.creeps[name]
    ws.counts[creep.memory.role]++
    switch(creep.memory.role){
      case 'pleb':
        workPleb(creep)
        break;
      default: log('Missing Worker: ' + name)
    }
  }

  // Create workers
  const action = ws.counts.pleb < 7 ? makePleb : null
  if (action !== null) action(Spawn)

  // Automatically delete memory of missing creeps
  for (const name in Memory.creeps) {
    if (!(name in Game.creeps)) {
      delete Memory.creeps[name];
    }
  }
});
