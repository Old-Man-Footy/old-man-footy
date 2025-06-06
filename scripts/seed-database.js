/**
 * Database Seeding Script for Development Environment - SQLite/Sequelize Implementation
 * 
 * This script populates the local SQLite development database with:
 * - Test clubs and users
 * - Sample carnival data (both manual and MySideline imported)
 * - Email subscriptions
 * - Realistic data for testing all platform features
 */

const bcrypt = require('bcrypt');
const { sequelize, User, Club, Carnival, EmailSubscription } = require('../models');
const MySidelineService = require('../services/mySidelineService');

// Load environment variables
require('dotenv').config();

/**
 * Australian Rugby League club names and locations for realistic test data
 */
const SAMPLE_CLUBS = [
    { name: 'Canterbury Bankstown Masters', state: 'NSW', location: 'Belmore' },
    { name: 'Parramatta Eels Masters', state: 'NSW', location: 'Parramatta' },
    { name: 'Brisbane Broncos Masters', state: 'QLD', location: 'Brisbane' },
    { name: 'Gold Coast Titans Masters', state: 'QLD', location: 'Gold Coast' },
    { name: 'Melbourne Storm Masters', state: 'VIC', location: 'Melbourne' },
    { name: 'Geelong Masters Rugby League', state: 'VIC', location: 'Geelong' },
    { name: 'Perth Pirates Masters', state: 'WA', location: 'Perth' },
    { name: 'Fremantle Dockers Masters', state: 'WA', location: 'Fremantle' },
    { name: 'Adelaide Rams Masters', state: 'SA', location: 'Adelaide' },
    { name: 'Port Adelaide Masters', state: 'SA', location: 'Port Adelaide' },
    { name: 'Hobart Devils Masters', state: 'TAS', location: 'Hobart' },
    { name: 'Launceston Lions Masters', state: 'TAS', location: 'Launceston' }
];

/**
 * Sample carnival data for testing
 */
const SAMPLE_CARNIVALS = [
    {
        title: 'NSW Masters Grand Final',
        date: new Date('2025-09-15'),
        state: 'NSW',
        locationAddress: 'ANZ Stadium, Olympic Park, Sydney NSW 2127',
        scheduleDetails: 'Championship finals across all age groups. Games start at 9:00 AM with the grand final at 3:00 PM.',
        organiserContactName: 'John Smith',
        organiserContactEmail: 'john.smith@nswmasters.com.au',
        organiserContactPhone: '0412 345 678',
        registrationLink: 'https://www.nswmasters.com.au/register/grand-final',
        feesDescription: 'Entry fee: $150 per team. Includes lunch and presentation.',
        callForVolunteers: 'Seeking referees and ground officials. Contact organiser for details.',
        socialMediaFacebook: 'https://facebook.com/nswmasters',
        socialMediaInstagram: 'https://instagram.com/nswmasters'
    },
    {
        title: 'Queensland Masters Carnival',
        date: new Date('2025-08-20'),
        state: 'QLD',
        locationAddress: 'Suncorp Stadium, Milton QLD 4064',
        scheduleDetails: 'Two-day carnival featuring 35+ and 45+ divisions. Pool games Saturday, finals Sunday.',
        organiserContactName: 'Sarah Wilson',
        organiserContactEmail: 'sarah.wilson@qldmasters.com.au',
        organiserContactPhone: '0423 456 789',
        registrationLink: 'https://www.qldmasters.com.au/carnival2025',
        feesDescription: 'Team entry: $200. Individual registration: $50.',
        callForVolunteers: 'Volunteers needed for ground setup, timekeeping, and canteen duties.',
        socialMediaFacebook: 'https://facebook.com/qldmasters',
        socialMediaWebsite: 'https://www.qldmasters.com.au'
    },
    {
        title: 'Victorian Masters Championship',
        date: new Date('2025-07-30'),
        state: 'VIC',
        locationAddress: 'AAMI Park, Melbourne VIC 3000',
        scheduleDetails: 'Annual championship with modified rules for masters players. Games from 10:00 AM to 4:00 PM.',
        organiserContactName: 'Mike Johnson',
        organiserContactEmail: 'mike.johnson@vicmasters.com.au',
        organiserContactPhone: '0434 567 890',
        registrationLink: 'https://www.vicmasters.com.au/championship',
        feesDescription: 'Entry fee: $180 per team. Includes referee fees and ground hire.',
        socialMediaFacebook: 'https://facebook.com/vicmasters',
        socialMediaTwitter: 'https://twitter.com/vicmasters'
    },
    {
        title: 'Perth Masters Festival',
        date: new Date('2025-10-05'),
        state: 'WA',
        locationAddress: 'HBF Park, Perth WA 6004',
        scheduleDetails: 'Festival format with social games and skill competitions. Family-friendly event.',
        organiserContactName: 'David Brown',
        organiserContactEmail: 'david.brown@wamasters.com.au',
        organiserContactPhone: '0445 678 901',
        registrationLink: 'https://www.wamasters.com.au/festival',
        feesDescription: 'Participation fee: $100 per team. Includes BBQ lunch.',
        callForVolunteers: 'Looking for BBQ helpers and event coordinators.',
        socialMediaWebsite: 'https://www.wamasters.com.au'
    },
    {
        title: 'Adelaide Masters Cup',
        date: new Date('2025-06-25'),
        state: 'SA',
        locationAddress: 'Adelaide Oval, North Adelaide SA 5006',
        scheduleDetails: 'Knockout tournament format. Registration 8:30 AM, first games 9:00 AM.',
        organiserContactName: 'Lisa Taylor',
        organiserContactEmail: 'lisa.taylor@samasters.com.au',
        organiserContactPhone: '0456 789 012',
        registrationLink: 'https://www.samasters.com.au/cup2025',
        feesDescription: 'Entry: $120 per team. Trophy presentation at 5:00 PM.'
    }
];

