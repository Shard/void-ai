// Defined in creeps.ts
type  CreepRole = 'Pleb' | 'Miner' | 'Hauler' | 'Upgrader' | 'Builder' | 'Claimer'

type CreepTask = 'IDLE' | 'MINE' | 'WITHDRAW' | 'TRAVEL'
  | 'PICKUP' | 'UPGRADE' | 'TRANSFER' | 'REPAIR'
  | 'RESERVE' | 'CLAIM' | 'ATTACK' | 'RECYCLE' | 'BUILD'

type CreepCounts = { [R in CreepRole]: number }

interface WorldState {
  counts: CreepCounts
}

interface CreepMemory {
  role: CreepRole;
  task: CreepTask;
  // Usually an ID for a game object that directly related to the task
  assigned: string;
  // The room name that represents the assigned room of the creep
  home: string;
  // Extra data for role/task specific data
  payload?: any;
}

interface RoomMemory {
  // Dict<String,String> - Maps mining node ids to storage container ids
  // mining: {},
  designation?: string;
  counts: CreepCounts;
  desiredCreeps: CreepCounts;
  lastMined: string;
}

interface Memory {
  uuid: number;
  log: any;
}

// `global` extension samples
declare namespace NodeJS {
  interface Global {
    log: any;
  }
}
