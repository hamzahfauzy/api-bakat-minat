var mongoose = require('mongoose');
// Setup schema
var postSchema = mongoose.Schema({
    parent:{},
    title:{
        type:String,
        required:true
    },
    description:{
        type:String,
        required:true
    },
    category:{},
    type_as:String,
    create_date: {
        type: Date,
        default: Date.now
    }
});

// postSchema.set('toObject', { virtuals: true })

// Export User model
var Post = module.exports = mongoose.model('posts', postSchema);
module.exports.get = function (callback, limit) {
    Post.find(callback).limit(limit);
}