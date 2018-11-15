/**
 * Created by qingkai.wu on 2018/9/27.
 */

module.exports = (function(){
    const fs = require('fs');
    const path = require('path');
    const request = require('request');
    const forge = require('node-forge');

    const mixinUtil = require('./mixinUtil');
    const forgeUtil = require('./forgeUtil');

    const logger = require('pomelo-logger').getLogger('mixin', __filename);

    function doRequest(options) {
        return new Promise((resolve, reject)=>{
            function callback(err, httpResponse, body){
                if (!!err) {
                    // this.end();
                    reject(err);
                } else if (httpResponse.statusCode != 200) {
                    reject(httpResponse.statusCode);
                } else {
                    let res = JSON.parse(body);
                    resolve(res);
                }
                // logger.error(`httpResponse.statusCode:${httpResponse.statusCode}`);
                // let res = null;
                // try {
                //     if (!!res.error)
                //         reject(res.error);
                //     else
                //         resolve(res.data);
                // } catch (e) {
                //     logger.error(`response body:`);
                //     logger.error(typeof body);
                //     logger.error(body);
                // } finally {
                //     reject('can not parse response');
                // }
            }
            options.callback = callback;
            new request.Request(options);
        });
    }

    /**
     * 为你的app新增用户
     * @param account
     * @param newUsername
     * @returns {Promise}
     */
    function createUser(account, newUsername) {
        return new Promise((resolve, reject)=>{
            forgeUtil.createRsaKeyPair().then(keyPair=>{
                let params = {
                    session_secret  : forgeUtil.pemKeyToString(keyPair['publicKey']),
                    full_name       : newUsername
                };
                let options = mixinUtil.getRequestOptions(account, 'POST', 'users', params);
                doRequest(options).then(data=>{
                    if (!!data.error){
                        reject(data.error);
                        return;
                    }
                    let sonUser = data.data;
                    let keyName = sonUser['user_id'];
                    let fileName = path.resolve(path.join(__dirname, '../', 'pemKeys'), keyName + ".key");
                    fs.writeFile(fileName, JSON.stringify(keyPair), (err)=>{
                        if (!!err)
                            reject(err);
                        else
                            resolve(sonUser);
                    });
                }).catch(reject);
            }).catch(err=>{
                reject(err);
            });
        });
    }

    /**
     * 新建count个mixin User
     * @param {object} account      主账号
     * @param {string} newerName    昵称
     * @param {number} count        需要生成多少个user
     * @returns {*}
     */
    function createUsers(account, newerName, count) {
        return new Promise((resolve, reject)=>{
            if (isNaN(count)) {
                reject('count must be an number');
                return;
            }

            let proArr = [];
            for (let i = 0; i < count; i++) {
                proArr.push(createUser(account, newerName));
            }
            Promise.all(proArr).then(resolve).catch(reject);
        });
    }

    /**
     * 新增/更新 PinCode
     * @param account
     * @param newPin
     * @returns {Promise}
     */
    function updatePin(account, newPin) {
        return new Promise((resolve, reject) => {
            let pinJson = {
                old_pin : !!account.PinCode ? mixinUtil.encryptPin(account) : '',
                pin     : mixinUtil.encryptPin(account, newPin)
            };
            let options = mixinUtil.getRequestOptions(account, 'POST', 'pin/update', pinJson);
            doRequest(options).then(resolve).catch(reject);
        });
    }

    /**
     * 获取用户简介
     * @param account
     * @returns {Promise}
     */
    function readProfile(account) {
        return new Promise((resolve, reject) => {
            let options = mixinUtil.getRequestOptions(account, 'GET', 'me');
            doRequest(options).then(resolve).catch(reject);
        });
    }

    /**
     * 获取用户信息
     * @param account
     * @param userId
     * @returns {Promise}
     */
    function readUser(account, userId) {
        return new Promise((resolve, reject) => {
            let options = mixinUtil.getRequestOptions(account, 'GET', 'users', userId || account.ClientId);
            doRequest(options).then(resolve).catch(reject);
        });
    }

    /**
     * 获取资金信息
     *  注:新生成的子user的资产列表是一个空数组.如果要生成某币种的资产,传入该子账号和asset_id(父子的资产id相同,public_key不同)
     * @param account
     * @param [assetId]
     * @returns {Promise}
     */
    function readAssets(account, assetId) {
        return new Promise((resolve, reject) => {
            let paramStr = !!assetId && assetId.length == '36' ? assetId : '';
            let options = mixinUtil.getRequestOptions(account, 'GET', 'assets', paramStr);
            doRequest(options).then(resolve).catch(reject);
        });
    }

    // 暂时未启用,如需使用可直接放开测试
    // function readAddress(account, userId) {
    //     return new Promise((resolve, reject) => {
    //         if (!userId || userId.length != '36') {
    //             reject(`param userId must be an uuid`);
    //             return;
    //         }
    //         let options = mixinUtil.getRequestOptions(account, 'GET', 'addresses', userId);
    //         doRequest(options).then(resolve).catch(reject);
    //     });
    // }
    //
    // function readAddresses(account, userId) {
    //     return new Promise((resolve, reject) => {
    //         if (!userId || userId.length != '36') {
    //             reject(`param userId must be an uuid`);
    //             return;
    //         }
    //         let options = mixinUtil.getRequestOptions(account, 'GET', 'assets', userId);
    //         doRequest(options).then(resolve).catch(reject);
    //     });
    // }

    /**
     * 转账
     * @param account
     * @param {string}  assetId         资产id
     * @param {string}  encryptPin      加密后的pin_code
     * @param {string}  recipientId     子账户是userId,根账户是clientId
     * @param {string}  amount          数量
     * @param {string}  memo            备注
     * @param {string}  [traceId]       交易id,默认自动生成
     * @returns {Promise}
     */
    function transfer(account, encryptPin, assetId, recipientId, amount, memo, traceId) {
        return new Promise((resolve, reject) => {
            if (typeof amount === 'number')
                amount = amount.toString();
            if (isNaN(amount)) {
                throw new Error('param amount must be an number or a string number');
            }
            let params = {
                asset_id        : assetId,
                opponent_id     : recipientId,
                amount          : amount,
                memo            : memo || '',
                pin             : encryptPin,
                trace_id        : traceId || mixinUtil.uuidv4(),
            };
            let options = mixinUtil.getRequestOptions(account, 'POST', 'transfers', params);
            doRequest(options).then(resolve).catch(err=>{
                console.error(options);
                reject(err);
            });
        });
    }

    /**
     * 扫描充值记录
     * @param {object}  account     账号
     * @param {string}  [assetId]   资产id,选填
     * @param {number}  date        查询起始时间
     * @param {string}  order       排序  ASC or DESC. 默认正序,这样最后一条的create_at字段,即使下次扫描的起始时间
     * @param {number}  limit       处理个数,默认500
     * @returns {Promise}
     */
    function networkSnapshots(account, assetId = '', date = Date.now(), order = 'ASC', limit = 500) {
        return new Promise((resolve, reject)=>{
            let paramStr = !!assetId ? `&asset=${assetId}&` : '';
            let offset = forgeUtil.toRFC3339nano(date);
            paramStr += `limit=${limit}&offset=${offset}&order=${order}`;
            let options = mixinUtil.getRequestOptions(account, 'GET', 'network/snapshots', paramStr, '?');
            doRequest(options).then(resolve).catch(reject);
        });
    }

    /**
     * 根据充值记录id,查询该记录信息
     * @param account
     * @param snapshotId
     * @returns {Promise}
     */
    function getSnapshotsById(account, snapshotId) {
        return new Promise((resolve, reject)=>{
            let options = mixinUtil.getRequestOptions(account, 'GET', 'network/snapshots', snapshotId);
            doRequest(options).then(resolve).catch(reject);
        });
    }

    function externalTransactions(account, publicKey, assetId) {
        return new Promise((resolve, reject)=>{
            let paramStr = `asset=${assetId}&public_key=${publicKey}`;
            let options = mixinUtil.getRequestOptions(account, 'GET', 'external/transactions', paramStr, '?');
            doRequest(options).then(resolve).catch(reject);
        });
    }

    return {
        createUser,
        createUsers,
        readProfile,
        readUser,
        updatePin,
        readAssets,
        transfer,
        networkSnapshots,
        getSnapshotsById,
        externalTransactions,
        // readAddress,
        // readAddresses,
    }
})();