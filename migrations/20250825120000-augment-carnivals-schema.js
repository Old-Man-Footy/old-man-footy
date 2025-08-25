'use strict';

/** @type {import('sequelize-cli').Migration} */
export const up = async (queryInterface, Sequelize) => {
  // Describe existing table to guard against re-applying changes
  const cols = await queryInterface.describeTable('carnivals');

  // Helper to add a column if it's missing
  const addIfMissing = async (name, spec) => {
    if (!cols[name]) {
      await queryInterface.addColumn('carnivals', name, spec);
    }
  };

  // New MySideline reference fields
  await addIfMissing('mySidelineAddress', { type: Sequelize.TEXT, allowNull: true });
  await addIfMissing('mySidelineDate', { type: Sequelize.DATE, allowNull: true });

  // Structured location fields
  await addIfMissing('locationAddressLine1', { type: Sequelize.STRING(200), allowNull: true });
  await addIfMissing('locationAddressLine2', { type: Sequelize.STRING(200), allowNull: true });

  // Event details
  await addIfMissing('scheduleDetails', { type: Sequelize.TEXT, allowNull: true });
  await addIfMissing('feesDescription', { type: Sequelize.TEXT, allowNull: true });
  await addIfMissing('callForVolunteers', { type: Sequelize.TEXT, allowNull: true });

  // Media fields
  await addIfMissing('clubLogoURL', { type: Sequelize.STRING, allowNull: true });
  await addIfMissing('promotionalImageURL', { type: Sequelize.STRING, allowNull: true });
  await addIfMissing('additionalImages', { type: Sequelize.JSON, allowNull: true, defaultValue: [] });

  // Social links
  await addIfMissing('socialMediaFacebook', { type: Sequelize.STRING, allowNull: true });
  await addIfMissing('socialMediaInstagram', { type: Sequelize.STRING, allowNull: true });
  await addIfMissing('socialMediaTwitter', { type: Sequelize.STRING, allowNull: true });
  await addIfMissing('socialMediaWebsite', { type: Sequelize.STRING, allowNull: true });

  // Draw/documents
  await addIfMissing('drawFiles', { type: Sequelize.JSON, allowNull: true, defaultValue: [] });
  await addIfMissing('drawFileURL', { type: Sequelize.STRING, allowNull: true });
  await addIfMissing('drawFileName', { type: Sequelize.STRING, allowNull: true });
  await addIfMissing('drawTitle', { type: Sequelize.STRING, allowNull: true });
  await addIfMissing('drawDescription', { type: Sequelize.TEXT, allowNull: true });

  // Type/constraint adjustments to match model definitions
  // SQLite supports changeColumn by recreating tables under the hood via sequelize.
  // Make these best-effort (wrap individually to avoid failing entire migration on one env quirk).
  const safeChange = async (name, spec) => {
    try {
      if (cols[name]) {
        await queryInterface.changeColumn('carnivals', name, spec);
      }
    } catch (err) {
      console.warn(`⚠️  Skipping changeColumn for carnivals.${name}: ${err.message}`);
    }
  };

  await safeChange('date', { type: Sequelize.DATE, allowNull: true });
  await safeChange('endDate', { type: Sequelize.DATE, allowNull: true });
  await safeChange('locationAddress', { type: Sequelize.TEXT, allowNull: true });
};

export const down = async (queryInterface, Sequelize) => {
  const cols = await queryInterface.describeTable('carnivals');
  const dropIfExists = async (name) => {
    if (cols[name]) {
      await queryInterface.removeColumn('carnivals', name);
    }
  };

  // Revert type changes best-effort
  const safeChange = async (name, spec) => {
    try {
      if (cols[name]) await queryInterface.changeColumn('carnivals', name, spec);
    } catch (err) {
      console.warn(`⚠️  Skipping revert changeColumn for carnivals.${name}: ${err.message}`);
    }
  };

  // Drop added columns
  await dropIfExists('mySidelineAddress');
  await dropIfExists('mySidelineDate');
  await dropIfExists('locationAddressLine1');
  await dropIfExists('locationAddressLine2');
  await dropIfExists('scheduleDetails');
  await dropIfExists('feesDescription');
  await dropIfExists('callForVolunteers');
  await dropIfExists('clubLogoURL');
  await dropIfExists('promotionalImageURL');
  await dropIfExists('additionalImages');
  await dropIfExists('socialMediaFacebook');
  await dropIfExists('socialMediaInstagram');
  await dropIfExists('socialMediaTwitter');
  await dropIfExists('socialMediaWebsite');
  await dropIfExists('drawFiles');
  await dropIfExists('drawFileURL');
  await dropIfExists('drawFileName');
  await dropIfExists('drawTitle');
  await dropIfExists('drawDescription');

  // Revert types loosely toward original migration (DATEONLY/STRING)
  await safeChange('date', { type: Sequelize.DATEONLY, allowNull: false });
  await safeChange('endDate', { type: Sequelize.DATEONLY, allowNull: true });
  await safeChange('locationAddress', { type: Sequelize.STRING, allowNull: true });
};
