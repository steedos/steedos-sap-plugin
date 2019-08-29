// 服务类采购合同自动创建
var rfc = require('node-rfc');
const Fiber = require('fibers');
const WAERSMap = {
    '人民币': 'CNY',
    '日元': 'JPY',
    '美金': 'USD',
    '欧元': 'EUR'
};
const ZPO_TYPEMap = {
    '固定总价': '1',
    '暂估费用': '2',
    '按实结算': '3'
}

exports.run = function run(insId, resolve, reject) {
    Fiber(function () {
        try {
            let abapSystem = Meteor.settings.sap.abapConfig;

            let ins = Creator.getCollection('instances').findOne(insId, {
                fields: {
                    values: 1,
                    applicant_name: 1
                }
            });

            let values = ins.values;

            let IT_INPUT_HEADER = {
                'UNSEZ': values['UNSEZ'] || '',
                'TXZ01': values['TXZ01'] || '',
                'BSART': 'ZB',
                'ERNAM': ins.applicant_name,
                'LIFNR': values['LIFNR'] ? values['LIFNR']['LIFNR'] : '',
                'EKGRP': values['EKGRP'] ? values['EKGRP']['EKGRP'] : '',
                'WAERS': WAERSMap[values['WAERS']] || 'CNY',
                'ZPO_TYPE': ZPO_TYPEMap[values['ZPO_TYPE']] || ''
            }

            console.log('IT_INPUT_HEADER: ', IT_INPUT_HEADER);
            let IT_INPUT_ITEMs = [];
            let projectInfo = values['projectInfo'] || [];
            let IT_INPUT_ITEM = {
                'UNSEZ': values['UNSEZ'] || '',
                'SERIAL_NO': '',
                'KNTTP': values['KNTTP'] ? values['KNTTP']['KNTTP'] : '',
                'PSTYP': 'D',
                'MATNR': '',
                'MATKL': values['MATKL'] ? values['MATKL']['MATKL'] : '',
                'SRVPOS': values['SRVPOS'] ? values['SRVPOS']['ASNUM'] : '',
                'PSP_PNR': values['PSP_PNR'] ? values['PSP_PNR']['POSID'] : ''
            }
            projectInfo.forEach(function (element) {
                let pi = {
                    'NUMB': element['NUMB']['NUMB'],
                    'KOSTL': element['KOSTL']['KOSTL'],
                    'MENGE': element['MENGE']
                };
                IT_INPUT_ITEMs.push(Object.assign(pi, IT_INPUT_ITEM));
            });

            console.log('IT_INPUT_ITEMs: ', IT_INPUT_ITEMs);

            // create new client
            var client = new rfc.Client(abapSystem);

            // and connect
            client.connect(function (err) {
                if (err) { // check for login/connection errors
                    console.error('could not connect to server', err);
                    reject(err);
                }

                // invoke remote enabled ABAP function module
                client.invoke('ZMM_PO_CREATE', {
                        IT_INPUT_HEADER: [IT_INPUT_HEADER],
                        IT_INPUT_ITEM: IT_INPUT_ITEMs
                    },
                    function (err, res) {
                        if (err) {
                            console.error('Error invoking ZMM_PO_CREATE:', err);
                            reject(err);
                        }
                        // res 返回结构
                        // { ET_OUTPUT: [ { UNSEZ: '', EBELN: '', ZTYPE: 'E', MESSAGE: '接口数据获取失败' } ],
                        //     IT_INPUT_HEADER: [],
                        //     IT_INPUT_ITEM: [] }

                        console.log('Result ZMM_PO_CREATE:', res);
                        let output = res.ET_OUTPUT[0];
                        if (output.ZTYPE === 'S') {
                            console.log('ZMM_PO_CREATE: ', 'success');
                            Fiber(function () {
                                let ins = Creator.getCollection('instances').findOne(insId, {
                                    fields: {
                                        traces: 1
                                    }
                                });
                                for (let trIdx = 0; trIdx < ins.traces.length; trIdx++) {
                                    const trace = ins.traces[trIdx];
                                    if (trace.is_finished === false) {
                                        for (let appIdx = 0; appIdx < trace.approves.length; appIdx++) {
                                            const appr = trace.approves[appIdx];
                                            if (appr.is_finished === false) {
                                                let setObj = {
                                                    'values.EBELN': output.EBELN
                                                };
                                                setObj[`traces.${trIdx}.approves.${appIdx}.values`] = Object.assign({}, values, {
                                                    'EBELN': output.EBELN
                                                });

                                                console.log('setObj: ', setObj);
                                                Creator.getCollection('instances').update(insId, {
                                                    $set: setObj
                                                })
                                                resolve({
                                                    ok: 1
                                                })
                                            }
                                        }
                                    }
                                }
                            }).run()
                        } else {
                            console.error('ZMM_PO_CREATE: ', `create failed ${output.MESSAGE}`);
                            resolve({
                                ok: 0,
                                msg: output.MESSAGE
                            })
                        }
                    });
            });

        } catch (error) {
            reject(error);
        }
    }).run()
}