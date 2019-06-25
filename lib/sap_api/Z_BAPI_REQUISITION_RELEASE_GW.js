// 合同返回PR审批结果至SAP系统
var rfc = require('node-rfc');

exports.run = function run(insId, ZMMSTATUS) {
    let abapSystem = Meteor.settings.plugins.sap.abapConfig;
    let ins = Creator.getCollection('instances').findOne(insId, {
        fields: {
            values: 1
        }
    });

    let data = {
        ZMMSTATUS: ZMMSTATUS,
        NUMBER: ins.values.NUMBER,
        REL_CODE: '01',
        ITEM: ins.values.BNFPO
    }

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
        // {
        //     'NUMBER': '0010001166',
        //     'REL_CODE': '01',
        //     'ITEM': '00010',
        //     'ZMMSTATUS': '01',
        //     'ZMMCONNO': ''
        // }
        client.invoke('Z_BAPI_REQUISITION_RELEASE_GW ',
            data,
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
                if (res.MESSAGE === 'S:更新成功!') {

                } else {

                }
            });




    });
}