var mongoose = require('mongoose');
const config = require('config');
const jwt = require('jsonwebtoken');
const Joi = require('joi');
// Setup schema
var userSchema = mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    username: {
        type: String,
        required: true
    },
    password: {
        type: String,
        required: true
    },
    isAdmin: Boolean,
    status:Boolean,
    metas:{},
    create_date: {
        type: Date,
        default: Date.now
    }
});

//custom method to generate authToken 
userSchema.methods.generateAuthToken = function() { 
  const token = jwt.sign({ _id: this._id, isAdmin: this.isAdmin }, config.get('myprivatekey')); //get the private key from the config file -> environment variable
  return token;
}

// Export User model
var User = module.exports = mongoose.model('users', userSchema);
module.exports.get = function (callback, limit) {
    User.find(callback).limit(limit);
}

module.exports.getParticipant = function (callback, limit) {
    User.find({$or:[ {isAdmin : { '$exists' : false }}, {isAdmin:false}]},callback).limit(limit);
}