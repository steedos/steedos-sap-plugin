// 获取PR行项目
var rfc = require('node-rfc');
const Fiber = require('fibers');
const _ = require('underscore');

function getMaterialCategory(KNTTP, AFNAM) {
    if (!KNTTP) {
        if (AFNAM.indexOf('0503019') > -1) {
            return '总务普通资产';
        } else {
            return '普通资产';
        }
    } else if (KNTTP === 'A') {
        if (AFNAM.indexOf('0401004') > -1) {
            return '总务固定资产';
        } else {
            return '固定资产';
        }
    } else if (KNTTP === 'Q') {
        return '项目资产';
    }
}

exports.run = function run(insId, resolve, reject) {
    let abapSystem = Meteor.settings.sap.abapConfig;
    let spaceId = Meteor.settings.sap.spaceId;
    let flowId = Meteor.settings.sap.flows.wuliao;

    // create new client
    var client = new rfc.Client(abapSystem);

    // echo the client NW RFC lib version
    console.log('RFC client lib version: ', client.getVersion());
    if (!insId) { // 获取所有'未审批'物料单
        // and connect
        client.connect(function (err) {
            if (err) { // check for login/connection errors
                return console.error('could not connect to server', err);
            }

            // invoke remote enabled ABAP function module
            client.invoke('Z_BAPI_REQUISITION_GETITEMSGW ', {},
                function (err, res) {
                    if (err) {
                        return console.error('Error invoking STFC_CONNECTION:', err);
                    }
                    // res 返回结构
                    // { MESSAGE: '',
                    // REL_CODE: '',
                    // REL_GROUP: '',
                    // PRHEADERTEXT:
                    //  [ { PREQ_NO: '0010002638',
                    //      PREQ_ITEM: '00000',
                    //      TEXT_ID: 'B01',
                    //      TEXT_FORM: '*',
                    //      TEXT_LINE: 'tets' } ],
                    // PRITEMTEXT: [],
                    // REQUISITION_ITEMS:
                    //  [ { BANFN: '0010001166',
                    //      BNFPO: '00010',
                    //      KNTTP: 'A',
                    //      STATU: 'N',
                    //      TXZ01: '差压变送器',
                    //      MENGE: '12.000',
                    //      MEINS: 'EA',
                    //      BADAT: '20120509',
                    //      PREIS: '0.00',
                    //      ERNAM: '洪恒',
                    //      ANLN1: '001070000013',
                    //      TXT50: '差压变送器',
                    //      WBS: '',
                    //      POST1: '',
                    //      DEPARTMENT: '',
                    //      MATNR: '',
                    //      AFNAM: '120405001',
                    //      ACCOUNT: 'HONGHENG',
                    //      DANWEI: '每一个',
                    //      AFDES: '配合S6工程天然气管线搬迁',
                    //      EINDT: '20120517' }],
                    // RETURN:
                    //  [ { TYPE: 'W',
                    //      CODE: 'BM035',
                    //      MESSAGE: '测量单位 ZI 没有 ISO 代码',
                    //      LOG_NO: '',
                    //      LOG_MSG_NO: '000000',
                    //      MESSAGE_V1: 'ZI',
                    //      MESSAGE_V2: '',
                    //      MESSAGE_V3: '',
                    //      MESSAGE_V4: '' } ] }
                    console.log('Z_BAPI_REQUISITION_GETITEMSGW: ', 'res.PRHEADERTEXT.length: ', res.PRHEADERTEXT.length);
                    console.log('Z_BAPI_REQUISITION_GETITEMSGW: ', 'res.PRITEMTEXT.length: ', res.PRITEMTEXT.length);
                    console.log('Z_BAPI_REQUISITION_GETITEMSGW: ', 'res.REQUISITION_ITEMS.length: ', res.REQUISITION_ITEMS.length);

                    let requisition_items_map = {};
                    let pritemtext_map = {};
                    let prheadertext_map = {};
                    res.REQUISITION_ITEMS.forEach(function (item) {
                        const BANFN = item['BANFN'];
                        if (!requisition_items_map[BANFN]) {
                            requisition_items_map[BANFN] = [item];
                        } else {
                            requisition_items_map[BANFN].push(item);
                        }
                    })
                    // 物料属性
                    res.PRITEMTEXT.forEach(function (item) {
                        const PREQ_NO = item['PREQ_NO'];
                        if (!pritemtext_map[PREQ_NO]) {
                            pritemtext_map[PREQ_NO] = [item];
                        } else {
                            pritemtext_map[PREQ_NO].push(item);
                        }
                    })
                    // 表头注释
                    res.PRHEADERTEXT.forEach(function (item) {
                        const PREQ_NO = item['PREQ_NO'];
                        if (!prheadertext_map[PREQ_NO]) {
                            prheadertext_map[PREQ_NO] = [item];
                        } else {
                            prheadertext_map[PREQ_NO].push(item);
                        }
                    })


                    Fiber(function () {
                        _.each(requisition_items_map, function (items, BANFN) {
                            try {
                                let userName = items[0].ACCOUNT;
                                let user_info = Creator.getCollection('space_users').findOne({
                                    space: spaceId,
                                    username: userName
                                }, {
                                        fields: {
                                            user: 1,
                                            name: 1,
                                            sort_no: 1,
                                            organization: 1,
                                            hr: 1,
                                            roles: 1
                                        }
                                    })
                                if (!user_info) {
                                    console.error('Z_BAPI_REQUISITION_GETITEMSGW: ', `can not find user ${userName}`);
                                    return;
                                }
                                let ins = Creator.getCollection('instances').findOne({
                                    space: spaceId,
                                    flow: flowId,
                                    'values.shengoudanhao': BANFN
                                }, {
                                        fields: {
                                            _id: 1
                                        }
                                    });
                                let projectInfo = [];
                                items.forEach(function (requisition) {
                                    let TEXT_LINE = '';
                                    if (pritemtext_map[BANFN]) {
                                        pritemtext_map[BANFN].forEach(function (pt) {
                                            if (pt['PREQ_ITEM'] === requisition['BNFPO']) {
                                                TEXT_LINE = pt['TEXT_LINE']
                                            }
                                        })
                                    }

                                    projectInfo.push({
                                        'AFNAM': requisition['AFNAM'], // 计划编号
                                        'WBS': requisition['WBS'], // WBS编码
                                        'AFDES': requisition['AFDES'], // 项目表述
                                        'ANLN1': requisition['ANLN1'], // 资产编码
                                        'TXT50': requisition['TXT50'], // 资产描述
                                        'BANFN': requisition['BANFN'], // 采购申请号
                                        'BNFPO': requisition['BNFPO'], // 行项目
                                        'MATNR': requisition['MATNR'], // 物料编码
                                        'TXZ01': requisition['TXZ01'], // 物料描述
                                        'TEXT_LINE': TEXT_LINE, // 物料属性
                                        'MENGE': requisition['MENGE'], // 数量
                                        'DANWEI': requisition['DANWEI'], // 单位
                                        'EINDT': requisition['EINDT'], // 交货日期
                                        // '': requisition[''] // 备注
                                    });
                                })
                                let biaotouzhushi = '';
                                if (prheadertext_map && prheadertext_map[BANFN] && prheadertext_map[BANFN][0]) {
                                    biaotouzhushi = prheadertext_map[BANFN][0]['TEXT_LINE']
                                }
                                let wuzileibie = getMaterialCategory(items[0]['KNTTP'], items[0]['AFNAM']);
                                let org = Creator.getCollection('organizations').findOne(user_info.organization);
                                let DEPARTMENT = {
                                    id: org._id,
                                    name: org.name,
                                    fullname: org.fullname
                                }
                                let ACCOUNT = {
                                    id: user_info.user,
                                    name: user_info.name,
                                    organization: {
                                        name: DEPARTMENT.name,
                                        fullname: DEPARTMENT.fullname
                                    }
                                }
                                let setObj = {
                                    'values.biaotouzhushi': biaotouzhushi, // 表头注释
                                    'values.shengoudanhao': BANFN, // 采购申请编号 （申购单号）
                                    'values.wuzileibie': wuzileibie, // 物资类别
                                    'values.ACCOUNT': ACCOUNT, // 申购人
                                    'values.DEPARTMENT': DEPARTMENT, // 申购部门
                                    'values.projectInfo': projectInfo // 资产信息
                                }
                                let insertObj = {
                                    'biaotouzhushi': biaotouzhushi, // 表头注释
                                    'shengoudanhao': BANFN, // 采购申请编号 （申购单号）
                                    'wuzileibie': wuzileibie, // 物资类别
                                    'ACCOUNT': ACCOUNT, // 申购人
                                    'DEPARTMENT': DEPARTMENT, // 申购部门
                                    'projectInfo': projectInfo // 资产信息
                                };

                                if (ins) { // 更新
                                    console.error('Z_BAPI_REQUISITION_GETITEMSGW: ', '更新');
                                    console.error('Z_BAPI_REQUISITION_GETITEMSGW: ', 'shengoudanhao ', BANFN);
                                    let newSetObj = Object.assign(setObj, {
                                        'traces.0.approves.0.values.biaotouzhushi': biaotouzhushi ? biaotouzhushi : ins.values.biaotouzhushi, // 表头注释
                                        'traces.0.approves.0.values.shengoudanhao': BANFN, // 采购申请编号 （申购单号）
                                        'traces.0.approves.0.values.wuzileibie': wuzileibie, // 物资类别
                                        'traces.0.approves.0.values.ACCOUNT': ACCOUNT, // 申购人
                                        'traces.0.approves.0.values.DEPARTMENT': DEPARTMENT, // 申购部门
                                        'traces.0.approves.0.values.projectInfo': projectInfo // 资产信息
                                    });
                                    Creator.getCollection('instances').update(ins._id, {
                                        $set: newSetObj
                                    })
                                } else { // 新建
                                    let flow = Creator.getCollection('flows').findOne(flowId, {
                                        fields: {
                                            'current._id': 1
                                        }
                                    });
                                    if (!flow) {
                                        console.error('Z_BAPI_REQUISITION_GETITEMSGW: ', `can not find flow ${flowId}`);
                                        return;
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

                                    let user = {
                                        _id: user_info.user,
                                        name: user_info.name
                                    }

                                    let new_ins_id = uuflowManager.create_instance(instance_from_client, user);

                                    // 给instance.values赋值，不然草稿箱子提交之后不可编辑的字段值不会赋给instance.values
                                    Creator.getCollection('instances').update(new_ins_id, {
                                        $set: setObj
                                    });
                                }
                            } catch (error) {
                                console.error('Z_BAPI_REQUISITION_GETITEMSGW: ', 'error ', error);
                            }
                        })
                    }).run()
                });
        });
    } else {
        try {
            // and connect
            client.connect(function (err) {
                if (err) { // check for login/connection errors
                    console.error('could not connect to server', err);
                    reject(err);
                }
                // invoke remote enabled ABAP function module
                client.invoke('Z_BAPI_REQUISITION_GETITEMSGW ', {},
                    function (err, res) {
                        if (err) {
                            console.error('Error invoking STFC_CONNECTION:', err);
                            reject(err);
                        }
                        console.log('Z_BAPI_REQUISITION_GETITEMSGW: ', 'res.PRHEADERTEXT.length: ', res.PRHEADERTEXT.length);
                        console.log('Z_BAPI_REQUISITION_GETITEMSGW: ', 'res.PRITEMTEXT.length: ', res.PRITEMTEXT.length);
                        console.log('Z_BAPI_REQUISITION_GETITEMSGW: ', 'res.REQUISITION_ITEMS.length: ', res.REQUISITION_ITEMS.length);

                        let requisition_items_map = {};
                        let pritemtext_map = {};
                        let prheadertext_map = {};
                        res.REQUISITION_ITEMS.forEach(function (item) {
                            const BANFN = item['BANFN'];
                            if (!requisition_items_map[BANFN]) {
                                requisition_items_map[BANFN] = [item];
                            } else {
                                requisition_items_map[BANFN].push(item);
                            }
                        })
                        // 物料属性
                        res.PRITEMTEXT.forEach(function (item) {
                            const PREQ_NO = item['PREQ_NO'];
                            if (!pritemtext_map[PREQ_NO]) {
                                pritemtext_map[PREQ_NO] = [item];
                            } else {
                                pritemtext_map[PREQ_NO].push(item);
                            }
                        })
                        // 表头注释
                        res.PRHEADERTEXT.forEach(function (item) {
                            const PREQ_NO = item['PREQ_NO'];
                            if (!prheadertext_map[PREQ_NO]) {
                                prheadertext_map[PREQ_NO] = [item];
                            } else {
                                prheadertext_map[PREQ_NO].push(item);
                            }
                        })

                        Fiber(function () {
                            try {
                                let ins = Creator.getCollection('instances').findOne(insId, {
                                    fields: {
                                        values: 1
                                    }
                                });
                                let BANFN = ins.values.shengoudanhao;
                                let items = requisition_items_map[BANFN];
                                let userName = items[0].ACCOUNT;
                                let user_info = Creator.getCollection('space_users').findOne({
                                    space: spaceId,
                                    username: userName
                                }, {
                                        fields: {
                                            user: 1,
                                            name: 1,
                                            sort_no: 1,
                                            organization: 1,
                                            hr: 1,
                                            roles: 1
                                        }
                                    })
                                if (!user_info) {
                                    console.error('Z_BAPI_REQUISITION_GETITEMSGW: ', `can not find user ${userName}`);
                                    reject(`Z_BAPI_REQUISITION_GETITEMSGW: can not find user ${userName}`);
                                }

                                let projectInfo = [];
                                items.forEach(function (requisition) {
                                    let TEXT_LINE = '';
                                    if (pritemtext_map[BANFN]) {
                                        pritemtext_map[BANFN].forEach(function (pt) {
                                            if (pt['PREQ_ITEM'] === requisition['BNFPO']) {
                                                TEXT_LINE = pt['TEXT_LINE']
                                            }
                                        })
                                    }

                                    projectInfo.push({
                                        'AFNAM': requisition['AFNAM'], // 计划编号
                                        'WBS': requisition['WBS'], // WBS编码
                                        'AFDES': requisition['AFDES'], // 项目表述
                                        'ANLN1': requisition['ANLN1'], // 资产编码
                                        'TXT50': requisition['TXT50'], // 资产描述
                                        'BANFN': requisition['BANFN'], // 采购申请号
                                        'BNFPO': requisition['BNFPO'], // 行项目
                                        'MATNR': requisition['MATNR'], // 物料编码
                                        'TXZ01': requisition['TXZ01'], // 物料描述
                                        'TEXT_LINE': TEXT_LINE, // 物料属性
                                        'MENGE': requisition['MENGE'], // 数量
                                        'DANWEI': requisition['DANWEI'], // 单位
                                        'EINDT': requisition['EINDT'], // 交货日期
                                        // '': requisition[''] // 备注
                                    });
                                })
                                let biaotouzhushi = '';
                                if (prheadertext_map && prheadertext_map[BANFN] && prheadertext_map[BANFN][0]) {
                                    biaotouzhushi = prheadertext_map[BANFN][0]['TEXT_LINE']
                                }
                                let wuzileibie = getMaterialCategory(items[0]['KNTTP'], items[0]['AFNAM']);
                                let org = Creator.getCollection('organizations').findOne(user_info.organization);
                                let DEPARTMENT = {
                                    id: org._id,
                                    name: org.name,
                                    fullname: org.fullname
                                }
                                let ACCOUNT = {
                                    id: user_info.user,
                                    name: user_info.name,
                                    organization: {
                                        name: DEPARTMENT.name,
                                        fullname: DEPARTMENT.fullname
                                    }
                                }
                                let setObj = {
                                    'values.biaotouzhushi': biaotouzhushi ? biaotouzhushi : ins.values.biaotouzhushi, // 表头注释
                                    'values.shengoudanhao': BANFN, // 采购申请编号 （申购单号）
                                    'values.wuzileibie': wuzileibie, // 物资类别
                                    'values.ACCOUNT': ACCOUNT, // 申购人
                                    'values.DEPARTMENT': DEPARTMENT, // 申购部门
                                    'values.projectInfo': projectInfo // 资产信息
                                }

                                console.error('Z_BAPI_REQUISITION_GETITEMSGW: ', '更新');
                                console.error('Z_BAPI_REQUISITION_GETITEMSGW: ', 'shengoudanhao ', BANFN);

                                if (ins.state === 'draft') {
                                    let newSetObj = Object.assign(setObj, {
                                        'traces.0.approves.0.values.biaotouzhushi': biaotouzhushi ? biaotouzhushi : ins.values.biaotouzhushi, // 表头注释
                                        'traces.0.approves.0.values.shengoudanhao': BANFN, // 采购申请编号 （申购单号）
                                        'traces.0.approves.0.values.wuzileibie': wuzileibie, // 物资类别
                                        'traces.0.approves.0.values.ACCOUNT': ACCOUNT, // 申购人
                                        'traces.0.approves.0.values.DEPARTMENT': DEPARTMENT, // 申购部门
                                        'traces.0.approves.0.values.projectInfo': projectInfo // 资产信息
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
                                console.error('Z_BAPI_REQUISITION_GETITEMSGW: ', 'fiber error ', error);
                                reject(error);
                            }
                        }).run()
                    });
            });
        } catch (error) {
            reject(error);
        }
    }
}