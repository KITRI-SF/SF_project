const express = require('express');
const session = require('express-session');
const mysql = require('mysql');
const request = require("request");

const bodyParser = require('body-parser');
const url = require('url');
const querystring = require('querystring');

const app = express();

const p = mysql.createPool({
     host: 'localhost'
	,user : 'sf_master'
	,password : 'kitri123'
	,database : 'sf_project'
    ,port : 3306   
    ,connectionLimit : 20
	,waitForConnection : false
});

app.locals.pretty = true;
app.set('views', 'views');
app.set('view engine', 'ejs');

app.use(express.json());
app.use(express.static('public'));
app.use(bodyParser.urlencoded({extended: false}));

app.use(session({
	secret: 'SFproJ',
	resave: false,
	saveUninitialized: true
}));

const port = 4000;

app.get('/',(req,res)=>{
    let sess = req.session;
    if(sess.user) {
        p.getConnection((err,connection)=>{
            if(err){
                connection.release();
                throw err;
            }
            let selectQuery = `
                select s.sensor_id "sensor_id", sensor_data, status
                from (select sensor_id, sensor_data from sensors order by check_date desc limit 0,4) s, 
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
                connection.query(selectQuery,(err,results2)=>{
                    if(err){
                        connection.release();
                        throw err;
                    }
                    connection.release();
                    res.render('mainindex',{user:sess.user, results:results, results2:results2});
                });
            });
        });
    }
    else{
        res.render('testlogin',{auth:true});
    }
});

app.get('/login',(req,res)=>{
    let mode = req.params.mode;
    let sess = req.session;
    if(!sess.uid) res.redirect('/');
});

app.get('/manage/:mode',(req,res)=>{
    let mode = req.params.mode;
    let sess = req.session;
    if(!sess.user) res.redirect('/');
    else {
        switch(mode){
            case 'stock': 
                res.render('stock',{user:sess.user});
            break;
            case 'illum': 
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
                        connection.release();
                        var illum = new Array();
                        var date = new Array();
                        results.forEach(result => {
                            illum.push(result.illum);
                            date.push(`"${result.check_date}"`);
                        });
                        res.render('lighttest',{user:sess.user, illum:illum, date:date});
                    });
                });
                
            break;
            case 'th': 
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
                    connection.query(thQuery,(err,results)=>{
                        if(err){
                            connection.release();
                            throw err;
                        }
                        connection.release();
                        var temp = new Array();
                        var  humid = new Array();
                        var date = new Array();
                        results.forEach(result => {
                            temp.push(result.temp);
                            humid.push(result.humid);
                            date.push(`"${result.check_date}"`);
                        });
                        res.render('th',{temp:temp, humid:humid, date:date, user:sess.user})
                    });
                })
            break;
        }
    }
});

app.post('/login',(req,res)=>{
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

app.get('/api/test',(req,res)=>{
    const data = {};
    data.temp = Math.floor(Math.random() * Math.floor(10)) + 20;
    data.humid = Math.floor(Math.random() * Math.floor(10)) + 20;
    data.gas = Math.floor(Math.random() * Math.floor(10)) + 20;
    data.light = Math.floor(Math.random() * Math.floor(10)) + 20;
    res.send(data);
});

app.get('/logout',(req,res)=>{
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

setInterval(()=>{
    let url = "http://183.101.196.144:4000/api/test";
    request(url,function(err,res,body){
        const result = JSON.parse(body);
        const temp = result.temp;
        const humid = result.humid;
        const gas = result.gas;
        const light = result.light;
        console.log(`{"temp":${temp}, "humid":${humid}, "gas":${gas}, "light":${light}}`);
        p.getConnection((err,connection)=>{
            if(err){
                connection.release();
                throw err;
            }
            let insertQuery = `
                insert into sensors(SENSOR_ID, SENSOR_DATA, CHECK_DATE)
                values
                (1,?,date_format(NOW(),'%y-%m-%d %H:%i:%s')),
                (2,?,date_format(NOW(),'%y-%m-%d %H:%i:%s')),
                (3,?,date_format(NOW(),'%y-%m-%d %H:%i:%s')),
                (4,?,date_format(NOW(),'%y-%m-%d %H:%i:%s'));
            `;

            connection.query(insertQuery,[temp,humid,gas,light],(err,result)=>{
                if(err){
                    connection.release();
                    throw err;
                }
                connection.release();
            });
        });
    });
},60000);

// setInterval(()=>{
//     console.log("SENSING");
//     request('http://183.101.196.156:80/',(err,res,body)=>{
//         const result = JSON.parse(body);
//         const data = result.data;
//         console.log(data);
//     });
// },2000);

app.listen(port,()=>{
    console.log("running at ",port);
});
