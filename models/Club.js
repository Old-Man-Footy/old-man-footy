const mongoose = require('mongoose');

const clubSchema = new mongoose.Schema({
    clubName: {
        type: String,
        required: true,
        unique: true,
        trim: true
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Club', clubSchema);