interface CreepMemory {
  role: string;
  assigned: string;
  task: string;
}

interface WorldState {
  counts: any
}

interface RoomMemory {
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
