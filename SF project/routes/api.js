module.exports = (app, p) => {
    const express = require('express');
    const router = express.Router();
    const mysql = require('mysql');
    const accountSid = 'ACc004c79e020198fd67984dc3469b50af';
    const authToken = '2e597d0282a9bc7d77d2bdf8e6b17c60';
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
            res.render('index',{redirect:`'/'`});
        }
    });

    router.get("/sms",(req,res)=>{
        let auth = req.query.key == 'ryo@ctat!frmas$ritki';
        if(auth){
            var numbersToMessage;
            // sample: numbersToMessage = ["+82 10-2377-5817", "+82 10-2931-2131"];
            numbersToMessage = ["+82 10-2377-5817", "+82 10-2931-2131"];
            let data = {};
            numbersToMessage.forEach(function(number, ind){
                var message = client.messages.create({
                    body: '공장에서 가스 누출이 감지되었습니다!',
                    from: '+19255218810',
                    to: number
                })
                .then(message =>  console.log(message.status))
                .done();
                data[`p${ind}`] =   {
                    body: '공장에서 가스 누출이 감지되었습니다!',
                    from: '+19255218810',
                    to: number
                }
            });
            res.send(data);
        }
        else{
            res.render('index',{redirect:`'/'`});
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
            res.render('index',{redirect:`'/'`});
        }
    });
    
    router.get('/test',(req,res)=>{
        let auth = req.query.key == 'ryo@ctat!frmas$ritki';
        if(auth){
            console.log("working..");
            res.render('index',{redirect:`'/'`});
        }
        else {
            console.log("Check your key");
            res.render('index',{redirect:`'/'`});
        }
    });

    router.get('/talk',(req,res)=>{
        let auth = req.query.key == 'ryo@ctat!frmas$ritki';
        let command = req.query.command;
        console.log(`command:${command} || ${typeof(command)}`);
        if(auth){
            switch(command) {
                case '0':
                    console.log("천장 닫기");
                    break;
                case '1':
                    console.log("천장 열기");
                    break;
                case '2':
                    console.log("난방 실생");
                    break;
                case '3':
                    console.log("난방 중지");
                    break;
                case '4':
                    console.log("제습 실행");
                    break;
                case '5':
                    console.log("제습 중지");
                    break;
                case '6':
                    console.log("조명 켜기");
                    break;
                case '7':
                    console.log("조명 끄기");
                    break;
            }
        }
        res.render('index',{redirect:`'/'`});
    });

    return router;
}