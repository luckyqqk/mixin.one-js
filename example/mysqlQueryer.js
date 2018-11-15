module.exports = (function(){
    const MySQL = require('mysql');
    const mysqlClient = MySQL.createPool({
        host: '127.0.0.1',
        port: 3306,
        user: 'root',
        password: '',
        database: 'testDB'
    });

    function querySql0(sql) {
        return new Promise((resolve, reject)=>{
            mysqlClient.query(sql, null, (err, data)=>{
                if (!!err)
                    reject(err);
                else
                    resolve(data);
            });
        });
    }
    function querySql1(sql, values) {
        return new Promise((resolve, reject)=>{
            mysqlClient.query(sql, values, (err, data)=>{
                if (!!err)
                    reject(err);
                else
                    resolve(data);
            });
        });
    }
    /** 函数重载 */
    function addMethod(Obj, name, func) {
        let old = Obj[name];
        Obj[name] = function() {
            if (func.length == arguments.length)
                return func.apply(this, arguments);
            else if (typeof old == 'function')
                return old.apply(this, arguments);
        }
    }
    let forOut = {};
    addMethod(forOut, 'querySql', querySql0);
    addMethod(forOut, 'querySql', querySql1);
    return forOut;
})();