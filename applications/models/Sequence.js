var mongoose = require('mongoose');
// Setup schema
var sequenceSchema = mongoose.Schema({
    title: {
        type: String,
        required: true
    },
    contents:[],
    order:Number,
    countdown:Number,
    create_date: {
        type: Date,
        default: Date.now
    }
});

var School = module.exports = mongoose.model('sequences', sequenceSchema);
module.exports.get = function (callback, limit) {
    School.find(callback).limit(limit);
}