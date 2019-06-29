// 获取用款单
var rfc = require('node-rfc');

function translateToSteedosValues(sapOutput) {
    let values = Object.assign({}, sapOutput);
    // 项目代码
    let ZPLANCODE = Creator.getCollection('SAP_ZPPLN').findOne({
        'NUMB': sapOutput['ZPLANCODE']
    });
    ZPLANCODE['@label'] = ZPLANCODE.NUMB;
    values.ZPLANCODE = ZPLANCODE;
    // 项目名称
    values.DESCRIPTION = ZPLANCODE.NAME;
    return values;
}

exports.run = function run(insId) {
    let abapSystem = Meteor.settings.plugins.sap.abapConfig;
    let spaceId = Meteor.settings.plugins.sap.spaceId;
    let flowId = Meteor.settings.plugins.sap.flows.yongkuandan;
    // create new client
    var client = new rfc.Client(abapSystem);

    // echo the client NW RFC lib version
    console.log('RFC client lib version: ', client.getVersion());

    if (!insId) { // 获取所有'未审批'用款单
        // and connect
        client.connect(function (err) {
            if (err) { // check for login/connection errors
                return console.error('could not connect to server', err);
            }

            // invoke remote enabled ABAP function module

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

                    // 同步申请单
                    for (let i = 0; i < output.length; i++) {
                        const element = output[i];
                        let ZOBJNR = element.ZOBJNR;
                        let ins = Creator.getCollection('instances').findOne({
                            space: spaceId,
                            'values.ZOBJNR': ZOBJNR
                        }, {
                            fields: {
                                _id: 1
                            }
                        });

                        if (ins) { // 更新
                            let translatedElement = translateToSteedosValues(element);
                            let setObj = {
                                'values.CONTR_NO': translatedElement['CONTR_NO'],
                                'values.COMPA': translatedElement['COMPA'],
                                'values.CONTR_EXP': translatedElement['CONTR_EXP'],
                                'values.ACCUM_PAY': translatedElement['ACCUM_PAY'],
                                'values.DMBTR': translatedElement['DMBTR'],
                                'values.ZSTATE': translatedElement['ZSTATE'],
                                'values.ZPLANCODE': translatedElement['ZPLANCODE'],
                                'values.DESCRIPTION': translatedElement['DESCRIPTION'],
                                'values.EBELN': translatedElement['EBELN']
                            }
                            Creator.getCollection('instances').update(ins._id, {
                                $set: setObj
                            })
                        } else { // 新建
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
    } else { // 刷新单个用款单数据，使用同步的方式执行代码
        let result = {};
        let data = {};
        let ins = Creator.getCollection('instances').findOne(insId, {
            fields: {
                values: 1
            }
        });
        data.IV_ZOBJNR = ins.values.ZOBJNR;
        if (data.IV_ZOBJNR) {
            (async function () {
                try {
                    await client.open();

                    let res = await client.call('ZMM_ZOBJNR_GET', data);
                    let output = res.ET_OUTPUT;
                    // 更新申请单
                    let translatedElement = translateToSteedosValues(element);
                    let setObj = {
                        'values.CONTR_NO': translatedElement['CONTR_NO'],
                        'values.COMPA': translatedElement['COMPA'],
                        'values.CONTR_EXP': translatedElement['CONTR_EXP'],
                        'values.ACCUM_PAY': translatedElement['ACCUM_PAY'],
                        'values.DMBTR': translatedElement['DMBTR'],
                        'values.ZSTATE': translatedElement['ZSTATE'],
                        'values.ZPLANCODE': translatedElement['ZPLANCODE'],
                        'values.DESCRIPTION': translatedElement['DESCRIPTION'],
                        'values.EBELN': translatedElement['EBELN']
                    }
                    Creator.getCollection('instances').update(insId, {
                        $set: setObj
                    })

                    result = {
                        ok: 1
                    }
                } catch (ex) {
                    console.error('ZMM_ZOBJNR_GET: ', ex);
                    result = {
                        ok: 0,
                        msg: ex.message
                    }
                }
            })();
        }

        return result;
    }

}