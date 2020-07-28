// Import contact model
School = require('../models/School');
User = require('../models/User');
var mongoose = require('mongoose');
var formidable = require('formidable')
const readXlsxFile = require('read-excel-file/node')
var mv = require('mv');
var path = require('path');
var appDir = path.dirname(require.main.filename);

// Handle index actions
exports.index = function (req, res) {
    School.get(function (err, schools) {
        if (err) {
            res.json({
                status: "error",
                message: err,
            });
            return
        }
        res.json({
            status: "success",
            message: "schools retrieved successfully",
            data: schools
        });
    });
};

// Handle create user actions
exports.new = async function (req, res) {
    var school = new School();
    school.name = req.body.name ? req.body.name : school.name;
    school.students = req.body.students;
    school.save(function (err) {
        if (err)
        {
            res.json(err);
            return
        }
        res.json({
            message: 'New school created!',
            data: school
        });
    });
};

// Handle view user info
exports.view = function (req, res) {
    School.findById(req.params.school_id, function (err, school) {
        if (err)
        {
            res.send(err);
            return
        }
        res.json({
            message: 'school details loading..',
            data: school
        });
    });
};

exports.importStudents = function (req, res) {
    var form = new formidable.IncomingForm();
    form.parse(req, function (err, fields, files) {
        var oldpath = files.filetoupload.path;
        var newpath = appDir + "/uploads/" + files.filetoupload.name
        mv(oldpath, newpath, function (err) {
            readXlsxFile(newpath).then(async (rows) => {
                // Remove Header ROW
                // rows.shift();
                School.findById(fields.school_id, async function (err, school) {
                    if (err)
                    {
                        res.send(err);
                        return
                    }
                        var students = []
                        for(var i=1;i<rows.length;i++)
                        {
                            var val = rows[i]
                            var user_exists = await User.findOne({
                                name: val[2],
                                username:val[1]
                            })
                            var metas = {}
                            if(user_exists)
                            {
                                metas = JSON.stringify(user_exists.metas)
                                metas = JSON.parse(metas)
                            }
                            metas.school = school
                            var user = await User.findOneAndUpdate({
                                name: val[2],
                                username:val[1]
                            },{
                                name: val[2],
                                username: val[1],
                                password: 123,
                                isAdmin: false,
                                status: true,
                                metas: metas,
                            },{new:true,upsert:true})
                            students.push({
                                _id:user._id,
                                nis:val[1],
                                name:val[2],
                            })
                        }
                    school.students = students
                    school.save(function (err) {
                        if (err)
                        {
                            res.json(err);
                            return
                        }
                        res.json({
                            message: 'School Info updated',
                            data: school
                        });
                    });
                });
            })
        })
    })
    
};

// Handle update user info
exports.update = function (req, res) {
    School.findById(req.params.school_id, function (err, school) {
        if (err)
        {
            res.send(err);
            return
        }
        school.name = req.body.name ? req.body.name : school.name;
        school.students = req.body.students;
        
        // save the user and check for errors
        school.save(function (err) {
            if (err)
                res.json(err);
            res.json({
                message: 'school Info updated',
                data: school
            });
        });
    });
};

// Handle delete contact
exports.delete = function (req, res) {
    User.deleteMany({
        'metas.school._id' : new mongoose.Types.ObjectId(req.params.school_id)
    }, (err, user) => {

    })
    School.remove({
        _id: req.params.school_id
    }, function (err, school) {
        if (err)
        {
            res.send(err);
            return
        }
        res.json({
            status: "success",
            message: 'School deleted'
        });
    });
};