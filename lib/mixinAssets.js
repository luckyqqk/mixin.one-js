module.exports = (function(mixinRootUserInfo){
    const Account = require('./account');
    const mixinApi = require('./api');
    let rootAcc = new Account(mixinRootUserInfo);

    let res = null;

    /**
     * 返回当下主账户所支持的币种    {symbol : asset_id}
     * @returns {Promise}
     */
    function getRootAssets() {
        return new Promise((resolve, reject)=>{
            if (!!res) {
                resolve(res);
                return;
            }
            mixinApi.readAssets(rootAcc).then(assets=>{
                res = {};
                assets.data.forEach(asset=>{
                    res[asset['symbol']] = asset;
                });
                resolve(res);
            }).catch(reject);
        })
    }

    /**
     * 获取指定币种的asset_id
     * @param symbol
     * @returns {Promise}
     */
    function getRootAsset(symbol) {
        return new Promise((resolve, reject)=>{
            getRootAssets().then(assets=>{
                // console.error(assets);
                let asset = assets[symbol];
                if (!asset)
                    reject(`no this asset : ${symbol}`);
                else
                    resolve(asset);
            }).catch(reject);
        });
    }

    return {
        getRootAsset,
        getRootAssets,
    };
    // 初始化参数是appInfo,格式参见example下的mixinTest中的accountInfo
})(require('../appData/appData').MIXIN_MAIN_ACC);