/**
 * Sample email subscriptions for testing
 */
const SAMPLE_SUBSCRIPTIONS = [
    { email: 'fan1@example.com', states: ['NSW', 'QLD'] },
    { email: 'fan2@example.com', states: ['VIC'] },
    { email: 'fan3@example.com', states: ['WA', 'SA'] },
    { email: 'rugbyfan@gmail.com', states: ['NSW'] },
    { email: 'masters.supporter@outlook.com', states: ['QLD', 'VIC'] }
];

class DatabaseSeeder {
    constructor() {
        this.createdClubs = [];
        this.createdUsers = [];
        this.createdCarnivals = [];
    }

    /**
     * Initialize database connection and sync tables
     */
    async connect() {
        try {
            const { initializeDatabase } = require('../config/database');
            await initializeDatabase();
            console.log('✅ SQLite database initialized successfully');
        } catch (error) {
            console.error('❌ Database initialization failed:', error.message);
            process.exit(1);
        }
    }

    /**
     * Clear existing data using Sequelize
     */
    async clearDatabase() {
        console.log('🧹 Clearing existing data...');
        
        // Use transaction for atomicity
        const transaction = await sequelize.transaction();
        
        try {
            // Clear tables in correct order (foreign key constraints)
            await Carnival.destroy({ where: {}, transaction });
            await User.destroy({ where: {}, transaction });
            await Club.destroy({ where: {}, transaction });
            await EmailSubscription.destroy({ where: {}, transaction });
            
            await transaction.commit();
            console.log('✅ Database cleared');
        } catch (error) {
            await transaction.rollback();
            throw error;
        }
    }

    /**
     * Create test clubs using Sequelize
     */
    async createClubs() {
        console.log('🏢 Creating test clubs...');
        
        for (const clubData of SAMPLE_CLUBS) {
            const club = await Club.create({
                clubName: clubData.name,
                state: clubData.state,
                location: clubData.location,
                isActive: true
            });
            
            this.createdClubs.push(club);
        }
        
        console.log(`✅ Created ${this.createdClubs.length} clubs`);
    }

    /**
     * Create test users and delegates using Sequelize
     */
    async createUsers() {
        console.log('👥 Creating test users...');
        
        // Create admin user
        const adminUser = await User.create({
            email: 'admin@rugbyleaguemasters.com.au',
            firstName: 'Admin',
            lastName: 'User',
            passwordHash: 'admin123', // Will be hashed by model hook
            isAdmin: true,
            isActive: true
        });
        this.createdUsers.push(adminUser);

        // Create primary delegates for each club
        for (const club of this.createdClubs) {
            const primaryDelegate = await User.create({
                email: `primary@${club.clubName.toLowerCase().replace(/\s+/g, '')}.com.au`,
                firstName: 'Primary',
                lastName: 'Delegate',
                passwordHash: 'delegate123', // Will be hashed by model hook
                clubId: club.id,
                isPrimaryDelegate: true,
                isActive: true
            });
            this.createdUsers.push(primaryDelegate);

            // Create additional delegate for some clubs
            if (Math.random() > 0.5) {
                const secondaryDelegate = await User.create({
                    email: `delegate@${club.clubName.toLowerCase().replace(/\s+/g, '')}.com.au`,
                    firstName: 'Secondary',
                    lastName: 'Delegate',
                    passwordHash: 'delegate123', // Will be hashed by model hook
                    clubId: club.id,
                    isPrimaryDelegate: false,
                    isActive: true
                });
                this.createdUsers.push(secondaryDelegate);
            }
        }
        
        console.log(`✅ Created ${this.createdUsers.length} users (including admin)`);
    }

