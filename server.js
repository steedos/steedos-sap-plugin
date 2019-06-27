var server = require('@steedos/meteor-bundle-runner');
var objectql = require("@steedos/objectql");
var path = require('path');
var schedule = require('node-schedule');
var express = require('express');
// 项目代码
const ZMM_PO_AFNAM = require('./lib/sap_api/ZMM_PO_AFNAM');
// 供应商
const ZMM_PO_LIFNR = require('./lib/sap_api/ZMM_PO_LIFNR');
// 物料组
const ZMM_PO_MATKL = require('./lib/sap_api/ZMM_PO_MATKL');
// WBS元素
const ZMM_PO_POSID = require('./lib/sap_api/ZMM_PO_POSID');
// 作业编号
const ZMM_PO_ASNUM = require('./lib/sap_api/ZMM_PO_ASNUM');
// 采购组
const ZMM_PO_EKGRP = require('./lib/sap_api/ZMM_PO_EKGRP');
// 获取用款单
const ZMM_ZOBJNR_GET = require('./lib/sap_api/ZMM_ZOBJNR_GET');
// 获取PR行项目,物料
const Z_BAPI_REQUISITION_GETITEMSGW = require('./lib/sap_api/Z_BAPI_REQUISITION_GETITEMSGW');
// router：生成采购订单
const router = require('./lib/routes/router');
server.Fiber(function () {
    server.Profile.run("Server startup", function () {
        server.loadServerBundles();
        try {
            let objects = objectql.loadObjectFiles(path.resolve(__dirname, "./src"))
            let apps = objectql.loadAppFiles(path.resolve(__dirname, "./src"))
            objects.forEach(function (object) {
                Creator.Objects[object.name] = object
            })
            apps.forEach(function (app) {
                Creator.Apps[app._id] = app
            })


            let steedosSchema = objectql.getSteedosSchema();

            // 定时执行同步
            let sap_sync_rule = Meteor.settings.cron.sap_sync_rule;

            let sap_get_draft_rule = Meteor.settings.cron.sap_get_draft_rule;

            if (sap_sync_rule) {
                schedule.scheduleJob(sap_sync_rule, Meteor.bindEnvironment(function () {
                    console.time('sap_sync_rule');
                    // 获取项目代码
                    ZMM_PO_AFNAM.run(steedosSchema);
                    // 获取供应商
                    ZMM_PO_LIFNR.run(steedosSchema);
                    // 获取物料组
                    ZMM_PO_MATKL.run(steedosSchema);
                    // 获取WBS元素
                    ZMM_PO_POSID.run(steedosSchema);
                    // 获取作业编号
                    ZMM_PO_ASNUM.run(steedosSchema);
                    // 获取采购组
                    ZMM_PO_EKGRP.run(steedosSchema);
                    console.timeEnd('sap_sync_rule');
                }, function () {
                    console.log('Failed to bind environment');
                }));
            } else {
                console.error('need to config settings.cron.sap_sync_rule!!!')
            }

            if (sap_get_draft_rule) {
                schedule.scheduleJob(sap_get_draft_rule, Meteor.bindEnvironment(function () {
                    console.time('sap_get_draft_rule');
                    // 获取用款单
                    ZMM_ZOBJNR_GET.run();
                    // 获取PR行项目，物料
                    Z_BAPI_REQUISITION_GETITEMSGW.run();

                    console.timeEnd('sap_get_draft_rule');
                }, function () {
                    console.log('Failed to bind environment');
                }));
            } else {
                console.error('need to config settings.cron.sap_get_draft_rule!!!')
            }

            let app = express();
            app.use('/', router.router);
            WebApp.connectHandlers.use(app);
        } catch (error) {
            console.log(error)
        }
        server.callStartupHooks();
        server.runMain();
    });
}).run();