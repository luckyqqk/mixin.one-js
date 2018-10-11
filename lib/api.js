/**
 * Created by qingkai.wu on 2018/9/27.
 */
const request = require('request');
const forge = require('node-forge');

const mixinUtil = require('./mixinUtil');
const forgeUtil = require('./forgeUtil');

module.exports = (function(){
    function doRequest(options) {
        return new Promise((resolve, reject)=>{
            request(options, function(err, httpResponse, body){
                if (!!err) {
                    reject(err);
                    return;
                }
                let res = JSON.parse(body);
                if (!!res.error)
                    reject(res.error);
                else
                    resolve(res.data);
            });
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
                    session_secret : forgeUtil.pemKeyToString(keyPair.publicKeyPem),
                    full_name : newUsername
                };
                let options = mixinUtil.getRequestOptions(account, 'POST', 'users', params);
                request(options, function(err, httpresponse, body){
                    if(err) {
                        reject(err);
                    } else if (!!body.error){
                        reject(JSON.parse(body.error));
                    } else {
                        let sonUser = JSON.parse(body).data;
                        sonUser['PrivateKey'] = keyPair.privateKeyPem;
                        sonUser['PublicKey'] = keyPair.privateKeyPem;
                        resolve(sonUser);
                    }
                });
            }).catch(err=>{
                console.error(`mixinAPI createUser err : ${err.stack}`)
            });
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
     * 获取用户信息
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

    // 暂时未启用
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
     * @param {string}  assetId
     * @param {string}  encryptPin      加密后的pin_code
     * @param {string}  recipientId     userId
     * @param {string}  amount
     * @param {string}  memo
     * @param {string}  [trace_id]
     * @returns {Promise}
     */
    function transfer(account, encryptPin, assetId, recipientId, amount, memo, trace_id) {
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
                trace_id        : trace_id || mixinUtil.uuidv4(),
            };
            let options = mixinUtil.getRequestOptions(account, 'POST', 'transfers', params);
            doRequest(options).then(resolve).catch(reject);
        });
    }

    return {
        createUser      :   createUser,
        readProfile     :   readProfile,
        readUser        :   readUser,
        updatePin       :   updatePin,
        readAssets      :   readAssets,
        transfer        :   transfer,
        // readAddress     :   readAddress,
        // readAddresses   :   readAddresses,
    }
})();