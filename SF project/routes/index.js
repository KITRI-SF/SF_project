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
                    selectQuery = `
                        select ITEM_CATEGORY, ITEM_NAME, ITEM_STOCK
                        from items
                        where item_stock between 0 and 40
                        order by item_stock;
                    `;
                    connection.release();
                    res.render('mainindex',{user:sess.user, results:results});
                });
            });
        }
        else{
            res.render('testlogin',{auth:true});
        }
    });

    return router;
};