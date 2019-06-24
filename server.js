var server = require('@steedos/meteor-bundle-runner');
var objectql = require("@steedos/objectql");
var path = require('path');
var schedule = require('node-schedule');
// 项目代码
const ZMM_PO_AFNAM = require('./lib/ZMM_PO_AFNAM');
// 供应商
const ZMM_PO_LIFNR = require('./lib/ZMM_PO_LIFNR');
// 物料组
const ZMM_PO_MATKL = require('./lib/ZMM_PO_MATKL');
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

            // 自定义业务逻辑
            let steedosSchema = objectql.getSteedosSchema();
            let abapSystem = Meteor.settings.plugins.sap.abapConfig;
            let spaceId = Meteor.settings.plugins.sap.spaceId;

            // 定时执行同步
            let sap_sync_rule = Meteor.settings.cron.sap_sync_rule;

            let sap_get_draft_rule = Meteor.settings.cron.sap_get_draft_rule;

            if (sap_sync_rule) {
                schedule.scheduleJob(sap_sync_rule, Meteor.bindEnvironment(function () {
                    console.time('sap_sync_rule');
                    // 获取项目代码
                    ZMM_PO_AFNAM.run(abapSystem, steedosSchema, spaceId);
                    // 获取供应商
                    ZMM_PO_LIFNR.run(abapSystem, steedosSchema, spaceId);
                    // 获取物料组
                    ZMM_PO_MATKL.run(abapSystem, steedosSchema, spaceId);

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
                    

                    console.timeEnd('sap_get_draft_rule');
                }, function () {
                    console.log('Failed to bind environment');
                }));
            } else {
                console.error('need to config settings.cron.sap_get_draft_rule!!!')
            }
        } catch (error) {
            console.log(error)
        }
        server.callStartupHooks();
        server.runMain();
    });
}).run();