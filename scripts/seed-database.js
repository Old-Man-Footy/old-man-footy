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
    { 
        name: 'Canterbury Bankstown Masters', 
        state: 'NSW', 
        location: 'Belmore', 
        isPubliclyListed: true, 
        logoUrl: '/icons/seed.svg',
        contactPerson: 'Michael Thompson',
        contactEmail: 'contact@canterburymasters.com.au',
        contactPhone: '(02) 9759 3456',
        description: 'Founded in 1985, Canterbury Bankstown Masters is one of NSW\'s premier rugby league clubs for players over 35. We pride ourselves on mateship, fair play, and keeping the game alive for experienced players.',
        website: 'https://www.canterburymasters.com.au',
        facebookUrl: 'https://facebook.com/canterburymasters',
        instagramUrl: 'https://instagram.com/canterburymasters',
        twitterUrl: 'https://x.com/canterburymasters'
    },
    { 
        name: 'Parramatta Eels Masters', 
        state: 'NSW', 
        location: 'Parramatta', 
        isPubliclyListed: true, 
        logoUrl: '/icons/seed.svg',
        contactPerson: 'David Wilson',
        contactEmail: 'info@parramattamasters.com.au',
        contactPhone: '(02) 9630 7890',
        description: 'The Blue and Gold tradition continues with Parramatta Eels Masters. Established in 1990, we welcome players aged 35+ who want to continue their rugby league journey in a competitive yet friendly environment.',
        website: 'https://www.parramattamasters.com.au',
        facebookUrl: 'https://facebook.com/parramattamasters',
        instagramUrl: 'https://instagram.com/parramattamasters'
    },
    { 
        name: 'Cronulla Sharks Masters', 
        state: 'NSW', 
        location: 'Cronulla', 
        isPubliclyListed: true, 
        logoUrl: '/icons/seed.svg',
        contactPerson: 'James Mitchell',
        contactEmail: 'secretary@cronullamasters.com.au',
        contactPhone: '(02) 9523 4567',
        description: 'Located in the heart of the Shire, Cronulla Sharks Masters offers beach-side rugby league for mature players. Join us for competitive games and post-match gatherings at our licensed club.',
        website: 'https://www.cronullamasters.com.au',
        facebookUrl: 'https://facebook.com/cronullamasters',
        twitterUrl: 'https://x.com/cronullamasters'
    },
    { 
        name: 'Brisbane Broncos Masters', 
        state: 'QLD', 
        location: 'Brisbane', 
        isPubliclyListed: true, 
        logoUrl: '/icons/seed.svg',
        contactPerson: 'Sarah Johnson',
        contactEmail: 'admin@brisbanemasters.com.au',
        contactPhone: '(07) 3856 1234',
        description: 'Brisbane Broncos Masters carries on the proud tradition of Queensland rugby league. We field teams in multiple age divisions and host one of the state\'s largest masters carnivals.',
        website: 'https://www.brisbanemasters.com.au',
        facebookUrl: 'https://facebook.com/brisbanemasters',
        instagramUrl: 'https://instagram.com/brisbanemasters',
        twitterUrl: 'https://x.com/brisbanemasters'
    },
    { 
        name: 'Gold Coast Titans Masters', 
        state: 'QLD', 
        location: 'Gold Coast', 
        isPubliclyListed: true, 
        logoUrl: '/icons/seed.svg',
        contactPerson: 'Mark Stevens',
        contactEmail: 'contact@gctitansmasters.com.au',
        contactPhone: '(07) 5592 8765',
        description: 'The newest addition to Queensland masters rugby league, Gold Coast Titans Masters welcomes players from across South East Queensland for fun, fitness, and friendship.',
        facebookUrl: 'https://facebook.com/gctitansmasters',
        instagramUrl: 'https://instagram.com/gctitansmasters'
    },
    { 
        name: 'North Queensland Cowboys Masters', 
        state: 'QLD', 
        location: 'Townsville', 
        isPubliclyListed: true, 
        logoUrl: '/icons/seed.svg',
        contactPerson: 'Tony Richards',
        contactEmail: 'secretary@nqcowboysmasters.com.au',
        contactPhone: '(07) 4721 5432',
        description: 'Representing the far north, NQ Cowboys Masters brings together players from across tropical Queensland. We\'re known for our hospitality and competitive spirit.',
        website: 'https://www.nqcowboysmasters.com.au',
        facebookUrl: 'https://facebook.com/nqcowboysmasters'
    },
    { 
        name: 'Melbourne Storm Masters', 
        state: 'VIC', 
        location: 'Melbourne', 
        isPubliclyListed: true, 
        logoUrl: '/icons/seed.svg',
        contactPerson: 'Peter Anderson',
        contactEmail: 'info@melbournemasters.com.au',
        contactPhone: '(03) 9652 3456',
        description: 'Melbourne Storm Masters is the premier rugby league masters club in Victoria. We welcome players from all backgrounds and skill levels aged 35 and over.',
        website: 'https://www.melbournemasters.com.au',
        facebookUrl: 'https://facebook.com/melbournemasters',
        instagramUrl: 'https://instagram.com/melbournemasters',
        twitterUrl: 'https://x.com/melbournemasters'
    },
    { 
        name: 'Geelong Masters Rugby League', 
        state: 'VIC', 
        location: 'Geelong', 
        isPubliclyListed: true, 
        logoUrl: '/icons/seed.svg',
        contactPerson: 'Robert Clark',
        contactEmail: 'contact@geelongmasters.com.au',
        contactPhone: '(03) 5248 7890',
        description: 'Serving the Geelong region and surrounding areas, our club focuses on maintaining fitness, friendship, and the rugby league tradition for players over 35.',
        facebookUrl: 'https://facebook.com/geelongmasters',
        instagramUrl: 'https://instagram.com/geelongmasters'
    },
    { 
        name: 'Perth Pirates Masters', 
        state: 'WA', 
        location: 'Perth', 
        isPubliclyListed: true, 
        logoUrl: '/icons/seed.svg',
        contactPerson: 'Chris Walker',
        contactEmail: 'admin@perthpirates.com.au',
        contactPhone: '(08) 9321 4567',
        description: 'Perth Pirates Masters is Western Australia\'s foundation masters rugby league club. We\'ve been keeping the game alive in WA since 1988.',
        website: 'https://www.perthpirates.com.au',
        facebookUrl: 'https://facebook.com/perthpirates',
        twitterUrl: 'https://x.com/perthpirates'
    },
    { 
        name: 'Fremantle Dockers Masters', 
        state: 'WA', 
        location: 'Fremantle', 
        isPubliclyListed: true, 
        logoUrl: '/icons/seed.svg',
        contactPerson: 'Andrew Taylor',
        contactEmail: 'secretary@fremantlemasters.com.au',
        contactPhone: '(08) 9433 2109',
        description: 'Based in the historic port city of Fremantle, our club welcomes masters players from across the Perth metropolitan area for competitive rugby league.',
        facebookUrl: 'https://facebook.com/fremantlemasters',
        instagramUrl: 'https://instagram.com/fremantlemasters'
    },
    { 
        name: 'Adelaide Rams Masters', 
        state: 'SA', 
        location: 'Adelaide', 
        isPubliclyListed: true, 
        logoUrl: '/icons/seed.svg',
        contactPerson: 'Steven Brown',
        contactEmail: 'contact@adelaiderams.com.au',
        contactPhone: '(08) 8234 5678',
        description: 'Adelaide Rams Masters represents South Australia in the national masters rugby league community. We pride ourselves on sportsmanship and community involvement.',
        website: 'https://www.adelaiderams.com.au',
        facebookUrl: 'https://facebook.com/adelaiderams',
        instagramUrl: 'https://instagram.com/adelaiderams'
    },
    { 
        name: 'Port Adelaide Masters', 
        state: 'SA', 
        location: 'Port Adelaide', 
        isPubliclyListed: false, 
        logoUrl: '/icons/seed.svg',
        contactPerson: 'Daniel Power',
        contactEmail: 'admin@portmasters.com.au',
        contactPhone: '(08) 8447 3210',
        description: 'A close-knit club serving the Port Adelaide community. Currently building our membership before becoming publicly listed.',
        facebookUrl: 'https://facebook.com/portmasters'
    },
    { 
        name: 'Hobart Devils Masters', 
        state: 'TAS', 
        location: 'Hobart', 
        isPubliclyListed: true, 
        logoUrl: '/icons/seed.svg',
        contactPerson: 'Michelle Green',
        contactEmail: 'secretary@hobartdevils.com.au',
        contactPhone: '(03) 6234 8901',
        description: 'Tasmania\'s premier masters rugby league club, welcoming players from across the state. We host the annual Island Championship.',
        website: 'https://www.hobartdevils.com.au',
        facebookUrl: 'https://facebook.com/hobartdevils'
    },
    { 
        name: 'Launceston Lions Masters', 
        state: 'TAS', 
        location: 'Launceston', 
        isPubliclyListed: true, 
        logoUrl: '/icons/seed.svg',
        contactPerson: 'John Campbell',
        contactEmail: 'info@launcestonlions.com.au',
        contactPhone: '(03) 6331 7654',
        description: 'Representing northern Tasmania, the Lions are known for their fierce competition and warm hospitality. All skill levels welcome.',
        facebookUrl: 'https://facebook.com/launcestonlions',
        twitterUrl: 'https://x.com/launcestonlions'
    },
    { 
        name: 'Darwin Crocodiles Masters', 
        state: 'NT', 
        location: 'Darwin', 
        isPubliclyListed: true, 
        logoUrl: '/icons/seed.svg',
        contactPerson: 'Terry Robinson',
        contactEmail: 'contact@darwincrocs.com.au',
        contactPhone: '(08) 8922 1357',
        description: 'The Top End\'s only masters rugby league club. We adapt our game schedule to the tropical climate and welcome visiting teams year-round.',
        website: 'https://www.darwincrocs.com.au',
        facebookUrl: 'https://facebook.com/darwincrocs',
        instagramUrl: 'https://instagram.com/darwincrocs'
    },
    { 
        name: 'Canberra Raiders Masters', 
        state: 'ACT', 
        location: 'Canberra', 
        isPubliclyListed: true, 
        logoUrl: '/icons/seed.svg',
        contactPerson: 'Lisa Wilson',
        contactEmail: 'admin@canberramasters.com.au',
        contactPhone: '(02) 6247 8642',
        description: 'The nation\'s capital club, drawing players from Canberra and surrounding NSW regions. We host the annual Capital Cup tournament.',
        website: 'https://www.canberramasters.com.au',
        facebookUrl: 'https://facebook.com/canberramasters',
        instagramUrl: 'https://instagram.com/canberramasters',
        twitterUrl: 'https://x.com/canberramasters'
    }
];

