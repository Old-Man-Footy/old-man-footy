/**
 * Database Seeding Script for Development Environment - Modular Implementation
 * * This script populates the local SQLite development database with:
 * - Test clubs and users
 * - Sample carnival data (both manual and MySideline imported)
 * - Email subscriptions
 * - Realistic data for testing all platform features
 * 
 * SECURITY: This script can ONLY run on development or test environments
 * 
 * The script has been refactored into smaller, manageable modules:
 * - fixtures/ - Contains all sample data
 * - utilities/ - Contains business logic for seeding operations
 */

import { 
    sequelize,
    CarnivalSponsor, 
    CarnivalClub, 
    ClubPlayer, 
    CarnivalClubPlayer, 
    Club, 
    User, 
    Carnival, 
    Sponsor, 
    EmailSubscription 
} from '../models/index.mjs';
import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import { Op } from 'sequelize';
import { fileURLToPath } from 'url';

const execAsync = promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Import modular services
import { validateEnvironment } from './utilities/environmentValidation.mjs';
import DataCleanup from './utilities/dataCleanup.mjs';
import BasicSeeder from './utilities/basicSeeder.mjs';
import PlayerSeeder from './utilities/playerSeeder.mjs';

// Load environment variables
import dotenv from 'dotenv';
dotenv.config();

// Top-level logging
console.log('Seed script started');

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection:', reason);
  process.exit(1);
});

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  process.exit(1);
});

/**
 * Database Seeder - Main Orchestrator Class
 * 
 * Coordinates all seeding operations using specialized service classes
 */
class DatabaseSeeder {
    constructor() {
        this.cleanupService = new DataCleanup();
        this.basicSeedingService = new BasicSeeder();
        this.playerSeedingService = new PlayerSeeder();
        this.createdEntities = {
            clubs: [],
            users: [],
            carnivals: [],
            sponsors: []
        };
    }

    /**
     * Get database file path based on environment
     * @returns {string} Database file path
     */
    getDbPath() {
        const env = process.env.NODE_ENV || 'development';
        
        switch (env) {
            case 'production':
                return path.join(__dirname, '..', 'data', 'old-man-footy.db');
            case 'test':
                return path.join(__dirname, '..', 'data', 'test-old-man-footy.db');
            case 'e2e':
                return path.join(__dirname, '..', 'data', 'e2e-old-man-footy.db');
            case 'development':
            default:
                return path.join(__dirname, '..', 'data', 'dev-old-man-footy.db');
        }
    }

    /**
     * Check if database file exists
     * @returns {boolean} True if database exists
     */
    databaseExists() {
        const dbPath = this.getDbPath();
        return fs.existsSync(dbPath);
    }

    /**
     * Run database migrations
     * @returns {Promise<void>}
     */
    async runMigrations() {
        try {
            console.log('🔄 Running database migrations...');
            
            // Set NODE_ENV for migration command if not set
            const env = process.env.NODE_ENV || 'development';
            
            // Run migrations using sequelize-cli
            const { stdout, stderr } = await execAsync('npx sequelize-cli db:migrate', {
                env: { ...process.env, NODE_ENV: env },
                cwd: path.join(__dirname, '..')
            });
            
            if (stderr && !stderr.includes('WARNING')) {
                console.warn('Migration warnings:', stderr);
            }
            
            console.log('✅ Database migrations completed successfully');
            if (stdout && stdout.trim()) {
                console.log('Migration output:', stdout);
            }
            
        } catch (error) {
            // Check if it's a "No migrations were executed" message (which is not an error)
            if (error.message.includes('No migrations were executed')) {
                console.log('✅ Database is up to date - no migrations needed');
                return;
            }
            
            console.error('❌ Database migration failed:', error.message);
            throw error;
        }
    }

