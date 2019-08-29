// 获取物资类采购订单
var rfc = require('node-rfc');
const Fiber = require('fibers');

exports.run = function run(insId, resolve, reject) {
    let abapSystem = Meteor.settings.sap.abapConfig;
    let spaceId = Meteor.settings.sap.spaceId;
    let flowId = Meteor.settings.sap.flows.wuzicaigou;
    // create new client
    var client = new rfc.Client(abapSystem);

    // echo the client NW RFC lib version
    console.log('RFC client lib version: ', client.getVersion());

    if (!insId) { // 获取所有'未审批'物资类采购订单
        // and connect
        client.connect(function (err) {
            if (err) { // check for login/connection errors
                return console.error('could not connect to server', err);
            }

            // invoke remote enabled ABAP function module

            client.invoke('Z_GET_PO_INFO', {},
                function (err, res) {
                    if (err) {
                        return console.error('Error invoking STFC_CONNECTION:', err);
                    }
                    // res 返回结构
                    // { MESSAGE: '',
                    // IV_CODE: '',
                    // IV_EBELN: '',
                    // IV_GROUP: '',
                    // ET_HEADER:
                    //  [ { EBELN: '4500002621',
                    //      BSART: 'NB',
                    //      ERNAM: '洪恒',
                    //      ACCOUNT: 'HONGHENG',
                    //      LIFNR: '0000060505',
                    //      BEDAT: '20190611',
                    //      DEPARTMENT: '',
                    //      WAERS: 'CNY',
                    //      EKGRP: '601',
                    //      EKNAM: '张玉燕' },
                    //    { EBELN: '4500002643',
                    //      BSART: 'ZMAC',
                    //      ERNAM: '洪恒',
                    //      ACCOUNT: 'HONGHENG',
                    //      LIFNR: '0000060418',
                    //      BEDAT: '20190719',
                    //      DEPARTMENT: '',
                    //      WAERS: 'CNY',
                    //      EKGRP: '601',
                    //      EKNAM: '张玉燕' } ],
                    // ET_HEADERTEXT:
                    //  [ { PO_NUMBER: '4500002621',
                    //      TEXT_ID: 'F02',
                    //      TEXT_FORM: '*',
                    //      TEXT_LINE: '123456' } ],
                    // ET_ITEM:
                    //  [ 
                    //    { EBELN: '4500002643',
                    //      EBELP: '00010',
                    //      KNTTP: 'Q',
                    //      PSTYP: '3',
                    //      ANLN1: '',
                    //      EMATN: '61014000',
                    //      TXZ01: '弯头/D108*5mm/1.5D/32°/GB',
                    //      MENGE: '2.000',
                    //      MEINS: 'ZI',
                    //      MSEHT: '只',
                    //      NETPR: '200.00',
                    //      MATKL: '6107',
                    //      WERKS: '2600',
                    //      AFNAM: '',
                    //      AFDES: '',
                    //      POSID: 'S0903020402',
                    //      POST1: 'ERP实施',
                    //      EEIND: '20191017' } ],
                    // ET_RETURN: [] }

                    console.log('Z_GET_PO_INFO: ', 'ET_HEADER ', res.ET_HEADER.length);
                    console.log('Z_GET_PO_INFO: ', 'ET_HEADERTEXT ', res.ET_HEADERTEXT.length);
                    console.log('Z_GET_PO_INFO: ', 'ET_ITEM ', res.ET_ITEM.length);
                    console.log('Z_GET_PO_INFO: ', 'ET_RETURN ', res.ET_ITEM.length);
                    let et_head = res.ET_HEADER;
                    let et_item = res.ET_ITEM;
                    let et_headertext = res.ET_HEADERTEXT;

                    // 同步申请单
                    Fiber(function () {
                        try {
                            for (let i = 0; i < et_head.length; i++) {
                                try {
                                    const element = et_head[i];
                                    let EBELN = element.EBELN;
                                    let ins = Creator.getCollection('instances').findOne({
                                        space: spaceId,
                                        flow: flowId,
                                        'values.EBELN': EBELN
                                    }, {
                                            fields: {
                                                _id: 1
                                            }
                                        });
                                    let projectInfo = [];
                                    let TEXT_LINE = '';
                                    let zongjia = 0;
                                    for (let j = 0; j < et_item.length; j++) {
                                        const item = et_item[j];
                                        if (item.EBELN === EBELN) {
                                            projectInfo.push(item);
                                            zongjia += item.MENGE * item.NETPR;
                                        }
                                    }
                                    for (let k = 0; k < et_headertext.length; k++) {
                                        const item = et_headertext[k];
                                        if (item.PO_NUMBER === EBELN) {
                                            TEXT_LINE = item.TEXT_LINE;
                                        }
                                    }
                                    let setObj = {
                                        'values.EBELN': element['EBELN'], // 采购凭证号
                                        'values.TEXT_LINE': TEXT_LINE, // 合同主要内容
                                        'values.LIFNR': element['LIFNR'], // 供应商帐户号
                                        'values.NAME1': element['NAME1'], // 供应商描述
                                        'values.EKGRP': element['EKGRP'], // 采购组
                                        'values.EKNAM': element['EKNAM'], // 采购组描述
                                        'values.projectInfo': projectInfo, // 采购物流明细
                                        'values.zongjia': zongjia, // 总价
                                    }
                                    let insertObj = {
                                        'EBELN': element['EBELN'], // 采购凭证号
                                        'TEXT_LINE': TEXT_LINE, // 合同主要内容
                                        'LIFNR': element['LIFNR'], // 供应商帐户号
                                        'NAME1': element['NAME1'], // 供应商描述
                                        'EKGRP': element['EKGRP'], // 采购组
                                        'EKNAM': element['EKNAM'], // 采购组描述
                                        'projectInfo': projectInfo, // 采购物流明细
                                        'zongjia': zongjia, // 总价
                                    }
                                    if (ins) { // 更新
                                        console.error('Z_GET_PO_INFO: ', '更新');
                                        console.error('Z_GET_PO_INFO: ', 'EBELN ', EBELN);
                                        let newSetObj = Object.assign(setObj, {
                                            'traces.0.approves.0.values.EBELN': EBELN, // 采购凭证号
                                            'traces.0.approves.0.values.TEXT_LINE': TEXT_LINE, // 合同主要内容
                                            'traces.0.approves.0.values.LIFNR': element['LIFNR'], // 供应商帐户号
                                            'traces.0.approves.0.values.NAME1': element['NAME1'], // 供应商描述
                                            'traces.0.approves.0.values.EKGRP': element['EKGRP'], // 采购组
                                            'traces.0.approves.0.values.EKNAM': element['EKNAM'], // 采购组描述
                                            'traces.0.approves.0.values.projectInfo': projectInfo, // 采购物流明细
                                            'traces.0.approves.0.values.zongjia': zongjia, // 总价
                                        });
                                        Creator.getCollection('instances').update(ins._id, {
                                            $set: newSetObj
                                        })
                                    } else { // 新建
                                        // console.error('Z_GET_PO_INFO: ', '新建');
                                        let userName = element.ACCOUNT;
                                        if (!userName) {
                                            throw new Error(`Z_GET_PO_INFO: no ACCOUNT`);
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
                                                console.error('Z_GET_PO_INFO: ', `can not find flow ${flowId}`);
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
                                            console.error('Z_GET_PO_INFO: ', `can not find user ${userName}`);
                                            continue;
                                        }
                                    }
                                } catch (error) {
                                    console.error('Z_GET_PO_INFO: ', 'error ', error);
                                }
                            }
                        } catch (error) {
                            console.error('Z_GET_PO_INFO: ', 'fiber error ', error);
                        }
                    }).run()


                });
        });
    } else { // 刷新单个采购单数据，使用同步的方式执行代码
        try {
            Fiber(function () {
                let data = {};
                let ins = Creator.getCollection('instances').findOne(insId, {
                    fields: {
                        values: 1,
                        state: 1
                    }
                });
                data.IV_EBELN = ins.values.EBELN;
                if (data.IV_EBELN) {
                    // and connect
                    client.connect(function (err) {
                        if (err) { // check for login/connection errors
                            console.error('could not connect to server', err);
                            reject(err);
                        }

                        // invoke remote enabled ABAP function module
                        client.invoke('Z_GET_PO_INFO', data,
                            function (err, res) {
                                if (err) {
                                    console.error('Error invoking STFC_CONNECTION:', err);
                                    reject(err);
                                }
                                console.log('Z_GET_PO_INFO: ', 'ET_HEADER ', res.ET_HEADER.length);
                                console.log('Z_GET_PO_INFO: ', 'ET_HEADERTEXT ', res.ET_HEADERTEXT.length);
                                console.log('Z_GET_PO_INFO: ', 'ET_ITEM ', res.ET_ITEM.length);
                                console.log('Z_GET_PO_INFO: ', 'ET_RETURN ', res.ET_ITEM.length);
                                let et_head = res.ET_HEADER;
                                let et_item = res.ET_ITEM;
                                let et_headertext = res.ET_HEADERTEXT;
                                if (et_head[0]) {
                                    Fiber(function () {
                                        try {
                                            // 更新申请单
                                            const element = et_head[0];
                                            let EBELN = element.EBELN;
                                            let projectInfo = [];
                                            let TEXT_LINE = '';
                                            let zongjia = 0;
                                            for (let j = 0; j < et_item.length; j++) {
                                                const item = et_item[j];
                                                if (item.EBELN === EBELN) {
                                                    projectInfo.push(item);
                                                    zongjia += item.MENGE * item.NETPR;
                                                }
                                            }
                                            for (let k = 0; k < et_headertext.length; k++) {
                                                const item = et_headertext[k];
                                                if (item.PO_NUMBER === EBELN) {
                                                    TEXT_LINE = item.TEXT_LINE;
                                                }
                                            }
                                            let setObj = {
                                                'values.EBELN': EBELN, // 采购凭证号
                                                'values.TEXT_LINE': TEXT_LINE, // 合同主要内容
                                                'values.LIFNR': element['LIFNR'], // 供应商帐户号
                                                'values.NAME1': element['NAME1'], // 供应商描述
                                                'values.EKGRP': element['EKGRP'], // 采购组
                                                'values.EKNAM': element['EKNAM'], // 采购组描述
                                                'values.projectInfo': projectInfo, // 采购物流明细
                                                'values.zongjia': zongjia, // 总价
                                            }

                                            if (ins.state === 'draft') {
                                                let newSetObj = Object.assign(setObj, {
                                                    'traces.0.approves.0.values.EBELN': EBELN, // 采购凭证号
                                                    'traces.0.approves.0.values.TEXT_LINE': TEXT_LINE, // 合同主要内容
                                                    'traces.0.approves.0.values.LIFNR': element['LIFNR'], // 供应商帐户号
                                                    'traces.0.approves.0.values.NAME1': element['NAME1'], // 供应商描述
                                                    'traces.0.approves.0.values.EKGRP': element['EKGRP'], // 采购组
                                                    'traces.0.approves.0.values.EKNAM': element['EKNAM'], // 采购组描述
                                                    'traces.0.approves.0.values.projectInfo': projectInfo, // 采购物流明细
                                                    'traces.0.approves.0.values.zongjia': zongjia, // 总价
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
                                            console.error('Z_GET_PO_INFO: ', 'fiber error ', error);
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