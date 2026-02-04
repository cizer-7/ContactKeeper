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

    // 3. Generate Client to /tmp
    console.log('Preparing to generate Prisma Client at runtime...');

    const schemaPath = path.join(__dirname, 'prisma', 'schema.prisma');
    const tmpSchemaPath = path.join(tmpDir, 'schema.prisma');

    let schemaContent = fs.readFileSync(schemaPath, 'utf8');
    // Inject output path into generator
    if (schemaContent.includes('generator client {')) {
        schemaContent = schemaContent.replace(
            'generator client {',
            `generator client {\n  output = "${clientOutputDir}"`
        );
    } else {
        console.error('Could not find generator client block in schema');
    }

    fs.writeFileSync(tmpSchemaPath, schemaContent);
    console.log('Created temporary schema with custom output at:', tmpSchemaPath);

    // Run generate using the temp schema
    console.log('Running prisma generate...');
    try {
        execSync(`node node_modules/prisma/build/index.js generate --schema="${tmpSchemaPath}"`, {
            stdio: 'inherit',
            env: process.env
        });
        console.log('Prisma Client generated successfully at', clientOutputDir);

        // Point app to use this client
        process.env.PRISMA_CLIENT_PATH = clientOutputDir;

    } catch (genErr) {
        console.error('Failed to generate client:', genErr);
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
