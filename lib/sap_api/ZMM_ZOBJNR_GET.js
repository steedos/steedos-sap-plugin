// 获取用款单
var rfc = require('node-rfc');
const Fiber = require('fibers');
const ZWAERSMap = {
    'CNY': '人民币',
    'EUR': '欧元',
    'JPY': '日元',
    'USD': '美元',
}

function translateToSteedosValues(item) {
    let values = {};
    // 项目代码
    let ZPLANCODE = Creator.getCollection('SAP_ZPPLN').findOne({
        'NUMB': item['ZPLANCODE']
    });
    if (ZPLANCODE) {
        ZPLANCODE['@label'] = ZPLANCODE.NUMB;
        values.ZPLANCODE = ZPLANCODE;
        // 项目名称
        values.DESCRIPTION = item.DESCRIPTION;
    } else {
        throw new Error(`ZMM_ZOBJNR_GET: not find SAP_ZPPLN by ${item['ZPLANCODE']}`)
    }

    // 采购凭证号 （采购订单号）
    values.EBELN = item.EBELN;

    return values;
}

exports.run = function run(insId, resolve, reject) {
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
                    // {
                    //     IV_ZOBJNR: '',
                    //     ET_HEAD: [{
                    //         BUKRS: '2600',
                    //         ZOBJNR: '0000000009',
                    //         CONTR_NO: '生09-34补',
                    //         COMPA: '测试供应商 2008011601',
                    //         BKTXT: '会务费',
                    //         CONTR_EXP: '3000.00',
                    //         ACCUM_PAY: '16100.00',
                    //         DMBTR: '1000.00',
                    //         ZSTATE: ''
                    //     }],
                    //     ET_ITEM: [{
                    //         ZOBJNR: '0000000009',
                    //         ZFIPOS: '001',
                    //         ZPLANCODE: '10-01-03-001',
                    //         DESCRIPTION: '会务费',
                    //         EBELN: '4800000051',
                    //         USNAM: '',
                    //         DMBTR_YFK: '0.00',
                    //         DMBTR_ZBJ: '1000.00',
                    //         DMBTR_JDK: '0.00',
                    //         ZPO_TYPE: '1',
                    //         ZPO_TYPE_TEXT: '固定总价'
                    //     }],
                    //     ET_RETURN: []
                    // }

                    console.log('ZMM_ZOBJNR_GET: ', 'ET_HEAD ', res.ET_HEAD.length);
                    console.log('ZMM_ZOBJNR_GET: ', 'ET_ITEM ', res.ET_ITEM.length);
                    let et_head = res.ET_HEAD;
                    let et_item = res.ET_ITEM;

                    // 同步申请单
                    Fiber(function () {
                        try {
                            for (let i = 0; i < et_head.length; i++) {
                                try {
                                    const element = et_head[i];
                                    let ZOBJNR = element.ZOBJNR;
                                    let ins = Creator.getCollection('instances').findOne({
                                        space: spaceId,
                                        flow: flowId,
                                        'values.ZOBJNR': ZOBJNR
                                    }, {
                                        fields: {
                                            _id: 1
                                        }
                                    });
                                    let projectInfo = [];
                                    let ZPO_TYPE_TEXT = '';
                                    let ZWAERS = '';
                                    for (let j = 0; j < et_item.length; j++) {
                                        const item = et_item[j];
                                        if (item.ZOBJNR === ZOBJNR) {
                                            projectInfo.push(translateToSteedosValues(item));
                                            ZPO_TYPE_TEXT = item.ZPO_TYPE_TEXT;
                                            ZWAERS = ZWAERSMap[item['ZWAERS']];
                                        }
                                    }
                                    let setObj = {
                                        'values.ZOBJNR': element['ZOBJNR'], // 付款凭证号  （用款审批单号）
                                        'values.CONTR_NO': element['CONTR_NO'], // 合同编号
                                        'values.COMPA': element['COMPA'], // 受款单位
                                        'values.CONTR_EXP': element['CONTR_EXP'], // 合同费用
                                        'values.ACCUM_PAY': element['ACCUM_PAY'], // 累计付款
                                        'values.DMBTR': element['DMBTR'], // 本项付款
                                        'values.ZSTATE': element['ZSTATE'], // 标记
                                        'values.BKTXT': element['BKTXT'], // 用款事由（合同名称）
                                        'values.projectInfo': projectInfo, // 项目信息子表
                                        'values.ZPO_TYPE_TEXT': ZPO_TYPE_TEXT, // 合同结算类型文本
                                        'values.ZWAERS': ZWAERS // 币种
                                    }
                                    let insertObj = {
                                        'ZOBJNR': element['ZOBJNR'], // 付款凭证号  （用款审批单号）
                                        'CONTR_NO': element['CONTR_NO'], // 合同编号
                                        'COMPA': element['COMPA'], // 受款单位
                                        'CONTR_EXP': element['CONTR_EXP'], // 合同费用
                                        'ACCUM_PAY': element['ACCUM_PAY'], // 累计付款
                                        'DMBTR': element['DMBTR'], // 本项付款
                                        'ZSTATE': element['ZSTATE'], // 标记
                                        'BKTXT': element['BKTXT'], // 用款事由（合同名称）
                                        'projectInfo': projectInfo, // 项目信息子表
                                        'ZPO_TYPE_TEXT': ZPO_TYPE_TEXT, // 合同结算类型文本
                                        'ZWAERS': ZWAERS // 币种
                                    }
                                    if (ins) { // 更新
                                        console.error('ZMM_ZOBJNR_GET: ', '更新');
                                        console.error('ZMM_ZOBJNR_GET: ', 'ZOBJNR ', element.ZOBJNR);

                                        delete setObj['values.projectInfo']; // 自动更新不覆盖子表

                                        Creator.getCollection('instances').update(ins._id, {
                                            $set: setObj
                                        })
                                    } else { // 新建
                                        // console.error('ZMM_ZOBJNR_GET: ', '新建');
                                        let userName = element.USNAM;
                                        if (!userName) {
                                            throw new Error(`ZMM_ZOBJNR_GET: no USNAM`);
                                        }
                                        let user_info = Creator.getCollection('users').findOne({
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
                                                        values: insertObj
                                                    }]
                                                }]
                                            }

                                            let new_ins_id = uuflowManager.create_instance(instance_from_client, user_info);

                                            // 给instance.values赋值，不然草稿箱子提交之后不可编辑的字段值不会赋给instance.values
                                            Creator.getCollection('instances').update(new_ins_id, {
                                                $set: setObj
                                            });
                                        } else {
                                            console.error('ZMM_ZOBJNR_GET: ', `can not find user ${userName}`);
                                            continue;
                                        }
                                    }
                                } catch (error) {
                                    console.error('ZMM_ZOBJNR_GET: ', 'error ', error);
                                }
                            }
                        } catch (error) {
                            console.error('ZMM_ZOBJNR_GET: ', 'fiber error ', error);
                        }
                    }).run()


                });
        });
    } else { // 刷新单个用款单数据，使用同步的方式执行代码
        try {
            Fiber(function () {
                let data = {};
                let ins = Creator.getCollection('instances').findOne(insId, {
                    fields: {
                        values: 1,
                        state: 1
                    }
                });
                data.IV_ZOBJNR = ins.values.ZOBJNR;
                if (data.IV_ZOBJNR) {
                    // and connect
                    client.connect(function (err) {
                        if (err) { // check for login/connection errors
                            console.error('could not connect to server', err);
                            reject(err);
                        }

                        // invoke remote enabled ABAP function module
                        client.invoke('ZMM_ZOBJNR_GET', data,
                            function (err, res) {
                                if (err) {
                                    console.error('Error invoking STFC_CONNECTION:', err);
                                    reject(err);
                                }
                                console.log('ZMM_ZOBJNR_GET: ', 'res ', res);
                                console.log('ZMM_ZOBJNR_GET: ', 'ET_HEAD ', res.ET_HEAD.length);
                                console.log('ZMM_ZOBJNR_GET: ', 'ET_ITEM ', res.ET_ITEM.length);
                                let et_head = res.ET_HEAD;
                                let et_item = res.ET_ITEM;
                                if (et_head[0]) {
                                    Fiber(function () {
                                        try {
                                            // 更新申请单
                                            let projectInfo = [];
                                            let ZPO_TYPE_TEXT = '';
                                            let ZWAERS = '';
                                            for (let j = 0; j < et_item.length; j++) {
                                                const item = et_item[j];
                                                projectInfo.push(translateToSteedosValues(item));
                                                ZPO_TYPE_TEXT = item.ZPO_TYPE_TEXT;
                                                ZWAERS = ZWAERSMap[item['ZWAERS']];
                                            }
                                            let setObj = {
                                                'values.ZOBJNR': et_head[0]['ZOBJNR'], // 付款凭证号  （用款审批单号）
                                                'values.CONTR_NO': et_head[0]['CONTR_NO'], // 合同编号
                                                'values.COMPA': et_head[0]['COMPA'], // 受款单位
                                                'values.CONTR_EXP': et_head[0]['CONTR_EXP'], // 合同费用
                                                'values.ACCUM_PAY': et_head[0]['ACCUM_PAY'], // 累计付款
                                                'values.DMBTR': et_head[0]['DMBTR'], // 本项付款
                                                'values.ZSTATE': et_head[0]['ZSTATE'], // 标记
                                                'values.BKTXT': et_head[0]['BKTXT'], // 用款事由（合同名称）
                                                'values.projectInfo': projectInfo, // 项目信息子表
                                                'values.ZPO_TYPE_TEXT': ZPO_TYPE_TEXT, // 合同结算类型文本
                                                'values.ZWAERS': ZWAERS // 币种
                                            }

                                            if (ins.state === 'draft') {
                                                let newSetObj = Object.assign(setObj, {
                                                    'traces.0.approves.0.values.ZOBJNR': et_head[0]['ZOBJNR'], // 付款凭证号  （用款审批单号）
                                                    'traces.0.approves.0.values.CONTR_NO': et_head[0]['CONTR_NO'], // 合同编号
                                                    'traces.0.approves.0.values.COMPA': et_head[0]['COMPA'], // 受款单位
                                                    'traces.0.approves.0.values.CONTR_EXP': et_head[0]['CONTR_EXP'], // 合同费用
                                                    'traces.0.approves.0.values.ACCUM_PAY': et_head[0]['ACCUM_PAY'], // 累计付款
                                                    'traces.0.approves.0.values.DMBTR': et_head[0]['DMBTR'], // 本项付款
                                                    'traces.0.approves.0.values.ZSTATE': et_head[0]['ZSTATE'], // 标记
                                                    'traces.0.approves.0.values.BKTXT': et_head[0]['BKTXT'], // 用款事由（合同名称）
                                                    'traces.0.approves.0.values.projectInfo': projectInfo, // 项目信息子表
                                                    'traces.0.approves.0.values.ZPO_TYPE_TEXT': ZPO_TYPE_TEXT, // 合同结算类型文本
                                                    'traces.0.approves.0.values.ZWAERS': ZWAERS // 币种
                                                });
                                                Creator.getCollection('instances').update(insId, {
                                                    $set: newSetObj
                                                })
                                            } else {
                                                Creator.getCollection('instances').update(insId, {
                                                    $set: setObj
                                                })
                                            }

                                            resolve({
                                                ok: 1
                                            })
                                        } catch (error) {
                                            console.error('ZMM_ZOBJNR_GET: ', 'fiber error ', error);
                                            reject(error);
                                        }
                                    }).run()
                                } else {
                                    resolve({
                                        ok: 0,
                                        msg: '未找到对应记录'
                                    })
                                }

                            });
                    });
                }
            }).run()
        } catch (error) {
            reject(error);
        }

    }

}