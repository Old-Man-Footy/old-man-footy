/**
 * ClubPlayer Model - SQLite/Sequelize Implementation
 * 
 * Manages player information linked to clubs for the Old Man Footy platform.
 * Handles player registration, validation, and club associations.
 */

import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../config/database.mjs';

/**
 * ClubPlayer model class extending Sequelize Model
 */
class ClubPlayer extends Model {
  /**
   * Get the full name of the player
   * @returns {string} Full name combining first and last name
   */
  getFullName() {
    return `${this.firstName} ${this.lastName}`.trim();
  }

  /**
   * Get the player's age based on date of birth
   * @returns {number|null} Age in years, or null if DOB not set
   */
  getAge() {
    if (!this.dateOfBirth) return null;
    
    const today = new Date();
    const birthDate = new Date(this.dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    
    return age;
  }

  /**
   * Check if player is eligible for masters rugby (35+ years old)
   * @returns {boolean} True if player is 35 or older
   */
  isMastersEligible() {
    const age = this.getAge();
    return age !== null && age >= 35;
  }

  /**
   * Get player's initials for display purposes
   * @returns {string} Player's initials (e.g., "J.D.")
   */
  getInitials() {
    const firstInitial = this.firstName ? this.firstName.charAt(0).toUpperCase() : '';
    const lastInitial = this.lastName ? this.lastName.charAt(0).toUpperCase() : '';
    return `${firstInitial}.${lastInitial}.`;
  }
}

/**
 * Initialize ClubPlayer model with schema definition
 */
ClubPlayer.init({
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  clubId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'clubs',
      key: 'id'
    },
    validate: {
      notNull: {
        msg: 'Club ID is required'
      },
      isInt: {
        msg: 'Club ID must be a valid integer'
      }
    }
  },
  firstName: {
    type: DataTypes.STRING(50),
    allowNull: false,
    validate: {
      notEmpty: {
        msg: 'First name is required'
      },
      len: {
        args: [1, 50],
        msg: 'First name must be between 1 and 50 characters'
      },
      isAlpha: {
        msg: 'First name must contain only letters'
      }
    },
    set(value) {
      // Capitalize first letter and trim whitespace
      if (value) {
        this.setDataValue('firstName', value.trim().charAt(0).toUpperCase() + value.trim().slice(1).toLowerCase());
      }
    }
  },
  lastName: {
    type: DataTypes.STRING(50),
    allowNull: false,
    validate: {
      notEmpty: {
        msg: 'Last name is required'
      },
      len: {
        args: [1, 50],
        msg: 'Last name must be between 1 and 50 characters'
      },
      isAlpha: {
        msg: 'Last name must contain only letters'
      }
    },
    set(value) {
      // Capitalize first letter and trim whitespace
      if (value) {
        this.setDataValue('lastName', value.trim().charAt(0).toUpperCase() + value.trim().slice(1).toLowerCase());
      }
    }
  },
  dateOfBirth: {
    type: DataTypes.DATEONLY,
    allowNull: false,
    validate: {
      notNull: {
        msg: 'Date of birth is required'
      },
      isDate: {
        msg: 'Date of birth must be a valid date'
      },
      isNotFuture(value) {
        if (new Date(value) > new Date()) {
          throw new Error('Date of birth cannot be in the future');
        }
      },
      isReasonableAge(value) {
        const birthYear = new Date(value).getFullYear();
        const currentYear = new Date().getFullYear();
        const age = currentYear - birthYear;
        
        if (age < 16 || age > 100) {
          throw new Error('Player must be between 16 and 100 years old');
        }
      }
    }
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
    notEmpty: {
        msg: 'Email is required'
      },
      isEmail: {
        msg: 'Email must be a valid email address'
      },
      len: {
        args: [5, 254],
        msg: 'Email must be between 5 and 254 characters'
      }
    },
    set(value) {
      // Convert to lowercase and trim
      if (value) {
        this.setDataValue('email', value.trim().toLowerCase());
      }
    }
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    allowNull: false,
    validate: {
      isBoolean: {
        msg: 'Active status must be true or false'
      }
    }
  },
  registeredAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
    allowNull: false
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true,
    validate: {
      len: {
        args: [0, 1000],
        msg: 'Notes cannot exceed 1000 characters'
      }
    },
    set(value) {
      // Trim whitespace
      if (value) {
        this.setDataValue('notes', value.trim());
      }
    }
  },
  shorts: {
    type: DataTypes.ENUM('Unrestricted', 'Red', 'Yellow', 'Blue', 'Green'),
    allowNull: false,
    defaultValue: 'Unrestricted',
    validate: {
      isIn: {
        args: [['Unrestricted', 'Red', 'Yellow', 'Blue', 'Green']],
        msg: 'Shorts must be one of: Unrestricted, Red, Yellow, Blue, Green'
      }
    }
  },
  createdAt: {
    type: DataTypes.DATE,
    allowNull: false
  },
  updatedAt: {
    type: DataTypes.DATE,
    allowNull: false
  }
}, {
  sequelize,
  modelName: 'ClubPlayer',
  tableName: 'club_players',
  timestamps: true,
  indexes: [
    {
      unique: true,
      fields: ['clubId', 'firstName', 'lastName', 'dateOfBirth'],
      name: 'club_players_person_unique'
    },
    {
      fields: ['clubId']
    },
    {
      fields: ['firstName', 'lastName']
    },
    {
      fields: ['isActive']
    },
    {
      fields: ['dateOfBirth']
    },
    {
      fields: ['email']
    }
  ],
  hooks: {
    beforeValidate: (player) => {
      // Additional validation before saving
      if (player.email) {
        // Ensure email is properly formatted
        player.email = player.email.trim().toLowerCase();
      }
    },
    beforeCreate: (player) => {
      // Set registration timestamp
      player.registeredAt = new Date();
    }
  }
});

export default ClubPlayer;