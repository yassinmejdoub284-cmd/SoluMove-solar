import {spawn} from 'node:child_process';
const child=spawn(process.execPath,['node_modules/next/dist/bin/next','dev','--webpack',...process.argv.slice(2)],{stdio:'inherit',env:{...process.env,SOLAR_VERCEL_BUILD:'1'}});
child.on('exit',code=>process.exit(code??1));
