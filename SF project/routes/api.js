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

    router.get("/sms",(req,res)=>{    
        var numbersToMessage;
        // sample: numbersToMessage = ["+82 10-2377-5817", "+82 10-2931-2131"];
        numbersToMessage = ["+82 10-2377-5817", "+82 10-2931-2131"];

        let data = {};

        numbersToMessage.forEach(function(number, ind){
        // var message = client.messages.create({
        //     body: '공장에서 가스 누출이 감지되었습니다!',
        //     from: '+19255218810',
        //     to: number
        // })
        // .then(message =>  console.log(message.status))
        // .done();
            data[`p${ind}`] =   {
                body: '공장에서 가스 누출이 감지되었습니다!',
                from: '+19255218810',
                to: number
            }
        });
        res.send(data);
    });

    return router;
}