    /**
     * Initialize database connection and validate environment
     * @returns {Promise<void>}
     */
    async connect() {
        try {
            validateEnvironment();
            
            // Check if database exists and run migrations if needed
            const dbExists = this.databaseExists();
            
            if (!dbExists) {
                console.log('📄 Database file not found - will run migrations to create schema');
                
                // Ensure data directory exists
                const dbPath = this.getDbPath();
                const dataDir = path.dirname(dbPath);
                if (!fs.existsSync(dataDir)) {
                    console.log(`📁 Creating data directory: ${dataDir}`);
                    fs.mkdirSync(dataDir, { recursive: true });
                }
                
                // Run migrations to create the database schema
                await this.runMigrations();
            } else {
                console.log('📄 Database file exists - checking for pending migrations');
                
                // Run migrations to ensure database is up to date
                await this.runMigrations();
            }
            
            await this.basicSeedingService.connect();
        } catch (error) {
            console.error('❌ Database initialization failed:', error.message);
            process.exit(1);
        }
    }

    /**
     * Link sponsors to carnivals with realistic relationships
     * @returns {Promise<void>}
     */
    async linkSponsorsToCarnivals() {
        console.log('🎪 Linking sponsors to carnivals...');
        
        let totalLinks = 0;
        
        // Focus on major carnivals and upcoming events
        const majorCarnivals = this.createdEntities.carnivals.filter(carnival => 
            carnival.title.includes('Grand Final') || 
            carnival.title.includes('Championship') || 
            carnival.title.includes('Cup') ||
            carnival.date > new Date()
        );
        
        for (const carnival of majorCarnivals) {
            // Major carnivals get 2-6 sponsors, regular events get 0-3
            const isMajorEvent = carnival.title.includes('Grand Final') || 
                                carnival.title.includes('Championship');
            const maxSponsors = isMajorEvent ? 6 : 3;
            const minSponsors = isMajorEvent ? 2 : 0;
            
            const numSponsors = Math.floor(Math.random() * (maxSponsors - minSponsors + 1)) + minSponsors;
            
            if (numSponsors === 0) continue;
            
            // Prefer local sponsors (same state) with 80% probability for carnivals
            const localSponsors = this.createdEntities.sponsors.filter(sponsor => sponsor.state === carnival.state);
            const nationalSponsors = this.createdEntities.sponsors.filter(sponsor => 
                ['Bunnings Warehouse', 'Coca-Cola Australia', 'Toyota Australia', 'Woolworths Group', 'ANZ Bank'].includes(sponsor.sponsorName)
            );
            
            const selectedSponsors = [];
            const availableSponsors = [...this.createdEntities.sponsors];
            
            for (let i = 0; i < numSponsors && availableSponsors.length > 0; i++) {
                let sponsorPool;
                
                // First sponsor for major events: 50% chance of national sponsor
                if (i === 0 && isMajorEvent && Math.random() < 0.5 && nationalSponsors.length > 0) {
                    sponsorPool = nationalSponsors.filter(s => availableSponsors.includes(s));
                }
                // 80% chance for local sponsors
                else if (Math.random() < 0.8 && localSponsors.length > 0) {
                    sponsorPool = localSponsors.filter(s => availableSponsors.includes(s));
                }
                // Otherwise pick from remaining sponsors
                else {
                    sponsorPool = availableSponsors.filter(s => !selectedSponsors.includes(s));
                    if (sponsorPool.length === 0) {
                        sponsorPool = localSponsors.filter(s => availableSponsors.includes(s));
                    }
                }
                
                if (sponsorPool.length === 0) break;
                
                const randomIndex = Math.floor(Math.random() * sponsorPool.length);
                const selectedSponsor = sponsorPool[randomIndex];
                
                selectedSponsors.push(selectedSponsor);
                availableSponsors.splice(availableSponsors.indexOf(selectedSponsor), 1);
            }
            
            // Create carnival sponsorships
            for (let i = 0; i < selectedSponsors.length; i++) {
                const sponsor = selectedSponsors[i];
                
                // Title sponsors and major sponsors get higher levels
                let sponsorshipType;
                let sponsorshipLevel;
                
                if (i === 0 && isMajorEvent) {
                    sponsorshipType = Math.random() < 0.7 ? 'Title Sponsor' : 'Presenting Sponsor';
                    sponsorshipLevel = 'Gold';
                } else if (i === 0) {
                    sponsorshipType = 'Major Sponsor';
                    sponsorshipLevel = Math.random() < 0.6 ? 'Gold' : 'Silver';
                } else if (i === 1 && isMajorEvent) {
                    sponsorshipType = 'Major Sponsor';
                    sponsorshipLevel = Math.random() < 0.5 ? 'Silver' : 'Bronze';
                } else {
                    const types = ['Supporting Sponsor', 'Official Sponsor', 'Community Partner'];
                    sponsorshipType = types[Math.floor(Math.random() * types.length)];
                    sponsorshipLevel = Math.random() < 0.3 ? 'Bronze' : 'Supporting';
                }
                
                // Generate sponsorship values for carnivals
                const carnivalValues = {
                    'Gold': { min: 3000, max: 12000 },
                    'Silver': { min: 1000, max: 5000 },
                    'Bronze': { min: 300, max: 1500 },
                    'Supporting': { min: 100, max: 500 }
                };
                
                const valueRange = carnivalValues[sponsorshipLevel];
                const sponsorshipValue = Math.floor(
                    Math.random() * (valueRange.max - valueRange.min) + valueRange.min
                );
                
                const benefits = this.generateCarnivalBenefits(sponsorshipLevel, sponsorshipType);
                
                await CarnivalSponsor.create({
                    carnivalId: carnival.id,
                    sponsorId: sponsor.id,
                    sponsorshipType: sponsorshipType,
                    sponsorshipLevel: sponsorshipLevel,
                    sponsorshipValue: sponsorshipValue,
                    benefits: benefits,
                    isActive: true,
                    notes: `Seeded relationship - ${sponsorshipType} (${sponsorshipLevel})`
                });
                
                totalLinks++;
            }
        }
        
        console.log(`✅ Created ${totalLinks} carnival-sponsor relationships`);
    }

