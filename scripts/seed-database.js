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
const { sequelize, User, Club, Carnival, EmailSubscription, Sponsor, ClubSponsor, CarnivalSponsor } = require('../models');
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

/**
 * Sample sponsor data for testing - diverse Australian businesses
 */
const SAMPLE_SPONSORS = [
    {
        sponsorName: 'Bunnings Warehouse',
        businessType: 'Hardware & Home Improvement',
        location: 'Multiple Locations',
        state: 'NSW',
        description: 'Australia\'s leading retailer of home improvement and outdoor living products. Supporting local rugby league communities since 1994.',
        contactPerson: 'Community Relations Team',
        contactEmail: 'community@bunnings.com.au',
        contactPhone: '1800 555 0001',
        website: 'https://www.bunnings.com.au',
        facebookUrl: 'https://facebook.com/Bunnings',
        instagramUrl: 'https://instagram.com/bunningswarehouse',
        twitterUrl: 'https://twitter.com/Bunnings',
        logoUrl: '/icons/seed.svg',
        sponsorshipLevel: 'Gold',
        isActive: true,
        isPubliclyVisible: true
    },
    {
        sponsorName: 'Coca-Cola Australia',
        businessType: 'Beverages',
        location: 'Sydney',
        state: 'NSW',
        description: 'Refreshing Australian communities for over 75 years. Proud supporters of grassroots sports and local clubs.',
        contactPerson: 'Sports Marketing',
        contactEmail: 'sports@coca-cola.com.au',
        contactPhone: '1800 555 0002',
        website: 'https://www.coca-cola.com.au',
        facebookUrl: 'https://facebook.com/CocaColaAustralia',
        instagramUrl: 'https://instagram.com/cocacolaau',
        twitterUrl: 'https://twitter.com/CocaColaAU',
        logoUrl: '/icons/seed.svg',
        sponsorshipLevel: 'Gold',
        isActive: true,
        isPubliclyVisible: true
    },
    {
        sponsorName: 'Toyota Australia',
        businessType: 'Automotive',
        location: 'Melbourne',
        state: 'VIC',
        description: 'Built for Australia. Toyota has been supporting Australian sport and communities for decades.',
        contactPerson: 'Community Partnerships',
        contactEmail: 'community@toyota.com.au',
        contactPhone: '1800 555 0003',
        website: 'https://www.toyota.com.au',
        facebookUrl: 'https://facebook.com/ToyotaAustralia',
        instagramUrl: 'https://instagram.com/toyotaaustralia',
        twitterUrl: 'https://twitter.com/ToyotaAustralia',
        logoUrl: '/icons/seed.svg',
        sponsorshipLevel: 'Gold',
        isActive: true,
        isPubliclyVisible: true
    },
    {
        sponsorName: 'Woolworths Group',
        businessType: 'Retail & Supermarkets',
        location: 'Sydney',
        state: 'NSW',
        description: 'Fresh food people. Supporting local communities and grassroots sports across Australia.',
        contactPerson: 'Community Investment',
        contactEmail: 'community@woolworths.com.au',
        contactPhone: '1800 555 0004',
        website: 'https://www.woolworthsgroup.com.au',
        facebookUrl: 'https://facebook.com/woolworths',
        instagramUrl: 'https://instagram.com/woolworths_au',
        twitterUrl: 'https://twitter.com/woolworths',
        logoUrl: '/icons/seed.svg',
        sponsorshipLevel: 'Gold',
        isActive: true,
        isPubliclyVisible: true
    },
    {
        sponsorName: 'ANZ Bank',
        businessType: 'Banking & Finance',
        location: 'Melbourne',
        state: 'VIC',
        description: 'We live in your world. ANZ is committed to supporting local communities and sporting excellence.',
        contactPerson: 'Corporate Sponsorship',
        contactEmail: 'sponsorship@anz.com',
        contactPhone: '1800 555 0005',
        website: 'https://www.anz.com.au',
        facebookUrl: 'https://facebook.com/ANZAustralia',
        instagramUrl: 'https://instagram.com/anz_au',
        twitterUrl: 'https://twitter.com/ANZ_AU',
        logoUrl: '/icons/seed.svg',
        sponsorshipLevel: 'Silver',
        isActive: true,
        isPubliclyVisible: true
    },
    {
        sponsorName: 'Harvey Norman',
        businessType: 'Electronics & Furniture',
        location: 'Sydney',
        state: 'NSW',
        description: 'Go Harvey Norman! Australia\'s leading electrical, computer, furniture and bedding retailer.',
        contactPerson: 'Marketing Department',
        contactEmail: 'marketing@harveynorman.com.au',
        contactPhone: '1800 555 0006',
        website: 'https://www.harveynorman.com.au',
        facebookUrl: 'https://facebook.com/HarveyNormanAU',
        instagramUrl: 'https://instagram.com/harveynormanau',
        logoUrl: '/icons/seed.svg',
        sponsorshipLevel: 'Silver',
        isActive: true,
        isPubliclyVisible: true
    },
    {
        sponsorName: 'Lions Construction Group',
        businessType: 'Construction',
        location: 'Brisbane',
        state: 'QLD',
        description: 'Building Queensland communities. Local construction company specializing in residential and commercial projects.',
        contactPerson: 'Mark Stevens',
        contactEmail: 'mark@lionsconstruction.com.au',
        contactPhone: '(07) 3123 4567',
        website: 'https://www.lionsconstruction.com.au',
        facebookUrl: 'https://facebook.com/lionsconstruction',
        logoUrl: '/icons/seed.svg',
        sponsorshipLevel: 'Bronze',
        isActive: true,
        isPubliclyVisible: true
    },
    {
        sponsorName: 'Sharks Electrical Services',
        businessType: 'Electrical Services',
        location: 'Cronulla',
        state: 'NSW',
        description: 'Your local electrical experts. Servicing the Shire for over 20 years with reliable, professional electrical services.',
        contactPerson: 'Tony Russo',
        contactEmail: 'tony@sharkselectrical.com.au',
        contactPhone: '(02) 9523 7890',
        website: 'https://www.sharkselectrical.com.au',
        facebookUrl: 'https://facebook.com/sharkselectrical',
        logoUrl: '/icons/seed.svg',
        sponsorshipLevel: 'Supporting',
        isActive: true,
        isPubliclyVisible: true
    },
    {
        sponsorName: 'Bunworthy Real Estate',
        businessType: 'Real Estate',
        location: 'Parramatta',
        state: 'NSW',
        description: 'Selling Sydney\'s West for 30 years. Family-owned real estate agency committed to exceptional service and community support.',
        contactPerson: 'Sarah Bunworthy',
        contactEmail: 'sarah@bunworthyrealestate.com.au',
        contactPhone: '(02) 9630 5678',
        website: 'https://www.bunworthyrealestate.com.au',
        facebookUrl: 'https://facebook.com/bunworthyrealestate',
        instagramUrl: 'https://instagram.com/bunworthyrealestate',
        logoUrl: '/icons/seed.svg',
        sponsorshipLevel: 'Supporting',
        isActive: true,
        isPubliclyVisible: true
    },
    {
        sponsorName: 'Melbourne Storm Plumbing',
        businessType: 'Plumbing Services',
        location: 'Melbourne',
        state: 'VIC',
        description: 'Professional plumbing services across Melbourne. Emergency callouts, renovations, and maintenance - we do it all.',
        contactPerson: 'Peter Storm',
        contactEmail: 'peter@stormplumbing.com.au',
        contactPhone: '(03) 9876 5432',
        website: 'https://www.stormplumbing.com.au',
        facebookUrl: 'https://facebook.com/stormplumbing',
        logoUrl: '/icons/seed.svg',
        sponsorshipLevel: 'Bronze',
        isActive: true,
        isPubliclyVisible: true
    },
    {
        sponsorName: 'Geelong Auto Parts',
        businessType: 'Automotive Parts',
        location: 'Geelong',
        state: 'VIC',
        description: 'Your one-stop shop for automotive parts and accessories. Serving Geelong and surrounding areas since 1995.',
        contactPerson: 'Robert Mitchell',
        contactEmail: 'robert@geelongautoparts.com.au',
        contactPhone: '(03) 5248 9012',
        website: 'https://www.geelongautoparts.com.au',
        facebookUrl: 'https://facebook.com/geelongautoparts',
        logoUrl: '/icons/seed.svg',
        sponsorshipLevel: 'Supporting',
        isActive: true,
        isPubliclyVisible: true
    },
    {
        sponsorName: 'Perth Pirates Fitness',
        businessType: 'Fitness & Gym',
        location: 'Perth',
        state: 'WA',
        description: 'Train like a champion. State-of-the-art fitness facility offering personal training, group classes, and sports conditioning.',
        contactPerson: 'Chris Walker',
        contactEmail: 'chris@piratesfitness.com.au',
        contactPhone: '(08) 9321 3456',
        website: 'https://www.piratesfitness.com.au',
        facebookUrl: 'https://facebook.com/piratesfitness',
        instagramUrl: 'https://instagram.com/piratesfitness',
        logoUrl: '/icons/seed.svg',
        sponsorshipLevel: 'Bronze',
        isActive: true,
        isPubliclyVisible: true
    },
    {
        sponsorName: 'Fremantle Fish & Chips',
        businessType: 'Restaurant',
        location: 'Fremantle',
        state: 'WA',
        description: 'Fresh fish, crispy chips, and local hospitality. A Fremantle institution serving the community for over 40 years.',
        contactPerson: 'Maria Antonelli',
        contactEmail: 'maria@fremantlefish.com.au',
        contactPhone: '(08) 9433 6789',
        facebookUrl: 'https://facebook.com/fremantlefish',
        logoUrl: '/icons/seed.svg',
        sponsorshipLevel: 'Supporting',
        isActive: true,
        isPubliclyVisible: true
    },
    {
        sponsorName: 'Adelaide Hills Brewery',
        businessType: 'Brewery',
        location: 'Adelaide',
        state: 'SA',
        description: 'Crafting quality beer since 2010. Supporting local sport and bringing communities together one beer at a time.',
        contactPerson: 'James Anderson',
        contactEmail: 'james@adelaidehillsbrewery.com.au',
        contactPhone: '(08) 8234 7890',
        website: 'https://www.adelaidehillsbrewery.com.au',
        facebookUrl: 'https://facebook.com/adelaidehillsbrewery',
        instagramUrl: 'https://instagram.com/adelaidehillsbrewery',
        logoUrl: '/icons/seed.svg',
        sponsorshipLevel: 'Bronze',
        isActive: true,
        isPubliclyVisible: true
    },
    {
        sponsorName: 'Port Power Earthmoving',
        businessType: 'Earthmoving & Excavation',
        location: 'Port Adelaide',
        state: 'SA',
        description: 'Moving mountains for South Australia. Specialist earthmoving, excavation, and site preparation services.',
        contactPerson: 'Daniel Power',
        contactEmail: 'daniel@portpowerearthmoving.com.au',
        contactPhone: '(08) 8447 2345',
        website: 'https://www.portpowerearthmoving.com.au',
        facebookUrl: 'https://facebook.com/portpowerearthmoving',
        logoUrl: '/icons/seed.svg',
        sponsorshipLevel: 'Supporting',
        isActive: true,
        isPubliclyVisible: true
    },
    {
        sponsorName: 'Tasmania Devils Transport',
        businessType: 'Transport & Logistics',
        location: 'Hobart',
        state: 'TAS',
        description: 'Island-wide transport solutions. Reliable freight and logistics services connecting Tasmania to the mainland.',
        contactPerson: 'Michelle Green',
        contactEmail: 'michelle@devilstransport.com.au',
        contactPhone: '(03) 6234 5678',
        website: 'https://www.devilstransport.com.au',
        facebookUrl: 'https://facebook.com/devilstransport',
        logoUrl: '/icons/seed.svg',
        sponsorshipLevel: 'Bronze',
        isActive: true,
        isPubliclyVisible: true
    },
    {
        sponsorName: 'Lions Landscaping',
        businessType: 'Landscaping',
        location: 'Launceston',
        state: 'TAS',
        description: 'Creating beautiful outdoor spaces across northern Tasmania. Commercial and residential landscaping specialists.',
        contactPerson: 'John Campbell',
        contactEmail: 'john@lionslandscaping.com.au',
        contactPhone: '(03) 6331 6789',
        website: 'https://www.lionslandscaping.com.au',
        facebookUrl: 'https://facebook.com/lionslandscaping',
        logoUrl: '/icons/seed.svg',
        sponsorshipLevel: 'Supporting',
        isActive: true,
        isPubliclyVisible: true
    },
    {
        sponsorName: 'Crocodile Security Services',
        businessType: 'Security Services',
        location: 'Darwin',
        state: 'NT',
        description: 'Protecting the Top End. Professional security services for commercial, residential, and event security needs.',
        contactPerson: 'Terry Robinson',
        contactEmail: 'terry@crocodilesecurity.com.au',
        contactPhone: '(08) 8922 7890',
        website: 'https://www.crocodilesecurity.com.au',
        facebookUrl: 'https://facebook.com/crocodilesecurity',
        logoUrl: '/icons/seed.svg',
        sponsorshipLevel: 'Bronze',
        isActive: true,
        isPubliclyVisible: true
    },
    {
        sponsorName: 'Capital City Catering',
        businessType: 'Catering Services',
        location: 'Canberra',
        state: 'ACT',
        description: 'Serving the nation\'s capital with exceptional catering services. Specializing in corporate events and sporting functions.',
        contactPerson: 'Lisa Wilson',
        contactEmail: 'lisa@capitalcatering.com.au',
        contactPhone: '(02) 6247 3456',
        website: 'https://www.capitalcatering.com.au',
        facebookUrl: 'https://facebook.com/capitalcatering',
        instagramUrl: 'https://instagram.com/capitalcatering',
        logoUrl: '/icons/seed.svg',
        sponsorshipLevel: 'Supporting',
        isActive: true,
        isPubliclyVisible: true
    },
    {
        sponsorName: 'Sunshine Coast Physiotherapy',
        businessType: 'Healthcare',
        location: 'Sunshine Coast',
        state: 'QLD',
        description: 'Keeping athletes moving. Sports physiotherapy and injury rehabilitation specialists serving the Sunshine Coast.',
        contactPerson: 'Dr. Amanda Clarke',
        contactEmail: 'amanda@sunshinecoastphysio.com.au',
        contactPhone: '(07) 5444 8901',
        website: 'https://www.sunshinecoastphysio.com.au',
        facebookUrl: 'https://facebook.com/sunshinecoastphysio',
        instagramUrl: 'https://instagram.com/sunshinecoastphysio',
        logoUrl: '/icons/seed.svg',
        sponsorshipLevel: 'Supporting',
        isActive: true,
        isPubliclyVisible: true
    }
];

