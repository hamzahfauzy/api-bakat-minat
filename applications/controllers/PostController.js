// Import contact model
var mongoose = require('mongoose');
Post = require('./../models/Post');
Category = require('./../models/Category');
var mv = require('mv');
var path = require('path');
var appDir = path.dirname(require.main.filename);
var formidable = require('formidable')
const readXlsxFile = require('read-excel-file/node')

// Handle index actions
exports.index = async function (req, res) {
    try 
    {
        var posts = await Post.find({$and:[ {type_as : {$ne:'answer'}}, {type_as : {$ne:'correct answer'}}]})
        posts = JSON.stringify(posts)
        posts = JSON.parse(posts)
        if(posts)
        {
            for(var i = 0; i < posts.length; i++)
            {
                var post = posts[i]
                if(post.type_as == 'question')
                {
                    post.answers = await Post.find({'parent._id':new mongoose.Types.ObjectId(post._id)})
                }
            }
            res.json({
                status: "success",
                message: "posts retrieved successfully",
                data: posts,
                // answers:_answers
            });
        }
        else
            res.json({
                status: "error",
                message: "posts not found",
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
    Post.get(function (err, posts) {
        if (err) {
            res.json({
                status: "error",
                message: err,
            });
        }
        res.json({
            status: "success",
            message: "posts retrieved successfully",
            data: posts
        });
    });
};

// Handle create user actions
exports.new = async function (req, res) {
    var post = new Post();
    post.title = req.body.title;
    post.description = req.body.description;
    var parent = req.body.parent ? await Post.findById(req.body.parent) : ''
    var category = req.body.category ? await Category.findById(req.body.category) : ''
    post.parent = parent;
    post.category = category;
    post.type_as = req.body.type_as;
    post.save(function (err) {
        if (err)
        {
            res.json(err);
            return
        }
        res.json({
            message: 'New post created!',
            data: post
        });
    });
};

exports.importPosts = async function (req, res) {
    var form = new formidable.IncomingForm();
    var oldpath = ""
    var newpath = ""
    form.parse(req, async function (err, fields, files) {
        oldpath = files.filetoupload.path;
        newpath = appDir + "/uploads/" + files.filetoupload.name
        mv(oldpath, newpath, async function (err) {
            var rows = await readXlsxFile(newpath)
            // rows.shift()
            var categories = []
            var subcategories = []
            for(i=1;i<rows.length;i++)
            {
                var val = rows[i]
                // var category = await Category.findOneAndUpdate({name:val[1]},{
                //     name:val[1],
                //     category:val[1],
                // },{new:true,upsert:true})
                // console.log('category')

                var subcategory = await Category.findOneAndUpdate({name:val[2]},{
                    name:val[2],
                    category:val[2],
                    // parent:category
                },{new:true,upsert:true})
                // console.log('subcategory')

                const post = new Post({
                    title:'Soal Exam '+i,
                    description: val[0],
                    category: subcategory,
                    type_as: 'question'
                })
                let postSave = await post.save()
                // console.log('post')

                for(idx=1;idx<=4;idx++){
                    const answer = new Post({
                        title:'Jawaban '+idx+' Soal '+i,
                        description: val[2+idx],
                        parent: postSave,
                        type_as: idx == 1 ? 'correct answer' : 'answer'
                    })
                    let answerSave = await answer.save()
                    // console.log('answer')
                }
            }
            res.json({
                message: 'Post Import success',
            })
        }) 
    });
};

// Handle view user info
exports.view = function (req, res) {
    Post.findById(req.params.post_id, function (err, post) {
        if (err)
        {
            res.send(err);
            return
        }
        res.json({
            message: 'Post details loading..',
            data: post
        });
    });
};

exports.viewParent = function (req, res) {
    Post.find({'parent._id':new mongoose.Types.ObjectId(req.params.post_id)}, function (err, posts) {
        if (err)
            res.send(err);
        res.json({
            message: 'Post details loading..',
            data: posts
        });
    });
};

exports.viewByType = function (req, res) {
    Post.find({type_as:req.params.type_as}, async function (err, posts) {
        if (err)
        {
            res.send(err);
            return
        }

        var _posts = []
        // _post.question = post

        if(req.params.type_as == 'question')
        {
            for(i=0;i<posts.length;i++)
            {
                var post = posts[i]
                var answers = await Post.find({parent:post})
                _posts.push({question:post,answers:answers})
            }
        }
        else
            _posts = posts
        res.json({
            message: 'Post details loading..',
            data: _posts
        });
    });
};

// Handle update user info
exports.update = async function (req, res) {
    var post = await Post.findById(req.params.post_id)
    post.title = req.body.title;
    post.description = req.body.description;
    var category = req.body.category ? await Category.findById(req.body.category) : post.category
    post.category = category;
    post.type_as = req.body.type_as;
    post.save(function (err) {
        if (err)
        {
            res.json(err);
            return
        }
        res.json({
            message: 'Post Info updated',
            data: post
        });
    });
};

// Handle delete contact
exports.delete = function (req, res) {
    Post.remove({
        _id: req.params.post_id
    }, function (err, contact) {
        if (err)
        {
            res.send(err);
            return
        }
        res.json({
            status: "success",
            message: 'Pot deleted'
        });
    });
};