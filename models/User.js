const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true
    },
    passwordHash: {
        type: String,
        required: function() {
            return this.isActive;
        }
    },
    firstName: {
        type: String,
        required: true,
        trim: true
    },
    lastName: {
        type: String,
        required: true,
        trim: true
    },
    clubId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Club',
        required: true
    },
    isPrimaryDelegate: {
        type: Boolean,
        default: false
    },
    invitationToken: {
        type: String,
        sparse: true
    },
    tokenExpires: {
        type: Date
    },
    isActive: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true
});

// Hash password before saving
userSchema.pre('save', async function(next) {
    if (!this.isModified('passwordHash')) return next();
    
    try {
        const salt = await bcrypt.genSalt(12);
        this.passwordHash = await bcrypt.hash(this.passwordHash, salt);
        next();
    } catch (error) {
        next(error);
    }
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.passwordHash);
};

// Generate invitation token
userSchema.methods.generateInvitationToken = function() {
    const crypto = require('crypto');
    this.invitationToken = crypto.randomBytes(32).toString('hex');
    this.tokenExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
    return this.invitationToken;
};

module.exports = mongoose.model('User', userSchema);