// Import contact model
Exam = require('./../models/Exam')
User = require('./../models/User')
Post = require('./../models/Post')
School = require('./../models/School')
Sequence = require('./../models/Sequence')
Pengumuman = require('./../models/Pengumuman')
var mongoose = require('mongoose');
var mv = require('mv');
var path = require('path');
var appDir = path.dirname(require.main.filename);
var formidable = require('formidable')
const readXlsxFile = require('read-excel-file/node')
var xl = require('excel4node');
const Pengumuman = require('../models/Pengumuman')

exports.pengumuman = async function (req, res)
{
    let pengumuman = await Pengumuman.find({})
    res.json({
        status: "success",
        message: "pengumuman retrieved successfully",
        data: await pengumuman
    });
    return
}

// Handle index actions
exports.index = async function (req, res) {
    try 
    {
        let exams = await Exam.find({}).select('-participants')
        if(exams)
            res.json({
                status: "success",
                message: "exams retrieved successfully",
                data: await exams
            });
        else
            res.json({
                status: "error",
                message: "exam not found",
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
    // Exam.get(async function (err, exams) {
    //     if (err) {
    //         res.json({
    //             status: "error",
    //             message: err,
    //         });
    //         return
    //     }

    //     var _exams = JSON.stringify(exams)
    //     _exams = JSON.parse(_exams)
    //     delete exams.participants

    //     for(var h=0;h<_exams.length;h++){
    //         var users = _exams[h].participants
    //         var reports = []
    //         for(var i=0;i<users.length;i++)
    //         {
    //             var participant = users[i]
    //             var user = await User.findById(users[i]._id)
    //             if(!user) continue
    //             user = JSON.stringify(user)
    //             user = JSON.parse(user)
    //             // delete user.metas.sequences
    //             delete user.metas.school
    //             // delete user.sequences
    //             var sequences = user.metas.sequences
    //             if(typeof sequences === 'undefined'){
    //                 user.metas.NISN = participant.nis
    //                 reports.push(user)
    //                 continue
    //             } 
    //             for (var j = 0; j < sequences.length; j++) 
    //             {
    //                 var quis = j+1
    //                 if(quis%2 != 0) continue;
    //                 var sequence = sequences[j].contents
    //                 var nilai = 0
    //                 for(var k = 0; k < sequence.length; k++)
    //                 {
    //                     var content = sequence[k]
    //                     // if(content.childs.length == 0) continue;
    //                     if(typeof content.selected === 'undefined') continue
    //                     var selected = content.selected
    //                     var post = await Post.findById(selected)
    //                     if(post && post.type_as == "correct answer") nilai++
    //                 }
    //                 // user.nilai.push({
    //                 //     title:sequences[j].title,
    //                 //     nilai:nilai
    //                 // })
    //                 user[""+sequences[j].title] = nilai
    //             }
    //             delete user.metas.sequences
    //             reports.push(user)
    //         }
    //         _exams[h].participants = reports
    //     }

    //     res.json({
    //         status: "success",
    //         message: "Exam retrieved successfully",
    //         data: _exams
    //     });
    // });
};

// Handle create user actions
exports.new = async function (req, res) {
    var exam = new Exam();
    var school = await School.findById(req.body.school_id)
    exam.school_id = req.body.school_id
    // exam.participants = school.students
    exam.title = req.body.title;
    exam.start_time = req.body.start_time;
    exam.end_time = req.body.end_time;
    exam.school_id = req.body.school_id;
    var examSave = await exam.save()

    var participants = []
    for(var i=0;i<school.students.length;i++)
    {
        var val = school.students[i]

        var sch = JSON.stringify(school)
        sch = JSON.parse(sch)

        delete sch.students

        // var metas = {
        //     school:sch,
        //     exam_id:examSave._id
        // }
        var user = await User.findOneAndUpdate({
            _id:val._id,
        },{
            $set:{"metas.school":sch,"metas.exam_id":exam._id},
            // metas: metas,
        })
        participants.push({
            _id:user._id,
            nis:val.nis,
            name:val.name
        })
    }

    Exam.findById(examSave._id, function (err, exam) {
        exam.participants = participants
        exam.save(err => {
            if(err)
            {
                res.json({
                    message: 'New exam created error!',
                    data: err
                });
                return
            }
            res.json({
                message: 'New exam created!',
                data: exam
            });
        })
    })

};

// Handle create user actions
exports.duplicate = function (req, res) {
    Exam.findById(req.params.exam_id, function (err, exam) {
        if (err)
        {
            res.send(err);
            return
        }
        var newExam = new Exam(exam)
        newExam._id = mongoose.Types.ObjectId()
        newExam.isNew = true
        newExam.title = req.body.title
        newExam.participants = []
        newExam.start_time = req.body.start_time
        newExam.end_time = req.body.end_time
        newExam.save(function (err) {
            if (err)
            {
                res.json(err);
                return
            }
            res.json({
                message: 'Exam Info duplicated',
                data: newExam
            });
        });
    });
};

// Handle view user info
exports.view = async function (req, res) {
    var exam = await Exam.findById(req.params.exam_id)
    var _exam = JSON.stringify(exam)
        _exam = JSON.parse(_exam)
    var users = _exam.participants
    var reports = []
    for(var i=0;i<users.length;i++)
    {
        var participant = users[i]
        var user = await User.findById(users[i]._id)
        if(!user) continue
        user = JSON.stringify(user)
        user = JSON.parse(user)
        // delete user.metas.sequences
        delete user.metas.school
        // delete user.sequences
        var sequences = user.metas.sequences
        if(typeof sequences === 'undefined'){
            user.metas.NISN = participant.nis
            reports.push(user)
            continue
        } 

        var hasil_arr = []
        var subtest_R = [2,14,26]
        var subtest_I = [4,16,28]
        var subtest_A = [6,18,30]
        var subtest_S = [8,20,32]
        var subtest_E = [10,22,34]
        var subtest_C = [12,24,36]
        var R = 0, I = 0, A = 0, S = 0, E = 0, C = 0
        for (var j = 0; j < sequences.length; j++) 
        {
            var quis = j+1
            if(quis%2 != 0) continue;
            var sequence = sequences[j].contents
            var nilai = 0
            for(var k = 0; k < sequence.length; k++)
            {
                var content = sequence[k]
                // if(content.childs.length == 0) continue;
                if(typeof content.selected === 'undefined') continue
                var selected = content.selected
                var post = await Post.findById(selected)
                if(post) nilai+= parseInt(post.type_as)
            }

            if(subtest_R.includes(quis))
                R += nilai
            if(subtest_I.includes(quis))
                I += nilai
            if(subtest_A.includes(quis))
                A += nilai
            if(subtest_S.includes(quis))
                S += nilai
            if(subtest_E.includes(quis))
                E += nilai
            if(subtest_C.includes(quis))
                C += nilai
        }
        
        // for (var j = 0; j < sequences.length; j++) 
        // {
        //     var quis = j+1
        //     if(quis%2 != 0) continue;
        //     var sequence = sequences[j].contents
        //     var nilai = 0
        //     for(var k = 0; k < sequence.length; k++)
        //     {
        //         var content = sequence[k]
        //         // if(content.childs.length == 0) continue;
        //         if(typeof content.selected === 'undefined') continue
        //         var selected = content.selected
        //         var post = await Post.findById(selected)
        //         if(post && post.type_as == "correct answer") nilai++
        //     }
        //     // user.nilai.push({
        //     //     title:sequences[j].title,
        //     //     nilai:nilai
        //     // })
        //     user[""+sequences[j].title] = nilai
        // }
        user["R"] = R
        user["I"] = I
        user["A"] = A
        user["S"] = S
        user["E"] = E
        user["C"] = C
        delete user.metas.sequences
        reports.push(user)
    }
    _exam.participants = reports
    res.json({
        message: 'Exam detail loading..',
        data: _exam
    });
    // Exam.findById(req.params.exam_id, function (err, exam) {
    //     if (err)
    //         res.send(err);
    //     res.json({
    //         message: 'Exam detail loading..',
    //         data: exam
    //     });
    // });
};

exports.update = function (req, res) {
    Exam.findById(req.params.exam_id, async function (err, exam) {
        if (err)
        {
            res.send(err);
            return
        }
        var school = await School.findById(req.body.school_id)
        var participants = []
        for(var i=0;i<school.students.length;i++)
        {
            var val = school.students[i]
            var metas = {
                school:school,
                exam_id:exam._id
            }
            var user = await User.findOneAndUpdate({
                _id:val._id,
            },{
                $set:{"metas.school":school,"metas.exam_id":exam._id}
                // metas: metas,
            })
            if(!user) continue
            participants.push({
                _id:user._id,
                nis:val.nis,
                name:val.name,
            })
        }
        exam.title = req.body.title
        exam.start_time = req.body.start_time;
        exam.end_time = req.body.end_time;
        exam.school_id = req.body.school_id;
        exam.participants = participants;
        exam.save(function (err) {
            if (err)
            {
                res.json(err);
                return
            }
            res.json({
                message: 'Exam Info updated',
                data: exam
            });
        });
    });
};

exports.importParticipants = function (req, res) {
    var form = new formidable.IncomingForm();
    form.parse(req, function (err, fields, files) {
        var oldpath = files.filetoupload.path;
        var newpath = appDir + "/uploads/" + files.filetoupload.name
        mv(oldpath, newpath, function (err) {
            readXlsxFile(newpath).then(async (rows) => {
                // Remove Header ROW
                // rows.shift();

                var participants = []
                for(var i=1;i<rows.length;i++)
                {
                    var val = rows[i]
                    var user = await User.findOneAndUpdate({
                        name: val[2],
                        username:val[1],
                    },{
                        name: val[2],
                        username: val[1],
                        password: 123,
                        isAdmin: false,
                        status: true,
                        metas: {
                            exam_id:fields.exam_id,
                        }
                    },{new:true,upsert:true})
                    participants.push({
                            _id:user._id,
                            nis:val[1],
                            name:val[2]
                        
                    })
                }
                Exam.findById(fields.exam_id, function (err, exam) {
                    if (err)
                    {
                        res.send(err);
                        return
                    }
                    exam.participants = participants
                    exam.save(function (err) {
                        if (err)
                        {
                            res.json(err);
                            return
                        }
                        res.json({
                            message: 'Exam Info updated',
                            data: exam
                        });
                    });
                });
            })
        })
    })
    
};

exports.updateOrder = (req,res) => {
    Exam.findOne({'sequences._id':req.params.sequence_id.toString()}, (err, exam) => {
        var sequences = JSON.stringify(exam.sequences)
        sequences = JSON.parse(sequences)
        sequences.forEach(val => {
            if(val._id == req.params.sequence_id.toString())
                val.order = req.body.order
        })
        exam.sequences = sequences
        exam.save(function (err) {
            if (err)
            {
                res.json(err);
                return
            }
            res.json({
                message: 'Exam Info updated',
                data: exam
            });
        });
    });
    // Exam.find({'sequences._id':req.params.sequence_id, async function (err, exam) {
    //     if (err)
    //         res.send(err);
    //     exam.sequence.order = req.body.order
    //     exam.save(function (err) {
    //         if (err)
    //             res.json(err);
    //         res.json({
    //             message: 'Exam Info updated',
    //             data: exam
    //         });
    //     });
    // });
}
exports.updateCountdown = (req,res) => {
    Exam.findOne({'sequences._id':req.params.sequence_id.toString()}, (err, exam) => {
        var sequences = JSON.stringify(exam.sequences)
        sequences = JSON.parse(sequences)
        sequences.forEach(val => {
            if(val._id == req.params.sequence_id.toString())
                val.countdown = req.body.countdown
        })
        exam.sequences = sequences
        exam.save(function (err) {
            if (err)
            {
                res.json(err);
                return
            }
            res.json({
                message: 'Exam Info updated',
                data: exam
            });
        });
    });
}

exports.addSequence = async (req,res) => { 
    Exam.findById(req.params.exam_id, async function (err, exam) {
        if (err)
        {
            res.send(err);
            return
        }
        var sequences = req.body
        var posts = []
        if(sequences.content_type == 'category')
            posts = await Post.find({'category._id':new mongoose.Types.ObjectId(sequences.content)})
        else
            posts = await Post.findById(new mongoose.Types.ObjectId(sequences.content))
        var sequence = {
            title:sequences.title,
            contents:posts,
            order:sequences.order,
            countdown:sequences.timeout,
        }
        exam.sequences.push(sequence)
        exam.save(function (err) {
            if (err)
            {
                res.json(err);
                return
            }
            res.json({
                message: 'Exam Info updated',
                data: exam
            });
        });
    });
}

exports.report2 = async (req,res) => {
    // Create a new instance of a Workbook class
    var wb = new xl.Workbook();
    // Add Worksheets to the workbook
    var ws = wb.addWorksheet('Sheet 1');

    ws.cell(1, 1)
      .string("No")
    ws.cell(1, 2)
      .string("NAMA")
    var header_start = 3;
    var sequences = await Sequence.find({})
    for(var i=0;i<sequences.length;i++){
        var quis = i+1
        if(quis%2 != 0) continue;
        ws.cell(1, header_start).string(sequences[i].title)
        header_start++
    }
    ws.cell(1, 11)
      .string("HASIL 1")
    ws.cell(1, 12)
      .string("HASIL 2")
    var exam = await Exam.findById(req.params.exam_id)
    var users = exam.participants
    var school = await School.findById(exam.school_id)
    users = JSON.stringify(users)
    users = JSON.parse(users)
    for(var i=0;i<users.length;i++)
    {
        var n = i+1;
        var row = i+2;
        ws.cell(row, 1).number(n)
        var participant = users[i]
        var user = await User.findById(users[i]._id)
        if(!user) continue
        user = JSON.stringify(user)
        user = JSON.parse(user)
        // delete user.metas.sequences
        delete user.metas.school
        // delete user.sequences
        ws.cell(row, 2).string(user.name)
        var sequences = user.metas.sequences
        if(typeof sequences === 'undefined'){
            ws.cell(row, 3).number(0)
            ws.cell(row, 4).number(0)
            ws.cell(row, 5).number(0)
            ws.cell(row, 6).number(0)
            ws.cell(row, 7).number(0)
            ws.cell(row, 8).number(0)
            ws.cell(row, 9).number(0)
            ws.cell(row, 10).number(0)
            ws.cell(row, 11).number(0)
            ws.cell(row, 12).number(0)
            continue
        } 
        var subtest = 3, IPS = 0, IPA = 0, BAHASA1 = 0, BAHASA2 = 0, hasil1 = "", hasil2 = ""
        for (var j = 0; j < sequences.length; j++) 
        {
            var quis = j+1
            if(quis%2 != 0) continue;
            var sequence = sequences[j].contents
            var nilai = 0
            for(var k = 0; k < sequence.length; k++)
            {
                var content = sequence[k]
                // if(content.childs.length == 0) continue;
                if(typeof content.selected === 'undefined') continue
                var selected = content.selected
                var post = await Post.findById(selected)
                if(post && post.type_as == "correct answer") nilai++
            }
            // user.nilai.push({
            //     title:sequences[j].title,
            //     nilai:nilai
            // })
            // user[""+sequences[j].title] = nilai
            if(subtest <= 4) BAHASA1+=nilai
            if(subtest == 5 || subtest == 6) BAHASA2+=nilai
            if(subtest <= 6) IPS+=nilai
            if(subtest >= 7) IPA+=nilai
            ws.cell(row, subtest).number(nilai)
            subtest++
        }
        hasil1 = IPS > IPA ? "IPS" : "IPA"
        hasil1 = IPS == IPA ? "?" : hasil1
        hasil2 = BAHASA1 < BAHASA2 ? "BAHASA" : ""
 
        ws.cell(row, 11).string(hasil1)
        ws.cell(row, 12).string(hasil2)
    }
     
    // Create a reusable style
    // var style = wb.createStyle({
    //   font: {
    //     color: '#FF0800',
    //     size: 12,
    //   },
    //   numberFormat: '$#,##0.00; ($#,##0.00); -',
    // });
     
    // // Set value of cell A1 to 100 as a number type styled with paramaters of style
    // ws.cell(2, 1)
    //   .number(100)
     
    // // Set value of cell B1 to 200 as a number type styled with paramaters of style
    // ws.cell(2, 2)
    //   .number(200)
     
    // // Set value of cell C1 to a formula styled with paramaters of style
    // ws.cell(2, 3)
    //   .formula('A1 + B1')
     
    // // Set value of cell A2 to 'string' styled with paramaters of style
    // ws.cell(3, 1)
    //   .string('string')
     
    // // Set value of cell A3 to true as a boolean type styled with paramaters of style but with an adjustment to the font size.
    // ws.cell(4, 1)
    //   .bool(true)
     
    wb.write('uploads/'+school.name+'.xlsx');

    res.json({file:'uploads/'+school.name+'.xlsx'});
}

exports.beritaacara = async (req,res) => {
    // Create a new instance of a Workbook class
    var wb = new xl.Workbook();
    // Add Worksheets to the workbook
    var ws = wb.addWorksheet('Sheet 1');

    var dt = new Date();
    // var end_time = `${dt.getDate().toString().padStart(2, '0')}/${(dt.getMonth()+1).toString().padStart(2, '0')}/${dt.getFullYear().toString().padStart(4, '0')} ${dt.getHours().toString().padStart(2, '0')}:${dt.getMinutes().toString().padStart(2, '0')}:${dt.getSeconds().toString().padStart(2, '0')}`

    var exam = await Exam.findById(req.params.exam_id)
    var users = exam.participants
    var school = await School.findById(exam.school_id)

    ws.cell(1, 1, 1, 5, true)
      .string(`DAFTAR PESERTA YANG MENGIKUTI TES PEMINATAN ONLINE (TPO)`)

    ws.cell(2, 1)
      .string(`HARI/TANGGAL : ${dt.getDate().toString().padStart(2, '0')}/${(dt.getMonth()+1).toString().padStart(2, '0')}/${dt.getFullYear().toString().padStart(4, '0')}`)
    ws.cell(3, 1)
      .string(`WAKTU : ${dt.getHours().toString().padStart(2, '0')}:${dt.getMinutes().toString().padStart(2, '0')}:${dt.getSeconds().toString().padStart(2, '0')}`)
    ws.cell(4, 1)
      .string(`ASAL SEKOLAH : ${school.name}`)

    ws.cell(5, 1)
      .string("No")
    ws.cell(5, 2)
      .string("NAMA")
    ws.cell(5, 3)
      .string("WAKTU MULAI")
    ws.cell(5, 4)
      .string("WAKTU SELESAI")
    ws.cell(5, 5)
      .string("KETERANGAN")
    
    users = JSON.stringify(users)
    users = JSON.parse(users)
    for(var i=0;i<users.length;i++)
    {
        var participant = users[i]
        var user = await User.findById(users[i]._id)
        if(!user) continue
        if(user.name == undefined) continue 
        
        var n = i+1;
        var row = i+6;
        ws.cell(row, 1).number(n)
        
        user = JSON.stringify(user)
        user = JSON.parse(user)
        // delete user.metas.sequences
        delete user.metas.school
        // delete user.sequences
        
        ws.cell(row, 2).string(user.name)
        ws.cell(row, 3).string(user.metas.start_time !== undefined ? user.metas.start_time : '')
        ws.cell(row, 4).string(user.metas.end_time !== undefined ? user.metas.end_time : '')
        ws.cell(row, 5).string(user.metas.end_time !== undefined ? "Selesai" : "Sedang Mengerjakan")
    }
     
    // Create a reusable style
    // var style = wb.createStyle({
    //   font: {
    //     color: '#FF0800',
    //     size: 12,
    //   },
    //   numberFormat: '$#,##0.00; ($#,##0.00); -',
    // });
     
    // // Set value of cell A1 to 100 as a number type styled with paramaters of style
    // ws.cell(2, 1)
    //   .number(100)
     
    // // Set value of cell B1 to 200 as a number type styled with paramaters of style
    // ws.cell(2, 2)
    //   .number(200)
     
    // // Set value of cell C1 to a formula styled with paramaters of style
    // ws.cell(2, 3)
    //   .formula('A1 + B1')
     
    // // Set value of cell A2 to 'string' styled with paramaters of style
    // ws.cell(3, 1)
    //   .string('string')
     
    // // Set value of cell A3 to true as a boolean type styled with paramaters of style but with an adjustment to the font size.
    // ws.cell(4, 1)
    //   .bool(true)
     
    wb.write('uploads/berita-acara-'+school.name+'.xlsx');

    res.json({file:'uploads/berita-acara-'+school.name+'.xlsx'});
}

exports.report = async (req,res) => {
    // Create a new instance of a Workbook class
    
    var exam = await Exam.findById(req.params.exam_id)
    var users = exam.participants
    var school = await School.findById(exam.school_id)
    users = JSON.stringify(users)
    users = JSON.parse(users)
    var rows = ""
    for(var i=0;i<users.length;i++)
    {
        var n = i+1;
        rows += "<tr><td>"+n+"</td>"
        var row = i+2;
        var participant = users[i]
        var user = await User.findById(users[i]._id)
        if(!user) continue
        user = JSON.stringify(user)
        user = JSON.parse(user)
        // delete user.metas.sequences
        delete user.metas.school
        // delete user.sequences
        rows += "<td>"+user.name+"</td>"
        rows += "<td>\'"+user.username+"</td>"
        rows += "<td>"+user.metas.tempat_tanggal_lahir+"</td>"
        rows += "<td>"+user.metas.nilai_bahasa+"</td>"
        rows += "<td>"+user.metas.nilai_ips+"</td>"
        rows += "<td>"+user.metas.nilai_ipa+"</td>"
        rows += "<td>"+user.metas.jurusan+"</td>"
        rows += "<td>"+user.metas.total_nilai+"</td>"
        rows += "<td>"+user.metas.predikat+"</td>"
        var sequences = user.metas.sequences
        if(typeof sequences === 'undefined'){
            rows += "<td></td>"
            rows += "<td></td>"
            rows += "<td></td>"
            rows += "<td></td>"
            rows += "<td></td>"
            rows += "<td></td>"
            rows += "<td></td></tr>"
            continue
        } 
        // var subtest = 3, IPS = 0, IPA = 0, BAHASA1 = 0, BAHASA2 = 0, hasil1 = "", hasil2 = ""
        // var subtest = 1
        var hasil_arr = []
        var subtest_R = [2,14,26]
        var subtest_I = [4,16,28]
        var subtest_A = [6,18,30]
        var subtest_S = [8,20,32]
        var subtest_E = [10,22,34]
        var subtest_C = [12,24,36]
        var R = 0, I = 0, A = 0, S = 0, E = 0, C = 0
        for (var j = 0; j < sequences.length; j++) 
        {
            var quis = j+1
            if(quis%2 != 0) continue;
            var sequence = sequences[j].contents
            var nilai = 0
            for(var k = 0; k < sequence.length; k++)
            {
                var content = sequence[k]
                // if(content.childs.length == 0) continue;
                if(typeof content.selected === 'undefined') continue
                var selected = content.selected
                var post = await Post.findById(selected)
                if(post) nilai+= parseInt(post.type_as)
            }
            // user.nilai.push({
            //     title:sequences[j].title,
            //     nilai:nilai
            // })
            // user[""+sequences[j].title] = nilai
            // if(subtest <= 4) BAHASA1+=nilai
            // if(subtest == 5 || subtest == 6) BAHASA2+=nilai
            // if(subtest <= 6) IPS+=nilai
            // if(subtest >= 7) IPA+=nilai
            if(subtest_R.includes(quis))
                R += nilai
            if(subtest_I.includes(quis))
                I += nilai
            if(subtest_A.includes(quis))
                A += nilai
            if(subtest_S.includes(quis))
                S += nilai
            if(subtest_E.includes(quis))
                E += nilai
            if(subtest_C.includes(quis))
                C += nilai
        }

        hasil_arr.push({"name":"REALISTIC","nilai":R})
        hasil_arr.push({"name":"INVESTIGATIVE","nilai":I})
        hasil_arr.push({"name":"ARTISTIC","nilai":A})
        hasil_arr.push({"name":"SOCIAL","nilai":S})
        hasil_arr.push({"name":"ENTERPRISING","nilai":E})
        hasil_arr.push({"name":"CONFIDENTIAL","nilai":C})

        hasil_arr = hasil_arr.sort((a,b) => (a.nilai < b.nilai) ? 1 : ((b.nilai < a.nilai) ? -1 : 0))
        hasil_arr = hasil_arr.slice(0,3)
        var hasil = ""
        hasil_arr.forEach((val,idx) => {
            hasil += val.name
            if(idx < 2) hasil += " - "
        })

        rows += "<td>"+R+"</td>"
        rows += "<td>"+I+"</td>"
        rows += "<td>"+A+"</td>"
        rows += "<td>"+S+"</td>"
        rows += "<td>"+E+"</td>"
        rows += "<td>"+C+"</td>"
        rows += "<td>"+hasil+"</td></tr>"
    }

    var html_response = "<title>LAPORAN MINAT BAKAT "+school.name+"</title>"

    html_response += "<br>"
    html_response += `<div>
    <!--
    <table>
        <tr>
            <td>NAMA SEKOLAH</td>
            <td>:</td>
            <td>${school.name}</td>
        </tr>
        <tr>
            <td>TANGGAL PELAKSANAAN TES</td>
            <td>:</td>
            <td>${exam.start_time}</td>
        </tr>
        
    </table>
    <button onclick="tableToExcel('report', '${school.name}')">Export</button>
    -->
    <br>
    <table id="report" width="100%" border="1" cellspacing="0" cellpadding="5">
        <tr style="border:0px">
            <td style="border:0px" colspan="2">NAMA SEKOLAH</td>
            <td style="border:0px">:</td>
            <td style="border:0px">${school.name}</td>
            <td style="border:0px"></td>
            <td style="border:0px"></td>
            <td style="border:0px"></td>
            <td style="border:0px"></td>
            <td style="border:0px"></td>
            <td style="border:0px"></td>
            <td style="border:0px"></td>
            <td style="border:0px"></td>
        </tr>
        <tr style="border:0px">
            <td style="border:0px" colspan="2">TANGGAL PELAKSANAAN TES</td>
            <td style="border:0px">:</td>
            <td style="border:0px">${exam.start_time.split('T')[0]}</td>
            <td style="border:0px"></td>
            <td style="border:0px"></td>
            <td style="border:0px"></td>
            <td style="border:0px"></td>
            <td style="border:0px"></td>
            <td style="border:0px"></td>
            <td style="border:0px"></td>
            <td style="border:0px"></td>
        </tr>
        <tr style="background-color:#eaeaea;">
            <th rowspan="2" style="text-align:center">NO</th>
            <th rowspan="2" style="text-align:center">NAMA</th>
            <th rowspan="2" style="text-align:center">NISN</th>
            <th rowspan="2" style="text-align:center">TEMPAT, TANGGAL LAHIR</th>
            <th colspan="3" style="text-align:center">HASIL TES</th>
            <th rowspan="2" style="text-align:center">JURUSAN</th>
            <th rowspan="2" style="text-align:center">SKOR</th>
            <th rowspan="2" style="text-align:center">POTENSI AKADEMIK</th>
            <th colspan="6" style="text-align:center">HASIL TES MINAT BAKAT</th>
            <th rowspan="2" style="text-align:center">MINAT BAKAT</th>
        </tr>
        <tr style="background-color:#eaeaea;">
            <th style="text-align:center">BHS</th>
            <th style="text-align:center">IPS</th>
            <th style="text-align:center">IPA</th>
            <th style="text-align:center">R</th>
            <th style="text-align:center">I</th>
            <th style="text-align:center">A</th>
            <th style="text-align:center">S</th>
            <th style="text-align:center">E</th>
            <th style="text-align:center">C</th>
        </tr>
        ${rows}
    </table></div>
    <script src="http://code.jquery.com/jquery-latest.min.js" type="text/javascript"></script>
    <script src="/api/uploads/tableToExcel.js" type="text/javascript"></script>
    <script type="text/javascript">
        tableToExcel('report', '${school.name}')
    </script> 
    `

    res.type("text/html");
    res.send(html_response);
}

exports.printacara = async (req,res) => {
    var dt = new Date();
    // var end_time = `${dt.getDate().toString().padStart(2, '0')}/${(dt.getMonth()+1).toString().padStart(2, '0')}/${dt.getFullYear().toString().padStart(4, '0')} ${dt.getHours().toString().padStart(2, '0')}:${dt.getMinutes().toString().padStart(2, '0')}:${dt.getSeconds().toString().padStart(2, '0')}`

    var exam = await Exam.findById(req.params.exam_id)
    var users = exam.participants
    var school = await School.findById(exam.school_id)
    
    users = JSON.stringify(users)
    users = JSON.parse(users)
    var rows = "";
    for(var i=0;i<users.length;i++)
    {
        var participant = users[i]
        var user = await User.findById(users[i]._id)
        if(!user) continue
        if(user.name == undefined) continue 
        var n = i+1;

        user = JSON.stringify(user)
        user = JSON.parse(user)
        delete user.metas.sequences
        delete user.metas.school
        // delete user.sequences
        var stts = user.metas.end_time !== undefined ? "Selesai" : user.metas.start_time == undefined ? "" : "Sedang Mengerjakan"
        // var stts = user.metas.start_time !== undefined ? "Selesai" : ""
        rows += `
            <tr>
                <td>${n}</td>
                <td>${user.name}</td>
                <td>${user.username}</td>
                <td>${user.metas.start_time !== undefined ? user.metas.start_time : ''}</td>
                <td>${user.metas.end_time !== undefined ? user.metas.end_time : ''}</td>
                <td>${stts}</td>
            </tr>
        `      
    }

    var html_response = "<title>BERITA ACARA "+school.name+"</title><h2 align='center'>DAFTAR PESERTA YANG MENGIKUTI TES PEMINATAN ONLINE (TPO)</h2>"

    html_response += "<br>"
    html_response += `
    <table>
        <tr>
            <td>HARI/TANGGAL</td>
            <td>:</td>
            <td>${dt.getDate().toString().padStart(2, '0')}/${(dt.getMonth()+1).toString().padStart(2, '0')}/${dt.getFullYear().toString().padStart(4, '0')}</td>
        </tr>
        <tr>
            <td>WAKTU</td>
            <td>:</td>
            <td>${dt.getHours().toString().padStart(2, '0')}:${dt.getMinutes().toString().padStart(2, '0')}:${dt.getSeconds().toString().padStart(2, '0')}</td>
        </tr>
        <tr>
            <td>ASAL SEKOLAH</td>
            <td>:</td>
            <td>${school.name}</td>
        </tr>
    </table>
    <br>
    <table width="100%" border="1" cellspacing="0" cellpadding="5">
        <tr style="background-color:#eaeaea;">
            <th rowspan="2">No</th>
            <th rowspan="2">NAMA</th>
            <th rowspan="2">NISN</th>
            <th colspan="2" style="text-align:center">WAKTU TEST</th>
            <th rowspan="2">KETERANGAN</th>
        </tr>
        <tr style="background-color:#eaeaea;">
            <th style="text-align:center">MULAI</th>
            <th style="text-align:center">SELESAI</th>
        </tr>
        ${rows}
    </table>
    <script>window.print()</script>
    `

    res.type("text/html");
    res.send(html_response);
}

exports.getParticipantsActive = async (req, res) => {
    var users = await User.find({'metas.school._id':req.params.school_id})
    users = JSON.stringify(users)
    users = JSON.parse(users)
    var reports = []
    for(var i=0;i<users.length;i++)
    {
        var participant = users[i]
        var user = await User.findById(users[i]._id)
        if(!user) continue
        user = JSON.stringify(user)
        user = JSON.parse(user)
        // delete user.metas.sequences
        delete user.metas.school
        // delete user.sequences
        var sequences = user.metas.sequences
        if(typeof sequences === 'undefined'){
            user.metas.NISN = participant.nis
            reports.push(user)
            continue
        } 
        for (var j = 0; j < sequences.length; j++) 
        {
            var quis = j+1
            if(quis%2 != 0) continue;
            var sequence = sequences[j].contents
            var nilai = 0
            for(var k = 0; k < sequence.length; k++)
            {
                var content = sequence[k]
                // if(content.childs.length == 0) continue;
                if(typeof content.selected === 'undefined') continue
                var selected = content.selected
                var post = await Post.findById(selected)
                if(post && post.type_as == "correct answer") nilai++
            }
            // user.nilai.push({
            //     title:sequences[j].title,
            //     nilai:nilai
            // })
            user[""+sequences[j].title] = nilai
        }
        delete user.metas.sequences
        reports.push(user)
    }
    res.json(reports)
}

exports.delete = function (req, res) {
    Exam.remove({
        _id: req.params.exam_id
    }, function (err, contact) {
        if (err)
        {
            res.send(err);
            return
        }
        res.json({
            status: "success",
            message: 'Exam deleted'
        });
    });
};

exports.startExam = async (req, res) => {
    var user = await User.findById(req.user._id)
    var metas = JSON.stringify(user.metas)
    metas = JSON.parse(metas)
    var req_metas = Object.keys(req.body)

    req_metas.forEach(val => {
        metas[""+val] = req.body[val]
    })

    
    
    // var exam = await Exam.findById(req.body.exam_id).populate('participants')
    var _sequences = await Sequence.find({})
    var sequences = []
    for(var i=0;i<_sequences.length;i++)
    {
        var sequence = _sequences[i]
        sequence = JSON.stringify(sequence)
        sequence = JSON.parse(sequence)
        var contents = []
        for(var j=0;j<sequence.contents.length;j++)
        {
            var content = JSON.stringify(sequence.contents[j])
            content = JSON.parse(content)
            delete content.category
            var sub_contents = content.type_as == "question" ? await Post.find({'parent._id':new mongoose.Types.ObjectId(content._id)}).select('-parent') : {}
            // sub_contents = sub_contents.length ? sub_contents.sort(() => Math.random() - 0.5) : {};
            contents.push({
                parent:content,
                childs:sub_contents
            })
        }
        sequence.contents = contents
        sequences.push(sequence)
    }
    
    var dt = new Date();
    var start_time = `${dt.getDate().toString().padStart(2, '0')}/${(dt.getMonth()+1).toString().padStart(2, '0')}/${dt.getFullYear().toString().padStart(4, '0')} ${dt.getHours().toString().padStart(2, '0')}:${dt.getMinutes().toString().padStart(2, '0')}:${dt.getSeconds().toString().padStart(2, '0')}`

    sequences = sequences.sort((a,b) => (a.order > b.order) ? 1 : ((b.order > a.order) ? -1 : 0))
    metas.sequences = sequences
    metas.seqActive = 0
    metas.start_time = start_time
    var userUpdate = await User.findOneAndUpdate({
        _id: req.user._id,
    },{
        metas: metas
    })
    res.json({
        status: "success",
        message: 'Exam start',
        user:userUpdate,
        data:sequences
    });
}

exports.sendUserSequence = async (req, res) => {
    var user = await User.findById(req.user._id)
    var metas = JSON.stringify(user.metas)
    metas = JSON.parse(metas)
    metas.sequences = req.body.sequences
    metas.seqActive = req.body.seqActive
    var userUpdate = await User.findOneAndUpdate({
        _id: req.user._id,
    },{
        metas: metas
    })
    res.json({
        status: "success",
        message: 'Sequence Saved',
        user:userUpdate,
    });
}

exports.finishExam = async (req, res) => {
    var user = await User.findById(req.user._id)
    var metas = JSON.stringify(user.metas)
    var dt = new Date();
    var end_time = `${dt.getDate().toString().padStart(2, '0')}/${(dt.getMonth()+1).toString().padStart(2, '0')}/${dt.getFullYear().toString().padStart(4, '0')} ${dt.getHours().toString().padStart(2, '0')}:${dt.getMinutes().toString().padStart(2, '0')}:${dt.getSeconds().toString().padStart(2, '0')}`
    metas = JSON.parse(metas)
    metas.exam_finished = true
    metas.end_time = end_time
    var userUpdate = await User.findOneAndUpdate({
        _id: req.user._id,
    },{
        metas: metas
    })
    res.json({
        status: "success",
        message: 'Exam Finished',
        user:userUpdate,
    });
}