const fs = require('fs');
const path = require('path');
/**
 *
 * mixin账号字段
 *
 * 该对象主要用于显示标明mixin账号数据中的字段
 * 其中字段的命名方式完全采用mixin的返回值,
 * 直接使用其返回值,可减少字段歧义从而减少bug率.
 * 对于有命名规范情怀的强迫症患者,我也表示很无奈^.^.
 */
let Account = function(opts) {
    this.ClientId        = opts.ClientId || opts.user_id;
    this.ClientSecret    = opts.ClientSecret || '';
    this.PinCode         = opts.PinCode || '';
    this.SessionId       = opts.SessionId || opts.session_id;
    this.PinToken        = opts.PinToken || opts.pin_token || '';
    this.PrivateKey      = opts.PrivateKey;

    let pemKey = path.resolve(path.join(__dirname, '../', 'pemKeys'), this.ClientId + '.key');
    if (fs.existsSync(pemKey)) {
        let keys = fs.readFileSync(pemKey, 'utf8');
        this.PrivateKey = JSON.parse(keys).privateKey;
    }
};
module.exports = Account;
