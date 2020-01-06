module.exports = (app, p) => {
    const express = require('express');
    const router = express.Router();
    const mysql = require('mysql');
    router.get('/light',(req,res)=>{
        let sess = req.session;
        if(!sess.user) { res.render('index',{redirect:`'/'`}); }
        if(!(sess.user == 'KIM' || sess.user == 'DEV')) {
            res.render('index',{redirect:`'/'`});
        }
        else {
        p.getConnection((err,connection)=>{
            if(err){
                connection.release();
                throw err;
            }
            let illumQuery = `
                select sensor_data "light", date_format(check_date,'%Y-%m-%d %H:%i:%s') "check_date"
                from sensors
                where sensor_id = 3
                and check_date > subdate(now(), interval 30 minute)
                order by check_date;
            `;
            connection.query(illumQuery,(err,results)=>{
                if(err){
                    connection.release();
                    throw err;
                }
                var light = new Array(); // 차트 상의 표현될 조도 값을 담을 배열 변수
                var date = new Array(); // 차트 상의 표현될 조도 값 측정 날짜를 담을 배열 변수
                var cur = undefined; //현재의 값이 있는지 없는지 표현될 변수
                if(results[0]){
                    results.forEach(result => {
                        light.push(result.light);
                        date.push(`"${result.check_date}"`); // billboard 차트에서 받는 포맷("날짜")으로 변환
                    });
                    cur = results[results.length-1].light; //가장 최근의 값이 가장 마지막이기 때문에 마지막 값을 최근 데이터 값에 담기
                }
                let statusQuery = `
                    select m.status "status", m.is_auto "is_auto", a.aim_data "aim_data"
                    from machine_status m, aim_data a
                    where m.sensor_id = a.sensor_id
                    and m.sensor_id = 3;
                `;
                connection.query(statusQuery,(err,results)=>{
                    if(err){
                        connection.release();
                        throw err;
                    }
                    var aim, st, isAuto;
                    if(results[0]){
                        aim = results[0].aim_data; //현재 타겟 조도
                        st = results[0].status; //현재 천장 열림/닫힘 상태
                        isAuto = results[0].is_auto; //현재 자동/수동 여부
                    }
                    connection.release();
                    res.render('lighttest',{user:sess.user, light:light, date:date, aim:aim, cur:cur, st:st, isAuto:isAuto});
                });
            });
        });
        }
    });

    router.get('/th',(req,res)=>{
        let sess = req.session;
        if(!sess.user) { res.render('index',{redirect:`'/'`}); }
        if(!(sess.user == 'LEE' || sess.user == 'DEV')) {
            res.render('index',{redirect:`'/'`});
        }
        else {
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
                var temp = new Array(); //차트에 표현될 온도 값을 담을 배열 변수
                var humid = new Array(); //차트에 표현될 습도 값을 담을 배열 변수
                var date = new Array(); //온습도 측정 시각을 담을 배열 변수
                var curT = undefined; //가장 최근의 온도값 담을 변수
                var curH = undefined; //가장 최근의 습도값 담을 변수
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
                    var aim = new Array(); //온습도의 타겟 값 담을 배열 변수 index ( 0:온도, 1:습도 )
                    var st = new Array(); //냉난방기/제습기 현재 상태를 담을 배열 변수 index ( 0:온도, 1:습도 )
                    var isAuto = new Array(); //온습도 자동/수동 여부를 담을 배열 변수 index ( 0:온도, 1:습도 )
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
        }
    });

    router.get('/stock',(req,res)=>{
        let sess = req.session;
        if(!sess.user) { res.render('index',{redirect:`'/'`}); }
        if(!(sess.user == 'JIN' || sess.user == 'DEV')) {
            res.render('index',{redirect:`'/'`});
        }
        else {
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
                var col = new Array(); // [ ["완제품1",완제품1 재고],["완제품2",완제품2 재고], ... ,["완제품n",완제품n 재고]] 형태의 배열 (pieChart의 columns안에 들어갈 값)
                var color = {}; //각 카테고리별 색깔 값 (barChart)
                var pattern = new Array(); //각 카테고리별 색깔 값 (pieChart)
                var stockPer=0; // 재고율 표현 변수
                Presults.forEach((presult,ind)=>{
                    prd.push(new Array());
                    col.push(new Array());
                    col[ind].push(`["${presult.p_name}"`);
                    prd[ind].push(`"${presult.p_name}"`);
                    col[ind].push(`${presult.p_stock}]`);
                    prd[ind].push(presult.p_stock);
                    color[presult.p_name] = "#" + ( Math.round(Math.random() * (0xFFFFFF - 0x999999) + 0xFFFFFF  ).toString(16) + "0" ).substring(0,6); //색깔값(16진수)이 6자리를 유지해야 해야 하기때문에 subString 사용
                    pattern.push(`"${color[presult.p_name]}"`);
                    stockPer += presult.p_stock; //재고율 계산 전 모든 완제품 제고값 더하기
                });
                stockPer = Math.round(stockPer/3000 * 100) ; // 재고율 계산 (최대를 3000으로 설정하였지만 바꾸어도 상관이 없음)
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
                    let mat_s = new Array(); // 완제품별 필요소재 수량을 담을 배열 변수 [[완제품1번의 소재1 수량,완제품1번의 소재2 수량,...완제품1번의 소재n 수량],[완제품2번의 소재1 수량,완제품2번의 소재2 수량,...완제품2번의 소재n 수량], ...]
                    let mat_n = new Array(); // 완제품별 필요소재 이름을 담을 배열 변수 [[완제품1번의 소재1 명칭,완제품1번의 소재2 명칭,...완제품1번의 소재n 명칭],[완제품2번의 소재1 명칭,완제품2번의 소재2 명칭,...완제품2번의 소재n 명칭], ...]
                    let cid=0, ind=-1; // cid 현재 완제품 아이디, ind 현재 index (완제품 아이디는 1부터시작하기에 if문 들어가서 ind++을 하기 떄문에 -1으로 초기화)
                    Mresults.forEach(Mresult=>{
                        if(cid != Mresult.p_id) { //완제품 아이디로 정렬하고 재고명으로 정렬하였기때문에 완제품 아이디가 바뀔때마다 새로운 배열 추가
                            cid = Mresult.p_id;
                            mat_s.push(new Array());
                            mat_n.push(new Array());
                            ind++;
                        }
                        mat_s[ind].push(Mresult.m_stock);
                        mat_n[ind].push(`"${Mresult.m_name}"`); //billboard 차트에서 요구하는 포맷으로 변환
                    });
                    /*
                        id 바뀔때만 ind 증가
                        if(cid != Mresult.p_id) {
                            cid = Mresult.p_id;
                            mat.push(new Array());
                            ind++;
                        }
                    */
                    connection.release();
                    res.render('stock',{user:sess.user, col:col ,prd:prd, mat_s:mat_s, mat_n:mat_n, color:color, pattern:pattern, stockPer:stockPer});
                });
            });
        });
        }
    });

    return router;
};