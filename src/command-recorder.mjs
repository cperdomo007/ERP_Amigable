import {recordIds} from './domain.mjs';
let current=null;
export function beginCommands(){current=[]}
export function finishCommands(){const commands=current||[];current=null;return commands}
export const command=(action,fn)=>(db,...args)=>{const {result,ids}=recordIds(()=>fn(db,...args));if(current)current.push({action,args:structuredClone(args),ids});return result};
