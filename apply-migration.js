const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function applyMigration() {
    console.log('🔄 Applying portal data migration to database...\n');

    try {
        // Step 1: Get portal data from contacts
        const contactsWithPortal = await prisma.contact.findMany({
            where: { hasPortal: true },
            include: { client: true }
        });

        console.log(`Found ${contactsWithPortal.length} contacts with portal data\n`);

        // Step 2: Group by client (take first if multiple)
        const clientUpdates = new Map();

        contactsWithPortal.forEach(contact => {
            if (!clientUpdates.has(contact.clientId)) {
                clientUpdates.set(contact.clientId, {
                    hasPortal: true,
                    portalUrl: contact.portalUrl,
                    portalUser: contact.portalUser,
                    portalPass: contact.portalPass
                });
                console.log(`✓ Preparing migration for client: ${contact.client.name}`);
            }
        });

        console.log(`\n📝 Migrating data for ${clientUpdates.size} clients...\n`);

        // Step 3: Update clients with portal data
        for (const [clientId, portalData] of clientUpdates) {
            await prisma.client.update({
                where: { id: clientId },
                data: portalData
            });
            console.log(`✓ Updated client ID ${clientId}`);
        }

        console.log('\n✅ Migration completed successfully!');
        console.log(`   ${clientUpdates.size} clients updated with portal information`);

    } catch (error) {
        console.error('❌ Migration failed:', error);
        throw error;
    } finally {
        await prisma.$disconnect();
    }
}

if (require.main === module) {
    applyMigration()
        .then(() => process.exit(0))
        .catch((error) => {
            console.error(error);
            process.exit(1);
        });
}

module.exports = { applyMigration };
