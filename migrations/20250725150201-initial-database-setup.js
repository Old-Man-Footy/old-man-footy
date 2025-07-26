'use strict';

/** @type {import('sequelize-cli').Migration} */
export const up = async (queryInterface, Sequelize) => {
  // --- Club Table --- (move this before users)
  await queryInterface.createTable('clubs', {
    id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
    clubName: { type: Sequelize.STRING, allowNull: false, unique: true },
    state: { type: Sequelize.STRING(3), allowNull: true },
    location: { type: Sequelize.STRING, allowNull: true },
    contactEmail: { type: Sequelize.STRING, allowNull: true },
    contactPhone: { type: Sequelize.STRING, allowNull: true },
    contactPerson: { type: Sequelize.STRING, allowNull: true },
    description: { type: Sequelize.TEXT, allowNull: true },
    isPubliclyListed: { type: Sequelize.BOOLEAN, defaultValue: false, allowNull: false },
    isActive: { type: Sequelize.BOOLEAN, defaultValue: true, allowNull: false },
    createdByProxy: { type: Sequelize.BOOLEAN, defaultValue: false, allowNull: false },
    inviteEmail: { type: Sequelize.STRING, allowNull: true },
    createdByUserId: { type: Sequelize.INTEGER, allowNull: true, references: { model: 'users', key: 'id' } },
    createdAt: { type: Sequelize.DATE, allowNull: false },
    updatedAt: { type: Sequelize.DATE, allowNull: false }
  });

  // --- User Table ---
  await queryInterface.createTable('users', {
    id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
    email: { type: Sequelize.STRING, allowNull: false, unique: true },
    passwordHash: { type: Sequelize.STRING, allowNull: true },
    firstName: { type: Sequelize.STRING, allowNull: false },
    lastName: { type: Sequelize.STRING, allowNull: false },
    phoneNumber: { type: Sequelize.STRING(20), allowNull: true },
    clubId: { type: Sequelize.INTEGER, allowNull: true, references: { model: 'clubs', key: 'id' } },
    isPrimaryDelegate: { type: Sequelize.BOOLEAN, defaultValue: false, allowNull: false },
    isAdmin: { type: Sequelize.BOOLEAN, defaultValue: false, allowNull: false },
    invitationToken: { type: Sequelize.STRING, allowNull: true, unique: true },
    invitationExpires: { type: Sequelize.DATE, allowNull: true },
    tokenExpires: { type: Sequelize.DATE, allowNull: true },
    passwordResetToken: { type: Sequelize.STRING, allowNull: true, unique: true },
    passwordResetExpires: { type: Sequelize.DATE, allowNull: true },
    isActive: { type: Sequelize.BOOLEAN, defaultValue: true, allowNull: false },
    lastLoginAt: { type: Sequelize.DATE, allowNull: true },
    createdAt: { type: Sequelize.DATE, allowNull: false },
    updatedAt: { type: Sequelize.DATE, allowNull: false }
  });

  // --- ClubAlternateName Table ---
  await queryInterface.createTable('club_alternate_names', {
    id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
    clubId: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'clubs', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'CASCADE' },
    alternateName: { type: Sequelize.STRING, allowNull: false },
    isActive: { type: Sequelize.BOOLEAN, defaultValue: true, allowNull: false },
    createdAt: { type: Sequelize.DATE, allowNull: false },
    updatedAt: { type: Sequelize.DATE, allowNull: false }
  });

  // --- ClubPlayer Table ---
  await queryInterface.createTable('club_players', {
    id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
    clubId: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'clubs', key: 'id' } },
    firstName: { type: Sequelize.STRING(50), allowNull: false },
    lastName: { type: Sequelize.STRING(50), allowNull: false },
    dateOfBirth: { type: Sequelize.DATEONLY, allowNull: true },
    email: { type: Sequelize.STRING, allowNull: true },
    phoneNumber: { type: Sequelize.STRING, allowNull: true },
    notes: { type: Sequelize.TEXT, allowNull: true },
    shorts: { type: Sequelize.STRING, allowNull: false, defaultValue: 'Unrestricted' },
    isActive: { type: Sequelize.BOOLEAN, defaultValue: true, allowNull: false },
    createdAt: { type: Sequelize.DATE, allowNull: false },
    updatedAt: { type: Sequelize.DATE, allowNull: false }
  });

  // --- Carnival Table ---
  await queryInterface.createTable('carnivals', {
    id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
    title: { type: Sequelize.STRING, allowNull: false },
    mySidelineTitle: { type: Sequelize.STRING, allowNull: true },
    mySidelineId: { type: Sequelize.INTEGER, allowNull: true },
    clubId: { type: Sequelize.INTEGER, allowNull: true, references: { model: 'clubs', key: 'id' } },
    isManuallyEntered: { type: Sequelize.BOOLEAN, defaultValue: true, allowNull: false },
    lastMySidelineSync: { type: Sequelize.DATE, allowNull: true },
    state: { type: Sequelize.STRING(3), allowNull: true },
    isActive: { type: Sequelize.BOOLEAN, defaultValue: true, allowNull: false },
    claimedAt: { type: Sequelize.DATE, allowNull: true },
    maxTeams: { type: Sequelize.INTEGER, allowNull: true },
    currentRegistrations: { type: Sequelize.INTEGER, defaultValue: 0, allowNull: false },
    date: { type: Sequelize.DATEONLY, allowNull: false },
    endDate: { type: Sequelize.DATEONLY, allowNull: true },
    venueName: { type: Sequelize.STRING(200), allowNull: true },
    locationAddress: { type: Sequelize.STRING, allowNull: true },
    locationLatitude: { type: Sequelize.DECIMAL(10, 8), allowNull: true },
    locationLongitude: { type: Sequelize.DECIMAL(11, 8), allowNull: true },
    locationSuburb: { type: Sequelize.STRING(100), allowNull: true },
    locationPostcode: { type: Sequelize.STRING(10), allowNull: true },
    locationCountry: { type: Sequelize.STRING(50), allowNull: true, defaultValue: 'Australia' },
    organiserContactName: { type: Sequelize.STRING, allowNull: true },
    organiserContactEmail: { type: Sequelize.STRING, allowNull: true },
    organiserContactPhone: { type: Sequelize.STRING, allowNull: true },
    registrationLink: { type: Sequelize.STRING, allowNull: true },
    isRegistrationOpen: { type: Sequelize.BOOLEAN, defaultValue: true, allowNull: false },
    registrationDeadline: { type: Sequelize.DATE, allowNull: true },
    adminNotes: { type: Sequelize.TEXT, allowNull: true },
    createdByUserId: { type: Sequelize.INTEGER, allowNull: true, references: { model: 'users', key: 'id' } },
    createdAt: { type: Sequelize.DATE, allowNull: false },
    updatedAt: { type: Sequelize.DATE, allowNull: false }
  });

  // --- Sponsor Table ---
  await queryInterface.createTable('sponsors', {
    id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
    sponsorName: { type: Sequelize.STRING, allowNull: false, unique: true },
    businessType: { type: Sequelize.STRING, allowNull: true },
    location: { type: Sequelize.STRING, allowNull: true },
    state: { type: Sequelize.STRING(3), allowNull: true },
    description: { type: Sequelize.TEXT, allowNull: true },
    contactPerson: { type: Sequelize.STRING, allowNull: true },
    contactEmail: { type: Sequelize.STRING, allowNull: true },
    contactPhone: { type: Sequelize.STRING, allowNull: true },
    website: { type: Sequelize.STRING, allowNull: true },
    facebookUrl: { type: Sequelize.STRING, allowNull: true },
    instagramUrl: { type: Sequelize.STRING, allowNull: true },
    twitterUrl: { type: Sequelize.STRING, allowNull: true },
    clubId: { type: Sequelize.INTEGER, allowNull: true, references: { model: 'clubs', key: 'id' } },
    isActive: { type: Sequelize.BOOLEAN, defaultValue: true, allowNull: false },
    createdAt: { type: Sequelize.DATE, allowNull: false },
    updatedAt: { type: Sequelize.DATE, allowNull: false }
  });

  // --- CarnivalClub Table ---
  await queryInterface.createTable('carnival_clubs', {
    id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
    carnivalId: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'carnivals', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'CASCADE' },
    clubId: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'clubs', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'CASCADE' },
    registrationDate: { type: Sequelize.DATEONLY, allowNull: false, defaultValue: Sequelize.NOW },
    playerCount: { type: Sequelize.INTEGER, allowNull: true },
    teamName: { type: Sequelize.STRING, allowNull: true },
    contactPerson: { type: Sequelize.STRING, allowNull: true },
    contactEmail: { type: Sequelize.STRING, allowNull: true },
    contactPhone: { type: Sequelize.STRING, allowNull: true },
    specialRequirements: { type: Sequelize.TEXT, allowNull: true },
    isPaid: { type: Sequelize.BOOLEAN, defaultValue: false, allowNull: false },
    approvalStatus: { type: Sequelize.STRING, allowNull: false, defaultValue: 'pending' },
    rejectionReason: { type: Sequelize.TEXT, allowNull: true },
    isActive: { type: Sequelize.BOOLEAN, defaultValue: true, allowNull: false },
    createdAt: { type: Sequelize.DATE, allowNull: false },
    updatedAt: { type: Sequelize.DATE, allowNull: false }
  });

  // --- CarnivalClubPlayer Table ---
  await queryInterface.createTable('carnival_club_players', {
    id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
    carnivalClubId: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'carnival_clubs', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'CASCADE' },
    clubPlayerId: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'club_players', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'CASCADE' },
    isActive: { type: Sequelize.BOOLEAN, defaultValue: true, allowNull: false },
    attendanceStatus: { type: Sequelize.STRING, allowNull: false, defaultValue: 'confirmed' },
    notes: { type: Sequelize.TEXT, allowNull: true },
    addedAt: { type: Sequelize.DATE, defaultValue: Sequelize.NOW, allowNull: false },
    createdAt: { type: Sequelize.DATE, allowNull: false },
    updatedAt: { type: Sequelize.DATE, allowNull: false }
  });

  // --- carnivalsponsor Table ---
  await queryInterface.createTable('carnival_sponsors', {
    id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
    carnivalId: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'carnivals', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'CASCADE' },
    sponsorId: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'sponsors', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'CASCADE' },
    sponsorshipLevel: { type: Sequelize.STRING, allowNull: false, defaultValue: 'Supporting' },
    sponsorshipValue: { type: Sequelize.DECIMAL(10, 2), allowNull: true },
    packageDetails: { type: Sequelize.TEXT, allowNull: true },
    displayOrder: { type: Sequelize.INTEGER, allowNull: true, defaultValue: 0 },
    logoDisplaySize: { type: Sequelize.STRING, allowNull: false, defaultValue: 'Medium' },
    includeInProgram: { type: Sequelize.BOOLEAN, defaultValue: true, allowNull: false },
    includeOnWebsite: { type: Sequelize.BOOLEAN, defaultValue: true, allowNull: false },
    isActive: { type: Sequelize.BOOLEAN, defaultValue: true, allowNull: false },
    notes: { type: Sequelize.TEXT, allowNull: true },
    createdAt: { type: Sequelize.DATE, allowNull: false },
    updatedAt: { type: Sequelize.DATE, allowNull: false }
  });

  // --- EmailSubscription Table ---
  await queryInterface.createTable('email_subscriptions', {
    id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
    email: { type: Sequelize.STRING, allowNull: false, unique: true },
    states: { type: Sequelize.JSON, allowNull: true, defaultValue: [] },
    isActive: { type: Sequelize.BOOLEAN, defaultValue: true, allowNull: false },
    unsubscribeToken: { type: Sequelize.STRING, allowNull: true, unique: true },
    source: { type: Sequelize.STRING, allowNull: true, defaultValue: 'homepage' },
    unsubscribedAt: { type: Sequelize.DATE, allowNull: true },
    createdAt: { type: Sequelize.DATE, allowNull: false },
    updatedAt: { type: Sequelize.DATE, allowNull: false }
  });

  // --- AuditLog Table ---
  await queryInterface.createTable('audit_logs', {
    id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
    userId: { type: Sequelize.INTEGER, allowNull: true, references: { model: 'users', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'SET NULL' },
    action: { type: Sequelize.STRING(100), allowNull: false },
    entityType: { type: Sequelize.STRING(50), allowNull: false },
    entityId: { type: Sequelize.INTEGER, allowNull: true },
    oldValues: { type: Sequelize.JSON, allowNull: true },
    newValues: { type: Sequelize.JSON, allowNull: true },
    ipAddress: { type: Sequelize.STRING(45), allowNull: true },
    userAgent: { type: Sequelize.TEXT, allowNull: true },
    sessionId: { type: Sequelize.STRING(255), allowNull: true },
    result: { type: Sequelize.STRING, allowNull: false, defaultValue: 'SUCCESS' },
    errorMessage: { type: Sequelize.TEXT, allowNull: true },
    metadata: { type: Sequelize.JSON, allowNull: true },
    createdAt: { type: Sequelize.DATE, allowNull: false },
    updatedAt: { type: Sequelize.DATE, allowNull: false }
  });

  // --- SyncLog Table ---
  await queryInterface.createTable('sync_logs', {
    id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
    syncType: { type: Sequelize.STRING, allowNull: false },
    status: { type: Sequelize.STRING, allowNull: false, defaultValue: 'started' },
    startedAt: { type: Sequelize.DATE, allowNull: false },
    completedAt: { type: Sequelize.DATE, allowNull: true },
    eventsProcessed: { type: Sequelize.INTEGER, allowNull: true, defaultValue: 0 },
    eventsCreated: { type: Sequelize.INTEGER, allowNull: true, defaultValue: 0 },
    eventsUpdated: { type: Sequelize.INTEGER, allowNull: true, defaultValue: 0 },
    errorMessage: { type: Sequelize.TEXT, allowNull: true },
    metadata: { type: Sequelize.JSON, allowNull: true },
    createdAt: { type: Sequelize.DATE, allowNull: false },
    updatedAt: { type: Sequelize.DATE, allowNull: false }
  });
};

export const down = async (queryInterface, Sequelize) => {
  await queryInterface.dropTable('sync_logs');
  await queryInterface.dropTable('audit_logs');
  await queryInterface.dropTable('email_subscriptions');
  await queryInterface.dropTable('carnival_sponsors');
  await queryInterface.dropTable('carnival_club_players');
  await queryInterface.dropTable('carnival_clubs');
  await queryInterface.dropTable('carnivals');
  await queryInterface.dropTable('sponsors');
  await queryInterface.dropTable('club_players');
  await queryInterface.dropTable('club_alternate_names');
  await queryInterface.dropTable('clubs');
  await queryInterface.dropTable('users');
};
