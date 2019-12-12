const express = require('express');
const session = require('express-session');
const mysql = require('mysql');

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

app.use(express.static('public'));
app.use(bodyParser.urlencoded({extended: false}));

app.use(session({
	secret: 'SFproJ',
	resave: false,
	saveUninitialized: true
}));

const port = 4000;

let authenticated = false;

app.get('/',(req,res)=>{
    let sess = req.session;
    if(sess.user) {
        res.render('main',{user:sess.user});
    }
    else{
        res.render('login');
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
                res.render('stock');
            break;
            case 'illum': 
                res.render('illum');
            break;
            case 'th': 
                res.render('th');
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
        where USER_ID = ? and USER_PW = ?;
        `;
        connection.query(select_query,user,(err,result)=>{
            if(err){
                connection.release();
                throw err;
            }
            
            if(result[0]){
                let sess = req.session;
                sess.user = result[0].USER_NAME;
            }
            connection.release();
            res.redirect('/');
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

app.listen(port,()=>{
    console.log("running at ",port);
});