/**
 * Sample carnival data for testing - diverse across all states
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
        socialMediaInstagram: 'https://instagram.com/nswmasters',
        clubLogoURL: '/icons/seed.svg'
    },
    {
        title: 'Cronulla Beach Masters Tournament',
        date: new Date('2025-08-10'),
        state: 'NSW',
        locationAddress: 'Sharks Park, Cronulla NSW 2230',
        scheduleDetails: 'Beach-side tournament with modified touch rules. 10:00 AM start, BBQ lunch included.',
        organiserContactName: 'Steve Rogers',
        organiserContactEmail: 'steve.rogers@cronullamasters.com.au',
        organiserContactPhone: '0423 111 222',
        registrationLink: 'https://www.cronullamasters.com.au/beach-tournament',
        feesDescription: 'Team entry: $120. Individual players: $30.',
        socialMediaFacebook: 'https://facebook.com/cronullamasters',
        socialMediaWebsite: 'https://www.cronullamasters.com.au',
        clubLogoURL: '/icons/seed.svg'
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
        socialMediaWebsite: 'https://www.qldmasters.com.au',
        clubLogoURL: '/icons/seed.svg'
    },
    {
        title: 'Gold Coast Summer Festival',
        date: new Date('2025-12-28'),
        state: 'QLD',
        locationAddress: 'Cbus Super Stadium, Robina QLD 4226',
        scheduleDetails: 'Holiday season festival with family activities. Games run from 9:00 AM to 5:00 PM.',
        organiserContactName: 'Mark Thompson',
        organiserContactEmail: 'mark.thompson@gcmasters.com.au',
        organiserContactPhone: '0434 222 333',
        registrationLink: 'https://www.gcmasters.com.au/summer-festival',
        feesDescription: 'Entry: $80 per team. Kids activities included.',
        socialMediaInstagram: 'https://instagram.com/gcmasters',
        socialMediaTwitter: 'https://twitter.com/gcmasters',
        clubLogoURL: '/icons/seed.svg'
    },
    {
        title: 'North Queensland Cowboys Heritage Cup',
        date: new Date('2025-07-15'),
        state: 'QLD',
        locationAddress: 'Queensland Country Bank Stadium, Townsville QLD 4810',
        scheduleDetails: 'Heritage round celebrating rugby league history. Traditional jerseys encouraged.',
        organiserContactName: 'Jim Richards',
        organiserContactEmail: 'jim.richards@nqmasters.com.au',
        organiserContactPhone: '0445 333 444',
        registrationLink: 'https://www.nqmasters.com.au/heritage-cup',
        feesDescription: 'Team registration: $140. Museum tour included.',
        callForVolunteers: 'Looking for heritage display volunteers and photographers.',
        socialMediaWebsite: 'https://www.nqmasters.com.au',
        clubLogoURL: '/icons/seed.svg'
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
        socialMediaTwitter: 'https://twitter.com/vicmasters',
        clubLogoURL: '/icons/seed.svg'
    },
    {
        title: 'Geelong Waterfront Masters Cup',
        date: new Date('2025-10-12'),
        state: 'VIC',
        locationAddress: 'Kardinia Park, Geelong VIC 3220',
        scheduleDetails: 'Scenic waterfront tournament with post-game festivities. 9:00 AM to 6:00 PM.',
        organiserContactName: 'Paul Anderson',
        organiserContactEmail: 'paul.anderson@geelongmasters.com.au',
        organiserContactPhone: '0456 444 555',
        registrationLink: 'https://www.geelongmasters.com.au/waterfront-cup',
        feesDescription: 'Entry: $160 per team. Evening dinner optional ($35pp).',
        socialMediaFacebook: 'https://facebook.com/geelongmasters',
        socialMediaInstagram: 'https://instagram.com/geelongmasters',
        clubLogoURL: '/icons/seed.svg'
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
        socialMediaWebsite: 'https://www.wamasters.com.au',
        clubLogoURL: '/icons/seed.svg'
    },
    {
        title: 'Fremantle Dockers Masters Derby',
        date: new Date('2025-09-28'),
        state: 'WA',
        locationAddress: 'Fremantle Oval, Fremantle WA 6160',
        scheduleDetails: 'Local derby with traditional rivalries. Morning games followed by presentation lunch.',
        organiserContactName: 'Tony Walsh',
        organiserContactEmail: 'tony.walsh@fremantlemasters.com.au',
        organiserContactPhone: '0467 555 666',
        registrationLink: 'https://www.fremantlemasters.com.au/derby2025',
        feesDescription: 'Team entry: $130. Lunch included for all participants.',
        socialMediaFacebook: 'https://facebook.com/fremantlemasters',
        clubLogoURL: '/icons/seed.svg'
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
        feesDescription: 'Entry: $120 per team. Trophy presentation at 5:00 PM.',
        clubLogoURL: '/icons/seed.svg'
    },
    {
        title: 'Port Adelaide Heritage Carnival',
        date: new Date('2025-11-14'),
        state: 'SA',
        locationAddress: 'Alberton Oval, Port Adelaide SA 5015',
        scheduleDetails: 'Heritage-themed carnival celebrating club history. Vintage uniforms encouraged.',
        organiserContactName: 'Robert Power',
        organiserContactEmail: 'robert.power@portmasters.com.au',
        organiserContactPhone: '0478 666 777',
        registrationLink: 'https://www.portmasters.com.au/heritage2025',
        feesDescription: 'Team registration: $110. Heritage display entry free.',
        callForVolunteers: 'Seeking volunteers for heritage displays and photography.',
        socialMediaInstagram: 'https://instagram.com/portmasters',
        clubLogoURL: '/icons/seed.svg'
    },
    {
        title: 'Tasmania Devils Island Championship',
        date: new Date('2025-08-05'),
        state: 'TAS',
        locationAddress: 'Bellerive Oval, Hobart TAS 7018',
        scheduleDetails: 'Island-wide championship bringing together teams from across Tasmania.',
        organiserContactName: 'Andrew Clark',
        organiserContactEmail: 'andrew.clark@tasmasters.com.au',
        organiserContactPhone: '0489 777 888',
        registrationLink: 'https://www.tasmasters.com.au/island-championship',
        feesDescription: 'Entry: $90 per team. Ferry discounts available for visiting teams.',
        socialMediaFacebook: 'https://facebook.com/tasmasters',
        socialMediaWebsite: 'https://www.tasmasters.com.au',
        clubLogoURL: '/icons/seed.svg'
    },
    {
        title: 'Launceston Lions Northern Cup',
        date: new Date('2025-09-20'),
        state: 'TAS',
        locationAddress: 'York Park, Launceston TAS 7250',
        scheduleDetails: 'Northern Tasmania competition with interstate teams welcome. Two-day format.',
        organiserContactName: 'Karen Mitchell',
        organiserContactEmail: 'karen.mitchell@northerntasmasters.com.au',
        organiserContactPhone: '0491 888 999',
        registrationLink: 'https://www.northerntasmasters.com.au/northern-cup',
        feesDescription: 'Team entry: $100. Accommodation assistance available.',
        socialMediaTwitter: 'https://twitter.com/northerntasmasters',
        clubLogoURL: '/icons/seed.svg'
    },
    {
        title: 'Darwin Crocodiles Top End Tournament',
        date: new Date('2025-08-30'),
        state: 'NT',
        locationAddress: 'TIO Stadium, Darwin NT 0800',
        scheduleDetails: 'Unique Top End experience with modified heat rules. Early morning and evening games.',
        organiserContactName: 'Terry Johnson',
        organiserContactEmail: 'terry.johnson@ntmasters.com.au',
        organiserContactPhone: '0412 999 111',
        registrationLink: 'https://www.ntmasters.com.au/top-end-tournament',
        feesDescription: 'Entry: $85 per team. Heat management protocols included.',
        callForVolunteers: 'Need volunteers familiar with tropical weather protocols.',
        socialMediaFacebook: 'https://facebook.com/ntmasters',
        socialMediaWebsite: 'https://www.ntmasters.com.au',
        clubLogoURL: '/icons/seed.svg'
    },
    {
        title: 'Canberra Raiders Capital Cup',
        date: new Date('2025-07-05'),
        state: 'ACT',
        locationAddress: 'GIO Stadium, Canberra ACT 2617',
        scheduleDetails: 'National capital tournament featuring teams from surrounding regions.',
        organiserContactName: 'Michelle Green',
        organiserContactEmail: 'michelle.green@actmasters.com.au',
        organiserContactPhone: '0423 111 000',
        registrationLink: 'https://www.actmasters.com.au/capital-cup',
        feesDescription: 'Team registration: $140. Parliament House tour optional.',
        socialMediaInstagram: 'https://instagram.com/actmasters',
        socialMediaTwitter: 'https://twitter.com/actmasters',
        clubLogoURL: '/icons/seed.svg'
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
    }

    /**
     * Create test users and delegates using Sequelize
     */
    async createUsers() {
        console.log('👥 Creating test users...');
        
        // Create admin user
        const adminUser = await User.create({
            email: 'admin@oldmanfooty.com.au',
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
            console.log('   Admin: admin@oldmanfooty.com.au / admin123');
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