class DatabaseSeeder {
    constructor() {
        this.createdClubs = [];
        this.createdUsers = [];
        this.createdCarnivals = [];
        this.createdSponsors = [];
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
            await Sponsor.destroy({ where: {}, transaction });
            
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
     * Create test sponsors using Sequelize
     */
    async createSponsors() {
        console.log('🤝 Creating test sponsors...');
        
        for (const sponsorData of SAMPLE_SPONSORS) {
            const sponsor = await Sponsor.create(sponsorData);
            this.createdSponsors.push(sponsor);
        }
        
        console.log(`✅ Created ${this.createdSponsors.length} sponsors`);
    }

    /**
     * Link sponsors to clubs with realistic relationships
     */
    async linkSponsorsToClubs() {
        console.log('🔗 Linking sponsors to clubs...');
        
        let totalLinks = 0;
        
        // Create realistic sponsor-club relationships
        for (const club of this.createdClubs) {
            // Each club gets 1-4 sponsors with varying levels
            const numSponsors = Math.floor(Math.random() * 4) + 1;
            const availableSponsors = [...this.createdSponsors];
            
            // Prefer local sponsors (same state) with 70% probability
            const localSponsors = availableSponsors.filter(sponsor => sponsor.state === club.state);
            const otherSponsors = availableSponsors.filter(sponsor => sponsor.state !== club.state);
            
            const selectedSponsors = [];
            
            for (let i = 0; i < numSponsors && availableSponsors.length > 0; i++) {
                let sponsorPool;
                
                // 70% chance to pick local sponsor, 30% for national/other state
                if (Math.random() < 0.7 && localSponsors.length > 0) {
                    sponsorPool = localSponsors;
                } else {
                    sponsorPool = otherSponsors.length > 0 ? otherSponsors : localSponsors;
                }
                
                if (sponsorPool.length === 0) break;
                
                const randomIndex = Math.floor(Math.random() * sponsorPool.length);
                const selectedSponsor = sponsorPool[randomIndex];
                
                selectedSponsors.push(selectedSponsor);
                
                // Remove from both pools to avoid duplicates
                const globalIndex = availableSponsors.indexOf(selectedSponsor);
                availableSponsors.splice(globalIndex, 1);
                localSponsors.splice(localSponsors.indexOf(selectedSponsor), 1);
                if (otherSponsors.includes(selectedSponsor)) {
                    otherSponsors.splice(otherSponsors.indexOf(selectedSponsor), 1);
                }
            }
            
            // Create relationships with appropriate sponsorship levels
            for (let i = 0; i < selectedSponsors.length; i++) {
                const sponsor = selectedSponsors[i];
                
                // Assign sponsorship levels based on sponsor's existing level and position
                let sponsorshipLevel;
                const sponsorLevels = ['Gold', 'Silver', 'Bronze', 'Supporting'];
                
                if (sponsor.sponsorshipLevel === 'Gold' && i === 0) {
                    sponsorshipLevel = 'Gold';
                } else if (sponsor.sponsorshipLevel === 'Gold' || sponsor.sponsorshipLevel === 'Silver') {
                    sponsorshipLevel = i === 0 ? 'Silver' : (Math.random() < 0.5 ? 'Bronze' : 'Supporting');
                } else {
                    sponsorshipLevel = Math.random() < 0.3 ? 'Bronze' : 'Supporting';
                }
                
                // Generate realistic sponsorship values
                const sponsorshipValues = {
                    'Gold': { min: 5000, max: 15000 },
                    'Silver': { min: 2000, max: 7000 },
                    'Bronze': { min: 500, max: 2500 },
                    'Supporting': { min: 100, max: 800 }
                };
                
                const valueRange = sponsorshipValues[sponsorshipLevel];
                const sponsorshipValue = Math.floor(
                    Math.random() * (valueRange.max - valueRange.min) + valueRange.min
                );
                
                // Generate start date (within last 2 years)
                const startDate = new Date();
                startDate.setDate(startDate.getDate() - Math.floor(Math.random() * 730));
                
                // 90% get ongoing sponsorship, 10% get end date
                let endDate = null;
                if (Math.random() < 0.1) {
                    endDate = new Date(startDate);
                    endDate.setDate(endDate.getDate() + Math.floor(Math.random() * 365) + 365);
                }
                
                const contractDetails = this.generateContractDetails(sponsorshipLevel, sponsor.businessType);
                
                await ClubSponsor.create({
                    clubId: club.id,
                    sponsorId: sponsor.id,
                    sponsorshipLevel: sponsorshipLevel,
                    sponsorshipValue: sponsorshipValue,
                    startDate: startDate,
                    endDate: endDate,
                    contractDetails: contractDetails,
                    isActive: true,
                    notes: `Seeded relationship - ${sponsorshipLevel} level sponsorship`
                });
                
                totalLinks++;
            }
        }
        
        console.log(`✅ Created ${totalLinks} club-sponsor relationships`);
    }

    /**
     * Link sponsors to carnivals with realistic relationships
     */
    async linkSponsorsToCarnivals() {
        console.log('🎪 Linking sponsors to carnivals...');
        
        let totalLinks = 0;
        
        // Focus on major carnivals and upcoming events
        const majorCarnivals = this.createdCarnivals.filter(carnival => 
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
            const localSponsors = this.createdSponsors.filter(sponsor => sponsor.state === carnival.state);
            const nationalSponsors = this.createdSponsors.filter(sponsor => 
                ['Bunnings Warehouse', 'Coca-Cola Australia', 'Toyota Australia', 'Woolworths Group', 'ANZ Bank'].includes(sponsor.sponsorName)
            );
            const otherSponsors = this.createdSponsors.filter(sponsor => 
                sponsor.state !== carnival.state && !nationalSponsors.includes(sponsor)
            );
            
            const selectedSponsors = [];
            const availableSponsors = [...this.createdSponsors];
            
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
                    sponsorPool = availableSponsors.filter(s => 
                        !selectedSponsors.includes(s) && 
                        (otherSponsors.includes(s) || nationalSponsors.includes(s))
                    );
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
     * Generate realistic contract details for club sponsorships
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
            sponsors: await Sponsor.count({ where: { isActive: true } }),
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
        console.log(`🤝 Sponsors: ${stats.sponsors}`);
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
            await this.createSponsors();
            await this.linkSponsorsToClubs();
            await this.createManualCarnivals();
            await this.linkSponsorsToCarnivals();
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