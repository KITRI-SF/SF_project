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
                select s.sensor_id "sensor_id", s.sensor_data "sensor_data", m.status "status", m.is_auto "is_auto"
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
                connection.release();
                res.render('mainindex',{user:sess.user, results:results});
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
                            color[presult.p_name] = "#" + (Math.round(Math.random() * 0xFFFFFF).toString(16)+"0").substring(0,6);
                            pattern.push(`"${color[presult.p_name]}"`);
                            stockPer += presult.p_stock;
                        });

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
                            console.log(prd);
                            console.log(mat_s);
                            console.log(mat_n);
                            console.log(color);
                            console.log(pattern);
                            res.render('stock',{user:sess.user, col:col ,prd:prd, mat_s:mat_s, mat_n:mat_n, color:color, pattern:pattern, stockPer:stockPer});
                        });
                    });
                });
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
    data.rest = "";
    res.send(data);
});

app.get('/api/aim',(req,res)=>{
    p.getConnection((err,connection)=>{
        if(err){
            connection.release();
            throw err;
        }
        let aimQuery = `
            select sensor_id, aim_data 
            from aim_data
            order by sensor_id;
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
                    case 4:
                        data.light = result.aim_data;
                    break;
                }
            });
            data._="";
            connection.release();
            res.send(data);
        });
    });
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

app.post('/illum/control',(req,res)=>{
    var remote = req.body.remote;
    p.getConnection((err,connection)=>{
        if(err){
            connection.release();
            throw err;
        }
        let updateQuery = `
            update machine_status set status = ? where sensor_id = 4;
        `;
        connection.query(updateQuery,[remote],(err)=>{
            if(err){
                connection.release();
                throw err;
            }
            connection.release();
            res.redirect('/manage/illum');
        })
    });
});

app.post('/illum/auto',(req,res)=>{
    var remote = req.body.remote;
    p.getConnection((err,connection)=>{
        if(err){
            connection.release();
            throw err;
        }
        let updateQuery = `
            update machine_status set is_auto = ? where sensor_id = 4;
        `;
        connection.query(updateQuery,[remote],(err)=>{
            if(err){
                connection.release();
                throw err;
            }
            connection.release();
            res.redirect('/manage/illum');
        })
    });
});

app.post('/temp/control',(req,res)=>{
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
            res.redirect('/manage/th');
        })
    });
});

app.post('/temp/auto',(req,res)=>{
    var remote = req.body.remote;
    p.getConnection((err,connection)=>{
        if(err){
            connection.release();
            throw err;
        }
        let updateQuery = `
            update machine_status set is_auto = ? where sensor_id = 1;
        `;
        connection.query(updateQuery,[remote],(err)=>{
            if(err){
                connection.release();
                throw err;
            }
            connection.release();
            res.redirect('/manage/th');
        })
    });
});

app.post('/humid/control',(req,res)=>{
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
            res.redirect('/manage/th');
        })
    });
});

app.post('/humid/auto',(req,res)=>{
    var remote = req.body.remote;
    p.getConnection((err,connection)=>{
        if(err){
            connection.release();
            throw err;
        }
        let updateQuery = `
            update machine_status set is_auto = ? where sensor_id = 2;
        `;
        connection.query(updateQuery,[remote],(err)=>{
            if(err){
                connection.release();
                throw err;
            }
            connection.release();
            res.redirect('/manage/th');
        })
    });
});

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
