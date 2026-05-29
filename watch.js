const esbuild = require('esbuild');
const { spawn } = require('child_process');

async function watch() {
  console.log('Watching PC client...');
  const pcCtx = await esbuild.context({
    entryPoints: ['src/client/pc/index.ts'],
    bundle: true,
    outfile: 'server/public/pc/index.js',
    sourcemap: true,
    target: ['es2022'],
  });
  await pcCtx.watch();

  console.log('Watching Mobile client...');
  const mobileCtx = await esbuild.context({
    entryPoints: ['src/client/mobile/index.ts'],
    bundle: true,
    outfile: 'server/public/mobile/index.js',
    sourcemap: true,
    target: ['es2022'],
  });
  await mobileCtx.watch();

  console.log('Starting Server with tsx watch...');
  const serverProcess = spawn('npx', ['tsx', 'watch', 'src/server/index.ts'], {
    stdio: 'inherit',
    shell: true,
  });

  serverProcess.on('close', (code) => {
    pcCtx.dispose();
    mobileCtx.dispose();
    process.exit(code || 0);
  });
}

watch().catch((err) => {
  console.error('Watch failed:', err);
  process.exit(1);
});
