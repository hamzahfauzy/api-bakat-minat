var mongoose = require('mongoose');
// Setup schema
var examSchema = mongoose.Schema({
    school_id:String,
    title: {
        type: String,
        required: true
    },
    participants:[],
    sequences:[],
    start_time:String,
    end_time:String,
    create_date: {
        type: Date,
        default: Date.now
    }
});

var Exam = module.exports = mongoose.model('exams', examSchema);
module.exports.get = function (callback, limit) {
    Exam.find(callback).limit(limit);
}