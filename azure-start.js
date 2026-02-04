const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');
const child_process = require('child_process');

console.log('Starting custom Azure startup script (Enhanced)...');

const enginesDir = path.join(__dirname, 'node_modules', '@prisma', 'engines');
const tmpDir = '/tmp';
const clientOutputDir = path.join(tmpDir, 'prisma-client');

// Function to copy and chmod file
function prepareBinary(source, destFile) {
    const dest = path.join(tmpDir, destFile);
    try {
        if (fs.existsSync(source)) {
            console.log(`Copying ${destFile} to ${dest}...`);
            fs.copyFileSync(source, dest);
            fs.chmodSync(dest, 0o755);
            return dest;
        }
    } catch (e) {
        console.warn(`Failed to copy ${destFile}:`, e.message);
    }
    return null;
}

try {
    if (fs.existsSync(enginesDir)) {
        const files = fs.readdirSync(enginesDir);

        // 1. Schema Engine (Migration)
        const schemaEngine = files.find(f => f.startsWith('schema-engine-') && !f.includes('darwin') && !f.includes('windows'));
        if (schemaEngine) {
            const dest = prepareBinary(path.join(enginesDir, schemaEngine), schemaEngine);
            if (dest) {
                process.env.PRISMA_SCHEMA_ENGINE_BINARY = dest;
                console.log('Set PRISMA_SCHEMA_ENGINE_BINARY to', dest);
            }
        }

        // 2. Query Engine (Runtime) - Library or Binary
        const libQueryEngine = files.find(f => f.startsWith('libquery_engine-') && f.endsWith('.so.node'));
        const queryEngine = files.find(f => f.startsWith('query-engine-') && !f.includes('darwin') && !f.includes('windows') && !f.endsWith('.gen'));

        if (libQueryEngine) {
            const dest = prepareBinary(path.join(enginesDir, libQueryEngine), libQueryEngine);
            if (dest) {
                process.env.PRISMA_QUERY_ENGINE_LIBRARY = dest;
                console.log('Set PRISMA_QUERY_ENGINE_LIBRARY to', dest);
            }
        }

        if (queryEngine) {
            const dest = prepareBinary(path.join(enginesDir, queryEngine), queryEngine);
            if (dest) {
                process.env.PRISMA_QUERY_ENGINE_BINARY = dest;
                console.log('Set PRISMA_QUERY_ENGINE_BINARY to', dest);
            }
        }

    } else {
        console.warn('Engines directory not found:', enginesDir);
    }

    // 3. Generate Client in a Fake Project (to bypass read-only and auto-install issues)
    console.log('Preparing to generate Prisma Client at runtime (Symlink Method)...');

    const buildDir = path.join(tmpDir, 'prisma-build');
    if (!fs.existsSync(buildDir)) {
        fs.mkdirSync(buildDir, { recursive: true });
    }

    // 3a. Setup Fake Project Root
    // Copy package.json so Prisma sees a valid project
    fs.copyFileSync(path.join(__dirname, 'package.json'), path.join(buildDir, 'package.json'));

    // Symlink node_modules so Prisma finds dependencies without installing
    const symlinkNodeModules = path.join(buildDir, 'node_modules');
    if (!fs.existsSync(symlinkNodeModules)) {
        try {
            fs.symlinkSync(path.join(__dirname, 'node_modules'), symlinkNodeModules);
            console.log('Symlinked node_modules to build dir.');
        } catch (symErr) {
            console.warn('Failed to symlink node_modules:', symErr);
        }
    }

    // 3b. Prepare Schema with Custom Output
    const prismaDir = path.join(buildDir, 'prisma');
    if (!fs.existsSync(prismaDir)) {
        fs.mkdirSync(prismaDir);
    }

    const schemaPath = path.join(__dirname, 'prisma', 'schema.prisma');
    const tmpSchemaPath = path.join(prismaDir, 'schema.prisma');

    // Output relative to the schema in the build dir
    // buildDir/prisma/schema.prisma -> output: ../generated-client -> buildDir/generated-client
    const relativeOutputDir = '../generated-client';
    const absoluteOutputDir = path.join(buildDir, 'generated-client');

    let schemaContent = fs.readFileSync(schemaPath, 'utf8');
    if (schemaContent.includes('generator client {')) {
        schemaContent = schemaContent.replace(
            'generator client {',
            `generator client {\n  output = "${relativeOutputDir}"`
        );
    }

    fs.writeFileSync(tmpSchemaPath, schemaContent);
    console.log('Created temporary schema at:', tmpSchemaPath);

    // 3c. Run Generate
    console.log('Running prisma generate...');
    try {
        // Run inside the buildDir so it finds package.json and node_modules there
        execSync(`node node_modules/prisma/build/index.js generate --schema="prisma/schema.prisma"`, {
            cwd: buildDir,
            stdio: 'inherit',
            env: { ...process.env, NODE_ENV: 'production' }
        });

        console.log('Prisma Client generated successfully at', absoluteOutputDir);

        // Point app to use this client
        process.env.PRISMA_CLIENT_PATH = absoluteOutputDir;

    } catch (genErr) {
        console.error('Failed to generate client (Symlink Method):', genErr);
    }

} catch (e) {
    console.error('Error preparing runtime environment:', e);
}

// 4. Migrate Deploy with Retry
const MAX_RETRIES = 5;
const RETRY_DELAY_SEC = 15;

for (let i = 1; i <= MAX_RETRIES; i++) {
    try {
        console.log(`Attempt ${i}/${MAX_RETRIES}: Running migrate deploy...`);
        // We use the Original schema for migration to avoid any confusion, or the temp one. 
        // Migration doesn't depend on client output, so original is fine. 
        // But we must use the correct engines which are set in env.
        execSync('node node_modules/prisma/build/index.js migrate deploy', {
            stdio: 'inherit',
            env: process.env
        });
        console.log('Migration successful.');
        break;
    } catch (e) {
        console.error(`Migration attempt ${i} failed.`);
        if (i < MAX_RETRIES) {
            console.log(`Waiting ${RETRY_DELAY_SEC} seconds before retrying...`);
            try {
                execSync(`sleep ${RETRY_DELAY_SEC}`);
            } catch (ex) {
                /* ignore */
                const stop = Date.now() + RETRY_DELAY_SEC * 1000;
                while (Date.now() < stop) { }
            }
        } else {
            console.error('All migration attempts failed. Continuing to try starting server anyway...');
            // process.exit(1); // Optional: try running anyway?
        }
    }
}

console.log('Starting application server...');
require('./server.js');
