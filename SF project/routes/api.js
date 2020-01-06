module.exports = (app, p) => {
    const express = require('express');
    const router = express.Router();
    const mysql = require('mysql');
    const accountSid = 'AC47db0031fce2223f2053ee7bcbad349e';
    const authToken = '6960c038bfd989ef0643b795775b3ff3';
    const client = require('twilio')(accountSid, authToken);

    router.get('/aim',(req,res)=>{
        p.getConnection((err,connection)=>{
            if(err){
                connection.release();
                throw err;
            }
            let aimQuery = `
                select a.sensor_id "sensor_id", a.aim_data "aim_data", m.name "name", m.status "status", m.is_auto "is_auto"
                from aim_data a, machine_status m
                where a.sensor_id = m. sensor_id;
            `;
            connection.query(aimQuery,(err,results)=>{
                if(err){
                    connection.release();
                    throw err;
                }
                let data = {};
                results.forEach((result,ind)=>{
                    switch(result.sensor_id){
                        case 1:
                            data.temp = result.aim_data;
                        break;
                        case 2:
                            data.humid = result.aim_data;
                        break;
                        case 3:
                            data.light = result.aim_data;
                        break;
                    }
                    data[result.name] = `${result.status}${result.is_auto}` ;
                    //1번째 현재 해당 기계 on/off
                    //2번째 현재 해당 기계를 자동 구동 여부
                });
                data._="";
                connection.release();
                res.send(data);
            });
        });
    });

    router.get('/insert',(req,res)=>{
        let temp = req.query.temp;
        let humid = req.query.humid;
        let cds = req.query.cds;
        let auth = req.query.key == 'ryo@ctat!frmas$ritki';
        console.log(`temp:${temp} || humid:${humid} || cds:${cds} || auth:${auth} || ${req.query.key}`);
        if(auth) {
            p.getConnection((err,connection)=>{
                if(err){
                    connection.release();
                    throw err;
                }
                connection.beginTransaction((err)=>{
                    if(err){
                        connection.release();
                        throw err;
                    }
                    let insertQuery = `
                        insert into sensors(sensor_id,sensor_data,check_date)
                        values
                        (1,?,date_format(NOW(),'%y-%m-%d %H:%i:%s')),
                        (2,?,date_format(NOW(),'%y-%m-%d %H:%i:%s')),
                        (3,?,date_format(NOW(),'%y-%m-%d %H:%i:%s'));
                    `;
                    connection.query(insertQuery,[temp,humid,cds],(err,results)=>{
                        if(err){
                            connection.rollback(()=>{
                                connection.release();
                                throw err;
                            });
                        }
                        connection.commit((err)=>{
                            if(err){
                                connection.rollback(()=>{
                                    connection.release();
                                    throw err;
                                })
                            }
                            connection.release();
                            console.log("success");
                            res.render('index',{redirect:`'/'`});
                        });
                    }); 
                });
            });
        }
        else{
            res.send("잘못된 접근 입니다.");
        }
    });

    router.get("/sms",(req,res)=>{
        let auth = req.query.key == 'ryo@ctat!frmas$ritki';
        if(auth){
            var numbersToMessage;
            numbersToMessage = ["+82 10-3896-8041", "+82 10-2931-2131"];
            let data = {};
            numbersToMessage.forEach(function(number, ind){
                var message = client.messages.create({
                    body: '공장에서 가스 누출이 감지되었습니다!',
                    from: '+12015033503',
                    to: number
                })
                .then(message =>  console.log(message.status))
                .done();
                data[`p${ind}`] =   {
                    body: '공장에서 가스 누출이 감지되었습니다!',
                    from: '+12015033503',
                    to: number
                }
            });
            res.send(data);
        }
        else{
            res.send("잘못된 접근 입니다.");
        }
    });

    router.get("/stock",(req,res)=>{ 
        let stock = req.query.stock; 
        let data = req.query.data; 
        let auth = req.query.key == 'ryo@ctat!frmas$ritki';
        console.log(`stock:${stock} || data:${data} || auth:${auth} || ${req.query.key}`);
        if(auth) {
            p.getConnection((err,connection)=>{
                if(err){
                    connection.release();
                    throw err;
                }
                connection.beginTransaction((err)=>{
                    if(err){
                        connection.release();
                        throw err;
                    }
                    let updateQuery = `
                        update product set p_stock = ? where p_id = 1;
                    `;
                    connection.query(updateQuery,[stock],(err,results)=>{
                        if(err){
                            connection.rollback(()=>{
                                connection.release();
                                throw err;
                            });
                        }
                        connection.commit((err)=>{
                            if(err){
                                connection.rollback(()=>{
                                    connection.release();
                                    throw err;
                                })
                            }
                            connection.release();
                            console.log("success");

                            res.render('index',{redirect:`'/'`});
                        });
                    }); 
                });
            });
        }
        else{
            res.send("잘못된 접근 입니다.");
        }
    });

    router.get('/talk',(req,res)=>{
        let auth = req.query.key == 'ryo@ctat!frmas$ritki';
        let command = req.query.command;
        console.log(`command:${command} || ${typeof(command)}`);
        if(auth){
            p.getConnection((err,connection)=>{
                if(err) {
                    connection.release();
                    throw err;
                }
                let selectQuery = `
                    select is_auto from machine_status;
                `;
                connection.query(selectQuery,(err,results)=>{
                    if(err) {
                        connection.release();
                        throw err;
                    }
                    let is_auto = new Array();
                    results.forEach(result => {
                        is_auto.push(result.is_auto);
                    });
                    console.log(is_auto);
                    let updateQuery =``;
                    switch(command) {
                        case '0':
                            if(is_auto[2]) break;
                            updateQuery = `
                                update machine_status set status = 0 where sensor_id = 3;
                            `;
                            connection.query(updateQuery,(err,result)=>{
                                if(err){
                                    connection.release();
                                    throw err;
                                }
                                connection.release();
                            });
                            console.log("천장 닫기");
                            break;
                        case '1':
                            if(is_auto[2]) break;
                            updateQuery = `
                                update machine_status set status = 1 where sensor_id = 3;
                            `;
                            connection.query(updateQuery,(err,result)=>{
                                if(err){
                                    connection.release();
                                    throw err;
                                }
                                connection.release();
                            });
                            console.log("천장 열기");
                            break;
                        case '2':
                            if(is_auto[0]) break;
                            updateQuery = `
                                update machine_status set status = 1 where sensor_id = 1;
                            `;
                            connection.query(updateQuery,(err,result)=>{
                                if(err){
                                    connection.release();
                                    throw err;
                                }
                                connection.release();
                            });
                            console.log("냉난방 실생");
                            break;
                        case '3':
                            if(is_auto[0]) break;
                            updateQuery = `
                                update machine_status set status = 0 where sensor_id = 1;
                            `;
                            connection.query(updateQuery,(err,result)=>{
                                if(err){
                                    connection.release();
                                    throw err;
                                }
                                connection.release();
                            });
                            console.log("냉난방 중지");
                            break;
                        case '4':
                            if(is_auto[1]) break;
                            updateQuery = `
                                update machine_status set status = 1 where sensor_id = 2;
                            `;
                            connection.query(updateQuery,(err,result)=>{
                                if(err){
                                    connection.release();
                                    throw err;
                                }
                                connection.release();
                            });
                            console.log("제습 실행");
                            break;
                        case '5':
                            if(is_auto[1]) break;
                            updateQuery = `
                                update machine_status set status = 0 where sensor_id = 2;
                            `;
                            connection.query(updateQuery,(err,result)=>{
                                if(err){
                                    connection.release();
                                    throw err;
                                }
                                connection.release();
                            });
                            console.log("제습 중지");
                            break;
                    }
                });
            });
        }
        res.render('index',{redirect:`'/'`});
    });

    return router;
}