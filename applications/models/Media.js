var mongoose = require('mongoose');
// Setup schema
var mediaSchema = mongoose.Schema({
    name: String,
    url:String,
    uploaded:String,
});

var Media = module.exports = mongoose.model('media', mediaSchema);
module.exports.get = function (callback, limit) {
    Media.find(callback).limit(limit);
}