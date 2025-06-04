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
    // Social Media Links - Updated to match routes structure
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
    // Draw Upload - Updated field names to match routes
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
    mySidelineEventId: {
        type: String,
        unique: true,
        sparse: true
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
    }
}, {
    timestamps: true
});

// Index for efficient queries
carnivalSchema.index({ date: 1 });
carnivalSchema.index({ state: 1 });
carnivalSchema.index({ isActive: 1 });

module.exports = mongoose.model('Carnival', carnivalSchema);