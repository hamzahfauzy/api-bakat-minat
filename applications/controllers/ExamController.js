// Import contact model
Exam = require('./../models/Exam')
User = require('./../models/User')
Post = require('./../models/Post')
School = require('./../models/School')
Pengumuman = require('./../models/Pengumuman')
Sequence = require('./../models/Sequence')
fs = require('fs')
var pdf = require('html-pdf');
var mongoose = require('mongoose');
var mv = require('mv');
var path = require('path');
var appDir = path.dirname(require.main.filename);
var formidable = require('formidable')
const readXlsxFile = require('read-excel-file/node')
var xl = require('excel4node');

exports.importNilai = function (req, res) {
    var form = new formidable.IncomingForm();
    form.parse(req, function (err, fields, files) {
        var oldpath = files.inputUpload.path;
        var newpath = appDir + "/uploads/" + files.inputUpload.name
        mv(oldpath, newpath, function (err) {
            readXlsxFile(newpath).then(async (rows) => {
                // Remove Header ROW
                // rows.shift();
                var students = []
                for(var i=0;i<rows.length;i++)
                {
                    var val = rows[i]
                    var username = val[1].replace(/'/g, "")
                    var user_exists = await User.findOne({
                        name: val[0],
                        username:username
                    })
                    var metas = {}
                    if(user_exists)
                    {
                        metas = JSON.stringify(user_exists.metas)
                        metas = JSON.parse(metas)
                    }
                    metas.exam_finished = true
                    metas.tempat_tanggal_lahir = val[2]
                    metas.nilai_bahasa = val[3]
                    metas.nilai_ips = val[4]
                    metas.nilai_ipa = val[5]
                    metas.jurusan   = val[6]
                    metas.total_nilai = val[7]
                    metas.predikat  = val[8]
                    metas.nilai = {
                        R: val[9],
                        I: val[10],
                        A: val[11],
                        S: val[12],
                        E: val[13],
                        C: val[14],
                        hasil: val[15]
                    }
                    var user = await User.findOneAndUpdate({
                        name: val[0],
                        username:username
                    },{
                        name: val[0],
                        username: username,
                        password: 123,
                        isAdmin: false,
                        status: true,
                        metas: metas,
                    },{new:true,upsert:true})
                    students.push({
                        _id:user._id,
                        nis:username,
                        name:val[0],
                    })
                }

                res.json({
                    message:'import nilai success',
                    data:students
                })
            })
        })
    })
    
};

exports.pengumuman = async function (req, res)
{
    let pengumuman = await Pengumuman.findOne({})
    var data = await pengumuman
    if(data == null)
    {
        var p = new Pengumuman
        p.tanggal = "2020-08-13"
        p.save(function(err){
            res.json({
                message:'berhasil',
                data:p
            })
        })
    }
    else
    {
        res.json({
            message:'data pengumuman',
            data:data
        })
    }
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
        if(typeof sequences === 'undefined' || !sequences.length){
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
        var total_tpo = 0
        for (var j = 0; j < sequences.length; j++) 
        {
            var quis = j+1
            if(quis%2 != 0) continue;
            var q = quis-16
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

            if(quis <= 16)
                total_tpo += nilai

            if(subtest_R.includes(q))
                R += nilai
            if(subtest_I.includes(q))
                I += nilai
            if(subtest_A.includes(q))
                A += nilai
            if(subtest_S.includes(q))
                S += nilai
            if(subtest_E.includes(q))
                E += nilai
            if(subtest_C.includes(q))
                C += nilai
        }
        
        user["R"] = R
        user["I"] = I
        user["A"] = A
        user["S"] = S
        user["E"] = E
        user["C"] = C
        user["total_tpo"] = total_tpo
        delete user.metas.sequences
        reports.push(user)
    }
    _exam.participants = reports
    res.json({
        message: 'Exam detail loading..',
        data: _exam
    });
};

exports.resetParticipant = async function (req, res) {
    var exam = await Exam.findById(req.params.exam_id)
    var _exam = JSON.stringify(exam)
        _exam = JSON.parse(_exam)
    var users = _exam.participants
    var all_users = []
    for(var i=0;i<users.length;i++)
    {
        var user = await User.findById(users[i]._id)
        if(!user) continue
        // user = JSON.stringify(user)
        // user = JSON.parse(user)
        // delete user.metas.sequences
        // delete user.metas.sequences
        // delete user.sequences

        var mUser = await User.findOneAndUpdate({
            _id:users[i]._id,
        },{
            $pull:{"metas.sequences":{}},
            $unset:{
                "metas.end_time":true,
                "metas.end_time":true,
                "metas.exam_finished":true,
                "metas.seqActive":true,
                "metas.start_time":true
            }
            // metas: user.metas,
        })
        all_users.push(mUser)
    }

    res.json({
        message: 'Exam participant reset...',
        all_users: all_users
    });
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
                    var username = val[1].replace(/'/g, "")
                    var val = rows[i]
                    var user = await User.findOneAndUpdate({
                        name: val[3],
                        username:username,
                    },{
                        name: val[3],
                        username: username,
                        password: 123,
                        isAdmin: false,
                        status: true,
                        metas: {
                            exam_id:fields.exam_id,
                        }
                    },{new:true,upsert:true})
                    participants.push({
                            _id:user._id,
                            nis:username,
                            name:val[3]
                        
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
                if(post) nilai+=parseInt(post.type_as)
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
        hasil_arr.push({"name":"ENTERPRENUER","nilai":E})
        hasil_arr.push({"name":"CONVENTIONAL","nilai":C})

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

exports.reportDetail = async (req,res) => {
    var exam = await Exam.findById(req.params.exam_id)
    var _exam = JSON.stringify(exam)
        _exam = JSON.parse(_exam)
    var users = _exam.participants
    var school = await School.findById(_exam.school_id)
    // var reports = []
    var rows = ""
    var d = new Date(Date.now()).toLocaleString().split(",")[0];
    var subtest = {
        '2':1,
        '4':2,
        '6':3,
        '8':4,
        '10':5,
        '12':6,
        '14':7,
        '16':8,
    }

    var subtest_value = {
        '1':0,
        '2':0,
        '3':0,
        '4':0,
        '5':0,
        '6':0,
        '7':0,
        '8':0,
    }
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
        rows += "<tr>"
        rows += "<td>"+(i+1)+"</td>"
        rows += "<td>\'"+user.username+"</td>"
        rows += "<td>"+user.name+"</td>"
        rows += "<td>"+school.name+"</td>"
        rows += "<td>"+user.metas.tempat_lahir+', '+user.metas.tanggal_lahir+"</td>"
        rows += "<td>"+user.metas.jenis_kelamin+"</td>"
        rows += "<td>"+d+"</td>"
        
        var sequences = user.metas.sequences
        if(typeof sequences === 'undefined')
        {
            rows += "<td></td>"
            rows += "<td></td>"
            rows += "<td></td>"
            rows += "<td></td>"
            rows += "<td></td>"
            rows += "<td></td>"
            rows += "<td></td>"
            rows += "<td></td>"
            rows += "<td></td>"
            rows += "<td></td>"
            rows += "<td></td>"
            rows += "<td></td>"
            rows += "<td></td>"
        }
        else
        {
            rows += "<td>"+user.metas.hp+"</td>"
            rows += "<td>"+user.metas.academyc_sma.jurusan+"</td>"
            rows += "<td>"+user.metas.nilai_tertinggi_x.mata_pelajaran+"</td>"
            rows += "<td>"+user.metas.nilai_tertinggi_x.nilai+"</td>"
            rows += "<td>"+user.metas.nilai_tertinggi_xi.mata_pelajaran+"</td>"
            rows += "<td>"+user.metas.nilai_tertinggi_xi.nilai+"</td>"
            rows += "<td>"+user.metas.nilai_tertinggi_xii.mata_pelajaran+"</td>"
            rows += "<td>"+user.metas.nilai_tertinggi_xii.nilai+"</td>"
            rows += "<td>"+user.metas.cita_cita[0].value+"</td>"
            rows += "<td>"+user.metas.cita_cita[1].value+"</td>"
            rows += "<td>"+user.metas.cita_cita[2].value+"</td>"
            rows += "<td>"+user.metas.jurusan[0].value+"</td>"
            rows += "<td>"+user.metas.jurusan[1].value+"</td>"
            rows += "<td>"+user.metas.jurusan[2].value+"</td>"
        }

        if(typeof sequences === 'undefined'){
            rows += "<td></td>"
            rows += "<td></td>"
            rows += "<td></td>"
            rows += "<td></td>"
            rows += "<td></td>"
            rows += "<td></td>"
            rows += "<td></td>"
            rows += "<td></td>"
            rows += "<td></td>"
            rows += "<td></td>"
            rows += "<td></td>"
            rows += "<td></td>"
            rows += "<td></td>"
            rows += "<td></td>"
            rows += "<td></td>"
            rows += "<td></td>"
            rows += "<td></td>"
            rows += "<td></td>"
            rows += "<td></td>"
            rows += "<td></td>"
            rows += "<td></td>"
            rows += "<td></td>"
            rows += "</tr>"
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
        var total_tpo = 0
        for (var j = 0; j < sequences.length; j++) 
        {
            var quis = j+1
            if(quis%2 != 0) continue;
            var q = quis-16
            var sequence = sequences[j].contents
            var nilai = 0
            for(var k = 0; k < sequence.length; k++)
            {
                var content = sequence[k]
                // if(content.childs.length == 0) continue;
                if(typeof content.selected === 'undefined') continue
                var selected = content.selected
                var post = await Post.findById(selected)
                if(quis <= 16 && post) subtest_value[""+subtest[quis]]+=parseInt(post.type_as)
                else if(quis >= 17 && post) nilai+= parseInt(post.type_as)
            }

            if(quis <= 16)
                total_tpo += nilai

            if(subtest_R.includes(q))
                R += nilai
            if(subtest_I.includes(q))
                I += nilai
            if(subtest_A.includes(q))
                A += nilai
            if(subtest_S.includes(q))
                S += nilai
            if(subtest_E.includes(q))
                E += nilai
            if(subtest_C.includes(q))
                C += nilai
        }
        
        // user["R"] = R
        // user["I"] = I
        // user["A"] = A
        // user["S"] = S
        // user["E"] = E
        // user["C"] = C
        // user["total_tpo"] = total_tpo
        delete user.metas.sequences
        // reports.push(user)

        hasil_arr.push({"name":"REALISTIC","nilai":R})
        hasil_arr.push({"name":"INVESTIGATIVE","nilai":I})
        hasil_arr.push({"name":"ARTISTIC","nilai":A})
        hasil_arr.push({"name":"SOCIAL","nilai":S})
        hasil_arr.push({"name":"ENTERPRENUER","nilai":E})
        hasil_arr.push({"name":"CONVENTIONAL","nilai":C})

        hasil_arr = hasil_arr.sort((a,b) => (a.nilai < b.nilai) ? 1 : ((b.nilai < a.nilai) ? -1 : 0))
        hasil_arr = hasil_arr.slice(0,3)
        var hasil = ""
        hasil_arr.forEach((val,idx) => {
            hasil += val.name
            if(idx < 2) hasil += " - "
        })

        var daya_tangkap = subtest_value[1]
        var analisa_masalah = (subtest_value[3]+subtest_value[8])
        var fleksibilitas_berpikir = (subtest_value[6]+subtest_value[8]+subtest_value[3])
        var pemecahan_masalah = (subtest_value[5])
        var logika_verbal = (subtest_value[4]+subtest_value[2])
        var logika_angka = (subtest_value[5]+subtest_value[6])

        if(daya_tangkap <= 4) daya_tangkap = 1
        else if(daya_tangkap >= 5 && daya_tangkap <= 8) daya_tangkap = 2
        else if(daya_tangkap >= 9 && daya_tangkap <= 12) daya_tangkap = 3
        else if(daya_tangkap >= 13 && daya_tangkap <= 16) daya_tangkap = 4
        else if(daya_tangkap >= 14) daya_tangkap = 5

        if(analisa_masalah <= 8) analisa_masalah = 1
        else if(analisa_masalah >= 9 && analisa_masalah <= 16) analisa_masalah = 2
        else if(analisa_masalah >= 17 && analisa_masalah <= 24) analisa_masalah = 3
        else if(analisa_masalah >= 25 && analisa_masalah <= 32) analisa_masalah = 4
        else if(analisa_masalah >= 33) analisa_masalah = 5

        if(fleksibilitas_berpikir <= 12) fleksibilitas_berpikir = 1
        else if(fleksibilitas_berpikir >= 13 && fleksibilitas_berpikir <= 24) fleksibilitas_berpikir = 2
        else if(fleksibilitas_berpikir >= 25 && fleksibilitas_berpikir <= 36) fleksibilitas_berpikir = 3
        else if(fleksibilitas_berpikir >= 37 && fleksibilitas_berpikir <= 48) fleksibilitas_berpikir = 4
        else if(fleksibilitas_berpikir >= 49) fleksibilitas_berpikir = 5

        if(pemecahan_masalah <= 4) pemecahan_masalah = 1
        else if(pemecahan_masalah >= 5 && pemecahan_masalah <= 8) pemecahan_masalah = 2
        else if(pemecahan_masalah >= 9 && pemecahan_masalah <= 12) pemecahan_masalah = 3
        else if(pemecahan_masalah >= 13 && pemecahan_masalah <= 16) pemecahan_masalah = 4
        else if(pemecahan_masalah >= 14) pemecahan_masalah = 5

        if(logika_verbal <= 8) logika_verbal = 1
        else if(logika_verbal >= 9 && logika_verbal <= 16) logika_verbal = 2
        else if(logika_verbal >= 17 && logika_verbal <= 24) logika_verbal = 3
        else if(logika_verbal >= 25 && logika_verbal <= 32) logika_verbal = 4
        else if(logika_verbal >= 33) logika_verbal = 5

        if(logika_angka <= 8) logika_angka = 1
        else if(logika_angka >= 9 && logika_angka <= 16) logika_angka = 2
        else if(logika_angka >= 17 && logika_angka <= 24) logika_angka = 3
        else if(logika_angka >= 25 && logika_angka <= 32) logika_angka = 4
        else if(logika_angka >= 33) logika_angka = 5

        rows += "<td>"+R+"</td>"
        rows += "<td>"+I+"</td>"
        rows += "<td>"+A+"</td>"
        rows += "<td>"+S+"</td>"
        rows += "<td>"+E+"</td>"
        rows += "<td>"+C+"</td>"
        rows += "<td>"+hasil+"</td>"
        rows += "<td>"+subtest_value[1]+"</td>"
        rows += "<td>"+subtest_value[2]+"</td>"
        rows += "<td>"+subtest_value[3]+"</td>"
        rows += "<td>"+subtest_value[4]+"</td>"
        rows += "<td>"+subtest_value[5]+"</td>"
        rows += "<td>"+subtest_value[6]+"</td>"
        rows += "<td>"+subtest_value[7]+"</td>"
        rows += "<td>"+subtest_value[8]+"</td>"
        rows += "<td>"+total_tpo+"</td>"
        rows += "<td></td>"
        rows += "<td>"+daya_tangkap+"</td>"
        rows += "<td>"+analisa_masalah+"</td>"
        rows += "<td>"+fleksibilitas_berpikir+"</td>"
        rows += "<td>"+pemecahan_masalah+"</td>"
        rows += "<td>"+logika_verbal+"</td>"
        rows += "<td>"+logika_angka+"</td>"
        rows += "</tr>"
    }
    var html_response = "<title>LAPORAN MINAT BAKAT "+school.name+"</title>"

    html_response += "<br>"
    html_response += `<div>
    <table id="report" width="100%" border="1" cellspacing="0" cellpadding="5">
        <tr style="background-color:#eaeaea;">
            <th rowspan="3" style="text-align:center">NO</th>
            <th rowspan="3" style="text-align:center">NIS</th>
            <th rowspan="3" style="text-align:center">NAMA SISWA</th>
            <th rowspan="3" style="text-align:center">KELAS</th>
            <th rowspan="3" style="text-align:center">TEMPAT, TANGGAL LAHIR</th>
            <th rowspan="3" style="text-align:center">JENIS KELAMIN</th>
            <th rowspan="3" style="text-align:center">TGL PEMERIKSAAN</th>
            <th rowspan="3" style="text-align:center">NO. HP/WA</th>
            <th rowspan="3" style="text-align:center">JURUSAN SEKARANG</th>
            <th colspan="6" style="text-align:center">NILAI TERTINGGI</th>
            <th rowspan="3" colspan="3" style="text-align:center">CITA-CITA</th>
            <th rowspan="3" colspan="3" style="text-align:center">PILIHAN JURUSAN</th>
            <th colspan="7" style="text-align:center">HOLLAND</th>
            <th colspan="10" style="text-align:center">HASIL TES POTENSI AKADEMIK (TPA)</th>
            <th colspan="6" style="text-align:center">URAIAN PENILAIAN ASPEK BERPIKIR</th>
        </tr>
        <tr>
            <th style="text-align:center" rowspan="2" colspan="2">X</th>
            <th style="text-align:center" rowspan="2" colspan="2">XI</th>
            <th style="text-align:center" rowspan="2" colspan="2">XII</th>
            <th style="text-align:center" rowspan="2">R</th>
            <th style="text-align:center" rowspan="2">I</th>
            <th style="text-align:center" rowspan="2">A</th>
            <th style="text-align:center" rowspan="2">S</th>
            <th style="text-align:center" rowspan="2">E</th>
            <th style="text-align:center" rowspan="2">C</th>
            <th style="text-align:center" rowspan="2">HASIL</th>
            <th style="text-align:center" rowspan="2">1</th>
            <th style="text-align:center" rowspan="2">2</th>
            <th style="text-align:center" rowspan="2">3</th>
            <th style="text-align:center" rowspan="2">4</th>
            <th style="text-align:center" rowspan="2">5</th>
            <th style="text-align:center" rowspan="2">6</th>
            <th style="text-align:center" rowspan="2">7</th>
            <th style="text-align:center" rowspan="2">8</th>
            <th style="text-align:center" rowspan="2">TOTAL</th>
            <th style="text-align:center" rowspan="2">POTENSI AKADEMIK</th>
            <th style="text-align:center" rowspan="2">DAYA TANGKAP (1)</th>
            <th style="text-align:center" rowspan="2">ANALISA MASALAH (3+8)</th>
            <th style="text-align:center" rowspan="2">FLEKSIBILITAS BERPIKIR (6+8+3)</th>
            <th style="text-align:center" rowspan="2">PEMECAHAN MASALAH (5)</th>
            <th style="text-align:center" rowspan="2">LOGIKA VERBAL (4+2)</th>
            <th style="text-align:center" rowspan="2">LOGIKA ANGKA (5+6)</th>
        </tr>
        ${rows}
    </table></div>
    
    `

    res.type("text/html");
    res.send(html_response);
    // _exam.participants = reports
    // res.json({
    //     message: 'Exam detail loading..',
    //     data: _exam
    // });
}

exports.reportDetail3 = async (req,res) => {
    // Create a new instance of a Workbook class
    
    var exam = await Exam.findById(req.params.exam_id)
    var users = exam.participants
    var school = await School.findById(exam.school_id)
    users = JSON.stringify(users)
    users = JSON.parse(users)
    var rows = ""
    var d = new Date(Date.now()).toLocaleString().split(",")[0];
    for(var i=0;i<users.length;i++)
    {
        var n = i+1;
        rows += "<tr><td>"+n+"</td>"
        // var row = i+2;
        // var participant = users[i]
        var user = await User.findById(users[i]._id)
        if(!user) continue
        user = JSON.stringify(user)
        user = JSON.parse(user)
        // delete user.metas.sequences
        delete user.metas.school
        // delete user.sequences
        
        rows += "<td>"+user.name+"</td>"
        rows += "<td>\'"+user.username+"</td>"
        rows += "<td>"+school.name+"</td>"
        rows += "<td>"+user.metas.tempat_tanggal_lahir+"</td>"
        rows += "<td>"+user.metas.jenis_kelamin+"</td>"
        rows += "<td>"+d+"</td>"
        rows += "<td>"+user.metas.hp+"</td>"
        rows += "<td>"+user.metas.academyc_sma.jurusan+"</td>"
        rows += "<td>"+user.metas.nilai_tertinggi_x.mata_pelajaran+"</td>"
        rows += "<td>"+user.metas.nilai_tertinggi_x.nilai+"</td>"
        rows += "<td>"+user.metas.nilai_tertinggi_xi.mata_pelajaran+"</td>"
        rows += "<td>"+user.metas.nilai_tertinggi_xi.nilai+"</td>"
        rows += "<td>"+user.metas.nilai_tertinggi_xii.mata_pelajaran+"</td>"
        rows += "<td>"+user.metas.nilai_tertinggi_xii.nilai+"</td>"
        rows += "<td>"+user.metas.cita_cita[0].value+"</td>"
        rows += "<td>"+user.metas.cita_cita[1].value+"</td>"
        rows += "<td>"+user.metas.cita_cita[2].value+"</td>"
        rows += "<td>"+user.metas.jurusan[0].value+"</td>"
        rows += "<td>"+user.metas.jurusan[1].value+"</td>"
        rows += "<td>"+user.metas.jurusan[2].value+"</td>"
        var sequences = user.metas.sequences
        if(typeof sequences === 'undefined'){
            rows += "<td></td>"
            rows += "<td></td>"
            rows += "<td></td>"
            rows += "<td></td>"
            rows += "<td></td>"
            rows += "<td></td>"
            rows += "<td></td>"
            rows += "<td></td>"
            rows += "<td></td>"
            rows += "<td></td>"
            rows += "<td></td>"
            rows += "<td></td>"
            rows += "<td></td>"
            rows += "<td></td>"
            rows += "<td></td>"
            rows += "<td></td>"
            rows += "<td></td>"
            rows += "<td></td>"
            rows += "<td></td>"
            rows += "<td></td>"
            rows += "<td></td>"
            rows += "<td></td>"
            rows += "</tr>"
            continue
        } 
        
        var subtest = {
            '2':1,
            '4':2,
            '6':3,
            '8':4,
            '10':5,
            '12':6,
            '14':7,
            '16':8,
        }

        var subtest_value = {
            '1':0,
            '2':0,
            '3':0,
            '4':0,
            '5':0,
            '6':0,
            '7':0,
            '8':0,
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
        var _R = {'1':0,'2':0,'3':0,'4':0,'5':0}
        var _I = {'1':0,'2':0,'3':0,'4':0,'5':0}
        var _A = {'1':0,'2':0,'3':0,'4':0,'5':0}
        var _S = {'1':0,'2':0,'3':0,'4':0,'5':0}
        var _E = {'1':0,'2':0,'3':0,'4':0,'5':0}
        var _C = {'1':0,'2':0,'3':0,'4':0,'5':0}
        for (var j = 0; j < sequences.length; j++) 
        {
            var quis = j+1
            if(quis%2 != 0) continue;
            if(quis <= 16)
            {
                var sequence = sequences[j].contents
                var nilai = 0
                for(var k = 0; k < sequence.length; k++)
                {
                    var content = sequence[k]
                    // if(content.childs.length == 0) continue;
                    if(typeof content.selected === 'undefined') continue
                    var selected = content.selected
                    var post = await Post.findById(selected)
                    if(post) subtest_value[""+subtest[quis]]+=parseInt(post.type_as)
                }
            }
            else
            {
                var q = quis-16
                var sequence = sequences[j].contents
                var nilai = 0
                for(var k = 0; k < sequence.length; k++)
                {
                    var content = sequence[k]
                    // if(content.childs.length == 0) continue;
                    if(typeof content.selected === 'undefined') continue
                    var selected = content.selected
                    var post = await Post.findById(selected)
                    if(post) nilai+=parseInt(post.type_as)
                    if(subtest_R.includes(q))
                        _R[parseInt(post.type_as)]++
                    if(subtest_I.includes(q))
                        _I[parseInt(post.type_as)]++
                    if(subtest_A.includes(q))
                        _A[parseInt(post.type_as)]++
                    if(subtest_S.includes(q))
                        _S[parseInt(post.type_as)]++
                    if(subtest_E.includes(q))
                        _E[parseInt(post.type_as)]++
                    if(subtest_C.includes(q))
                        _C[parseInt(post.type_as)]++
                }

                if(subtest_R.includes(q))
                    R += nilai
                if(subtest_I.includes(q))
                    I += nilai
                if(subtest_A.includes(q))
                    A += nilai
                if(subtest_S.includes(q))
                    S += nilai
                if(subtest_E.includes(q))
                    E += nilai
                if(subtest_C.includes(q))
                    C += nilai
            }
        }

        hasil_arr.push({"name":"REALISTIC","nilai":R})
        hasil_arr.push({"name":"INVESTIGATIVE","nilai":I})
        hasil_arr.push({"name":"ARTISTIC","nilai":A})
        hasil_arr.push({"name":"SOCIAL","nilai":S})
        hasil_arr.push({"name":"ENTERPRENUER","nilai":E})
        hasil_arr.push({"name":"CONVENTIONAL","nilai":C})

        hasil_arr = hasil_arr.sort((a,b) => (a.nilai < b.nilai) ? 1 : ((b.nilai < a.nilai) ? -1 : 0))
        hasil_arr = hasil_arr.slice(0,3)
        var hasil = ""
        hasil_arr.forEach((val,idx) => {
            hasil += val.name
            if(idx < 2) hasil += " - "
        })

        var total = 0
        for(var i=1;i<=8;i++)
            total += subtest_value[''+i]
        // subtest_value.forEach(val => total+=val)
        var daya_tangkap = subtest_value[1]
        var analisa_masalah = (subtest_value[3]+subtest_value[8])
        var fleksibilitas_berpikir = (subtest_value[6]+subtest_value[8]+subtest_value[3])
        var pemecahan_masalah = (subtest_value[5])
        var logika_verbal = (subtest_value[4]+subtest_value[2])
        var logika_angka = (subtest_value[5]+subtest_value[6])

        if(daya_tangkap <= 4) daya_tangkap = 1
        else if(daya_tangkap >= 5 && daya_tangkap <= 8) daya_tangkap = 2
        else if(daya_tangkap >= 9 && daya_tangkap <= 12) daya_tangkap = 3
        else if(daya_tangkap >= 13 && daya_tangkap <= 16) daya_tangkap = 4
        else if(daya_tangkap >= 14) daya_tangkap = 5

        if(analisa_masalah <= 8) analisa_masalah = 1
        else if(analisa_masalah >= 9 && analisa_masalah <= 16) analisa_masalah = 2
        else if(analisa_masalah >= 17 && analisa_masalah <= 24) analisa_masalah = 3
        else if(analisa_masalah >= 25 && analisa_masalah <= 32) analisa_masalah = 4
        else if(analisa_masalah >= 33) analisa_masalah = 5

        if(fleksibilitas_berpikir <= 12) fleksibilitas_berpikir = 1
        else if(fleksibilitas_berpikir >= 13 && fleksibilitas_berpikir <= 24) fleksibilitas_berpikir = 2
        else if(fleksibilitas_berpikir >= 25 && fleksibilitas_berpikir <= 36) fleksibilitas_berpikir = 3
        else if(fleksibilitas_berpikir >= 37 && fleksibilitas_berpikir <= 48) fleksibilitas_berpikir = 4
        else if(fleksibilitas_berpikir >= 49) fleksibilitas_berpikir = 5

        if(pemecahan_masalah <= 4) pemecahan_masalah = 1
        else if(pemecahan_masalah >= 5 && pemecahan_masalah <= 8) pemecahan_masalah = 2
        else if(pemecahan_masalah >= 9 && pemecahan_masalah <= 12) pemecahan_masalah = 3
        else if(pemecahan_masalah >= 13 && pemecahan_masalah <= 16) pemecahan_masalah = 4
        else if(pemecahan_masalah >= 14) pemecahan_masalah = 5

        if(logika_verbal <= 8) logika_verbal = 1
        else if(logika_verbal >= 9 && logika_verbal <= 16) logika_verbal = 2
        else if(logika_verbal >= 17 && logika_verbal <= 24) logika_verbal = 3
        else if(logika_verbal >= 25 && logika_verbal <= 32) logika_verbal = 4
        else if(logika_verbal >= 33) logika_verbal = 5

        if(logika_angka <= 8) logika_angka = 1
        else if(logika_angka >= 9 && logika_angka <= 16) logika_angka = 2
        else if(logika_angka >= 17 && logika_angka <= 24) logika_angka = 3
        else if(logika_angka >= 25 && logika_angka <= 32) logika_angka = 4
        else if(logika_angka >= 33) logika_angka = 5

        rows += "<td>"+R+"</td>"
        rows += "<td>"+I+"</td>"
        rows += "<td>"+A+"</td>"
        rows += "<td>"+S+"</td>"
        rows += "<td>"+E+"</td>"
        rows += "<td>"+C+"</td>"
        rows += "<td>"+hasil+"</td>"
        rows += "<td>"+subtest_value[1]+"</td>"
        rows += "<td>"+subtest_value[2]+"</td>"
        rows += "<td>"+subtest_value[3]+"</td>"
        rows += "<td>"+subtest_value[4]+"</td>"
        rows += "<td>"+subtest_value[5]+"</td>"
        rows += "<td>"+subtest_value[6]+"</td>"
        rows += "<td>"+subtest_value[7]+"</td>"
        rows += "<td>"+subtest_value[8]+"</td>"
        rows += "<td>"+total+"</td>"
        rows += "<td>"+daya_tangkap+"</td>"
        rows += "<td>"+analisa_masalah+"</td>"
        rows += "<td>"+fleksibilitas_berpikir+"</td>"
        rows += "<td>"+pemecahan_masalah+"</td>"
        rows += "<td>"+logika_verbal+"</td>"
        rows += "<td>"+logika_angka+"</td>"
        rows += "</tr>"
    }

    var html_response = "<title>LAPORAN MINAT BAKAT "+school.name+"</title>"

    html_response += "<br>"
    html_response += `<div>
    <table id="report" width="100%" border="1" cellspacing="0" cellpadding="5">
        <tr style="background-color:#eaeaea;">
            <th rowspan="2" style="text-align:center">NO</th>
            <th rowspan="2" style="text-align:center">NAMA</th>
            <th rowspan="2" style="text-align:center">NISN</th>
            <th rowspan="2" style="text-align:center">KELAS</th>
            <th rowspan="2" style="text-align:center">TEMPAT, TANGGAL LAHIR</th>
            <th rowspan="2" style="text-align:center">JENIS KELAMIN</th>
            <th rowspan="2" style="text-align:center">NO. HP/WA</th>
            <th rowspan="2" style="text-align:center">JURUSAN SEKARANG</th>
            <th colspan="3" style="text-align:center">NILAI TERTINGGI</th>
            <th rowspan="2" colspan="3" style="text-align:center">CITA-CITA</th>
            <th rowspan="2" colspan="3" style="text-align:center">PILIHAN JURUSAN</th>
            <th colspan="7" style="text-align:center">HOLLAND</th>
            <th colspan="9" style="text-align:center">HASIL TES POTENSI AKADEMIK (TPA)</th>
            <th colspan="6" style="text-align:center">URAIAN PENILAIAN ASPEK BERPIKIR</th>
        </tr>
        <tr>
            <th colspan="2" style="text-align:center">X</th>
            <th colspan="2" style="text-align:center">XI</th>
            <th colspan="2" style="text-align:center">XII</th>
        </tr>
        <tr>
            <th style="text-align:center">R</th>
            <th style="text-align:center">I</th>
            <th style="text-align:center">A</th>
            <th style="text-align:center">S</th>
            <th style="text-align:center">E</th>
            <th style="text-align:center">C</th>
            <th style="text-align:center">HASIL</th>
            <th style="text-align:center">1</th>
            <th style="text-align:center">2</th>
            <th style="text-align:center">3</th>
            <th style="text-align:center">4</th>
            <th style="text-align:center">5</th>
            <th style="text-align:center">6</th>
            <th style="text-align:center">7</th>
            <th style="text-align:center">8</th>
            <th style="text-align:center">TOTAL</th>
            <th style="text-align:center">DAYA TANGKAP (1)</th>
            <th style="text-align:center">ANALISA MASALAH (3+8)</th>
            <th style="text-align:center">FLEKSIBILITAS BERPIKIR (6+8+3)</th>
            <th style="text-align:center">PEMECAHAN MASALAH (5)</th>
            <th style="text-align:center">LOGIKA VERBAL (4+2)</th>
            <th style="text-align:center">LOGIKA ANGKA (5+6)</th>
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

exports.reportDetail2 = async (req,res) => {
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
        var sequences = user.metas.sequences
        if(typeof sequences === 'undefined'){
            rows += "<td></td>"
            rows += "<td></td>"
            rows += "<td></td>"
            rows += "<td></td>"
            rows += "<td></td>"
            rows += "<td></td>"
            rows += "<td></td>"
            rows += "<td></td>"
            rows += "<td></td>"
            rows += "<td></td>"
            rows += "<td></td>"
            rows += "<td></td>"
            rows += "<td></td>"
            rows += "<td></td>"
            rows += "<td></td>"
            rows += "<td></td>"
            rows += "<td></td>"
            rows += "<td></td>"
            rows += "<td></td>"
            rows += "<td></td>"
            rows += "<td></td>"
            rows += "<td></td>"
            rows += "<td></td>"
            rows += "<td></td>"
            rows += "<td></td>"
            rows += "<td></td>"
            rows += "<td></td>"
            rows += "<td></td>"
            rows += "<td></td>"
            rows += "<td></td>"
            rows += "<td></td>"
            rows += "<td></td>"
            rows += "<td></td>"
            rows += "<td></td>"
            rows += "<td></td>"
            rows += "<td></td>"
            rows += "</tr>"
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
        var _R = {'1':0,'2':0,'3':0,'4':0,'5':0}
        var _I = {'1':0,'2':0,'3':0,'4':0,'5':0}
        var _A = {'1':0,'2':0,'3':0,'4':0,'5':0}
        var _S = {'1':0,'2':0,'3':0,'4':0,'5':0}
        var _E = {'1':0,'2':0,'3':0,'4':0,'5':0}
        var _C = {'1':0,'2':0,'3':0,'4':0,'5':0}
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
                if(post) nilai+=parseInt(post.type_as)
                if(subtest_R.includes(quis))
                    _R[parseInt(post.type_as)]++
                if(subtest_I.includes(quis))
                    _I[parseInt(post.type_as)]++
                if(subtest_A.includes(quis))
                    _A[parseInt(post.type_as)]++
                if(subtest_S.includes(quis))
                    _S[parseInt(post.type_as)]++
                if(subtest_E.includes(quis))
                    _E[parseInt(post.type_as)]++
                if(subtest_C.includes(quis))
                    _C[parseInt(post.type_as)]++
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

        hasil_arr.push({"name":"REALISTIC","nilai":R})
        hasil_arr.push({"name":"INVESTIGATIVE","nilai":I})
        hasil_arr.push({"name":"ARTISTIC","nilai":A})
        hasil_arr.push({"name":"SOCIAL","nilai":S})
        hasil_arr.push({"name":"ENTERPRENUER","nilai":E})
        hasil_arr.push({"name":"CONVENTIONAL","nilai":C})

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
        rows += "<td>"+_R[1]+"</td>"
        rows += "<td>"+_R[2]+"</td>"
        rows += "<td>"+_R[3]+"</td>"
        rows += "<td>"+_R[4]+"</td>"
        rows += "<td>"+_R[5]+"</td>"
        rows += "<td>"+_I[1]+"</td>"
        rows += "<td>"+_I[2]+"</td>"
        rows += "<td>"+_I[3]+"</td>"
        rows += "<td>"+_I[4]+"</td>"
        rows += "<td>"+_I[5]+"</td>"
        rows += "<td>"+_A[1]+"</td>"
        rows += "<td>"+_A[2]+"</td>"
        rows += "<td>"+_A[3]+"</td>"
        rows += "<td>"+_A[4]+"</td>"
        rows += "<td>"+_A[5]+"</td>"
        rows += "<td>"+_S[1]+"</td>"
        rows += "<td>"+_S[2]+"</td>"
        rows += "<td>"+_S[3]+"</td>"
        rows += "<td>"+_S[4]+"</td>"
        rows += "<td>"+_S[5]+"</td>"
        rows += "<td>"+_E[1]+"</td>"
        rows += "<td>"+_E[2]+"</td>"
        rows += "<td>"+_E[3]+"</td>"
        rows += "<td>"+_E[4]+"</td>"
        rows += "<td>"+_E[5]+"</td>"
        rows += "<td>"+_C[1]+"</td>"
        rows += "<td>"+_C[2]+"</td>"
        rows += "<td>"+_C[3]+"</td>"
        rows += "<td>"+_C[4]+"</td>"
        rows += "<td>"+_C[5]+"</td>"
        rows += "</tr>"
    }

    var html_response = "<title>LAPORAN MINAT BAKAT "+school.name+"</title>"

    html_response += "<br>"
    html_response += `<div>
    <table id="report" width="100%" border="1" cellspacing="0" cellpadding="5">
        <tr style="border:0px">
            <td style="border:0px" colspan="2">NAMA SEKOLAH</td>
            <td style="border:0px">:</td>
            <td style="border:0px" colspan="36">${school.name}</td>
        </tr>
        <tr style="border:0px">
            <td style="border:0px" colspan="2">TANGGAL PELAKSANAAN TES</td>
            <td style="border:0px">:</td>
            <td style="border:0px" colspan="36">${exam.start_time.split('T')[0]}</td>
        </tr>
        <tr style="background-color:#eaeaea;">
            <th rowspan="2" style="text-align:center">NO</th>
            <th rowspan="2" style="text-align:center">NAMA</th>
            <th rowspan="2" style="text-align:center">NISN</th>
            <th rowspan="2" style="text-align:center">R</th>
            <th rowspan="2" style="text-align:center">I</th>
            <th rowspan="2" style="text-align:center">A</th>
            <th rowspan="2" style="text-align:center">S</th>
            <th rowspan="2" style="text-align:center">E</th>
            <th rowspan="2" style="text-align:center">C</th>
            <th colspan="5" style="text-align:center">R</th>
            <th colspan="5" style="text-align:center">I</th>
            <th colspan="5" style="text-align:center">A</th>
            <th colspan="5" style="text-align:center">S</th>
            <th colspan="5" style="text-align:center">E</th>
            <th colspan="5" style="text-align:center">C</th>
        </tr>
        <tr style="background-color:#eaeaea;">
            <th style="text-align:center">1</th>
            <th style="text-align:center">2</th>
            <th style="text-align:center">3</th>
            <th style="text-align:center">4</th>
            <th style="text-align:center">5</th>
            <th style="text-align:center">1</th>
            <th style="text-align:center">2</th>
            <th style="text-align:center">3</th>
            <th style="text-align:center">4</th>
            <th style="text-align:center">5</th>
            <th style="text-align:center">1</th>
            <th style="text-align:center">2</th>
            <th style="text-align:center">3</th>
            <th style="text-align:center">4</th>
            <th style="text-align:center">5</th>
            <th style="text-align:center">1</th>
            <th style="text-align:center">2</th>
            <th style="text-align:center">3</th>
            <th style="text-align:center">4</th>
            <th style="text-align:center">5</th>
            <th style="text-align:center">1</th>
            <th style="text-align:center">2</th>
            <th style="text-align:center">3</th>
            <th style="text-align:center">4</th>
            <th style="text-align:center">5</th>
            <th style="text-align:center">1</th>
            <th style="text-align:center">2</th>
            <th style="text-align:center">3</th>
            <th style="text-align:center">4</th>
            <th style="text-align:center">5</th>
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

exports.download = async function(req, res)
{
    var user = await User.findById(req.params.user_id)

    var html = `<div style="margin:auto;">
                    <img src="http://tmc.minat-bakat.id:8000/api/uploads/top.jpeg" width="100%" />
                    <div style="width:90%;margin:auto;margin-top:30px;">
                    <table width="100%" border="1" cellpadding="5" cellspacing="0" style="font-size:8px!important">
                        <tr>
                            <td rowspan="5" width="30%" style="line-height:1.5">
                                <center>
                                <b>LAPORAN HASIL TES POTENSI AKADEMIK DAN PEMINATAN</b>
                                </center>
                            </td>
                            <td width="15%">Nama</td>
                            <td width="3%" style="text-align:center">:</td>
                            <td>${user.name}</td>
                        </tr>
                        <tr>
                            <td width="20%">NISN</td>
                            <td style="text-align:center">:</td>
                            <td>${user.username}</td>
                        </tr>
                        <tr>
                            <td width="20%">Tempat, Tanggal Lahir</td>
                            <td style="text-align:center">:</td>
                            <td>${user.metas.tempat_tanggal_lahir}</td>
                        </tr>
                        <tr>
                            <td width="20%">Asal Sekolah</td>
                            <td style="text-align:center">:</td>
                            <td>${user.metas.school.name}</td>
                        </tr>
                        <tr>
                            <td width="20%">Tanggal Pemeriksaan</td>
                            <td>:</td>
                            <td>10 Agustus 2020</td>
                        </tr>
                    </table>
                    <br>
                    <table width="100%" border="1" cellpadding="5" cellspacing="0" style="font-size:8px!important">
                        <tr style="font-weight:bold">
                            <td width="5%">1.</td>
                            <td width="30%">TINGKAT POTENSI AKADEMIK</td>
                            <td width="3%" style="text-align:center">:</td>
                            <td colspan="3" style="text-align:center">${user.metas.predikat}</td>
                        </tr>
                        <tr style="font-weight:bold">
                            <td>2.</td>
                            <td colspan="6">HASIL TES PEMINATAN ONLINE</td>
                        </tr>
                        <tr>
                            <td></td>
                            <td>Kelompok Soal Peminatan IPA</td>
                            <td style="text-align:center">:</td>
                            <td colspan="3" style="text-align:center"><b>${user.metas.nilai_ipa}</b></td>
                        </tr>
                        <tr>
                            <td></td>
                            <td>Kelompok Soal Peminatan IPS</td>
                            <td style="text-align:center">:</td>
                            <td colspan="3" style="text-align:center"><b>${user.metas.nilai_ips}</b></td>
                        </tr>
                        <tr>
                            <td></td>
                            <td>Kelompok Soal Peminatan Bahasa</td>
                            <td style="text-align:center">:</td>
                            <td colspan="3" style="text-align:center"><b>${user.metas.nilai_bahasa}</b></td>
                        </tr>
                        <tr style="font-weight:bold">
                            <td>3.</td>
                            <td>JURUSAN SMA</td>
                            <td style="text-align:center">:</td>
                            <td colspan="3" style="text-align:center"><b>${user.metas.jurusan}</b></td>
                        </tr>
                        <tr style="font-weight:bold">
                            <td>4.</td>
                            <td>BAKAT DAN MINAT</td>
                            <td style="text-align:center">:</td>
                            <td style="text-align:center"><b>${user.metas.nilai.hasil == null || user.metas.nilai.hasil == 'Tidak diketahui' ? 'Tidak diketahui' : user.metas.nilai.hasil.split(" - ")[0]}</b></td>
                            <td style="text-align:center"><b>${user.metas.nilai.hasil == null || user.metas.nilai.hasil == 'Tidak diketahui' ? 'Tidak diketahui' : user.metas.nilai.hasil.split(" - ")[1]}</b></td>
                            <td style="text-align:center"><b>${user.metas.nilai.hasil == null || user.metas.nilai.hasil == 'Tidak diketahui' ? 'Tidak diketahui' : user.metas.nilai.hasil.split(" - ")[2]}</b></td>
                        </tr>
                        <tr style="font-weight:bold">
                            <td>5.</td>
                            <td>ALTERNATIF JURUSAN DI PERGURUAN TINGGI</td>
                            <td style="text-align:center">:</td>
                            <td colspan="3" style="text-align:center">Terlampir - </td>
                        </tr>
                    </table>
                    </div>
                    <br>
                    <img src="http://tmc.minat-bakat.id:8000/api/uploads/bottom.png" width="100%" />
                    <img src="http://tmc.minat-bakat.id:8000/api/uploads/lampiran.jpg" width="100%" />
                </div>`

    // res.type("text/html");
    // res.send(html)

    var options = { 
        format: 'A4',
        // width: '21cm',
        // height: '33cm',
        orientation: "portrait"
    };

    var rsp = res

    pdf.create(html,options).toFile('./uploads/'+user.name+'.pdf', function(err, res){
        console.log(res.filename);
        // var filePath = "/files/my_pdf_file.pdf";
        rsp.download(res.filename);

        // fs.readFile(res.filename, function (err,data){
        //     rsp.contentType("application/pdf");
        // });
    });
    // res.json({
    //     message:'data user'
    // })
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
            sub_contents = sub_contents.length && sub_contents.length == 4 ? sub_contents.sort(() => Math.random() - 0.5) : sub_contents;
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

exports.startExamDemo = async (req, res) => {
    
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
            sub_contents = sub_contents.length && sub_contents.length == 4 ? sub_contents.sort(() => Math.random() - 0.5) : sub_contents;
            contents.push({
                parent:content,
                childs:sub_contents
            })
        }
        sequence.contents = contents
        sequences.push(sequence)
    }
    
    sequences = sequences.sort((a,b) => (a.order > b.order) ? 1 : ((b.order > a.order) ? -1 : 0))
    
    res.json({
        status: "success",
        message: 'Exam start',
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