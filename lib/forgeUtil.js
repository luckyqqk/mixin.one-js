/**
 * Created by qingkai.wu on 2018/9/28.
 */

const forge = require('node-forge');
module.exports = (function(){
    /** 生成秘钥对 func of Promise */
    function createRsaKeyPair() {
        return new Promise((resolve, reject)=> {
            forge.pki.rsa.generateKeyPair({bits: 1024, workers: 2}, function(err, keypair) {
                if (!!err) {
                    reject(err);
                    return;
                }
                let key = {
                    publicKeyPem : forge.pki.publicKeyToPem(keypair.publicKey),
                    privateKeyPem : forge.pki.privateKeyToPem(keypair.privateKey)
                };
                resolve(key);
            });
        });
    }
    /** pem秘钥转string */
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


    return {
        createRsaKeyPair    :   createRsaKeyPair,
        pemKeyToString      :   pemKeyToString,
        decryptRSAOAEP      :   decryptRSAOAEP,
    }
})();