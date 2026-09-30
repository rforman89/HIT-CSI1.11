import assert from 'node:assert/strict';
export const roles=['admin','admin','jury','jury','jury','suspect','suspect','suspect',...Array.from({length:12},(_,i)=>i%2?'b':'a')];
export const schedule=[{at:60,action:'browser-note'},{at:180,action:'browser-credit'},{at:300,action:'purchase-a'},{at:420,action:'note-b'},{at:450,action:'reconnect'},{at:540,action:'release'},{at:660,action:'credit'},{at:780,action:'purchase-b'}];
export function validateAcceptance(options){
 assert.equal(options.target,'hosted');assert.equal(options.allowHosted,true);assert.equal(options.profile,'A');assert.equal(options.clients,20);assert.equal(options.seconds,900);assert.equal(options.writes,true);
}