    /**
     * Link clubs to carnivals as attendees with realistic registration data
     * @returns {Promise<Array>} Created carnival club registrations
     */
    async linkClubsToCarnivals() {
        console.log('🎪 Registering clubs as carnival attendees...');
        
        let totalRegistrations = 0;
        const carnivalClubs = [];
        
        // Process each carnival to add realistic club attendance
        for (const carnival of this.createdEntities.carnivals) {
            // Skip past events (older than 3 months ago) - limited attendees for historical data
            const threeMonthsAgo = new Date();
            threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
            
            const isPastEvent = carnival.date < threeMonthsAgo;
            const isUpcomingEvent = carnival.date > new Date();
            
            // Determine number of attending clubs based on carnival type and timing
            let minClubs, maxClubs;
            
            if (carnival.title.includes('Grand Final') || carnival.title.includes('Championship')) {
                minClubs = isPastEvent ? 4 : 8;
                maxClubs = isPastEvent ? 8 : 16;
            } else if (carnival.title.includes('Cup') || carnival.title.includes('Carnival')) {
                minClubs = isPastEvent ? 3 : 5;
                maxClubs = isPastEvent ? 6 : 12;
            } else {
                minClubs = isPastEvent ? 2 : 3;
                maxClubs = isPastEvent ? 5 : 8;
            }
            
            const numAttendees = Math.floor(Math.random() * (maxClubs - minClubs + 1)) + minClubs;
            
            // Get potential attending clubs - prefer same state with some interstate
            // Exclude the hosting club from attendees
            const hostingClubId = carnival.clubId; // Get the host club ID from the carnival record
            const localClubs = this.createdEntities.clubs.filter(club => 
                club.state === carnival.state && club.isPubliclyListed && club.id !== hostingClubId
            );
            const interstateClubs = this.createdEntities.clubs.filter(club => 
                club.state !== carnival.state && club.isPubliclyListed && club.id !== hostingClubId
            );
            
            const selectedClubs = [];
            
            // 75% local clubs, 25% interstate for major events
            const localCount = Math.ceil(numAttendees * 0.75);
            const interstateCount = numAttendees - localCount;
            
            // Select local clubs
            const availableLocalClubs = [...localClubs];
            for (let i = 0; i < localCount && availableLocalClubs.length > 0; i++) {
                const randomIndex = Math.floor(Math.random() * availableLocalClubs.length);
                const selectedClub = availableLocalClubs.splice(randomIndex, 1)[0];
                selectedClubs.push(selectedClub);
            }
            
            // Select interstate clubs for major events
            const availableInterstateClubs = [...interstateClubs];
            for (let i = 0; i < interstateCount && availableInterstateClubs.length > 0; i++) {
                const randomIndex = Math.floor(Math.random() * availableInterstateClubs.length);
                const selectedClub = availableInterstateClubs.splice(randomIndex, 1)[0];
                selectedClubs.push(selectedClub);
            }
            
            // Create realistic registrations for each attending club
            for (let i = 0; i < selectedClubs.length; i++) {
                const club = selectedClubs[i];
                
                // Generate registration date (1-60 days before carnival)
                const registrationDate = new Date(carnival.date);
                const daysBeforeEvent = Math.floor(Math.random() * 60) + 1;
                registrationDate.setDate(registrationDate.getDate() - daysBeforeEvent);
                
                // Team name variations
                const teamNames = [
                    null, // Use club name
                    `${club.clubName.split(' ')[0]} Warriors`,
                    `${club.clubName.split(' ')[0]} Legends`,
                    `${club.clubName.split(' ')[0]} Masters`,
                    `${club.location} ${club.clubName.split(' ')[club.clubName.split(' ').length - 1]}`,
                ];
                const teamName = Math.random() < 0.3 ? teamNames[Math.floor(Math.random() * teamNames.length)] : null;
                
                // Player count (realistic for masters teams)
                const playerCount = Math.floor(Math.random() * 8) + 13; // 13-20 players
                
                // Contact person
                const contactPerson = club.contactPerson || 'Team Manager';
                const contactEmail = club.contactEmail || `team@${club.clubName.toLowerCase().replace(/\s+/g, '')}.com.au`;
                const contactPhone = club.contactPhone || this.generatePhoneNumber();
                
                // Special requirements (20% of teams have special requirements)
                const specialRequirements = Math.random() < 0.2 ? this.generateSpecialRequirements() : null;
                
                // Registration notes (30% have notes)
                const registrationNotes = Math.random() < 0.3 ? this.generateRegistrationNotes(club, carnival) : null;
                
                // Payment details
                const registrationFees = {
                    'Grand Final': { min: 120, max: 200 },
                    'Championship': { min: 100, max: 180 },
                    'Cup': { min: 80, max: 150 },
                    'Carnival': { min: 70, max: 120 },
                    'Tournament': { min: 60, max: 100 },
                    'Festival': { min: 50, max: 90 },
                    'Derby': { min: 80, max: 130 }
                };
                
                let feeRange = { min: 60, max: 100 }; // Default
                for (const [eventType, range] of Object.entries(registrationFees)) {
                    if (carnival.title.includes(eventType)) {
                        feeRange = range;
                        break;
                    }
                }
                
                const paymentAmount = Math.floor(Math.random() * (feeRange.max - feeRange.min + 1)) + feeRange.min;
                
                // Payment status - past events are mostly paid, future events have mixed status
                let isPaid;
                let paymentDate = null;
                
                if (isPastEvent) {
                    isPaid = Math.random() < 0.95; // 95% of past events are paid
                } else if (isUpcomingEvent) {
                    isPaid = Math.random() < 0.6; // 60% of future events are already paid
                } else {
                    isPaid = Math.random() < 0.8; // 80% of recent events are paid
                }
                
                if (isPaid) {
                    paymentDate = new Date(registrationDate);
                    paymentDate.setDate(paymentDate.getDate() + Math.floor(Math.random() * 14)); // Paid within 2 weeks of registration
                }
                
                // Create the carnival-club registration
                const carnivalClub = await CarnivalClub.create({
                    carnivalId: carnival.id,
                    clubId: club.id,
                    registrationDate: registrationDate,
                    teamName: teamName,
                    playerCount: playerCount,
                    contactPerson: contactPerson,
                    contactEmail: contactEmail,
                    contactPhone: contactPhone,
                    specialRequirements: specialRequirements,
                    registrationNotes: registrationNotes,
                    paymentAmount: paymentAmount,
                    isPaid: isPaid,
                    paymentDate: paymentDate,
                    isActive: true
                });
                
                carnivalClubs.push(carnivalClub);
                totalRegistrations++;
            }
        }
        
        console.log(`✅ Created ${totalRegistrations} club-carnival registrations`);
        return carnivalClubs;
    }

