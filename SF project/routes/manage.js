module.exports = (app, p) => {
    const express = require('express');
    const router = express.Router();
    const mysql = require('mysql');

    router.get('/illum',(req,res)=>{
        let sess = req.session;
        if(!sess.user) { res.redirect('/'); }

        p.getConnection((err,connection)=>{
            if(err){
                connection.release();
                throw err;
            }
            let illumQuery = `
                select sensor_data "illum", date_format(check_date,'%Y-%m-%d %H:%i:%s') "check_date"
                from sensors
                where sensor_id = 4
                and check_date > subdate(now(), interval 30 minute)
                order by check_date;
            `;
            connection.query(illumQuery,(err,results)=>{
                if(err){
                    connection.release();
                    throw err;
                }
                var illum = new Array();
                var date = new Array();
                var cur = undefined;
                if(results[0]){
                    results.forEach(result => {
                        illum.push(result.illum);
                        date.push(`"${result.check_date}"`);
                    });
                    cur = results[results.length-1].illum;
                }
                let statusQuery = `
                    select m.status "status", m.is_auto "is_auto", a.aim_data "aim_data"
                    from machine_status m, aim_data a
                    where m.sensor_id = a.sensor_id
                    and m.sensor_id = 4;
                `;
                connection.query(statusQuery,(err,results)=>{
                    if(err){
                        connection.release();
                        throw err;
                    }
                    var aim, st, isAuto;
                    if(results[0]){
                        aim = results[0].aim_data;
                        st = results[0].status;
                        isAuto = results[0].is_auto;
                    }
                    connection.release();
                    res.render('lighttest',{user:sess.user, illum:illum, date:date, aim:aim, cur:cur, st:st, isAuto:isAuto});
                });
            });
        });
    });

    router.get('/th',(req,res)=>{
        let sess = req.session;
        if(!sess.user) { res.redirect('/'); }

        p.getConnection((err, connection)=>{
            if(err){
                connection.release();
                throw err;
            }
            let thQuery = `
                select t.sensor_data "temp", h.sensor_data "humid", date_format(t.check_date,'%Y-%m-%d %H:%i:%s') "check_date"
                from (select * from sensors where sensor_id=1 order by check_date desc) t,
                (select * from sensors where sensor_id=2 order by check_date desc) h
                where t.check_date = h.check_date 
                    and t.check_date > subdate(now(), interval 30 minute)
                order by t.check_date;
            `;
            connection.query(thQuery,(err,thresults)=>{
                if(err){
                    connection.release();
                    throw err;
                }
                var temp = new Array();
                var  humid = new Array();
                var date = new Array();
                var curT = undefined;
                var curH = undefined;
                if(thresults[0]){
                    thresults.forEach(result => {
                        temp.push(result.temp);
                        humid.push(result.humid);
                        date.push(`"${result.check_date}"`);
                    });
                    curT = thresults[thresults.length-1].temp;
                    curH = thresults[thresults.length-1].humid;
                }
                let statusQuery = `
                    select m.status "status", m.is_auto "is_auto", a.aim_data "aim_data"
                    from machine_status m, aim_data a
                    where m.sensor_id in (1,2)
                        and m.sensor_id = a.sensor_id
                    order by m.sensor_id asc;
                `;
                connection.query(statusQuery,(err,stresults)=>{
                    if(err){
                        connection.release();
                        throw err;
                    }
                    var aim = new Array();
                    var st = new Array();
                    var isAuto = new Array();
                    if(stresults[0]){
                        stresults.forEach(result => {
                                aim.push(result.aim_data);
                                st.push(result.status);
                                isAuto.push(result.is_auto);
                        });
                    }
                    connection.release();
                    res.render('th',{temp:temp, humid:humid, date:date, user:sess.user, curT:curT, curH:curH, aim:aim, st:st, isAuto:isAuto});
                });
                
            });
        });
    });

    router.get('/stock',(req,res)=>{
        let sess = req.session;
        if(!sess.user) { res.redirect('/'); }

        p.getConnection((err,connection)=>{
            if(err){
                connection.release();
                throw err;
            }
            let pQuery = `
                select p_name, p_stock
                from product
                order by p_id asc; 
            `; //id (1 ... n') 순서
            connection.query(pQuery,(err,Presults)=>{
                if(err){
                    connection.release();
                    throw err;
                }

                var prd = new Array();
                var col = new Array();
                var color = {};
                var pattern = new Array();
                var stockPer=0;
                Presults.forEach((presult,ind)=>{
                    prd.push(new Array());
                    col.push(new Array());
                    col[ind].push(`["${presult.p_name}"`);
                    prd[ind].push(`"${presult.p_name}"`);
                    col[ind].push(`${presult.p_stock}]`);
                    prd[ind].push(presult.p_stock);
                    color[presult.p_name] = "#" + ( Math.round(Math.random() * (0xFFFFFF - 0x999999) + 0xFFFFFF  ).toString(16) + "0" ).substring(0,6);
                    pattern.push(`"${color[presult.p_name]}"`);
                    stockPer += presult.p_stock;
                });
                stockPer = Math.round(stockPer/3000 * 100) ;
                let mQuery = `
                    select m_name, m_stock, p_id
                    from material
                    order by p_id asc, m_name asc;
                `;
                connection.query(mQuery,(err,Mresults)=>{
                    if(err){
                        connection.release();
                        throw err;
                    }
                    let mat_s = new Array();
                    let mat_n = new Array();
                    let cid=0, ind=-1;
                    Mresults.forEach(Mresult=>{
                        if(cid != Mresult.p_id) {
                            cid = Mresult.p_id;
                            mat_s.push(new Array());
                            mat_n.push(new Array());
                            ind++;
                        }
                        mat_s[ind].push(Mresult.m_stock);
                        mat_n[ind].push(`"${Mresult.m_name}"`);
                    });
                    /*
                        id 바뀔때만 ind 증가
                        if(cid != Mresult.p_id) {
                            cid = Mresult.p_id;
                            mat.push(new Array());
                            ind++;
                        }
                    */
                    res.render('stock',{user:sess.user, col:col ,prd:prd, mat_s:mat_s, mat_n:mat_n, color:color, pattern:pattern, stockPer:stockPer});
                });
            });
        });
    });

    return router;
};