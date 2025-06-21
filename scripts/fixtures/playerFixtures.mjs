/**
 * Player Fixtures - Sample Player Data for Seeding
 * 
 * Contains realistic Australian names and data for generating test players
 */

/**
 * Sample player first names for realistic generation
 * @type {Array<string>}
 */
export const FIRST_NAMES = [
    'Adam', 'Alan', 'Andrew', 'Anthony', 'Brett', 'Brian', 'Bruce', 'Carl', 'Chris', 'Craig',
    'Daniel', 'David', 'Dean', 'Derek', 'Gareth', 'Gary', 'Glenn', 'Graham', 'Grant', 'Greg',
    'Ian', 'Jason', 'Jeff', 'John', 'Keith', 'Kevin', 'Lance', 'Mark', 'Martin', 'Matthew',
    'Michael', 'Neil', 'Nick', 'Paul', 'Peter', 'Philip', 'Richard', 'Robert', 'Scott', 'Simon',
    'Stephen', 'Steve', 'Stuart', 'Terry', 'Tim', 'Tony', 'Trevor', 'Wayne', 'William', 'Aaron',
    'Ben', 'Cameron', 'Darren', 'Gavin', 'James', 'Joel', 'Nathan', 'Ryan', 'Shane', 'Troy'
];

/**
 * Sample player last names for realistic generation
 * @type {Array<string>}
 */
export const LAST_NAMES = [
    'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Miller', 'Davis', 'Wilson', 'Moore', 'Taylor',
    'Anderson', 'Thomas', 'Jackson', 'White', 'Harris', 'Martin', 'Thompson', 'Garcia', 'Martinez', 'Robinson',
    'Clark', 'Rodriguez', 'Lewis', 'Lee', 'Walker', 'Hall', 'Allen', 'Young', 'Hernandez', 'King',
    'Wright', 'Lopez', 'Hill', 'Scott', 'Green', 'Adams', 'Baker', 'Gonzalez', 'Nelson', 'Carter',
    'Mitchell', 'Perez', 'Roberts', 'Turner', 'Phillips', 'Campbell', 'Parker', 'EvANS', 'Edwards', 'Collins',
    'Stewart', 'Sanchez', 'Morris', 'Rogers', 'Reed', 'Cook', 'Morgan', 'Bell', 'Murphy', 'Bailey'
];

/**
 * Sample domains for player email generation
 * @type {Array<string>}
 */
export const EMAIL_DOMAINS = [
    'gmail.com', 'outlook.com', 'hotmail.com', 'yahoo.com.au', 'bigpond.com',
    'optusnet.com.au', 'iinet.net.au', 'westnet.com.au', 'live.com.au'
];

/**
 * Sample notes for players (30% of players get notes)
 * @type {Array<string>}
 */
export const PLAYER_NOTES = [
    'Experienced player - former club captain',
    'New to masters rugby league',
    'Injury concerns - knees',
    'Available most weekends',
    'Prefers forward positions',
    'Good team player',
    'Former representative player',
    'Club volunteer - helps with events',
    'Part-time availability due to work',
    'Reliable attendance record'
];

/**
 * Sample notes for player carnival attendance (10% of assignments get notes)
 * @type {Array<string>}
 */
export const ATTENDANCE_NOTES = [
    'May need to leave early',
    'First time at this carnival',
    'Injury management required',
    'Bringing family to watch',
    'Carpooling with teammates',
    'Confirmed availability'
];