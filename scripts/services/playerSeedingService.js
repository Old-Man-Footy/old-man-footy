/**
 * Player Seeding Service
 * 
 * Handles creation of test players for clubs with realistic data
 * Includes age requirements and carnival attendance linking
 */

const { ClubPlayer, CarnivalClubPlayer } = require('../../models');
const { FIRST_NAMES, LAST_NAMES, EMAIL_DOMAINS, PLAYER_NOTES, ATTENDANCE_NOTES } = require('../fixtures/playerFixtures');

class PlayerSeedingService {
    /**
     * Create players for each club using realistic data
     * @param {Array} clubs - Array of created clubs
     * @returns {Promise<void>}
     */
    async createClubPlayers(clubs) {
        console.log('🏃 Creating test players for each club...');
        
        let totalPlayersCreated = 0;
        let duplicatesSkipped = 0;
        
        for (const club of clubs) {
            // Create 11-20 players per club
            const playerCount = Math.floor(Math.random() * 10) + 11;
            
            for (let i = 0; i < playerCount; i++) {
                const firstName = FIRST_NAMES[Math.floor(Math.random() * FIRST_NAMES.length)];
                const lastName = LAST_NAMES[Math.floor(Math.random() * LAST_NAMES.length)];
                const domain = EMAIL_DOMAINS[Math.floor(Math.random() * EMAIL_DOMAINS.length)];
                
                // Generate age with 95% aged 35+, 5% aged 33-34
                let age;
                if (Math.random() < 0.95) {
                    // 95% are masters eligible (35-54 years)
                    age = Math.floor(Math.random() * 20) + 35;
                } else {
                    // 5% are younger (33-34 years)
                    age = Math.floor(Math.random() * 2) + 33;
                }
                
                // Calculate date of birth
                const dateOfBirth = new Date();
                dateOfBirth.setFullYear(dateOfBirth.getFullYear() - age);
                dateOfBirth.setMonth(Math.floor(Math.random() * 12));
                dateOfBirth.setDate(Math.floor(Math.random() * 28) + 1);
                
                // Format date as YYYY-MM-DD for database
                const formattedDateOfBirth = dateOfBirth.toISOString().split('T')[0];
                
                // Check for duplicate based on business rules (club + name + DOB)
                const isDuplicate = await ClubPlayer.isDuplicate(
                    club.id,
                    firstName,
                    lastName,
                    formattedDateOfBirth
                );
                
                if (isDuplicate) {
                    // Skip this duplicate and try with a different name
                    duplicatesSkipped++;
                    continue;
                }
                
                // Generate shorts preference with correct enum values
                const shortsOptions = ['Unrestricted', 'Red', 'Yellow', 'Blue', 'Green'];
                const shortsWeights = [40, 15, 15, 15, 15]; // Percentages
                const shorts = this.weightedRandomChoice(shortsOptions, shortsWeights);
                
                // 30% chance of having notes
                const notes = Math.random() < 0.3 
                    ? PLAYER_NOTES[Math.floor(Math.random() * PLAYER_NOTES.length)]
                    : null;
                
                try {
                    const player = await ClubPlayer.create({
                        clubId: club.id,
                        firstName: firstName,
                        lastName: lastName,
                        email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@${domain}`,
                        dateOfBirth: formattedDateOfBirth,
                        shorts: shorts, // Fixed: use 'shorts' instead of 'shortsPreference'
                        notes: notes,
                        isActive: true
                    });
                    
                    totalPlayersCreated++;
                } catch (error) {
                    // Handle any remaining database constraint errors
                    if (error.name === 'SequelizeUniqueConstraintError') {
                        console.warn(`⚠️  Skipping duplicate player: ${firstName} ${lastName} (${formattedDateOfBirth})`);
                        duplicatesSkipped++;
                    } else {
                        console.error(`❌ Error creating player ${firstName} ${lastName}:`, error.message);
                    }
                }
            }
        }
        
        console.log(`✅ Created ${totalPlayersCreated} players for all clubs (${duplicatesSkipped} duplicates skipped)`);
    }

    /**
     * Link players to carnival attendance with realistic data
     * @param {Array} carnivalClubs - Array of carnival registrations
     * @returns {Promise<void>}
     */
    async linkPlayersToCarnivals(carnivalClubs) {
        console.log('🎪 Linking players to carnival attendance...');
        
        let totalAssignments = 0;
        
        for (const carnivalClub of carnivalClubs) {
            // Get players for this club
            const clubPlayers = await ClubPlayer.findAll({
                where: { clubId: carnivalClub.clubId, isActive: true }
            });
            
            if (clubPlayers.length === 0) continue;
            
            // Assign 11-15 players per registration
            const playersToAssign = Math.min(
                Math.floor(Math.random() * 5) + 11,
                clubPlayers.length
            );
            
            // Randomly select players for this carnival
            const shuffledPlayers = [...clubPlayers].sort(() => 0.5 - Math.random());
            const selectedPlayers = shuffledPlayers.slice(0, playersToAssign);
            
            for (const player of selectedPlayers) {
                // Generate attendance status (80% confirmed, 15% tentative, 5% unavailable)
                let attendanceStatus;
                const statusRandom = Math.random();
                if (statusRandom < 0.8) {
                    attendanceStatus = 'confirmed';
                } else if (statusRandom < 0.95) {
                    attendanceStatus = 'tentative';
                } else {
                    attendanceStatus = 'unavailable';
                }
                
                // 10% chance of having attendance notes
                const attendanceNotes = Math.random() < 0.1 
                    ? ATTENDANCE_NOTES[Math.floor(Math.random() * ATTENDANCE_NOTES.length)]
                    : null;
                
                try {
                    await CarnivalClubPlayer.create({
                        carnivalClubId: carnivalClub.id,
                        clubPlayerId: player.id,
                        attendanceStatus: attendanceStatus,
                        notes: attendanceNotes,
                        isActive: true
                    });
                    
                    totalAssignments++;
                } catch (error) {
                    console.warn(`⚠️  Could not assign player ${player.firstName} ${player.lastName} to carnival: ${error.message}`);
                }
            }
        }
        
        console.log(`✅ Created ${totalAssignments} player-carnival assignments`);
    }

    /**
     * Weighted random choice helper
     * @param {Array} choices - Array of choices
     * @param {Array} weights - Array of weights (percentages)
     * @returns {*} Selected choice
     */
    weightedRandomChoice(choices, weights) {
        const random = Math.random() * 100;
        let cumulative = 0;
        
        for (let i = 0; i < choices.length; i++) {
            cumulative += weights[i];
            if (random <= cumulative) {
                return choices[i];
            }
        }
        
        return choices[0]; // Fallback
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
     * Generate emergency contact names
     * @returns {string} Emergency contact name
     */
    generateEmergencyContactName() {
        const relationships = ['Partner', 'Spouse', 'Parent', 'Sibling', 'Child'];
        const relationship = relationships[Math.floor(Math.random() * relationships.length)];
        const firstName = FIRST_NAMES[Math.floor(Math.random() * FIRST_NAMES.length)];
        return `${firstName} (${relationship})`;
    }
}

module.exports = PlayerSeedingService;