    /**
     * Generate enhanced summary statistics including player data
     * @returns {Promise<Object>} Summary statistics
     */
    async generateEnhancedSummary() {
        const stats = {
            clubs: await Club.count({ where: { isActive: true } }),
            users: await User.count({ where: { isActive: true } }),
            players: await ClubPlayer.count({ where: { isActive: true } }),
            carnivals: await Carnival.count({ where: { isActive: true } }),
            manualCarnivals: await Carnival.count({ where: { isManuallyEntered: true, isActive: true } }),
            mySidelineCarnivals: await Carnival.count({ where: { isManuallyEntered: false, isActive: true } }),
            subscriptions: await EmailSubscription.count({ where: { isActive: true } }),
            sponsors: await Sponsor.count({ where: { isActive: true } }),
            carnivalSponsors: await CarnivalSponsor.count({ where: { isActive: true } }),
            carnivalRegistrations: await CarnivalClub.count({ where: { isActive: true } }),
            paidRegistrations: await CarnivalClub.count({ where: { isPaid: true, isActive: true } }),
            playerAssignments: await CarnivalClubPlayer.count({ where: { isActive: true } }),
            upcomingCarnivals: await Carnival.count({ 
                where: { 
                    date: { [Op.gte]: new Date() }, 
                    isActive: true 
                }
            })
        };

        // Calculate player age statistics
        const playerAgeStats = await sequelize.query(`
            SELECT 
                COUNT(*) as total,
                SUM(CASE WHEN (julianday('now') - julianday(dateOfBirth))/365.25 >= 35 THEN 1 ELSE 0 END) as mastersEligible,
                AVG((julianday('now') - julianday(dateOfBirth))/365.25) as averageAge,
                MIN((julianday('now') - julianday(dateOfBirth))/365.25) as youngestAge,
                MAX((julianday('now') - julianday(dateOfBirth))/365.25) as oldestAge
            FROM club_players 
            WHERE isActive = 1
        `, { type: sequelize.QueryTypes.SELECT });

        const ageStats = playerAgeStats[0];

        console.log('\n📊 DATABASE SEEDING SUMMARY');
        console.log('=' .repeat(50));
        console.log(`👥 Users: ${stats.users} (including admin)`);
        console.log(`🏢 Clubs: ${stats.clubs}`);
        console.log(`🏃 Players: ${stats.players}`);
        console.log(`   ✅ Masters Eligible (35+): ${ageStats.mastersEligible} (${Math.round((ageStats.mastersEligible / ageStats.total) * 100)}%)`);
        console.log(`   📊 Age Range: ${Math.round(ageStats.youngestAge)} - ${Math.round(ageStats.oldestAge)} years`);
        console.log(`   📈 Average Age: ${Math.round(ageStats.averageAge)} years`);
        console.log(`🤝 Sponsors: ${stats.sponsors}`);
        console.log(`🔗 Club-Sponsor Relationships: ${stats.clubSponsors}`);
        console.log(`🎪 Total Carnivals: ${stats.carnivals}`);
        console.log(`   ✏️  Manual: ${stats.manualCarnivals}`);
        console.log(`   🔄 MySideline: ${stats.mySidelineCarnivals}`);
        console.log(`🎪 Carnival-Sponsor Relationships: ${stats.carnivalSponsors}`);
        console.log(`🎟️ Carnival Registrations: ${stats.carnivalRegistrations}`);
        console.log(`   💰 Paid: ${stats.paidRegistrations}`);
        console.log(`   ⏳ Pending: ${stats.carnivalRegistrations - stats.paidRegistrations}`);
        console.log(`🏃 Player-Carnival Assignments: ${stats.playerAssignments}`);
        console.log(`   📊 Average per Registration: ${Math.round(stats.playerAssignments / stats.carnivalRegistrations)} players`);
        console.log(`📧 Email Subscriptions: ${stats.subscriptions}`);
        console.log(`📅 Upcoming Carnivals: ${stats.upcomingCarnivals}`);
        console.log('=' .repeat(50));
        
        return stats;
    }

