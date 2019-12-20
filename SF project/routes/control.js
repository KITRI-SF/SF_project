module.exports = (app, p) => {
    const express = require('express');
    const router = express.Router();
    const mysql = require('mysql');

    router.post('/temp',(req,res)=>{
        var remote = req.body.remote;
        p.getConnection((err,connection)=>{
            if(err){
                connection.release();
                throw err;
            }
            let updateQuery = `
                update machine_status set status = ? where sensor_id = 1;
            `;
            connection.query(updateQuery,[remote],(err)=>{
                if(err){
                    connection.release();
                    throw err;
                }
                connection.release();
                res.render('index',{redirect:`'/manage/th'`});
            })
        });
    });

    router.post('/humid',(req,res)=>{
        var remote = req.body.remote;
        p.getConnection((err,connection)=>{
            if(err){
                connection.release();
                throw err;
            }
            let updateQuery = `
                update machine_status set status = ? where sensor_id = 2;
            `;
            connection.query(updateQuery,[remote],(err)=>{
                if(err){
                    connection.release();
                    throw err;
                }
                connection.release();
                res.render('index',{redirect:`'/manage/th'`});
            })
        });
    });

    router.post('/illum',(req,res)=>{
        var remote = req.body.remote;
        p.getConnection((err,connection)=>{
            if(err){
                connection.release();
                throw err;
            }
            let updateQuery = `
                update machine_status set status = ? where sensor_id = 3;
            `;
            connection.query(updateQuery,[remote],(err)=>{
                if(err){
                    connection.release();
                    throw err;
                }
                connection.release();
                res.render('index',{redirect:`'/manage/illum'`});
            })
        });
    });

    return router;
}