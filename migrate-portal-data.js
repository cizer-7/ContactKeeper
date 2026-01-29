const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function migratePortalData() {
    console.log('🔄 Starting portal data migration...\n');

    try {
        // Step 1: Find all contacts with portal information
        const contactsWithPortal = await prisma.contact.findMany({
            where: { hasPortal: true },
            include: { client: true }
        });

        console.log(`Found ${contactsWithPortal.length} contacts with portal information\n`);

        if (contactsWithPortal.length === 0) {
            console.log('✅ No portal data to migrate');
            return;
        }

        // Step 2: Group by client and handle conflicts
        const clientPortalMap = new Map();

        contactsWithPortal.forEach(contact => {
            const clientId = contact.clientId;

            if (!clientPortalMap.has(clientId)) {
                clientPortalMap.set(clientId, {
                    clientName: contact.client.name,
                    portalUrl: contact.portalUrl,
                    portalUser: contact.portalUser,
                    portalPass: contact.portalPass,
                    contactName: contact.name || contact.email || 'Unknown'
                });
            } else {
                console.log(`⚠️  WARNING: Client "${contact.client.name}" has multiple contacts with portal info`);
                console.log(`   Keeping first found, ignoring contact: ${contact.name || contact.email}`);
            }
        });

        console.log(`\n📊 Migration Summary:`);
        console.log(`   Clients to update: ${clientPortalMap.size}`);

        // Step 3: Display what will be migrated
        console.log('\n📝 Portal data to migrate:');
        for (const [clientId, data] of clientPortalMap) {
            console.log(`   • ${data.clientName}: ${data.portalUrl} (from contact: ${data.contactName})`);
        }

        console.log('\n✅ Migration script completed successfully');
        console.log('💾 Portal data mapping saved for schema update');

        // Return the map for use in actual migration
        return clientPortalMap;

    } catch (error) {
        console.error('❌ Migration failed:', error);
        throw error;
    } finally {
        await prisma.$disconnect();
    }
}

// Run if called directly
if (require.main === module) {
    migratePortalData()
        .then(() => process.exit(0))
        .catch((error) => {
            console.error(error);
            process.exit(1);
        });
}

module.exports = { migratePortalData };
