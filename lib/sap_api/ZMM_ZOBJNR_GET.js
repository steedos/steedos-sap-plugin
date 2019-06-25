// 获取用款单
var rfc = require('node-rfc');

exports.run = function run(insId) {
    let abapSystem = Meteor.settings.plugins.sap.abapConfig;
    let spaceId = Meteor.settings.plugins.sap.spaceId;
    let flowId = Meteor.settings.plugins.sap.flows.yongkuandan;
    // create new client
    var client = new rfc.Client(abapSystem);

    // echo the client NW RFC lib version
    console.log('RFC client lib version: ', client.getVersion());

    // and connect
    client.connect(function (err) {
        if (err) { // check for login/connection errors
            return console.error('could not connect to server', err);
        }

        // invoke remote enabled ABAP function module
        let data = {};
        if (insId) {
            let ins = Creator.getCollection('instances').findOne(insId, {
                fields: {
                    values: 1
                }
            });
            data.IV_ZOBJNR = ins.values.ZOBJNR
        }
        client.invoke('ZMM_ZOBJNR_GET', {},
            function (err, res) {
                if (err) {
                    return console.error('Error invoking STFC_CONNECTION:', err);
                }
                // res 返回结构
                // { IV_ZOBJNR: '',
                // ET_OUTPUT:
                //  [ { ZOBJNR: '0000000008',
                //      CONTR_NO: '',
                //      COMPA: '上海飞奥燃气设备有限公司',
                //      CONTR_EXP: '0.00',
                //      ACCUM_PAY: '0.00',
                //      DMBTR: '3000.00',
                //      ZSTATE: '',
                //      ZPLANCODE: '12-02-02-002',
                //      DESCRIPTION: '2012年度天然气主干网沉降监测',
                //      EBELN: '',
                //      USNAM: 'username' } ],
                // ET_RETURN: [] }

                console.log('Result STFC_CONNECTION:', res);
                console.log(res.ET_OUTPUT.length);

                let output = res.ET_OUTPUT;
                if (insId) {
                    // 更新申请单
                    let setObj = {
                        'values.CONTR_NO': output[0]['CONTR_NO'],
                        'values.COMPA': output[0]['COMPA'],
                        'values.CONTR_EXP': output[0]['CONTR_EXP'],
                        'values.ACCUM_PAY': output[0]['ACCUM_PAY'],
                        'values.DMBTR': output[0]['DMBTR'],
                        'values.ZSTATE': output[0]['ZSTATE'],
                        'values.ZPLANCODE': output[0]['ZPLANCODE'],
                        'values.DESCRIPTION': output[0]['DESCRIPTION'],
                        'values.EBELN': output[0]['EBELN']
                    }
                    Creator.getCollection('instances').update(insId, {
                        $set: setObj
                    })
                } else {
                    // 新建申请单
                    for (let i = 0; i < output.length; i++) {
                        const element = output[i];
                        let userName = element.USNAM;
                        let user_info = Creator.getCollection('space_users').find({
                            space: spaceId,
                            username: userName
                        }, {
                            fields: {
                                name: 1
                            }
                        })
                        if (user_info) {
                            let flow = Creator.getCollection('flows').findOne(flowId, {
                                fields: {
                                    'current._id': 1
                                }
                            });
                            if (!flow) {
                                console.error('ZMM_ZOBJNR_GET: ', `can not find flow ${flowId}`);
                                continue;
                            }
                            let instance_from_client = {
                                space: spaceId,
                                flow: flowId,
                                flow_version: flow.current._id,
                                traces: [{
                                    approves: [{
                                        values: element
                                    }]
                                }]
                            }

                            uuflowManager.create_instance(instance_from_client, user_info);
                        } else {
                            console.error('ZMM_ZOBJNR_GET: ', `can not find user ${userName}`);
                            continue;
                        }
                    }
                }




            });




    });
}