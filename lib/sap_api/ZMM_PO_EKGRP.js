// 采购组
var rfc = require('node-rfc');

exports.run = function run(steedosSchema) {
    let abapSystem = Meteor.settings.sap.abapConfig;
    let spaceId = Meteor.settings.sap.spaceId;
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
        client.invoke('ZMM_PO_EKGRP', {},
            async function (err, res) {
                if (err) {
                    return console.error('Error invoking STFC_CONNECTION:', err);
                }
                // res 返回结构
                // { IV_EKGRP: '',
                // ET_OUTPUT:
                //  [ { MANDT: '300',
                //      EKGRP: '601',
                //      EKNAM: '张玉燕',
                //      EKTEL: '',
                //      LDEST: 'LP01',
                //      TELFX: '',
                //      TEL_NUMBER: '',
                //      TEL_EXTENS: '',
                //      SMTP_ADDR: '' } ],
                // ET_RETURN: [] }

                console.log('ZMM_PO_EKGRP: ', 'length ', res.ET_OUTPUT.length);
                let obj = steedosSchema.getObject('SAP_T024');
                if (!obj) {
                    return console.error('can not find object SAP_T024!')
                }
                let output = res.ET_OUTPUT;
                for (let i = 0; i < output.length; i++) {
                    const element = output[i];
                    const record = await obj.find({
                        filters: `EKGRP eq '${element['EKGRP']}'`
                    });
                    if (record && record[0]) {
                        // console.log('ZMM_PO_EKGRP: ', '.update ', element['EKGRP']);
                        await obj.update(record[0]._id, element)
                    } else {
                        await obj.insert(Object.assign(element, {
                            space: spaceId
                        }))
                    }
                }
            });




    });
}