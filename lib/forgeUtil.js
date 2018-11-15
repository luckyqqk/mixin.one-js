/**
 * Created by qingkai.wu on 2018/9/28.
 */

const forge = require('node-forge');
module.exports = (function(){
    /** 生成密钥对 func of Promise */
    function createRsaKeyPair() {
        return new Promise((resolve, reject)=> {
            forge.pki.rsa.generateKeyPair({bits: 1024, workers: 2}, function(err, keypair) {
                if (!!err) {
                    reject(err);
                    return;
                }
                let key = {
                    publicKey   : forge.pki.publicKeyToPem(keypair.publicKey),
                    privateKey  : forge.pki.privateKeyToPem(keypair.privateKey)
                };
                resolve(key);
            });
        });
    }
    /** pem密钥转string */
    function pemKeyToString(pemKey) {
        let lines = pemKey.trim().split("\n");
        lines.shift();
        lines.pop();
        let resultLine = lines.map(function(x){return x.trim();});
        return resultLine.join('');
    }

    /** rsa-oaep解密 */
    function decryptRSAOAEP(privateKeyPem, message, label){
        let pki = forge.pki;
        let privateKey = pki.privateKeyFromPem(privateKeyPem);
        let buf = new Buffer(message, 'base64');
        let decrypted = privateKey.decrypt(buf, 'RSA-OAEP',{
            md: forge.md.sha256.create(),
            label: label
        });
        return new Buffer(decrypted, 'binary').toString('base64');
    }

    function uuidv4() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            let r = Math.random() * 16 | 0,
                v = c == 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }

    function toRFC3339nano(date = Date.now()) {
        let ts = Math.round(date / 1000);
        let ns = date % 1000 + "000000";
        let theDate = new Date(parseInt(ts + '000'));
        if (theDate == 'Invalid Date')
            return date;
        return theDate.toISOString().replace('000', ns);
    }

    return {
        uuidv4,
        toRFC3339nano,
        createRsaKeyPair,
        pemKeyToString,
        decryptRSAOAEP,
    }
})();