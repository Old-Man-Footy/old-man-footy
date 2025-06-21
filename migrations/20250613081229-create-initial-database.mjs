'use strict';

/**
 * Initial Database Schema Migration
 * Creates all core tables for the Old Man Footy platform
 * @type {import('sequelize-cli').Migration}
 */
export default {
  async up (queryInterface, Sequelize) {
    // Create Clubs table first (referenced by Users)
    await queryInterface.createTable('clubs', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      clubName: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true
      },
      state: {
        type: Sequelize.STRING(3),
        allowNull: true
      },
      location: {
        type: Sequelize.STRING,
        allowNull: true
      },
      contactEmail: {
        type: Sequelize.STRING,
        allowNull: true
      },
      contactPhone: {
        type: Sequelize.STRING,
        allowNull: true
      },
      contactPerson: {
        type: Sequelize.STRING,
        allowNull: true
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      website: {
        type: Sequelize.STRING,
        allowNull: true
      },
      facebookUrl: {
        type: Sequelize.STRING,
        allowNull: true
      },
      instagramUrl: {
        type: Sequelize.STRING,
        allowNull: true
      },
      twitterUrl: {
        type: Sequelize.STRING,
        allowNull: true
      },
      logoUrl: {
        type: Sequelize.STRING,
        allowNull: true
      },
      isPubliclyListed: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
        allowNull: false
      },
      isActive: {
        type: Sequelize.BOOLEAN,
        defaultValue: true,
        allowNull: false
      },
      createdByProxy: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
        allowNull: false
      },
      inviteEmail: {
        type: Sequelize.STRING,
        allowNull: true
      },
      createdByUserId: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'users',
          key: 'id'
        }
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE
      }
    });

    // Create Users table
    await queryInterface.createTable('users', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      email: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true
      },
      passwordHash: {
        type: Sequelize.STRING,
        allowNull: true
      },
      firstName: {
        type: Sequelize.STRING,
        allowNull: false
      },
      lastName: {
        type: Sequelize.STRING,
        allowNull: false
      },
      clubId: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'clubs',
          key: 'id'
        }
      },
      isPrimaryDelegate: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
        allowNull: false
      },
      isAdmin: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
        allowNull: false
      },
      invitationToken: {
        type: Sequelize.STRING,
        allowNull: true,
        unique: true
      },
      tokenExpires: {
        type: Sequelize.DATE,
        allowNull: true
      },
      passwordResetToken: {
        type: Sequelize.STRING,
        allowNull: true,
        unique: true
      },
      passwordResetExpires: {
        type: Sequelize.DATE,
        allowNull: true
      },
      isActive: {
        type: Sequelize.BOOLEAN,
        defaultValue: true,
        allowNull: false
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE
      }
    });

    // Create Carnivals table
    await queryInterface.createTable('carnivals', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      title: {
        type: Sequelize.STRING,
        allowNull: false
      },
      mySidelineTitle: {
        type: Sequelize.STRING,
        allowNull: true
      },
      date: {
        type: Sequelize.DATE,
        allowNull: true
      },
      locationAddress: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      locationAddressPart1: {
        type: Sequelize.STRING,
        allowNull: true
      },
      locationAddressPart2: {
        type: Sequelize.STRING,
        allowNull: true
      },
      locationAddressPart3: {
        type: Sequelize.STRING,
        allowNull: true
      },
      locationAddressPart4: {
        type: Sequelize.STRING,
        allowNull: true
      },
      organiserContactName: {
        type: Sequelize.STRING,
        allowNull: true
      },
      organiserContactEmail: {
        type: Sequelize.STRING,
        allowNull: true
      },
      organiserContactPhone: {
        type: Sequelize.STRING,
        allowNull: true
      },
      scheduleDetails: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      registrationLink: {
        type: Sequelize.STRING,
        allowNull: true
      },
      feesDescription: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      callForVolunteers: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      clubLogoURL: {
        type: Sequelize.STRING,
        allowNull: true
      },
      promotionalImageURL: {
        type: Sequelize.STRING,
        allowNull: true
      },
      additionalImages: {
        type: Sequelize.JSON,
        allowNull: true,
        defaultValue: []
      },
      socialMediaFacebook: {
        type: Sequelize.STRING,
        allowNull: true
      },
      socialMediaInstagram: {
        type: Sequelize.STRING,
        allowNull: true
      },
      socialMediaTwitter: {
        type: Sequelize.STRING,
        allowNull: true
      },
      socialMediaWebsite: {
        type: Sequelize.STRING,
        allowNull: true
      },
      drawFiles: {
        type: Sequelize.JSON,
        allowNull: true,
        defaultValue: []
      },
      drawFileURL: {
        type: Sequelize.STRING,
        allowNull: true
      },
      drawFileName: {
        type: Sequelize.STRING,
        allowNull: true
      },
      drawTitle: {
        type: Sequelize.STRING,
        allowNull: true
      },
      drawDescription: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      createdByUserId: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'users',
          key: 'id'
        }
      },
      isManuallyEntered: {
        type: Sequelize.BOOLEAN,
        defaultValue: true,
        allowNull: false
      },
      lastMySidelineSync: {
        type: Sequelize.DATE,
        allowNull: true
      },
      state: {
        type: Sequelize.STRING(3),
        allowNull: false
      },
      isActive: {
        type: Sequelize.BOOLEAN,
        defaultValue: true,
        allowNull: false
      },
      claimedAt: {
        type: Sequelize.DATE,
        allowNull: true
      },
      maxTeams: {
        type: Sequelize.INTEGER,
        allowNull: true
      },
      currentRegistrations: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
        allowNull: false
      },
      isRegistrationOpen: {
        type: Sequelize.BOOLEAN,
        defaultValue: true,
        allowNull: false
      },
      registrationDeadline: {
        type: Sequelize.DATE,
        allowNull: true
      },
      adminNotes: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE
      }
    });

    // Create Sponsors table
    await queryInterface.createTable('sponsors', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      sponsorName: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true
      },
      businessType: {
        type: Sequelize.STRING,
        allowNull: true
      },
      location: {
        type: Sequelize.STRING,
        allowNull: true
      },
      state: {
        type: Sequelize.STRING(3),
        allowNull: true
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      contactPerson: {
        type: Sequelize.STRING,
        allowNull: true
      },
      contactEmail: {
        type: Sequelize.STRING,
        allowNull: true
      },
      contactPhone: {
        type: Sequelize.STRING,
        allowNull: true
      },
      website: {
        type: Sequelize.STRING,
        allowNull: true
      },
      facebookUrl: {
        type: Sequelize.STRING,
        allowNull: true
      },
      instagramUrl: {
        type: Sequelize.STRING,
        allowNull: true
      },
      twitterUrl: {
        type: Sequelize.STRING,
        allowNull: true
      },
      linkedinUrl: {
        type: Sequelize.STRING,
        allowNull: true
      },
      logoUrl: {
        type: Sequelize.STRING,
        allowNull: true
      },
      isActive: {
        type: Sequelize.BOOLEAN,
        defaultValue: true,
        allowNull: false
      },
      isPubliclyVisible: {
        type: Sequelize.BOOLEAN,
        defaultValue: true,
        allowNull: false
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE
      }
    });

    // Create EmailSubscriptions table
    await queryInterface.createTable('email_subscriptions', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      email: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true
      },
      states: {
        type: Sequelize.JSON,
        allowNull: true,
        defaultValue: []
      },
      isActive: {
        type: Sequelize.BOOLEAN,
        defaultValue: true,
        allowNull: false
      },
      unsubscribeToken: {
        type: Sequelize.STRING,
        allowNull: true,
        unique: true
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE
      }
    });

    // Create ClubAlternateNames table
    await queryInterface.createTable('club_alternate_names', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      clubId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'clubs',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      alternateName: {
        type: Sequelize.STRING,
        allowNull: false
      },
      isActive: {
        type: Sequelize.BOOLEAN,
        defaultValue: true,
        allowNull: false
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE
      }
    });

    // Create CarnivalClubs junction table
    await queryInterface.createTable('carnival_clubs', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      carnivalId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'carnivals',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      clubId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'clubs',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      registrationDate: {
        type: Sequelize.DATEONLY,
        allowNull: false,
        defaultValue: Sequelize.NOW
      },
      playerCount: {
        type: Sequelize.INTEGER,
        allowNull: true
      },
      teamName: {
        type: Sequelize.STRING,
        allowNull: true
      },
      contactPerson: {
        type: Sequelize.STRING,
        allowNull: true
      },
      contactEmail: {
        type: Sequelize.STRING,
        allowNull: true
      },
      contactPhone: {
        type: Sequelize.STRING,
        allowNull: true
      },
      specialRequirements: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      registrationNotes: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      isActive: {
        type: Sequelize.BOOLEAN,
        defaultValue: true,
        allowNull: false
      },
      isPaid: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
        allowNull: false
      },
      paymentAmount: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true
      },
      paymentDate: {
        type: Sequelize.DATEONLY,
        allowNull: true
      },
      displayOrder: {
        type: Sequelize.INTEGER,
        allowNull: true,
        defaultValue: 999
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE
      }
    });

    // Create ClubSponsors junction table
    await queryInterface.createTable('club_sponsors', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      clubId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'clubs',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      sponsorId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'sponsors',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      sponsorshipLevel: {
        type: Sequelize.ENUM('Gold', 'Silver', 'Bronze', 'Supporting', 'In-Kind'),
        allowNull: false,
        defaultValue: 'Supporting'
      },
      sponsorshipValue: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true
      },
      startDate: {
        type: Sequelize.DATEONLY,
        allowNull: false,
        defaultValue: Sequelize.NOW
      },
      endDate: {
        type: Sequelize.DATEONLY,
        allowNull: true
      },
      contractDetails: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      isActive: {
        type: Sequelize.BOOLEAN,
        defaultValue: true,
        allowNull: false
      },
      notes: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      displayOrder: {
        type: Sequelize.INTEGER,
        allowNull: true,
        defaultValue: 999
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE
      }
    });

    // Create CarnivalSponsors junction table
    await queryInterface.createTable('carnival_sponsors', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      carnivalId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'carnivals',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      sponsorId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'sponsors',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      sponsorshipLevel: {
        type: Sequelize.ENUM('Gold', 'Silver', 'Bronze', 'Supporting', 'In-Kind'),
        allowNull: false,
        defaultValue: 'Supporting'
      },
      sponsorshipValue: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true
      },
      packageDetails: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      displayOrder: {
        type: Sequelize.INTEGER,
        allowNull: true,
        defaultValue: 0
      },
      logoDisplaySize: {
        type: Sequelize.ENUM('Large', 'Medium', 'Small'),
        allowNull: false,
        defaultValue: 'Medium'
      },
      includeInProgram: {
        type: Sequelize.BOOLEAN,
        defaultValue: true,
        allowNull: false
      },
      includeOnWebsite: {
        type: Sequelize.BOOLEAN,
        defaultValue: true,
        allowNull: false
      },
      isActive: {
        type: Sequelize.BOOLEAN,
        defaultValue: true,
        allowNull: false
      },
      notes: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE
      }
    });

    // Add indexes for performance
    await queryInterface.addIndex('clubs', ['clubName'], { unique: true });
    await queryInterface.addIndex('clubs', ['state']);
    await queryInterface.addIndex('clubs', ['isActive']);

    await queryInterface.addIndex('users', ['email'], { unique: true });
    await queryInterface.addIndex('users', ['clubId']);
    await queryInterface.addIndex('users', ['isActive']);

    await queryInterface.addIndex('carnivals', ['date']);
    await queryInterface.addIndex('carnivals', ['state']);
    await queryInterface.addIndex('carnivals', ['isActive']);
    await queryInterface.addIndex('carnivals', ['createdByUserId']);
    await queryInterface.addIndex('carnivals', ['isManuallyEntered']);

    await queryInterface.addIndex('sponsors', ['sponsorName'], { unique: true });
    await queryInterface.addIndex('sponsors', ['state']);
    await queryInterface.addIndex('sponsors', ['isActive']);

    await queryInterface.addIndex('email_subscriptions', ['email'], { unique: true });
    await queryInterface.addIndex('email_subscriptions', ['isActive']);

    await queryInterface.addIndex('carnival_clubs', ['carnivalId', 'clubId'], { unique: true });
    await queryInterface.addIndex('carnival_clubs', ['carnivalId']);
    await queryInterface.addIndex('carnival_clubs', ['clubId']);
    await queryInterface.addIndex('carnival_clubs', ['isActive']);
    await queryInterface.addIndex('carnival_clubs', ['registrationDate']);
    await queryInterface.addIndex('carnival_clubs', ['isPaid']);

    await queryInterface.addIndex('club_sponsors', ['clubId', 'sponsorId', 'startDate'], { unique: true });
    await queryInterface.addIndex('club_sponsors', ['clubId']);
    await queryInterface.addIndex('club_sponsors', ['sponsorId']);
    await queryInterface.addIndex('club_sponsors', ['isActive']);
    await queryInterface.addIndex('club_sponsors', ['sponsorshipLevel']);
    await queryInterface.addIndex('club_sponsors', ['startDate']);
    await queryInterface.addIndex('club_sponsors', ['endDate']);

    await queryInterface.addIndex('carnival_sponsors', ['carnivalId', 'sponsorId'], { unique: true });
    await queryInterface.addIndex('carnival_sponsors', ['carnivalId']);
    await queryInterface.addIndex('carnival_sponsors', ['sponsorId']);
    await queryInterface.addIndex('carnival_sponsors', ['isActive']);
    await queryInterface.addIndex('carnival_sponsors', ['sponsorshipLevel']);
    await queryInterface.addIndex('carnival_sponsors', ['displayOrder']);
  },

  async down (queryInterface, Sequelize) {
    // Drop tables in reverse order to handle foreign key dependencies
    await queryInterface.dropTable('carnival_sponsors');
    await queryInterface.dropTable('club_sponsors');
    await queryInterface.dropTable('carnival_clubs');
    await queryInterface.dropTable('club_alternate_names');
    await queryInterface.dropTable('email_subscriptions');
    await queryInterface.dropTable('sponsors');
    await queryInterface.dropTable('carnivals');
    await queryInterface.dropTable('users');
    await queryInterface.dropTable('clubs');
  }
};
