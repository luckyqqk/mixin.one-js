const mixinOne = require('../index');
const Account = mixinOne.account;
const mixinAPI = mixinOne.api;

let accountInfo = {
    ClientId        : '********-498e-4136-8d7b-9476761044cb',
    ClientSecret    : '****************bdbca2538355a21796ad1bd77507862c956fc577d6101',
    PinCode         : '****59',
    SessionId       : '********-ce4f-4dfe-adc3-3f10154dba8d',
    PinToken        : '****************atAELKb4G7ORAJdfo37EYKea6jp63VURzYp6pm2c61o+St+dmzvQxeXp1s=',
    PrivateKey      : `-----BEGIN RSA PRIVATE KEY-----
*******************Wxu0U4cQTomlJdZ85SBHoqujc7rVUZRnP+j5NMVLFcIqV
*******************/YfU2YTxIgNCanEsOpPQVCbaj0U/Rr16IA4+plsFjJ9bv
*******************qGwInQ4fYAc/aBPGwvDnquALaD34rCI8IpPQwjQIDAQAB
*******************Q5ErdtFga1LHXE5nGeC9dVRwbUNIZRKyhR6/cIqDSDlBA
*******************TCljxYSnypdGZLOmFKAZaHLHr8UCdh+GHmGoEUAj/JoSU
*******************ygQ49KwisIPyvnQXH6JU0VLSrqBECQQDKkwzdJVW0oisj
*******************nuC8ZRTf/+kN9ewc1L48jR4Q+JuQgg/QGRtN05VbZFH8z
*******************SBPliHSpT33ispiN63M1YOYtqtFXuWyB6P5iowxW3aHCA
*******************mF9DWbG52u3o8ywJACFCU3Jblt65YWvR6BM/Ml2YRWlFQ
*******************LlXFITMhosyxhfLwtzfwmPcwUDoD635/61WcpDQJBALJC
*******************SQB442qV8W2RNZAuOc8iFYtbghdAxkSu3SFxmA2fepGJx
*******************CQHy8a5vR7bmpzBDi2Hl2Kpxfq6LuD/vjmyfTMIUSz9U7
*******************kCxS2HQs62692IDAhqyK6eEg=
-----END RSA PRIVATE KEY-----
`
};

let account = new Account(accountInfo);
let useSymbol = 'CNB';  // 我们使用吹牛币来进行测试,所以请在运行代码之前先给主账户转入CNB,以便资产列表中可以找到CNB
let PinCode = '123456'; // 给子账号添加的pin_code,正式环境需要用户来设置此code,该code即为用户的支付密码.

function getSymbolAssetId(account, useSymbol, cb) {
    mixinAPI.readAssets(account).then(assetsArr=>{
        let tempAsset = null,
            size = assetsArr.length;
        for (let i = 0; i < size; i++) {
            tempAsset = assetsArr[i];
            if (!tempAsset)
                continue;
            if (tempAsset['symbol'] != useSymbol)
                continue;
            cb(null, tempAsset);
            return;
        }
    }).catch(err=>{
        cb(err);
    });
}

const async = require('async');
async.waterfall([
    (_cb)=>{            // 创建子用户
        mixinAPI.createUser(account, 'testUser').then(userInfo=>{
            console.error("userInfo::::::::::::::::");
            console.error(userInfo);
            _cb(null, userInfo);
        }).catch(err=>{
            _cb(err);
        });
    },
    (userInfo, _cb)=>{  // 子用户设置pin_code, 正式环境,此code需由用户(玩家)填写, 作为玩家支付密码使用.
        let sonAccount = new Account(userInfo);
        mixinAPI.updatePin(sonAccount, PinCode).then(data=>{
            console.error("updatePinRes::::::::::::::::");
            console.error(data);
            // sonAccount.PinCode = PinCode;    // 用户自己保存,平台不保存
            _cb(null, sonAccount);
        }).catch(err=>{
            _cb(err);
        });
    },
    (sonAccount, _cb)=>{    // 给子账号1个币
        getSymbolAssetId(account, useSymbol, (err, asset)=>{
            let encryptPin = mixinOne.encryptPin(account, account.PinCode);
            if (!encryptPin) {
                _cb('rootAccount encryptPin is null');
                return;
            }
            let assetId = asset['asset_id'];
            mixinAPI.transfer(account, encryptPin, assetId, sonAccount.ClientId, '1', 'rootTransferToSon').then(data=>{
                console.error("rootTransferToSon::::::::::::::::");
                console.error(data);
                _cb(null, sonAccount, assetId);
            }).catch(err=>{
                _cb(err);
            });
        });
    },
    (sonAccount, assetId, _cb)=>{   // 打印子账号余额
        mixinAPI.readAssets(sonAccount, assetId).then(data=>{
            console.error("son asset::::::::::::::::");
            console.error(data);
            _cb(null, sonAccount, assetId);
        }).catch(err=>{
            _cb(err);
        });
    },
    (sonAccount, assetId, _cb)=>{   // 给父账号转回1个币
        let encryptPin = mixinOne.encryptPin(sonAccount, PinCode);
        if (!encryptPin) {
            _cb('sonAccount encryptPin is null');
            return;
        }
        mixinAPI.transfer(sonAccount, encryptPin, assetId, account.ClientId, '1', 'sonTransferToRoot').then(data=>{
            console.error("sonTransferToRoot::::::::::::::::");
            console.error(data);
            _cb(null, sonAccount, assetId);
        }).catch(err=>{
            _cb(err);
        });
    },
], (err, sonAccount, assetId)=>{
    if (!!err) {
        console.error(err);
        return;
    }
    // 打印父账号余额
    mixinAPI.readAssets(account, assetId).then(data=>{
        console.error("root asset::::::::::::::::");
        console.error(data);
    }).catch(err=>{
        console.error(err);
    });
});

// mixinAPI.createUser(account, 'testUser').then(userInfo=>{
//     console.error(userInfo);
//     let sonAccount = new Account(userInfo);
// }).catch(err=>{
//     console.error(err);
// });

// mixinAPI.updatePin(sonAccount, `123456`).then(data=>{
//     console.error(data);
// }).catch(err=>{
//     console.error(err);
// });

// mixinAPI.transfer(aSonUser, '965e5c6e-434c-3fa9-b780-c50f43cd955c', account.ClientId, '1', 'testTransfer').then(data=>{
//     console.error(data);
// }).catch(err=>{
//     console.error(err);
// });
//
// mixinAPI.readAssets(sonAccount, '965e5c6e-434c-3fa9-b780-c50f43cd955c').then(assets=>{
// mixinAPI.readAssets(account).then(assets=>{
//     console.error(assets);
// }).catch(err=>{
//     console.error(err);
// });

// mixinAPI.readProfile(sonAccount).then(data=>{
//     console.error(data);
// }).catch(err=>{
//     console.error(err);
// });

// mixinAPI.readUser(account, '5295299d-dcbe-3706-8896-47c202d35282').then(data=>{
//     console.error(data);
// }).catch(err=>{
//     console.error(err);
// });