'use strict';

/**
 * Augment Clubs and Sponsors schema to match model definitions
 * - clubs: add website, facebookUrl, instagramUrl, twitterUrl, logoUrl
 * - sponsors: add linkedinUrl, logoUrl
 */

/** @type {import('sequelize-cli').Migration} */
export const up = async (queryInterface, Sequelize) => {
  // Clubs table updates
  const clubCols = await queryInterface.describeTable('clubs');
  const addClubIfMissing = async (name, spec) => {
    if (!clubCols[name]) {
      await queryInterface.addColumn('clubs', name, spec);
    }
  };

  await addClubIfMissing('website', { type: Sequelize.STRING, allowNull: true });
  await addClubIfMissing('facebookUrl', { type: Sequelize.STRING, allowNull: true });
  await addClubIfMissing('instagramUrl', { type: Sequelize.STRING, allowNull: true });
  await addClubIfMissing('twitterUrl', { type: Sequelize.STRING, allowNull: true });
  await addClubIfMissing('logoUrl', { type: Sequelize.STRING, allowNull: true });

  // Sponsors table updates
  const sponsorCols = await queryInterface.describeTable('sponsors');
  const addSponsorIfMissing = async (name, spec) => {
    if (!sponsorCols[name]) {
      await queryInterface.addColumn('sponsors', name, spec);
    }
  };

  await addSponsorIfMissing('linkedinUrl', { type: Sequelize.STRING, allowNull: true });
  await addSponsorIfMissing('logoUrl', { type: Sequelize.STRING, allowNull: true });
};

export const down = async (queryInterface, Sequelize) => {
  // Clubs table reverts
  const clubCols = await queryInterface.describeTable('clubs');
  const dropClubIfExists = async (name) => {
    if (clubCols[name]) {
      await queryInterface.removeColumn('clubs', name);
    }
  };

  await dropClubIfExists('website');
  await dropClubIfExists('facebookUrl');
  await dropClubIfExists('instagramUrl');
  await dropClubIfExists('twitterUrl');
  await dropClubIfExists('logoUrl');

  // Sponsors table reverts
  const sponsorCols = await queryInterface.describeTable('sponsors');
  const dropSponsorIfExists = async (name) => {
    if (sponsorCols[name]) {
      await queryInterface.removeColumn('sponsors', name);
    }
  };

  await dropSponsorIfExists('linkedinUrl');
  await dropSponsorIfExists('logoUrl');
};
