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
        client.invoke('Z_BAPI_REQUISITION_RELEASE_GW ',
            {
                'NUMBER': '0010001166',
                'REL_CODE': '01',
                'ITEM': '00010',
                'ZMMSTATUS': '01'
                // 'ZMMCONNO':
            },
            function (err, res) {
                if (err) {
                    return console.error('Error invoking STFC_CONNECTION:', err);
                }
                // res 返回结构
                // { MESSAGE: 'S:更新成功!',
                //     ITEM: '00010',
                //     NUMBER: '0010001166',
                //     REL_CODE: '01',
                //     ZMMCONNO: '',
                //     ZMMSTATUS: '01' }

                console.log('Result STFC_CONNECTION:', res);
            });




    });
}