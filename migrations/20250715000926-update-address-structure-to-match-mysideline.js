import { DataTypes } from 'sequelize';

/** @type {import('sequelize-cli').Migration} */
export async function up(queryInterface, Sequelize) {
  // Add new MySideline-compatible address fields to carnivals table
  await queryInterface.addColumn('carnivals', 'locationLatitude', {
    type: Sequelize.DECIMAL(10, 8),
    allowNull: true,
    comment: 'Latitude coordinate for the event location'
  });

  await queryInterface.addColumn('carnivals', 'locationLongitude', {
    type: Sequelize.DECIMAL(11, 8),
    allowNull: true,
    comment: 'Longitude coordinate for the event location'
  });

  await queryInterface.addColumn('carnivals', 'locationSuburb', {
    type: Sequelize.STRING(100),
    allowNull: true,
    comment: 'Suburb/city name for the event location'
  });

  await queryInterface.addColumn('carnivals', 'locationPostcode', {
    type: Sequelize.STRING(10),
    allowNull: true,
    comment: 'Postcode for the event location'
  });

  await queryInterface.addColumn('carnivals', 'locationCountry', {
    type: Sequelize.STRING(50),
    allowNull: true,
    defaultValue: 'Australia',
    comment: 'Country for the event location'
  });

  // Migrate existing data: attempt to extract suburb and postcode from existing address fields
  const carnivals = await queryInterface.sequelize.query(
    'SELECT id, locationAddress, locationAddressPart3, locationAddressPart4, state FROM carnivals WHERE locationAddress IS NOT NULL',
    { type: Sequelize.QueryTypes.SELECT }
  );

  for (const carnival of carnivals) {
    let suburb = null;
    let postcode = null;
    let country = 'Australia';

    // Try to extract postcode from locationAddress using regex
    const postcodeMatch = carnival.locationAddress?.match(/\b(\d{4})\b/);
    if (postcodeMatch) {
      postcode = postcodeMatch[1];
    }

    // Try to extract suburb from locationAddressPart3 or parse from locationAddress
    if (carnival.locationAddressPart3 && carnival.locationAddressPart3.trim() !== '') {
      suburb = carnival.locationAddressPart3.trim();
    } else {
      // Try to extract suburb from the address string (before state abbreviation)
      const statePattern = new RegExp(`\\b(${carnival.state || 'NSW|QLD|VIC|SA|WA|TAS|NT|ACT'})\\b`, 'i');
      const addressParts = carnival.locationAddress?.split(',') || [];
      
      for (let i = addressParts.length - 1; i >= 0; i--) {
        const part = addressParts[i].trim();
        // If this part contains the state, the previous part might be the suburb
        if (statePattern.test(part) && i > 0) {
          const potentialSuburb = addressParts[i - 1].trim();
          // Only use if it doesn't look like a street address
          if (potentialSuburb && !/^\d+/.test(potentialSuburb)) {
            suburb = potentialSuburb;
            break;
          }
        }
      }
    }

    // Update the carnival with the extracted data
    if (suburb || postcode) {
      await queryInterface.sequelize.query(
        'UPDATE carnivals SET locationSuburb = ?, locationPostcode = ?, locationCountry = ? WHERE id = ?',
        {
          replacements: [suburb, postcode, country, carnival.id],
          type: Sequelize.QueryTypes.UPDATE
        }
      );
    }
  }

  console.log(`✅ Migrated address data for ${carnivals.length} carnivals to MySideline format`);
}

export async function down(queryInterface, Sequelize) {
  // Remove the new MySideline-compatible address fields
  await queryInterface.removeColumn('carnivals', 'locationLatitude');
  await queryInterface.removeColumn('carnivals', 'locationLongitude');
  await queryInterface.removeColumn('carnivals', 'locationSuburb');
  await queryInterface.removeColumn('carnivals', 'locationPostcode');
  await queryInterface.removeColumn('carnivals', 'locationCountry');
}
