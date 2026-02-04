const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

console.log('Starting custom Azure startup script...');

try {
    const enginesDir = path.join(__dirname, 'node_modules', '@prisma', 'engines');

    if (fs.existsSync(enginesDir)) {
        const files = fs.readdirSync(enginesDir);

        // Find the schema engine compatible with the current environment
        // On Azure Linux, this is typically debian-openssl
        let schemaEngineName = files.find(f =>
            f.startsWith('schema-engine-') &&
            !f.includes('darwin') &&
            !f.includes('windows')
        );

        // Fallback: if we only see darwin files (because of local checkout), check if there is ANY linux one?
        // If the deployment installed linux dependencies, they should be here.

        if (schemaEngineName) {
            const source = path.join(enginesDir, schemaEngineName);
            const dest = path.join('/tmp', schemaEngineName);

            console.log(`Found schema engine: ${schemaEngineName}`);
            console.log(`Copying to ${dest} to fix permissions...`);

            // Copy file to writable /tmp
            fs.copyFileSync(source, dest);

            // Grant execute permissions
            fs.chmodSync(dest, 0o755);
            console.log('Permissions updated (755).');

            // Tell Prisma to use this executable
            process.env.PRISMA_SCHEMA_ENGINE_BINARY = dest;
        } else {
            console.warn('No compatible Linux schema engine found in node_modules.');
        }
    } else {
        console.warn('Engines directory not found:', enginesDir);
    }
} catch (e) {
    console.error('Error preparing schema engine:', e);
    // Continue anyway, maybe it works or we see a new error
}

const MAX_RETRIES = 5;
const RETRY_DELAY_SEC = 15;

let migrationSuccess = false;

for (let i = 1; i <= MAX_RETRIES; i++) {
    try {
        console.log(`Attempt ${i}/${MAX_RETRIES}: Running migrate deploy...`);
        execSync('node node_modules/prisma/build/index.js migrate deploy', {
            stdio: 'inherit',
            env: process.env
        });
        console.log('Migration successful.');
        migrationSuccess = true;
        break;
    } catch (e) {
        console.error(`Migration attempt ${i} failed.`);
        if (i < MAX_RETRIES) {
            console.log(`Waiting ${RETRY_DELAY_SEC} seconds before retrying...`);
            try {
                execSync(`sleep ${RETRY_DELAY_SEC}`);
            } catch (sleepErr) {
                // Fallback if sleep command fails, busy wait
                const start = Date.now();
                while (Date.now() - start < RETRY_DELAY_SEC * 1000) { }
            }
        } else {
            console.error('All migration attempts failed. Exiting.');
            process.exit(1);
        }
    }
}

console.log('Starting application server...');
require('./server.js');
