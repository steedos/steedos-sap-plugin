// 成本中心
var rfc = require('node-rfc');

exports.run = function run(steedosSchema) {
    console.log('ZMM_PO_KOSTL: ', '.run');
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
        client.invoke('ZMM_PO_KOSTL', {},
            async function (err, res) {
                if (err) {
                    return console.error('Error invoking STFC_CONNECTION:', err);
                }
                // res 返回结构
                // { IV_KOSTL: '',
                // ET_OUTPUT:
                //  [ { MANDT: '300',
                //      SPRAS: '1',
                //      KOKRS: '0001',
                //      KOSTL: '0002600010',
                //      DATBI: '99991231',
                //      KTEXT: '人力资源部',
                //      LTEXT: '人力资源部',
                //      MCTXT: '人力资源部' } ],
                // ET_RETURN: [] }

                console.log('ZMM_PO_KOSTL: ', 'length ', res.ET_OUTPUT.length);
                let obj = steedosSchema.getObject('SAP_CSKT');
                if (!obj) {
                    return console.error('can not find object SAP_CSKT!')
                }
                let output = res.ET_OUTPUT;
                for (let i = 0; i < output.length; i++) {
                    const element = output[i];
                    const record = await obj.find({
                        filters: `KOSTL eq '${element['KOSTL']}'`
                    });
                    if (record && record[0]) {
                        // console.log('ZMM_PO_KOSTL: ', '.update ', element['KOSTL']);
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