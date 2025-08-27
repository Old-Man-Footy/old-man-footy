/**
 * Simple Database Seeding Script
 * Bypasses complex module resolution issues by running direct seeding
 */

import { 
    sequelize,
    Club, 
    User, 
    Carnival, 
    Sponsor, 
    EmailSubscription 
} from '../models/index.mjs';

console.log('🌱 Starting simple database seeding...');

try {
    // Test database connection
    await sequelize.authenticate();
    console.log('✅ Database connection established');

    // Create a simple test club
    const testClub = await Club.create({
        clubName: 'Brisbane Bears',
        location: 'Brisbane, QLD',
        website: 'https://brisbane-bears.com.au',
        contactEmail: 'info@brisbane-bears.com.au',
        isActive: true
    });
    console.log('✅ Created test club:', testClub.clubName);

    // Create admin user
    const admin = await User.create({
        email: 'admin@oldmanfooty.au',
        password: 'admin123', // Note: In real implementation this should be hashed
        firstName: 'System',
        lastName: 'Administrator',
        isActive: true,
        role: 'admin'
    });
    console.log('✅ Created admin user');

    // Create a test carnival
    const testCarnival = await Carnival.create({
        name: 'Test Masters Carnival',
        description: 'A test carnival for development',
        location: 'Brisbane, QLD',
        date: new Date('2024-09-15'),
        registrationOpenDate: new Date('2024-08-01'),
        registrationCloseDate: new Date('2024-09-10'),
        isActive: true,
        isManuallyEntered: true
    });
    console.log('✅ Created test carnival:', testCarnival.name);

    // Create a test sponsor
    const testSponsor = await Sponsor.create({
        businessName: 'Local Sports Store',
        contactPerson: 'John Smith',
        contactEmail: 'john@localsports.com.au',
        businessType: 'Sports Equipment',
        isActive: true
    });
    console.log('✅ Created test sponsor:', testSponsor.businessName);

    console.log('\n✅ Simple seeding completed successfully!');
    console.log('\n🔐 Login credentials:');
    console.log('   Admin: admin@oldmanfooty.au / admin123');

} catch (error) {
    console.error('❌ Seeding failed:', error.message);
    console.error(error.stack);
} finally {
    await sequelize.close();
    console.log('🔌 Database connection closed');
}
