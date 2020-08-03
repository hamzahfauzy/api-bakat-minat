var mongoose = require('mongoose');
// Setup schema
var pengumumanSchema = mongoose.Schema({
    tanggal:String,
});

var Pengumuman = module.exports = mongoose.model('pengumuman', pengumumanSchema);
module.exports.get = function (callback, limit) {
    Pengumuman.find(callback).limit(limit);
}