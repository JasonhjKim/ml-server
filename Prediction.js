const mongoose = require('mongoose');

const predictionSchema = new mongoose.Schema({
    spoon: Number,
    knife: Number,
    fork: Number,
    img: String,
    date: {
        type: Date,
        default: Date.now
    }
})

module.exports = mongoose.model('prediction', predictionSchema);