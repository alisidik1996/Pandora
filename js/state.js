/**
 * =============================================================
 *  MODULE: State
 *  Tanggung jawab: Shared mutable state yang dishare antar modul.
 * =============================================================
 */

let _teamData      = {};   // { id, name, startTime, locks, lockOrder, ... }
let _gameStartTime = 0;

export const State = {
  get teamData()       { return _teamData; },
  set teamData(v)      { _teamData = v; },

  get gameStartTime()  { return _gameStartTime; },
  set gameStartTime(v) { _gameStartTime = v; },
};
