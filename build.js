const esbuild = require('esbuild');
const { execSync } = require('child_process');

async function build() {
  console.log('Building PC client...');
  await esbuild.build({
    entryPoints: ['src/client/pc/index.ts'],
    bundle: true,
    outfile: 'server/public/pc/index.js',
    minify: true,
    sourcemap: true,
    target: ['es2022'],
  });

  console.log('Building Mobile client...');
  await esbuild.build({
    entryPoints: ['src/client/mobile/index.ts'],
    bundle: true,
    outfile: 'server/public/mobile/index.js',
    minify: true,
    sourcemap: true,
    target: ['es2022'],
  });

  console.log('Building Server...');
  // Run tsc to compile server ts files
  execSync('npx tsc', { stdio: 'inherit' });

  console.log('Build completed successfully!');
}

build().catch((err) => {
  console.error('Build failed:', err);
  process.exit(1);
});
