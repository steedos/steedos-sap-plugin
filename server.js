var server = require('@steedos/meteor-bundle-runner');
var objectql = require("@steedos/objectql");
var path = require('path');
var schedule = require('node-schedule');
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
// 获取用款单
const ZMM_ZOBJNR_GET = require('./lib/sap_api/ZMM_ZOBJNR_GET');
// 获取PR行项目,物料
const Z_BAPI_REQUISITION_GETITEMSGW = require('./lib/sap_api/Z_BAPI_REQUISITION_GETITEMSGW');
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
            let abapSystem = Meteor.settings.plugins.sap.abapConfig;
            let spaceId = Meteor.settings.plugins.sap.spaceId;
            let flows = Meteor.settings.plugins.sap.flows;

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
                    // 获取WBS元素
                    ZMM_PO_POSID.run(abapSystem, steedosSchema, spaceId);
                    // 获取作业编号
                    ZMM_PO_ASNUM.run(abapSystem, steedosSchema, spaceId);

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
                    if (flows.yongkuandan) {
                        ZMM_ZOBJNR_GET.run(abapSystem, spaceId, flows.yongkuandan);
                    } else {
                        console.error('server: flows.yongkuandan is null')
                    }

                    // 获取PR行项目，物料
                    if (flows.wuliao) {
                        Z_BAPI_REQUISITION_GETITEMSGW.run(abapSystem, spaceId, flows.wuliao);
                    } else {
                        console.error('server: flows.wuliao is null')
                    }

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