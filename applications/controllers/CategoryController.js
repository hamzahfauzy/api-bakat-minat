// Import contact model
Category = require('./../models/Category');
var mongoose = require('mongoose');

// Handle index actions
exports.index = function (req, res) {
    Category.get(function (err, categories) {
        if (err) {
            res.json({
                status: "error",
                message: err,
            });
            return
        }
        res.json({
            status: "success",
            message: "categories retrieved successfully",
            data: categories
        });
    });
};

// Handle create user actions
exports.new = async function (req, res) {
    var category = new Category();
    category.name = req.body.name ? req.body.name : category.name;
    category.description = req.body.description;
    if(req.body.parent)
        parent = await Category.findById(req.body.parent)
    category.parent = req.body.parent ? parent : '';
    category.save(function (err) {
        // if (err)
        //     res.json(err);
        res.json({
            message: 'New category created!',
            data: category
        });
    });
};

// Handle view user info
exports.view = function (req, res) {
    Category.findById(req.params.category_id, function (err, category) {
        if (err)
        {
            res.send(err);
            return
        }
        res.json({
            message: 'Category details loading..',
            data: category
        });
    });
};

exports.viewParent = function (req, res) {
    Category.find({'parent._id':new mongoose.Types.ObjectId(req.params.category_id)}, function (err, categories) {
        if (err)
        {
            res.send(err);
            return
        }
        res.json({
            message: 'Category details loading..',
            data: categories
        });
    });
};

// Handle update user info
exports.update = function (req, res) {
    Category.findById(req.params.category_id, function (err, category) {
        if (err)
        {
            res.send(err);
            return
        }
        category.name = req.body.name ? req.body.name : category.name;
        category.description = req.body.description;
        category.parent = req.body.parent ? req.body.parent : '';
        
        // save the user and check for errors
        category.save(function (err) {
            if (err)
            {
                res.json(err);
                return
            }
            res.json({
                message: 'Category Info updated',
                data: category
            });
        });
    });
};

// Handle delete contact
exports.delete = function (req, res) {
    Category.remove({
        _id: req.params.category_id
    }, function (err, contact) {
        if (err)
        {
            res.send(err);
            return
        }
        res.json({
            status: "success",
            message: 'Category deleted'
        });
    });
};