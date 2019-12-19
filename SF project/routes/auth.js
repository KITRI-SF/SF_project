module.exports = function(app, p){
    const express = require('express');
    const router = express.Router();
    const mysql = require('mysql');

    router.get('/login',(req,res)=>{
        let mode = req.params.mode;
        let sess = req.session;
        if(!sess.uid) res.redirect('/');
    });
    
    
    router.get('/logout',(req,res)=>{
        let sess = req.session;
        if (sess.user) {
            req.session.destroy((err) => {
                if (err)
                    console.log(err);
                else
                    res.redirect('/');
            });
        } else
            res.redirect('/');
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
            const select_query = `
            select USER_ID, USER_PW, USER_NAME
            from users
            where binary(USER_ID) = ? and binary(USER_PW) = ?;
            `;
            connection.query(select_query,user,(err,result)=>{
                if(err){
                    connection.release();
                    throw err;
                }
                connection.release();
                if(result[0]){
                    let sess = req.session;
                    sess.user = result[0].USER_NAME;
                    res.redirect('/');
                }
                else{
                    res.render('testlogin',{auth:false});
                }
            });
        });
    });
    return router;
};