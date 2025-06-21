/**
 * Basic Seeder
 * 
 * Handles creation of core entities (clubs, users, carnivals, sponsors)
 * and their basic relationships
 */

const { Club, User, Carnival, Sponsor, EmailSubscription, ClubSponsor, CarnivalSponsor, CarnivalClub } = require('../../models');
const { SAMPLE_CLUBS } = require('../fixtures/clubFixtures');
const { SAMPLE_CARNIVALS } = require('../fixtures/carnivalFixtures');
const { SAMPLE_SPONSORS, SAMPLE_SUBSCRIPTIONS } = require('../fixtures/sponsorFixtures');
const MySidelineService = require('../../services/mySidelineIntegrationService');

class BasicSeeder {
    constructor() {
        this.createdClubs = [];
        this.createdUsers = [];
        this.createdCarnivals = [];
        this.createdSponsors = [];
    }

    /**
     * Initialize database connection and validate environment
     * @returns {Promise<void>}
     */
    async connect() {
        try {
            const { initializeDatabase } = require('../../config/database');
            await initializeDatabase();
            console.log('✅ SQLite database initialized successfully');
        } catch (error) {
            console.error('❌ Database initialization failed:', error.message);
            process.exit(1);
        }
    }

    /**
     * Create test clubs using Sequelize
     * @returns {Promise<Array>} Created clubs
     */
    async createClubs() {
        console.log('🏢 Creating test clubs...');
        
        for (const clubData of SAMPLE_CLUBS) {
            const club = await Club.create({
                clubName: clubData.name,
                state: clubData.state,
                location: clubData.location,
                contactPerson: clubData.contactPerson,
                contactEmail: clubData.contactEmail,
                contactPhone: clubData.contactPhone,
                description: clubData.description,
                website: clubData.website,
                facebookUrl: clubData.facebookUrl,
                instagramUrl: clubData.instagramUrl,
                twitterUrl: clubData.twitterUrl,
                logoUrl: clubData.logoUrl,
                isPubliclyListed: clubData.isPubliclyListed,
                isActive: true
            });
            
            this.createdClubs.push(club);
        }
        
        console.log(`✅ Created ${this.createdClubs.length} clubs`);
        return this.createdClubs;
    }

    /**
     * Create test users and delegates using Sequelize
     * @returns {Promise<Array>} Created users
     */
    async createUsers() {
        console.log('👥 Creating test users...');
        
        // Create admin user
        const adminUser = await User.create({
            email: 'admin@oldmanfooty.au',
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
        return this.createdUsers;
    }

    /**
     * Create manual test carnivals using Sequelize
     * @returns {Promise<Array>}
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
                isManuallyEntered: true,
                createdBy: creator ? creator.id : null,
                isActive: true
            });
            
            this.createdCarnivals.push(carnival);
        }
        
        console.log(`✅ Created ${this.createdCarnivals.length} manual carnivals`);
        return this.createdCarnivals;
    }

    /**
     * Import MySideline data if available
     * @returns {Promise<void>}
     */
    async importMySidelineData() {
        console.log('🔄 Importing MySideline data...');
        
        try {
            const states = ['NSW', 'QLD', 'VIC', 'WA', 'SA', 'TAS', 'NT', 'ACT'];
            let totalImported = 0;
            
            for (const state of states) {
                try {
                    const stateEvents = await MySidelineService.getEventsForState(state);
                    console.log(`Found ${stateEvents.length} events for ${state}`);
                    
                    for (const event of stateEvents) {
                        try {
                            const carnival = await Carnival.create({
                                ...event,
                                isManuallyEntered: false,
                                isActive: true,
                                createdAt: new Date(),
                                updatedAt: new Date()
                            });
                            
                            this.createdCarnivals.push(carnival);
                            totalImported++;
                            console.log(`Created carnival: ${carnival.title}`);
                        } catch (createError) {
                            console.error(`Failed to create carnival for ${event.title}:`, createError.message);
                        }
                    }
                } catch (stateError) {
                    console.error(`Failed to fetch ${state} events:`, stateError.message);
                }
            }
            
            console.log(`✅ Imported ${totalImported} MySideline events`);
        } catch (error) {
            console.log(`⚠️  MySideline import failed (using manual data only): ${error.message}`);
        }
    }

    /**
     * Create test sponsors using Sequelize
     * @returns {Promise<Array>} Created sponsors
     */
    async createSponsors() {
        console.log('🤝 Creating test sponsors...');
        
        for (const sponsorData of SAMPLE_SPONSORS) {
            const sponsor = await Sponsor.create(sponsorData);
            this.createdSponsors.push(sponsor);
        }
        
        console.log(`✅ Created ${this.createdSponsors.length} sponsors`);
        return this.createdSponsors;
    }

    /**
     * Create email subscriptions using Sequelize
     * @returns {Promise<void>}
     */
    async createEmailSubscriptions() {
        console.log('📧 Creating email subscriptions...');
        
        let created = 0;
        let skipped = 0;
        
        for (const subData of SAMPLE_SUBSCRIPTIONS) {
            try {
                // Check if email already exists
                const existing = await EmailSubscription.findOne({
                    where: { email: subData.email }
                });
                
                if (existing) {
                    console.log(`  ⏭️  Skipping duplicate email: ${subData.email}`);
                    skipped++;
                    continue;
                }
                
                await EmailSubscription.create({
                    email: subData.email,
                    states: subData.states,
                    isActive: true
                });
                created++;
            } catch (error) {
                if (error.name === 'SequelizeUniqueConstraintError') {
                    console.log(`  ⏭️  Skipping duplicate email: ${subData.email}`);
                    skipped++;
                } else {
                    console.error(`  ❌ Failed to create subscription for ${subData.email}:`, error.message);
                }
            }
        }
        
        console.log(`✅ Created ${created} email subscriptions (${skipped} duplicates skipped)`);
    }

    /**
     * Get created entities
     * @returns {Object} Created entities
     */
    getCreatedEntities() {
        return {
            clubs: this.createdClubs,
            users: this.createdUsers,
            carnivals: this.createdCarnivals,
            sponsors: this.createdSponsors
        };
    }
}

module.exports = BasicSeeder;