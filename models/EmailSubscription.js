const mongoose = require('mongoose');

const emailSubscriptionSchema = new mongoose.Schema({
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true
    },
    stateFilter: [{
        type: String,
        enum: ['NSW', 'QLD', 'VIC', 'WA', 'SA', 'TAS', 'NT', 'ACT']
    }],
    isActive: {
        type: Boolean,
        default: true
    },
    unsubscribeToken: {
        type: String,
        unique: true,
        sparse: true
    }
}, {
    timestamps: true
});

// Generate unsubscribe token
emailSubscriptionSchema.methods.generateUnsubscribeToken = function() {
    const crypto = require('crypto');
    this.unsubscribeToken = crypto.randomBytes(32).toString('hex');
    return this.unsubscribeToken;
};

module.exports = mongoose.model('EmailSubscription', emailSubscriptionSchema);