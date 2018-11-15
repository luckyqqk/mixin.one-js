/*
Navicat MySQL Data Transfer

Source Server         : localhost
Source Server Version : 50640
Source Host           : localhost:3306
Source Database       : test

Target Server Type    : MYSQL
Target Server Version : 50640
File Encoding         : 65001

Date: 2018-10-30 20:39:13
*/

SET FOREIGN_KEY_CHECKS=0;

-- ----------------------------
-- Table structure for `mixin_user`
-- ----------------------------
DROP TABLE IF EXISTS `mixin_user`;
CREATE TABLE `mixin_user` (
  `id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `game_user_id` int(11) unsigned NOT NULL DEFAULT '0',
  `user_id` varchar(100) NOT NULL,
  `session_id` varchar(100) NOT NULL,
  `pin_token` varchar(200) NOT NULL,
  `status` int(11) unsigned NOT NULL DEFAULT '0' COMMENT '0未使用,1已预约,2显示账户,3充值账户',
  PRIMARY KEY (`id`)
) ENGINE=MyISAM AUTO_INCREMENT=1 DEFAULT CHARSET=utf8;

-- ----------------------------
-- Table structure for `user`
-- ----------------------------
DROP TABLE IF EXISTS `user`;
CREATE TABLE `user` (
  `id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `username` varchar(100) NOT NULL,
  `password` varchar(100) NOT NULL,
  `nickname` varchar(100) DEFAULT NULL,
  `mixin_recharge_id` int(11) unsigned NOT NULL DEFAULT '0',
  `mixin_pay_id` int(11) unsigned NOT NULL DEFAULT '0',
  `rename` int(11) unsigned NOT NULL DEFAULT '0' COMMENT '0游客,1已设置自己username',
  PRIMARY KEY (`id`)
) ENGINE=MyISAM AUTO_INCREMENT=1 DEFAULT CHARSET=utf8;

ALTER TABLE `user`
CHANGE COLUMN `rename` `renamed`  int(11) UNSIGNED NOT NULL DEFAULT 0 COMMENT '0游客,1已设置自己username' AFTER `mixin_pay_id`;