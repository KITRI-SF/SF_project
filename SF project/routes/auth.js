module.exports = function(app, p){
    const express = require('express');
    const router = express.Router();
    const mysql = require('mysql');

    router.get('/login',(req,res)=>{
         if(!req.session.uid) res.render('index',{redirect:`'/'`});
    });
    
    router.get('/logout',(req,res)=>{
        let sess = req.session;
        if (sess.user) {
            req.session.destroy((err) => {
                if (err)
                    console.log(err);
            });
        }
        res.render('index',{redirect:`'/'`});
    });
    
    router.post('/login',(req,res)=>{
        p.getConnection((err,connection)=>{
            if(err){
                connection.release();
                throw err;
            }
            let user = [
                Id = req.body.userId, 
                Pwd = req.body.userPwd
            ]
            let select_query = `
                select USER_ID, USER_PW, USER_NAME
                from users
                where binary(USER_ID) = ? and binary(USER_PW) = ?;
            `;
            connection.query(select_query,user,(err,result)=>{
                if(err){
                    connection.release();
                    throw err;
                }
                if(result[0]){
                    let select_query = `
                        select sensor_id
                        from sensor_info
                        where sensor_admin_id = ?;
                    `;
                    let sess = req.session;
                    sess.user = result[0].USER_NAME;
                    sess.sensor = sess.user == "DEV" ? [1,2,3] : [];
                    connection.query(select_query,[result[0].USER_ID],(err,result2)=>{
                        if(err){
                            connection.release();
                            throw err;
                        }
                        if(result2[0]){
                            result2.forEach(result => {
                                sess.sensor.push(result.sensor_id);
                            });
                        }
                        connection.release();
                        res.render('index',{redirect:`'/'`});
                    });
                }
                else{
                    res.render('login',{auth:false});
                }
            });
        });
    });
    return router;
};