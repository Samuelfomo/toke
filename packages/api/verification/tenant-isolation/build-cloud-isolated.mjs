// Local artifact only. No application/config module, .env or server is executed.
import { mkdtemp, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { build } from 'vite';
import vue from '@vitejs/plugin-vue';
import tailwind from 'tailwindcss';
import autoprefixer from 'autoprefixer';
for (const name of Object.keys(process.env)) if (/^(VITE_|PG|DB_)|^DATABASE_URL$/.test(name)) delete process.env[name];
const root=resolve(fileURLToPath(new URL('../../../..',import.meta.url)));
const temporary=await mkdtemp(join(tmpdir(),'toke-cloud-build-'));
await mkdir(join(temporary,'empty-env'));
const require=createRequire(import.meta.url);
const sharedBuild=spawnSync(process.execPath,[require.resolve('typescript/bin/tsc'),'-p',join(root,'packages/shared/tsconfig.json'),'--outDir',join(temporary,'shared')],{
  stdio:'inherit',env:{PATH:process.env.PATH,NODE_ENV:'test'},
});
if(sharedBuild.status!==0)throw Error('ISOLATED_SHARED_BUILD_FAILED');
await build({
  configFile:false,envFile:false,envDir:join(temporary,'empty-env'),mode:'validation',
  root:join(root,'packages/cloud'),plugins:[vue()],
  css:{postcss:{plugins:[tailwind({content:[join(root,'packages/cloud/index.html'),join(root,'packages/cloud/src/**/*.{vue,js,ts,jsx,tsx}')],theme:{extend:{}},plugins:[]}),autoprefixer()]}},
  resolve:{alias:{'@':join(root,'packages/cloud/src'),'@toke/shared':join(temporary,'shared')}},
  define:{'import.meta.env.VITE_URL':JSON.stringify('fixture.invalid')},
  build:{outDir:join(temporary,'dist'),emptyOutDir:false,rollupOptions:{output:{manualChunks(id){if(id.includes('node_modules'))return 'vendor';}}}},
});
console.log('LOCAL_ONLY_BUILD_ARTIFACT '+temporary);
