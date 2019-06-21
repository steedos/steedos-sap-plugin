var server = require('@steedos/meteor-bundle-runner');
var objectql = require("@steedos/objectql");
var path = require('path');
var schedule = require('node-schedule');
server.Fiber(function () {
    server.Profile.run("Server startup", function () {
        server.loadServerBundles();
        try {
            let objects = objectql.loadObjectFiles(path.resolve(__dirname, "./src"))
            let apps = objectql.loadAppFiles(path.resolve(__dirname, "./src"))
            objects.forEach(function(object){
                Creator.Objects[object.name] = object
            })
            apps.forEach(function(app){
                Creator.Apps[app._id] = app
            })

            // 自定义业务逻辑

            // 定时执行统计
            var rule = Meteor.settings.cron.sap_sync_interval;
            if (!rule){
                console.error('need to config settings.cron.sap_sync_interval!!!')
                return
            }
            schedule.scheduleJob(rule, Meteor.bindEnvironment(function () {
              console.time('sap_sync_interval');


              console.timeEnd('sap_sync_interval');


            }, function () {
              console.log('Failed to bind environment');
            }));

        } catch (error) {
            console.log(error)
        }
        server.callStartupHooks();
        server.runMain();
    });
}).run();