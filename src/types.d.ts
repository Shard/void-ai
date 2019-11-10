interface CreepMemory {
  role: string;
  assigned: string;
  task: string;
  payload?: any;
}

interface WorldState {
  counts: any
}

interface RoomMemory {
  // Dict<String,String> - Maps mining node ids to storage container ids
  // mining: {},
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
