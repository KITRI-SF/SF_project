module.exports = (app, p) => {
    const express = require('express');
    const router = express.Router();
    const mysql = require('mysql');

    router.get('/',(req,res)=>{
        let sess = req.session;
        if(sess.user) {
            p.getConnection((err,connection)=>{
                if(err){
                    connection.release();
                    throw err;
                }
                let selectQuery = `
                    select s.sensor_id "sensor_id", s.sensor_data "sensor_data", m.status "status", m.is_auto "is_auto"
                    from (select sensor_id, sensor_data from sensors where check_date > subdate(now(), interval 30 minute) order by check_date desc limit 0,4) s, 
                          machine_status m
                    where s.sensor_id = m. sensor_id;
                `;
                connection.query(selectQuery,(err,results)=>{
                    if(err){
                        connection.release();
                        throw err;
                    }
                    let selectQuery = `
                        select p_name, p_stock
                        from product;
                    `;
                    connection.query(selectQuery,(err,results2)=>{
                        if(err){
                            connection.release();
                            throw err;
                        }
                        connection.release();
                        res.render('main',{user:sess.user, results:results, results2:results2});
                    });
                });
            });
        }
        else{
            res.render('login',{auth:true});
        }
    });

    return router;
};