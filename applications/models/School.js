var mongoose = require('mongoose');
// Setup schema
var schoolSchema = mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    students:[],
    create_date: {
        type: Date,
        default: Date.now
    }
});

var School = module.exports = mongoose.model('schools', schoolSchema);
module.exports.get = function (callback, limit) {
    School.find(callback).limit(limit);
}