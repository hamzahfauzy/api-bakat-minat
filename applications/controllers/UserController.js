// Import contact model
User = require('./../models/User');
Exam = require('./../models/Exam');
Sequence = require('./../models/Sequence');
School = require('./../models/School');
const jwt = require("jsonwebtoken");
const config = require("config");
// Handle index actions
exports.index = async function (req, res) {
    try 
    {
        let users = await User.find({$or:[ {isAdmin : { '$exists' : false }}, {isAdmin:false}]}).select('-metas')
        if(users)
            res.json({
                status: "success",
                message: "users retrieved successfully",
                data: await users
            });
        else
            res.json({
                status: "error",
                message: "user not found",
            });
    }
    catch(err)
    {
        res.json({
            status: "error",
            message: err.stack,
        });
    }
    return
    
    
    // User.getParticipant(function (err, users) {
    //     if (err) {
    //         res.json({
    //             status: "error",
    //             message: err,
    //         });
    //     }
    //     res.json({
    //         status: "success",
    //         message: "users retrieved successfully",
    //         data: users
    //     });
    // }).catch(e => {
    //     res.json({
    //         status: "error",
    //         message: e,
    //     });
    // });
};

exports.login = async function (req, res) {
    if(!req.body.username || !req.body.password)
        return res.status(400).send({
            message:'Username or Password is empty'
        })
    
    let user = await User.findOne({ username: req.body.username});
    
    if (!user) return res.status(400).send({
        message: "User not found."
    });

    
    if (!user.status) return res.status(400).send({
        message: "User not active."
    });
    
    if(user.isAdmin && user.password != req.body.password) return res.status(400).send({
        message: "User not found."
    })

    const token = user.generateAuthToken();
    res.header("x-auth-token", token).send({
        _id: user._id,
        name: user.name,
        isAdmin: user.isAdmin,
        token: token,
    });
};

exports.register = async function (req, res) {
    var user = new User()

    user.name = "Administrator";
    user.username = "admin";
    user.password = "admin";
    user.isAdmin = true;
    user.status = true;
// save the user and check for errors
    user.save(function (err) {
        // if (err)
        //     res.json(err);
        res.json({
            message: 'Admin registered!',
            data: user
        });
    });
};

// Handle create user actions
exports.new = function (req, res) {
    var user = new User();
    user.name = req.body.name ? req.body.name : user.name;
    user.username = req.body.username;
    user.password = req.body.password;
    user.isAdmin  = false;
    user.status   = true;
// save the user and check for errors
    user.save(function (err) {
        // if (err)
        //     res.json(err);
        res.json({
            message: 'New user created!',
            data: user
        });
    });
};

// Handle view user info
exports.view = function (req, res) {
    User.findById(req.params.user_id, function (err, user) {
        if (err)
            res.send(err);
        res.json({
            message: 'User details loading..',
            data: user
        });
    });
};

// Handle view user info
exports.detail = async function (req, res) {
    const token = req.headers["x-access-token"] || req.headers["authorization"];
    try {
        //if can verify the token, set req.user and pass to next middleware
        const decoded = jwt.verify(token, config.get("myprivatekey"));
        var user = await User.findById(decoded._id)
        var otherData = {}
        if('exam_id' in user.metas) //.exam_id != undefined)
        {
            otherData = await Exam.findById(user.metas.exam_id).populate('participants')
            if(otherData)
            {
                otherData = JSON.stringify(otherData)
                otherData = JSON.parse(otherData)
                var school = await School.findById(otherData.school_id)    
                otherData.school = await school
            }
            else
                otherData = {}
        }
        res.json({
            message: 'User details loading..',
            data: user,
            otherData:otherData,
        });
        
    } catch (ex) {
        //if invalid token
        res.status(400).send("Invalid token.");
    }
};

// Handle update user info
exports.update = function (req, res) {
    User.findById(req.params.user_id, function (err, user) {
        if (err)
            res.send(err);
        user.name = req.body.name ? req.body.name : user.name;
        user.username = req.body.username;
        user.password = req.body.password;
        
        // save the user and check for errors
        user.save(function (err) {
            if (err)
                res.json(err);
            res.json({
                message: 'User Info updated',
                data: user
            });
        });
    });
};

// Handle delete contact
exports.delete = function (req, res) {
    User.remove({
        _id: req.params.user_id
    }, function (err, contact) {
        if (err)
            res.send(err);
        res.json({
            status: "success",
            message: 'User deleted'
        });
    });
};