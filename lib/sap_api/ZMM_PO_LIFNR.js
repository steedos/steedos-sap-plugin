// 供应商
var rfc = require('node-rfc');

exports.run = function run(steedosSchema) {
    console.log('ZMM_PO_LIFNR: ', '.run');
    let abapSystem = Meteor.settings.plugins.sap.abapConfig;
    let spaceId = Meteor.settings.plugins.sap.spaceId;
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
        client.invoke('ZMM_PO_LIFNR', {},
            async function (err, res) {
                if (err) {
                    return console.error('Error invoking STFC_CONNECTION:', err);
                }
                // res 返回结构
                // { IV_LIFNR: '',
                // IV_NAME1: '',
                // ET_OUTPUT:
                //  [ { LIFNR: '0000002000', NAME1: '申能股份有限公司' }],
                // ET_RETURN: [] }

                console.log('ZMM_PO_LIFNR: ', 'length ', res.ET_OUTPUT.length);
                let obj = steedosSchema.getObject('SAP_LFA1');
                if (!obj) {
                    return console.error('can not find object SAP_LFA1!')
                }
                let output = res.ET_OUTPUT;
                for (let i = 0; i < output.length; i++) {
                    const element = output[i];
                    const record = await obj.find({
                        filters: `LIFNR eq '${element['LIFNR']}'`
                    });
                    if (record && record[0]) {
                        // console.log('ZMM_PO_LIFNR: ', '.update ', element['LIFNR']);
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