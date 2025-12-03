/**
 * Migration: Add expires index to sessions table
 * 
 * The Session model defines an expires index but it wasn't created in the initial migration.
 * This index is crucial for performance of session cleanup and expiration queries.
 */

'use strict';

/**
 * Add the expires index to the sessions table
 */
export const up = async (queryInterface, Sequelize) => {
  await queryInterface.addIndex('sessions', {
    fields: ['expires'],
    name: 'sessions_expires_idx',
    type: 'BTREE'
  });

  console.log('✅ Added expires index to sessions table for improved session cleanup performance');
};

/**
 * Remove the expires index from the sessions table
 */
export const down = async (queryInterface, Sequelize) => {
  await queryInterface.removeIndex('sessions', 'sessions_expires_idx');
  console.log('✅ Removed expires index from sessions table');
};
