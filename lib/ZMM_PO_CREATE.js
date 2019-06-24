var rfc = require('node-rfc');

exports.run = function run(abapSystem) {

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
        client.invoke('ZMM_PO_CREATE ',
            {
                'IT_INPUT_HEADER': {
                    'UNSEZ': 'test',
                    'TXZ01': 'test',
                    'NUMB': 'test',
                    'BSART': 'test',
                    'ERNAM': 'test',
                    'LIFNR': 'test',
                    'EKGRP': 'test',
                    'WAERS': 'test',
                    'ZPO_TYPE': 'test'
                },
                'IT_INPUT_ITEM': {
                    'UNSEZ': 'test',
                    'SERIAL_NO': 'test',
                    'KNTTP': 'test',
                    'PSTYP': 'test',
                    'MATNR': 'test',
                    'MENGE': 'test',
                    'MATKL': 'test',
                    'KOSTL': 'test',
                    'SRVPOS': 'test',
                    'PSP_PNR': 'test'
                }
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
            });




    });
}