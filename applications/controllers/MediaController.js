// Import contact model
Media = require('./../models/Media');
var mv = require('mv');
var path = require('path');
var appDir = path.dirname(require.main.filename);
var formidable = require('formidable')
var url = require('url') ;

// Handle index actions
exports.index = function (req, res) {
    Media.get(function (err,  media) {
        if (err) {
            res.json({
                status: "error",
                message: err,
            });
        }
        res.json({
            status: "success",
            message: "media retrieved successfully",
            data: media
        });
    });
};

// Handle create user actions
exports.new = async function (req, res) {
    var form = new formidable.IncomingForm();
    var oldpath = ""
    var newpath = ""
    var hostname = req.headers.host; // hostname = 'localhost:8080'
    var pathname = url.parse(req.url).pathname; // pathname = '/MyApp'
    var base_url = 'http://' + hostname
    
    form.parse(req, async function (err, fields, files) {
        var _file = req.query.upload ? files.upload : files.filetoupload
        oldpath = _file.path;
        newpath = appDir + "/uploads/" + _file.name
        mv(oldpath, newpath, async function (err) {
            var media = new Media();
            media.name = _file.name;
            media.url = base_url + '/api/uploads/' + _file.name;
            media.uploaded = '1';
            
            await media.save();
            res.json({
                uploaded:1,
                filename:media.name,
                url:media.url,
                status: "success",
                message: "success",
            });
        }) 
    });
};

exports.delete = function (req, res) {
    Media.remove({
        _id: req.params.media_id
    }, function (err, contact) {
        if (err)
            res.send(err);
        res.json({
            status: "success",
            message: 'Media deleted'
        });
    });
};
