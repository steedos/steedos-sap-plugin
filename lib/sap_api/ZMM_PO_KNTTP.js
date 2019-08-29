// 科目分配类别
var rfc = require('node-rfc');

exports.run = function run(steedosSchema) {
    console.log('ZMM_PO_KNTTP: ', '.run');
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
        client.invoke('ZMM_PO_KNTTP', {},
            async function (err, res) {
                if (err) {
                    return console.error('Error invoking STFC_CONNECTION:', err);
                }
                // res 返回结构
                // { ET_OUTPUT:
                //     [ { MANDT: '300', SPRAS: '1', KNTTP: 'A', KNTTX: '资产' } ],
                //    ET_RETURN: [] }

                console.log('ZMM_PO_KNTTP: ', 'length ', res.ET_OUTPUT.length);
                let obj = steedosSchema.getObject('SAP_T163I');
                if (!obj) {
                    return console.error('can not find object SAP_T163I!')
                }
                let output = res.ET_OUTPUT;
                for (let i = 0; i < output.length; i++) {
                    const element = output[i];
                    const record = await obj.find({
                        filters: `KNTTP eq '${element['KNTTP']}'`
                    });
                    if (record && record[0]) {
                        // console.log('ZMM_PO_KNTTP: ', '.update ', element['KNTTP']);
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