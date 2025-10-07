/**
 * Basic Seeder
 * 
 * Handles creation of core entities (clubs, users, carnivals, sponsors)
 * and their basic relationships
 */

import { Club, User, Carnival, Sponsor, EmailSubscription } from '../../models/index.mjs';
import { SAMPLE_CLUBS } from '../fixtures/clubFixtures.mjs';
import { SAMPLE_CARNIVALS } from '../fixtures/carnivalFixtures.mjs';
import { SAMPLE_SPONSORS, SAMPLE_SUBSCRIPTIONS } from '../fixtures/sponsorFixtures.mjs';
import MySidelineService from '../../services/mySidelineIntegrationService.mjs';
import { AUSTRALIAN_STATES } from '../../config/constants.mjs';

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
            // Only check connection health, do not run full setup
            const { getDatabaseConnection } = await import('../../config/database.mjs');
            const connected = await getDatabaseConnection();
            if (!connected) throw new Error('Failed to establish database connection');
            console.log('✅ SQLite database connection is healthy');
        } catch (error) {
            console.error('❌ Database connection failed:', error.message);
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
            passwordHash: 'Admin123!', // Will be hashed by model hook
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
                passwordHash: 'Delegate123!', // Will be hashed by model hook
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
                    passwordHash: 'Delegate123!', // Will be hashed by model hook
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
                // Core carnival fields
                title: carnivalData.title,
                date: carnivalData.date,
                endDate: carnivalData.endDate,
                state: carnivalData.state,
                
                // Location fields - structured address
                locationAddress: carnivalData.locationAddress,
                locationSuburb: carnivalData.locationSuburb,
                locationPostcode: carnivalData.locationPostcode,
                locationCountry: carnivalData.locationCountry,
                locationAddressLine1: carnivalData.locationAddressLine1,
                locationAddressLine2: carnivalData.locationAddressLine2,
                venueName: carnivalData.venueName,
                locationLatitude: carnivalData.locationLatitude,
                locationLongitude: carnivalData.locationLongitude,
                
                // Contact and organization fields
                organiserContactName: carnivalData.organiserContactName,
                organiserContactEmail: carnivalData.organiserContactEmail,
                organiserContactPhone: carnivalData.organiserContactPhone,
                
                // Carnival details
                scheduleDetails: carnivalData.scheduleDetails,
                registrationLink: carnivalData.registrationLink,
                feesDescription: carnivalData.feesDescription,
                callForVolunteers: carnivalData.callForVolunteers,
                
                // Social media and branding
                socialMediaFacebook: carnivalData.socialMediaFacebook,
                socialMediaInstagram: carnivalData.socialMediaInstagram,
                socialMediaTwitter: carnivalData.socialMediaTwitter,
                socialMediaWebsite: carnivalData.socialMediaWebsite,
                clubLogoURL: carnivalData.clubLogoURL,
                promotionalImageURL: carnivalData.promotionalImageURL,
                
                // Draw and documents
                drawFileURL: carnivalData.drawFileURL,
                drawFileName: carnivalData.drawFileName,
                drawTitle: carnivalData.drawTitle,
                drawDescription: carnivalData.drawDescription,
                
                // Registration management
                maxTeams: carnivalData.maxTeams,
                currentRegistrations: carnivalData.currentRegistrations || 0,
                isRegistrationOpen: carnivalData.isRegistrationOpen !== false, // Default true
                registrationDeadline: carnivalData.registrationDeadline,
                
                // Admin and metadata
                adminNotes: carnivalData.adminNotes,
                createdByUserId: creator ? creator.id : null,
                clubId: randomClub ? randomClub.id : null, // Always assign a valid host club
                
                // MySideline fields (for manual entries these are null/false)
                mySidelineTitle: null,
                mySidelineId: null,
                mySidelineAddress: null,
                mySidelineDate: null,
                isManuallyEntered: true,
                lastMySidelineSync: null,
                claimedAt: null,
                
                // Status
                isActive: true,
                createdAt: new Date(),
                updatedAt: new Date()
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
            const states = AUSTRALIAN_STATES;
            let totalImported = 0;
            
            for (const state of states) {
                try {
                    const stateCarnivals = await MySidelineService.getCarnivalsForState(state);
                    console.log(`Found ${stateCarnivals.length} carnivals for ${state}`);
                    
                    for (const carnival of stateCarnivals) {
                        try {
                            const carnival = await Carnival.create({
                                ...carnival,
                                isManuallyEntered: false,
                                isActive: true,
                                createdAt: new Date(),
                                updatedAt: new Date()
                            });
                            
                            this.createdCarnivals.push(carnival);
                            totalImported++;
                            console.log(`Created carnival: ${carnival.title}`);
                        } catch (createError) {
                            console.error(`Failed to create carnival for ${carnival.title}:`, createError.message);
                        }
                    }
                } catch (stateError) {
                    console.error(`Failed to fetch ${state} carnivals:`, stateError.message);
                }
            }
            
            console.log(`✅ Imported ${totalImported} MySideline carnivals`);
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
        
        // Get available clubs to assign sponsors to
        const availableClubs = this.createdClubs.length > 0 ? this.createdClubs : await Club.findAll();
        
        if (availableClubs.length === 0) {
            console.log('⚠️  No clubs available to assign sponsors to. Skipping sponsor creation.');
            return this.createdSponsors;
        }
        
        for (const sponsorData of SAMPLE_SPONSORS) {
            // Assign sponsor to a random club
            const randomClub = availableClubs[Math.floor(Math.random() * availableClubs.length)];
            const sponsorWithClub = {
                ...sponsorData,
                clubId: randomClub.id
            };
            
            const sponsor = await Sponsor.create(sponsorWithClub);
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

export default BasicSeeder;