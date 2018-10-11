# mixin.one-js
mixin.one test sdk by nodejs

#### 首先,需要感恩
思路来源于[Ju Huo先生的mixin-node](https://github.com/virushuo/mixin-node.git),在此表示感谢.

#### 简介
本项目是我公司项目中需要的一个mixin模块,由本人封装以供使用.
目前我公司项目需要快速展示效果,demo出来后会专门做充值这块,所以该项目暂无充值代码.
仅有创建子用户,给子用户设置pin_code(支付密码),根/子账户相互转账的功能.

#### 目的
仅以此项目提供一个可读性好一些的sdk思路,
一来感谢mixin团队对用户对接api时的支持,
二来方便其他js开发者快速理解mixin-api.

#### 测试使用
虽本项目为test sdk,但本人还是着力封装,以便后期维护扩展(毕竟用户支付还未完成).
所以项目中的方法,也可以直接使用.言归正传:
1. 申请app账户,详情参见[mixin导读](https://developers.mixin.one/guides)
2. 将申请的app信息黏贴到本项目的example下的mixinTest.js里的变量accountInfo对应字段中.
3. 进入项目根目录,下载依赖包 ```cd mixin.one-js && npm install```.
4. 运行mixinTest.js  ```cd mixin.one-js/example && node mixinTest.js```
5. 查看打印

#### 测试步骤说明
因为每次调用均是异步返回,本人使用async包里的waterfall来控制流程(异步思维),测试代码,顺手就好,效果跟es6的async/aweit一样(同步思维).
1. 创建子账户
2. 给子账户绑定支付密码(pin_code)
3. 给子账户转1个币,至于转什么币,由变量useSymbol来控制,本测试用的CNB(吹牛币,^.^)
4. 打印子账户该币资产(创建账户后直接查询的话,是查不到的,只有充值后才会有该资产)
5. 子账户将1个币转回根账号
6. 打印根账号该币资产
7. 查看打印的各种字段信息,测试结束.

#### 备注
若对参数不是很理解,看看代码中的方法注释是否能提供帮助.
