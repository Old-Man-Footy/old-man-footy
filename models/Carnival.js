const mongoose = require('mongoose');

const carnivalSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true
    },
    date: {
        type: Date,
        required: true
    },
    locationAddress: {
        type: String,
        required: true,
        trim: true
    },
    organiserContactName: {
        type: String,
        required: true,
        trim: true
    },
    organiserContactEmail: {
        type: String,
        required: true,
        lowercase: true,
        trim: true
    },
    organiserContactPhone: {
        type: String,
        required: true,
        trim: true
    },
    scheduleDetails: {
        type: String,
        required: true
    },
    registrationLink: {
        type: String,
        trim: true
    },
    feesDescription: {
        type: String,
        trim: true
    },
    callForVolunteers: {
        type: String,
        trim: true
    },
    clubLogoURL: {
        type: String,
        trim: true
    },
    promotionalImageURL: {
        type: String,
        trim: true
    },
    // Additional images support
    additionalImages: [{
        type: String,
        trim: true
    }],
    // Social Media Links
    socialMediaFacebook: {
        type: String,
        trim: true
    },
    socialMediaInstagram: {
        type: String,
        trim: true
    },
    socialMediaTwitter: {
        type: String,
        trim: true
    },
    socialMediaWebsite: {
        type: String,
        trim: true
    },
    // Enhanced Draw/Document Upload Support
    drawFiles: [{
        url: {
            type: String,
            required: true
        },
        name: {
            type: String,
            required: true
        },
        uploadDate: {
            type: Date,
            default: Date.now
        },
        description: {
            type: String,
            trim: true
        }
    }],
    // Legacy draw fields for backward compatibility
    drawFileURL: {
        type: String,
        trim: true
    },
    drawFileName: {
        type: String,
        trim: true
    },
    drawTitle: {
        type: String,
        trim: true
    },
    drawDescription: {
        type: String,
        trim: true
    },
    createdByUserId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    isManuallyEntered: {
        type: Boolean,
        default: true
    },
    // MySideline Integration Fields
    mySidelineEventId: {
        type: String,
        unique: true,
        sparse: true,
        trim: true
    },
    lastMySidelineSync: {
        type: Date
    },
    mySidelineSourceUrl: {
        type: String,
        trim: true
    },
    state: {
        type: String,
        enum: ['NSW', 'QLD', 'VIC', 'WA', 'SA', 'TAS', 'NT', 'ACT'],
        required: true
    },
    isActive: {
        type: Boolean,
        default: true
    },
    claimedAt: {
        type: Date
    },
    // Enhanced fields for better carnival management
    maxTeams: {
        type: Number,
        min: 1
    },
    currentRegistrations: {
        type: Number,
        default: 0,
        min: 0
    },
    ageCategories: [{
        type: String,
        enum: ['35+', '40+', '45+', '50+', '55+', '60+', 'Open']
    }],
    isRegistrationOpen: {
        type: Boolean,
        default: true
    },
    registrationDeadline: {
        type: Date
    },
    // Weather and ground conditions
    weatherConditions: {
        type: String,
        trim: true
    },
    groundConditions: {
        type: String,
        trim: true
    },
    // Admin notes (only visible to carnival owner and primary delegates)
    adminNotes: {
        type: String,
        trim: true
    }
}, {
    timestamps: true
});

// Virtual for determining if registration is still open
carnivalSchema.virtual('isRegistrationActive').get(function() {
    if (!this.isRegistrationOpen) return false;
    if (this.registrationDeadline && new Date() > this.registrationDeadline) return false;
    if (this.maxTeams && this.currentRegistrations >= this.maxTeams) return false;
    return true;
});

// Virtual for days until carnival
carnivalSchema.virtual('daysUntilCarnival').get(function() {
    const today = new Date();
    const carnivalDate = new Date(this.date);
    const diffTime = carnivalDate - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
});

// Virtual for carnival status
carnivalSchema.virtual('status').get(function() {
    const today = new Date();
    const carnivalDate = new Date(this.date);
    
    if (carnivalDate < today) return 'completed';
    if (carnivalDate.toDateString() === today.toDateString()) return 'today';
    if (this.daysUntilCarnival <= 7) return 'upcoming';
    return 'future';
});

// Virtual for checking if this is a MySideline imported event
carnivalSchema.virtual('isMySidelineEvent').get(function() {
    return !!(this.mySidelineEventId && !this.isManuallyEntered);
});

// Indexes for efficient queries
carnivalSchema.index({ date: 1 });
carnivalSchema.index({ state: 1 });
carnivalSchema.index({ isActive: 1 });
carnivalSchema.index({ mySidelineEventId: 1 });
carnivalSchema.index({ createdByUserId: 1 });
carnivalSchema.index({ isManuallyEntered: 1 });
carnivalSchema.index({ date: 1, state: 1 });

// Static methods for common queries
carnivalSchema.statics.findUpcoming = function() {
    return this.find({
        isActive: true,
        date: { $gte: new Date() }
    }).sort({ date: 1 });
};

carnivalSchema.statics.findByState = function(state) {
    return this.find({
        isActive: true,
        state: state
    }).sort({ date: 1 });
};

carnivalSchema.statics.findMySidelineEvents = function() {
    return this.find({
        isActive: true,
        mySidelineEventId: { $exists: true, $ne: null }
    }).sort({ date: 1 });
};

// Instance method to check if user can edit this carnival
carnivalSchema.methods.canUserEdit = function(user) {
    if (!user) return false;
    
    // Primary delegates can edit any carnival
    if (user.isPrimaryDelegate) return true;
    
    // Users can edit their own carnivals
    if (this.createdByUserId && this.createdByUserId.toString() === user._id.toString()) return true;
    
    return false;
};

// Pre-save middleware to ensure consistent data
carnivalSchema.pre('save', function(next) {
    // Ensure current registrations doesn't exceed max teams
    if (this.maxTeams && this.currentRegistrations > this.maxTeams) {
        this.currentRegistrations = this.maxTeams;
    }
    
    // If this is a MySideline event being manually managed, update the flag
    if (this.mySidelineEventId && this.isModified('createdByUserId') && this.createdByUserId) {
        this.isManuallyEntered = true;
    }
    
    next();
});

// Ensure virtual fields are included in JSON output
carnivalSchema.set('toJSON', { virtuals: true });
carnivalSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Carnival', carnivalSchema);