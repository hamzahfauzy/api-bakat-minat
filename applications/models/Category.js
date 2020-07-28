var mongoose = require('mongoose');
// Setup schema
var categorySchema = mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    description:String,
    parent:{},
    create_date: {
        type: Date,
        default: Date.now
    }
});

var Category = module.exports = mongoose.model('categories', categorySchema);
module.exports.get = function (callback, limit) {
    Category.find(callback).limit(limit);
}