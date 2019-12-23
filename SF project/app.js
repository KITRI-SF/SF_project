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

const port = 4000;

app.locals.pretty = true;
app.set('views', 'views');
app.set('view engine', 'ejs');

app.use(session({
    secret: 'SFproJ',
    resave: false,
    saveUninitialized: true
}));

app.use(express.json());
app.use(express.static('public'));
app.use(bodyParser.urlencoded({extended: false}));

let index = require('./routes/index.js')(app, p);
app.use('/',index);

let auth = require('./routes/auth.js')(app, p);
app.use('/auth',auth);

let auto = require('./routes/auto.js')(app, p);
app.use('/auto',auto);

let control = require('./routes/control.js')(app, p);
app.use('/control',control);

let manage = require('./routes/manage.js')(app, p);
app.use('/manage',manage);

let api = require('./routes/api.js')(app, p);
app.use('/api',api);

let aim = require('./routes/aim.js')(app, p);
app.use('/aim',aim);

//error handling area
app.use((req,res,next)=>{
    throw new Error(req.url + ' not found');
});

app.use((err,req,res,next)=>{
    let sess = req.session;
    if(sess.user) {
        res.render('error',{user:sess.user});
    }
    else {
        res.render('index',{redirect:`'/'`});
    }
});
////error handling area

app.listen(port,()=>{
    console.log("running at ",port);
});