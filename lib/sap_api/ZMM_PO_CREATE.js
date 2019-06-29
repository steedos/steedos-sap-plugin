// 服务类采购合同自动创建
var rfc = require('node-rfc');
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

exports.run = function run(insId) {
    let abapSystem = Meteor.settings.plugins.sap.abapConfig;

    let ins = Creator.getCollection('instances').findOne(insId, {
        fields: {
            values: 1,
            applicant_name: 1
        }
    });

    let values = ins.values;

    console.log(values);

    let IT_INPUT_HEADER = {
        'UNSEZ': values['UNSEZ'] || '',
        'TXZ01': values['TXZ01'] || '',
        'NUMB': values['NUMB'] ? values['NUMB']['NUMB'] : '',
        'BSART': 'ZB',
        'ERNAM': ins.applicant_name,
        'LIFNR': values['LIFNR'] ? values['LIFNR']['LIFNR'] : '',
        'EKGRP': values['EKGRP'] ? values['EKGRP']['EKGRP'] : '',
        'WAERS': WAERSMap[values['WAERS']] || '',
        'ZPO_TYPE': ZPO_TYPEMap[values['ZPO_TYPE']] || ''
    }

    console.log('IT_INPUT_HEADER: ', IT_INPUT_HEADER);

    let IT_INPUT_ITEM = {
        'UNSEZ': values['UNSEZ'] || '',
        'SERIAL_NO': '',
        'KNTTP': values['KNTTP'] ? values['KNTTP']['KNTTP'] : '',
        'PSTYP': 'D',
        'MATNR': '',
        'MENGE': values['MENGE'] || '',
        'MATKL': values['MATKL'] ? values['MATKL']['MATKL'] : '',
        'KOSTL': values['KOSTL'] ? values['KOSTL']['KOSTL'] : '',
        'SRVPOS': values['SRVPOS'] ? values['SRVPOS']['ASNUM'] : '',
        'PSP_PNR': values['PSP_PNR'] ? values['PSP_PNR']['POSID'] : ''
    }

    console.log('IT_INPUT_ITEM: ', IT_INPUT_ITEM);

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
        client.invoke('ZMM_PO_CREATE', {
                IT_INPUT_HEADER: [IT_INPUT_HEADER],
                IT_INPUT_ITEM: [IT_INPUT_ITEM]
            },
            function (err, res) {
                if (err) {
                    return console.error('Error invoking ZMM_PO_CREATE:', err);
                }
                // res 返回结构
                // { ET_OUTPUT: [ { UNSEZ: '', EBELN: '', ZTYPE: 'E', MESSAGE: '接口数据获取失败' } ],
                //     IT_INPUT_HEADER: [],
                //     IT_INPUT_ITEM: [] }

                console.log('Result ZMM_PO_CREATE:', res);
                let output = res.ET_OUTPUT[0];
                if (output.ZTYPE === 'S') {
                    console.log('ZMM_PO_CREATE: ', 'success');
                    Creator.getCollection('instances').update(insId, {
                        $set: {
                            'values.EBELN': output.EBELN
                        }
                    })
                } else {
                    console.error('ZMM_PO_CREATE: ', `create failed ${output.MESSAGE}`)
                }
            });




    });


    // 待ZMM_PO_CREATE接口调通使用同步方式返回结果
    let res;

    // (async function () {
    //     try {
    //         await client.open();

    //         res = await client.call('ZMM_PO_CREATE', {
    //             IT_INPUT_HEADER: [IT_INPUT_HEADER],
    //             IT_INPUT_ITEM: [IT_INPUT_ITEM]
    //         });

    //         console.log('Result ZMM_PO_CREATE:', res);
    //         let output = res.ET_OUTPUT[0];
    //         if (output.ZTYPE === 'S') {
    //             console.log('ZMM_PO_CREATE: ', 'success');
    //             Creator.getCollection('instances').update(insId, {
    //                 $set: {
    //                     'values.EBELN': output.EBELN
    //                 }
    //             })
    //         } else {
    //             console.error('ZMM_PO_CREATE: ', `create failed ${output.MESSAGE}`)
    //         }

    //         console.log(result);
    //     } catch (ex) {
    //         console.error('Error invoking ZMM_PO_CREATE:', ex);
    //     }
    // })();

    return res;
}