    /**
     * Create manual test carnivals using Sequelize
     */
    async createManualCarnivals() {
        console.log('🎪 Creating manual test carnivals...');
        
        for (const carnivalData of SAMPLE_CARNIVALS) {
            // Find a user from the same state to be the creator
            const stateClubs = this.createdClubs.filter(club => club.state === carnivalData.state);
            const randomClub = stateClubs[Math.floor(Math.random() * stateClubs.length)];
            const creator = this.createdUsers.find(user => 
                user.clubId && user.clubId === randomClub.id
            );

            const carnival = await Carnival.create({
                ...carnivalData,
                createdByUserId: creator ? creator.id : undefined,
                isManuallyEntered: true,
                isActive: true
            });
            
            this.createdCarnivals.push(carnival);
        }
        
        console.log(`✅ Created ${SAMPLE_CARNIVALS.length} manual carnivals`);
    }

    /**
     * Import MySideline data using existing service
     */
    async importMySidelineData() {
        console.log('🔄 Importing MySideline data...');
        
        try {
            // Import events from each state
            const states = ['NSW', 'QLD', 'VIC', 'WA', 'SA', 'TAS'];
            let totalImported = 0;

            for (const state of states) {
                console.log(`  📡 Fetching ${state} events...`);
                
                try {
                    const events = await MySidelineService.scrapeStateEvents(state);
                    
                    for (const event of events) {
                        // Check if event already exists
                        const existingCarnival = await Carnival.findOne({ 
                            where: { mySidelineEventId: event.mySidelineId }
                        });
                        
                        if (!existingCarnival) {
                            const carnival = await MySidelineService.createNewEvent(event);
                            this.createdCarnivals.push(carnival);
                            totalImported++;
                        }
                    }
                } catch (stateError) {
                    console.log(`  ⚠️  ${state} import failed: ${stateError.message}`);
                }
            }
            
            console.log(`✅ Imported ${totalImported} MySideline events`);
        } catch (error) {
            console.log(`⚠️  MySideline import failed (using manual data only): ${error.message}`);
        }
    }

    /**
     * Create email subscriptions using Sequelize
     */
    async createEmailSubscriptions() {
        console.log('📧 Creating email subscriptions...');
        
        for (const subData of SAMPLE_SUBSCRIPTIONS) {
            await EmailSubscription.create({
                email: subData.email,
                states: subData.states,
                isActive: true
            });
        }
        
        console.log(`✅ Created ${SAMPLE_SUBSCRIPTIONS.length} email subscriptions`);
    }

    /**
     * Generate summary statistics using Sequelize
     */
    async generateSummary() {
        const stats = {
            clubs: await Club.count({ where: { isActive: true } }),
            users: await User.count({ where: { isActive: true } }),
            carnivals: await Carnival.count({ where: { isActive: true } }),
            manualCarnivals: await Carnival.count({ where: { isManuallyEntered: true, isActive: true } }),
            mySidelineCarnivals: await Carnival.count({ where: { isManuallyEntered: false, isActive: true } }),
            subscriptions: await EmailSubscription.count({ where: { isActive: true } }),
            upcomingCarnivals: await Carnival.count({ 
                where: { 
                    date: { [require('sequelize').Op.gte]: new Date() }, 
                    isActive: true 
                }
            })
        };

        console.log('\n📊 DATABASE SEEDING SUMMARY');
        console.log('=' .repeat(50));
        console.log(`👥 Users: ${stats.users} (including admin)`);
        console.log(`🏢 Clubs: ${stats.clubs}`);
        console.log(`🎪 Total Carnivals: ${stats.carnivals}`);
        console.log(`   ✏️  Manual: ${stats.manualCarnivals}`);
        console.log(`   🔄 MySideline: ${stats.mySidelineCarnivals}`);
        console.log(`   📅 Upcoming: ${stats.upcomingCarnivals}`);
        console.log(`📧 Email Subscriptions: ${stats.subscriptions}`);
        console.log('=' .repeat(50));
        
        return stats;
    }

    /**
     * Run the complete seeding process
     */
    async seed() {
        console.log('🌱 Starting SQLite database seeding process...\n');
        
        try {
            await this.connect();
            await this.clearDatabase();
            await this.createClubs();
            await this.createUsers();
            await this.createManualCarnivals();
            await this.importMySidelineData();
            await this.createEmailSubscriptions();
            await this.generateSummary();
            
            console.log('\n✅ Database seeding completed successfully!');
            console.log('\n🔐 Login credentials:');
            console.log('   Admin: admin@rugbyleaguemasters.com.au / admin123');
            console.log('   Delegates: primary@[clubname].com.au / delegate123');
            
        } catch (error) {
            console.error('\n❌ Database seeding failed:', error);
            throw error;
        } finally {
            await sequelize.close();
            console.log('\n🔌 Database connection closed');
        }
    }
}

/**
 * Run seeder if called directly
 */
if (require.main === module) {
    const seeder = new DatabaseSeeder();
    seeder.seed()
        .then(() => {
            console.log('\n🎉 Seeding process completed!');
            process.exit(0);
        })
        .catch((error) => {
            console.error('\n💥 Seeding process failed:', error);
            process.exit(1);
        });
}

module.exports = DatabaseSeeder;