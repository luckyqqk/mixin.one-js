module.exports = (function(){
    const path = require('path');
    const fs = require('fs');
    const sleep = require('sleep-promise');
    const async = require('async');
    const format = require('util').format;
    const mixinOne = require('../index');
    const Account = mixinOne.account;
    const mixinApi = mixinOne.api;
    const mysqlNoCache = require('./mysqlQueryer');
    const ConstData = require('../appData/appData');

    const rootAcc = new Account(ConstData.MIXIN_MAIN_ACC);                     // 主账号
    // const assetIdOfCNB = '965e5c6e-434c-3fa9-b780-c50f43cd955c';            // 试玩币的asset_id
    const SNAPSHOT_TIME_NAME = 'snapshot';
    const SNAPSHOT_SLEEP_TIME = 1000;   // 休息1秒
    let snapshotStatus = true;          // 是否扫描,true扫描,false结束扫描
    function setSnapshotStatus(bool) {
        snapshotStatus = bool;
    }
    // 给新增的用户转账试玩,废弃,改为用户手动领取
    // function _transferCNBOnCreate(newUserId) {
    //     return new Promise((resolve, reject)=>{
    //         let encryptPin = mixinOne.encryptPin(rootAcc);
    //         let traceId = mixinOne.uuidv4();
    //         mixinApi.transfer(rootAcc, encryptPin, assetIdOfCNB, newUserId, "1", "transferOnCreate", traceId).then(data=>{
    //             resolve(traceId);
    //         }).catch(reject);
    //     });
    // }

    /**
     * 生成mixinUser并存储到mysql
     * @param count
     * @returns {function(*=)}
     * @private
     */
    function _createMixinUsersAndSaveDB(count) {
        return (_cb)=>{
            mixinApi.createUsers(rootAcc, ConstData.MIXIN_DEFAULT_PARAM.USER_NAME, count).then(users=>{
                let sql = 'insert into mixin_user (user_id, session_id, pin_token) values ';
                let value = '';
                for (let i = 0; i < users.length; i++) {
                    // _transferCNBOnCreate(users[i]['user_id']).then(()=>{}).catch((err)=>{console.error(err)});
                    value = format(`%s,('%s','%s','%s')`, value, users[i]['user_id'], users[i]['session_id'], users[i]['pin_token']);
                }
                sql = format(`%s%s`, sql, value.substring(1));
                mysqlNoCache.querySql(sql).then((insertRes)=>{
                    let insertId = JSON.parse(JSON.stringify(insertRes)).insertId;
                    for (let i = 0; i < count; i++) {
                        users[i]['id'] = insertId++;
                    }
                    _cb(null, users);
                }).catch(err=>{
                    _cb(err);
                });
            }).catch(err=>{
                _cb(err);
            });
        }
    }

    /**
     * 新建count个mixin User并存储到mysql
     *
     * mixin用户生成,采用预生成策略.
     * 每次调用大概生成lessPrepare条mixin用户.
     * 这lessPrepare条任务,分lessPrepare/maxApiCall条(有余数的情况次数 + 1)的子任务.
     * 当第一个子任务结束时,该Promise先返回,以便调用方不用等待所有子任务均执行完毕.
     * 每次子任务执行完毕,进程挂起0毫秒,以便降低该进程对cpu的竞争(让调用方能抢到cpu,优先计算).
     * @param {number} count    需要生成多少个user
     * @returns {*}
     */
    function _createMixinUsers(count) {
        return new Promise((resolve, reject)=>{
            // 检测Promise的返回状态,并且挂起0毫秒
            let hasResolve = false;
            function _checkResolveAndReleaseCPU(users, cb) {
                if (!hasResolve) {
                    hasResolve = true;
                    resolve(users);
                }
                sleep(0).then(()=>{cb();}).catch(()=>{cb();});
            }
            const groupNum = Math.floor(count / maxApiCall);
            let funcArr = [];
            for (let i = 0; i < groupNum; i++) {
                funcArr.push(_createMixinUsersAndSaveDB(maxApiCall));
                funcArr.push(_checkResolveAndReleaseCPU);
            }
            // 剩余个数
            const lessCount = Math.floor(count % maxApiCall);
            if (lessCount > 0)
                funcArr.push(_createMixinUsersAndSaveDB(lessCount));
            else
                funcArr.pop();
            async.waterfall(funcArr, (err, data)=>{
                if (hasResolve)
                    return;
                if (!!err)
                    reject(err);
                else
                    resolve(data);
            });
        });
    }

    const lessPrepare = 6;   // 理解为游戏中新增用户的并发量,当mixin备用user数量小于该数的时候,需要新增mixin的备用用户.
    const maxApiCall = 4;    // 每次调用mixin api生成用户时的最大并发量.
    /**
     * 获取未使用的mixin用户
     * 用户不足时,会新增新mixin用户
     * @param limit
     * @returns {Promise}
     */
    function getUnUseMixinUser(limit) {
        return new Promise((resolve, reject)=>{
            mysqlNoCache.querySql(`select count(*) as count from mixin_user where status = 0;`).then(numDB=>{
                let num = JSON.parse(JSON.stringify(numDB))[0]['count'];
                // console.error(`num:${num}`);
                // 每次提供最大的user数量不超过单次并发生成的数量
                if (limit > maxApiCall) {
                    reject(`limit can not above ${maxApiCall}`);
                    return;
                }
                // 如果剩余数量不满足请求量,新增lessPrepare个user.
                if (num < limit) {
                    _createMixinUsers(lessPrepare).then(users=>{
                        let res = [];
                        for (let i = 0; i < limit; i++) {
                            res.push(users[i]);
                        }
                        _updatePrepareUser(res).then(()=>{
                            resolve(res);
                        }).catch(reject);
                    }).catch(reject);
                } else {
                    let sql = `select * from mixin_user where status = 0 limit ${limit}`;
                    mysqlNoCache.querySql(sql).then(dataDB=>{
                        let res = JSON.parse(JSON.stringify(dataDB));
                        _updatePrepareUser(res).then(()=>{
                            resolve(res);
                        }).catch(reject);
                    }).catch(err=>{
                        reject(err);
                    });
                    if (num - limit < lessPrepare)
                        _createMixinUsers(lessPrepare);
                }
            }).catch(err=>{
                reject(err);
            });
        });
    }

    function _updatePrepareUser(idArr) {
        return new Promise((resolve, reject)=>{
            let condition = '';
            for (let i = 0, size = idArr.length; i < size; i++) {
                condition += ` or id=${idArr[i]['id']}`;
            }
            condition = condition.substring(4); // 除去首位的or + 俩空格
            let sql = `update mixin_user set status = 1 where ${condition}`;
            mysqlNoCache.querySql(sql).then(resolve).catch(err=>{
                reject(err);
            });
        })
    }

    function doNetworkSnapshots(start) {
        if (!snapshotStatus) {
            console.error(`doNetworkSnapshots stopped`);
            return;
        }
        let fileName = path.resolve(__dirname, SNAPSHOT_TIME_NAME + ".time");
        let startTime = start || fs.readFileSync(fileName);
        console.error(`doNetworkSnapshots ${startTime}`);
        mixinApi.networkSnapshots(rootAcc, null, startTime).then(data=>{
            if (!!data.error) {
                console.error(data.error.toString());
                doNetworkSnapshots();
                return;
            }
            const snapshots = data.data;
            snapshots.forEach(snapshot=>{
                startTime = snapshot['created_at'];
                if (!snapshot['user_id'])
                    return;
                if (snapshot['user_id'] == rootAcc.ClientId)    // 主账户的到账不处理
                    return;
                if (parseFloat(snapshot['amount']) <= 0)          // 子账户扣款不处理
                    return;
                let mixinUserId = snapshot['user_id'],
                    symbol = snapshot['asset']['symbol'],
                    amount = snapshot['amount'];
                console.error(`mixinUserId:${mixinUserId}, symbol:${symbol}, amount:${amount}`);
                _getUserRecharge(mixinUserId, symbol, amount).then(getRes=>{
                    if (!!getRes.error) {
                        console.error(`_getUserRecharge api err:`);
                        console.error(getRes.error.toString());
                        return;
                    }
                    _payUserRecharge(mixinUserId, symbol, amount).then(payRes=>{
                        if (!!payRes.error) {
                            console.error(`_getUserRecharge api err:`);
                            console.error(getRes.error.toString());
                        }
                    }).catch(err=>{
                        console.error(`_payUserRecharge connect err:`);
                        console.error(JSON.stringify(err));
                        sleep(SNAPSHOT_SLEEP_TIME).then(()=>{
                            doNetworkSnapshots();
                        })
                    });
                }).catch(err=>{
                    console.error(`_getUserRecharge connect err:`);
                    console.error(JSON.stringify(err));
                    sleep(SNAPSHOT_SLEEP_TIME).then(()=>{
                        doNetworkSnapshots();
                    })
                });
            });
            // startTime 写入文件
            fs.writeFile(fileName, startTime, (err)=>{
                if (!!err) {
                    console.error(err);
                    return;
                }
                let interval = 0;
                if (snapshots.length < 500)
                    interval = SNAPSHOT_SLEEP_TIME;
                sleep(interval).then(()=>{
                    doNetworkSnapshots(startTime);
                }).catch(err=>{
                    console.error(`doNetworkSnapshots sleep err:`);
                    console.error(err);
                    doNetworkSnapshots();
                });
            });
        }).catch(err=>{
            console.error(`doNetworkSnapshots err:`);
            console.error(err);
            sleep(SNAPSHOT_SLEEP_TIME).then(()=>{
                doNetworkSnapshots();
            })
        });
    }

    function _getUserRecharge(mixinUserId, symbol, amount) {
        return new Promise((resolve, reject)=>{
            let sql = `select * from mixin_user where user_id='${mixinUserId}'`;
            mysqlNoCache.querySql(sql).then((dataDB)=>{
                let mixinUser = JSON.parse(JSON.stringify(dataDB))[0];
                if (!mixinUser) {
                    console.error(sql);
                    resolve({error:'no this account'});
                    return;
                } else if (mixinUser['status'] != 3) {
                    resolve({error:'not recharge account'});
                    return;
                }
                let userAccount = new Account(mixinUser);
                userAccount['PinCode'] = ConstData.MIXIN_DEFAULT_PARAM.RECHARGE_PIN;
                let encryptPin = mixinOne.encryptPin(userAccount);
                let traceId = mixinOne.uuidv4();
                mixinOne.getAssetBySymbol(symbol).then(asset=>{
                    let aimAssetId = asset['asset_id'];
                    let memo = `get user:${mixinUser['game_user_id']} recharge symbol:${symbol}, amount=${amount}`;
                    mixinApi.transfer(userAccount, encryptPin, aimAssetId, rootAcc.ClientId, amount, memo, traceId).then(resolve).catch(reject);
                }).catch(reject);
            }).catch(reject);
        });
    }

    function _payUserRecharge(mixinUserId, symbol, amount) {
        return new Promise((resolve, reject)=>{
            let sql = `select * from mixin_user where game_user_id=(select game_user_id from mixin_user where user_id='${mixinUserId}') and user_id <> '${mixinUserId}'`;
            mysqlNoCache.querySql(sql).then((dataDB)=>{
                let mixinPayUser = JSON.parse(JSON.stringify(dataDB))[0];
                let encryptPin = mixinOne.encryptPin(rootAcc);
                let traceId = mixinOne.uuidv4();
                mixinOne.getAssetBySymbol(symbol).then(asset=>{
                    let aimAssetId = asset['asset_id'];
                    let memo = `pay user:${mixinPayUser['game_user_id']} recharge symbol:${symbol}, amount=${amount}`;
                    mixinApi.transfer(rootAcc, encryptPin, aimAssetId, mixinPayUser['user_id'], amount, memo, traceId).then(transferRes=>{
                        resolve(transferRes);
                        // do some else e.g. push to the client
                    }).catch(reject);
                }).catch(reject);
            }).catch(reject);
        });
    }

    // function _yyy(asset) {
    //     return new Promise((resolve, reject)=>{
    //         mixinApi.externalTransactions(rootAcc, asset['public_key'], asset['asset_id']).then(data=>{
    //             let arr = data.data;
    //
    //         }).catch(reject);
    //     });
    // }
    //
    // function xxx() {
    //     return new Promise((resolve, reject)=>{
    //         mixinOne.getSupportAssets().then(assets=>{
    //             let funcArr = [];
    //             for (let symbol in assets) {
    //                 if (!assets.hasOwnProperty(symbol))
    //                     continue;
    //                 funcArr.push();
    //                 funcArr.push(sleep(0));
    //             }
    //             async.waterfall(funcArr, (err, data)=>{
    //                 if (!!err) {
    //                     console.error(err);
    //                     reject(err);
    //                     return;
    //                 }
    //                 resolve(data);
    //             });
    //         }).catch(reject);
    //     });
    // }

    return {
        // createUsers,
        setSnapshotStatus,
        doNetworkSnapshots,
        getUnUseMixinUser,
    }
})();
