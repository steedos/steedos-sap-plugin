// 物料组
var rfc = require('node-rfc');

exports.run = function run(steedosSchema) {
    console.log('ZMM_PO_MATKL: ', '.run');
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
        client.invoke('ZMM_PO_MATKL', {},
            async function (err, res) {
                if (err) {
                    return console.error('Error invoking STFC_CONNECTION:', err);
                }
                // res 返回结构
                // { IV_MATKL: '',
                // IV_WGBEZ: '',
                // ET_OUTPUT:
                //  [ { MANDT: '300',
                //      SPRAS: 'E',
                //      MATKL: '01',
                //      WGBEZ: 'Material group 1',
                //      WGBEZ60: '' } ],
                // ET_RETURN: [] }

                console.log('ZMM_PO_MATKL: ', 'length ', res.ET_OUTPUT.length);
                let obj = steedosSchema.getObject('SAP_T023T');
                if (!obj) {
                    return console.error('can not find object SAP_T023T!')
                }
                let output = res.ET_OUTPUT;
                for (let i = 0; i < output.length; i++) {
                    const element = output[i];
                    const record = await obj.find({
                        filters: `MATKL eq '${element['MATKL']}'`
                    });
                    if (record && record[0]) {
                        // console.log('ZMM_PO_MATKL: ', '.update ', element['MATKL']);
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