    /**
     * Generate realistic contract details for club sponsorships
     * @param {string} level - Sponsorship level
     * @param {string} businessType - Type of business
     * @returns {string} Contract details
     */
    generateContractDetails(level, businessType) {
        const details = [];
        
        // Base benefits by level
        switch (level) {
            case 'Gold':
                details.push('Logo on playing jerseys');
                details.push('Stadium signage');
                details.push('Website homepage feature');
                details.push('Social media promotion');
                details.push('VIP match day hospitality');
                break;
            case 'Silver':
                details.push('Logo on training gear');
                details.push('Dugout signage');
                details.push('Website sponsor page');
                details.push('Social media mentions');
                break;
            case 'Bronze':
                details.push('Ground signage');
                details.push('Website listing');
                details.push('Newsletter mentions');
                break;
            case 'Supporting':
                details.push('Website listing');
                details.push('Match day announcements');
                break;
        }
        
        // Add business-specific benefits
        if (businessType.includes('Food') || businessType.includes('Restaurant')) {
            details.push('Post-match catering opportunities');
        }
        if (businessType.includes('Automotive')) {
            details.push('Vehicle display opportunities');
        }
        if (businessType.includes('Healthcare') || businessType.includes('Fitness')) {
            details.push('Player injury support services');
        }
        
        return details.join('; ');
    }

