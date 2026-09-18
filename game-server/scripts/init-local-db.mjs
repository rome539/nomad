// Bootstrap only a fresh local D1. Never guesses migration state or touches remote D1.
import { spawnSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
const root=resolve(dirname(fileURLToPath(import.meta.url)), '..');
if(process.argv.length>2){console.error('This command accepts no arguments and only creates a fresh local database.');process.exit(1);}
const wrangler=resolve(root,'node_modules/wrangler/bin/wrangler.js');
const run=(args,capture=false)=>{
 const result=spawnSync(process.execPath,[wrangler,...args],{cwd:root,encoding:'utf8',stdio:['ignore',capture?'pipe':'ignore','pipe'],maxBuffer:8*1024*1024,env:{...process.env,WRANGLER_SEND_METRICS:'false'}});
 if(result.error||result.status!==0)throw new Error('Local database operation failed; inspect the private Wrangler log. No remote operation was attempted.');
 return result.stdout;
};
try{
 const output=run(['d1','execute','nomad','--local','--command',"SELECT COUNT(*) AS existing FROM sqlite_master WHERE type='table' AND name='players'",'--json'],true);
 const result=JSON.parse(output);
 if(result[0]?.results?.[0]?.existing!==0)throw new Error('Existing local database detected. Bootstrap refused to replay migrations over saved data. Use an isolated fresh checkout or review its migration history.');
 run(['d1','execute','nomad','--local','--file','schema.sql']);
 run(['d1','migrations','apply','nomad','--local']);
 console.log('Fresh local database initialized with the base schema and all tracked migrations.');
}catch(e){console.error(e.message);process.exitCode=1;}
