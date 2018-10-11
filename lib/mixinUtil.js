/**
 * Created by qingkai.wu on 2018/9/27.
 */
const crypto = require('crypto');
const forge = require('node-forge');
const jwt = require('jsonwebtoken');
const format = require('util').format;
const Uint64LE= require("int64-buffer").Uint64LE;

const forgeUtil = require('./forgeUtil');

module.exports = (function(){
    const expireTime = 3600;   //秒 自行设置     官网示例(golang)  expire := time.Now().UTC().Add(time.Hour * 24 * 30 * 3)

    function uuidv4() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            let r = Math.random() * 16 | 0,
                v = c == 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }

    /**
     * 米信 账号+内容加密方法
     * @param account
     * @param account.ClientId    主账号
     * @param account.SessionId
     * @param account.PrivateKey
     * @param method
     * @param uri
     * @param bodyStr
     * @returns {*}
     * @constructor
     */
    function signToken(account, method, uri, bodyStr) {
        let seconds = Math.floor(Date.now() / 1000);
        let expire = seconds + expireTime;
        let forUpdate = format(`%s/%s%s`, method, uri, bodyStr);
        // console.error(`forUpdate:${forUpdate}`);
        let sigSha256 = crypto.createHash('sha256').update(forUpdate).digest("hex");
        let payload = {
            uid: account.ClientId, //bot account id
            sid: account.SessionId,
            iat: seconds,
            exp: expire,
            jti: uuidv4(),
            sig: sigSha256
        };
        // console.error(payload);
        return jwt.sign(payload, account.PrivateKey, {algorithm: 'RS512'});
    }

    // function getUrl(uri) {
    //     return format(`https://api.mixin.one%s`, uri);
    // }

    /**
     * Encrypted Pin
     * @param {object}  account
     * @param {string}  account.PinToken
     * @param {string}  account.SessionId
     * @param {string}  account.PrivateKey
     * @param {string}  [account.PinCode]   // 跟下面的pinCode必须有一个存在且正确
     * @param {string}  [pinCode]           // 优先使用此pinCode,否则使用account中的pinCode,两者中必须有一个值是存在且正确的
     * @returns {string||null}
     */
    function encryptPin(account, pinCode) {
        let thePinCode = pinCode || account.PinCode;
        if (!thePinCode)
            return null;
        let aesKeyBase64 = forgeUtil.decryptRSAOAEP(account.PrivateKey, account.PinToken, account.SessionId);
        let time = new Uint64LE(Math.floor(Date.now() / 1000));
        let num = Date.now(); //TODO: read the global iterator value, and +1
        let iterator = new Uint64LE(num);
        let pin = Buffer.from(thePinCode, 'utf8' );
        let toEncrypt_pin_buff = Buffer.concat([pin, time.toBuffer() , iterator.toBuffer()]);
        const aes_BlockSize  = 16;
        let padding = aes_BlockSize - toEncrypt_pin_buff.length % aes_BlockSize;
        let padding_text_array = [];
        for(let i = 0; i<padding; i++){
            padding_text_array.push(padding);
        }
        let padding_buffer = Buffer.from(padding_text_array);
        let toEncrypt_pin_buff_padding = Buffer.concat([toEncrypt_pin_buff, padding_buffer]);
        let aesKey = Buffer.from(aesKeyBase64, 'base64');
        let iv16   = crypto.randomBytes(16);
        let cipher = crypto.createCipheriv('aes-256-cbc', aesKey, iv16);
        cipher.setAutoPadding(false);
        let encrypted_pin_buff = cipher.update(toEncrypt_pin_buff_padding,'utf-8');
        let encrypted_pin_with_irPrefix= Buffer.concat([iv16 , encrypted_pin_buff]);
        return Buffer.from(encrypted_pin_with_irPrefix).toString('base64');
    }

    /**
     * 获取request的options
     * @param {object}          account
     * @param {string}          method    POST OR GET
     * @param {string}          uri       接口uri,首位不含'/'
     * @param {string|object}   [params]
     * @returns {object}
     */
    function getRequestOptions(account, method, uri, params = '') {
        let options = {method : method};
        let paramsStr = null;
        switch (typeof params) {
            case 'string':
                paramsStr = !!params ? format(`/%s`, params) : params;
                options['url'] = format(`https://api.mixin.one/%s%s`, uri, paramsStr);
                break;
            case 'object':
                options['body'] = paramsStr = JSON.stringify(params);
                options['url'] = format(`https://api.mixin.one/%s`, uri);
                break;
        }
        let token = signToken(account, method, uri, paramsStr);
        options['headers'] = {
            'Authorization': 'Bearer ' + token,
            'Content-Type' : 'application/json',
        };
        return options;
    }

    return {
        uuidv4              :   uuidv4,
        signToken           :   signToken,
        encryptPin          :   encryptPin,
        getRequestOptions   :   getRequestOptions
    }
})();