    /**
     * Generate realistic benefits for carnival sponsorships
     * @param {string} level - Sponsorship level
     * @param {string} type - Sponsorship type
     * @returns {string} Benefits description
     */
    generateCarnivalBenefits(level, type) {
        const benefits = [];
        
        if (type === 'Title Sponsor') {
            benefits.push('Event naming rights');
            benefits.push('Logo on all event materials');
            benefits.push('Opening ceremony presentation');
            benefits.push('Trophy presentation rights');
            benefits.push('Premium hospitality package');
        } else if (type === 'Presenting Sponsor') {
            benefits.push('Logo on event materials');
            benefits.push('Ground announcements');
            benefits.push('Hospitality package');
            benefits.push('Social media promotion');
        } else if (type === 'Major Sponsor') {
            benefits.push('Ground signage');
            benefits.push('Program advertising');
            benefits.push('Website promotion');
            benefits.push('Public announcements');
        } else {
            benefits.push('Website listing');
            benefits.push('Program mention');
            if (Math.random() < 0.5) {
                benefits.push('Ground signage');
            }
        }
        
        return benefits.join('; ');
    }

    /**
     * Generate realistic special requirements for teams
     * @returns {string} Special requirements
     */
    generateSpecialRequirements() {
        const requirements = [
            'Wheelchair accessibility required for one player',
            'Early departure needed - must finish by 4:00 PM',
            'Medical officer on standby required for player with heart condition',
            'Parking for team bus required',
            'Late arrival - team arriving after 10:00 AM',
            'Photography restrictions - no social media photos of certain players',
            'Temperature controlled changing rooms needed',
            'Injury support - physiotherapy services required',
            'Medication storage - refrigeration required for player medications'
        ];
        
        return requirements[Math.floor(Math.random() * requirements.length)];
    }

    /**
     * Generate realistic registration notes for internal use
     * @param {Object} club - Club object
     * @param {Object} carnival - Carnival object
     * @returns {string} Registration notes
     */
    generateRegistrationNotes(club, carnival) {
        const notes = [
            `Strong team this year - won ${club.state} championship last season`,
            'New club to the competition - first time attending',
            'Regular attendees - 5th consecutive year participating',
            'Late registration due to player availability issues',
            'Traveling team - accommodation assistance provided',
            'Club celebrating 25th anniversary this year',
            'Merged team with local rival club due to numbers',
            'Young masters team - most players aged 35-40',
            'Veteran team - experienced players, competitive group',
            'Social players - here for fun and camaraderie',
            'Former NRL players in the squad',
            'Club fundraising for new jerseys through tournament',
            'Interstate rivals - traditional rivalry with host club',
            'Weather-dependent attendance - may withdraw if conditions poor',
            'Sponsored team - major local business backing'
        ];
        
        return notes[Math.floor(Math.random() * notes.length)];
    }

