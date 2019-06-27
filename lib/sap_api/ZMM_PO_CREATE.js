// 服务类采购合同自动创建
var rfc = require('node-rfc');
const WAERSMap = {
    '人民币': 'CNY',
    '日元': 'JPY',
    '美金': 'USD',
    '欧元': 'EUR'
};

exports.run = function run(insId) {
    let abapSystem = Meteor.settings.plugins.sap.abapConfig;

    let ins = Creator.getCollection('instances').findOne(insId, {
        fields: {
            values: 1
        }
    });

    let values = ins.values;

    console.log(values);

    let IT_INPUT_HEADER = {
        'UNSEZ': values['UNSEZ'] || '',
        'TXZ01': values['TXZ01'] || '',
        'NUMB': values['NUMB'] ? values['NUMB']['NUMB'] : '',
        'BSART': values['BSART'] || '',
        'ERNAM': values['ERNAM'] || '',
        'LIFNR': values['LIFNR'] ? values['LIFNR']['LIFNR'] : '',
        'EKGRP': values['EKGRP'] ? values['EKGRP']['EKGRP'] : '',
        'WAERS': WAERSMap[values['WAERS']] || '',
        'ZPO_TYPE': values['ZPO_TYPE'] || ''
    }

    console.log('IT_INPUT_HEADER: ', IT_INPUT_HEADER);

    let IT_INPUT_ITEM = {
        'UNSEZ': values['UNSEZ'] || '',
        'SERIAL_NO': values['SERIAL_NO'] || '',
        'KNTTP': values['KNTTP'] || '',
        'PSTYP': values['PSTYP'] || '',
        'MATNR': values['MATNR'] || '',
        'MENGE': values['MENGE'] || '',
        'MATKL': values['MATKL'] || '',
        'KOSTL': values['KOSTL'] || '',
        'SRVPOS': values['SRVPOS'] || '',
        'PSP_PNR': values['PSP_PNR'] || ''
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
        client.invoke('ZMM_PO_CREATE ', {
                'IT_INPUT_HEADER': IT_INPUT_HEADER,
                'IT_INPUT_ITEM': IT_INPUT_ITEM
            },
            function (err, res) {
                if (err) {
                    return console.error('Error invoking STFC_CONNECTION:', err);
                }
                // res 返回结构
                // { ET_OUTPUT: [ { UNSEZ: '', EBELN: '', ZTYPE: 'E', MESSAGE: '接口数据获取失败' } ],
                //     IT_INPUT_HEADER: [],
                //     IT_INPUT_ITEM: [] }

                console.log('Result STFC_CONNECTION:', res);
                let output = res.ET_OUTPUT[0];
                if (output.ZTYPE === 'S') {
                    console.log('success');
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
}