import * as A from './access.mjs';
import {command} from './command-recorder.mjs';
export {modules} from './access.mjs';
export const saveRole=command('saveRole',A.saveRole),saveUser=command('saveUser',A.saveUser);