    /**
     * Generate realistic Australian phone numbers
     * @returns {string} Formatted phone number
     */
    generatePhoneNumber() {
        const areaCodes = ['02', '03', '07', '08'];
        const mobilePrefix = '04';
        
        // 70% mobile, 30% landline
        if (Math.random() < 0.7) {
            // Mobile number
            const remainder = Math.floor(Math.random() * 100000000).toString().padStart(8, '0');
            return `${mobilePrefix}${remainder.substring(0, 2)} ${remainder.substring(2, 5)} ${remainder.substring(5, 8)}`;
        } else {
            // Landline number
            const areaCode = areaCodes[Math.floor(Math.random() * areaCodes.length)];
            const number = Math.floor(Math.random() * 100000000).toString().padStart(8, '0');
            return `(${areaCode}) ${number.substring(0, 4)} ${number.substring(4, 8)}`;
        }
    }

    /**
     * Run the complete seeding process with enhanced safety checks
     * @returns {Promise<void>}
     */
    async seed() {
        console.log('🌱 Starting database seeding process...\n');
        
        try {
            // Multiple environment validation checkpoints
            console.log('🛡️  SECURITY CHECKPOINT 1: Initial validation');
            await validateEnvironment();
            
            await this.connect();
            
            console.log('🛡️  SECURITY CHECKPOINT 2: Pre-clear validation');
            await validateEnvironment();
            
            // Choose clearing method based on command line flag
            const fullWipe = process.argv.includes('--full-wipe');
            
            try {
                if (fullWipe) {
                    console.log('⚠️  FULL WIPE MODE: Not implemented - use manual database deletion');
                    throw new Error('Full wipe mode not implemented in modular version');
                } else {
                    console.log('🎯 SELECTIVE MODE: Clearing only seed data');
                    await this.cleanupService.clearSeedData();
                }
                
                console.log('🛡️  SECURITY CHECKPOINT 4: Pre-seed validation');
                await validateEnvironment();
                
                // Proceed with seeding using modular services
                this.createdEntities.clubs = await this.basicSeedingService.createClubs();
                this.createdEntities.users = await this.basicSeedingService.createUsers();
                await this.playerSeedingService.createClubPlayers(this.createdEntities.clubs);
                this.createdEntities.sponsors = await this.basicSeedingService.createSponsors();
                this.createdEntities.carnivals = await this.basicSeedingService.createManualCarnivals();
                await this.linkSponsorsToCarnivals();
                const carnivalClubs = await this.linkClubsToCarnivals();
                await this.playerSeedingService.linkPlayersToCarnivals(carnivalClubs);
                await this.basicSeedingService.importMySidelineData();
                await this.basicSeedingService.createEmailSubscriptions();
                
                // Update summary to include player statistics
                await this.generateEnhancedSummary();
                
                console.log('\n✅ Database seeding completed successfully');
                
                console.log('\n🔐 Login credentials:');
                console.log('   Admin: admin@oldmanfooty.au / Admin123!');
                
            } catch (seedingError) {
                console.error('\n❌ Seeding process failed:', seedingError.message);
                throw seedingError;
            }
            
        } catch (error) {
            console.error('\n💥 Database seeding failed:', error);
            throw error;
        } finally {
            await sequelize.close();
            console.log('\n🔌 Database connection closed');
        }
    }
}

// Use a robust check for direct script execution (works cross-platform and with npm run)
const scriptName = path.basename(import.meta.url);
const invokedName = process.argv[1] ? path.basename(process.argv[1]) : '';
if (scriptName === invokedName) {
    // Display safety warning with updated information
    console.log('\n' + '⚠️ '.repeat(20));
    console.log('🚨 DATABASE SEEDING SCRIPT - SELECTIVE OPERATION');
    console.log('⚠️ '.repeat(20));
    console.log('DEFAULT: Clears only SEED data, preserves real user data');
    console.log('Only run this on DEVELOPMENT or TEST databases');
    console.log('Required flag: --confirm-seed');
    console.log('');
    console.log('Usage examples:');
    console.log('  npm run seed -- --confirm-seed                (selective clearing)');
    console.log('⚠️ '.repeat(20) + '\n');
    const seeder = new DatabaseSeeder();
    seeder.seed()
        .then(() => {
            console.log('\n🎉 Seeding process completed safely!');
            process.exit(0);
        })
        .catch((error) => {
            console.error('\n💥 Seeding process failed:', error.message);
            process.exit(1);
        });
}

export default DatabaseSeeder;