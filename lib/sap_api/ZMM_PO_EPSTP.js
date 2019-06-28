// 项目类别
var rfc = require('node-rfc');

exports.run = function run(steedosSchema) {
    console.log('ZMM_PO_EPSTP: ', '.run');
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
        client.invoke('ZMM_PO_EPSTP', {},
            async function (err, res) {
                if (err) {
                    return console.error('Error invoking STFC_CONNECTION:', err);
                }
                // res 返回结构
                // { ET_OUTPUT:
                //     [ { MANDT: '300', SPRAS: '1', PSTYP: '0', PTEXT: '标准', EPSTP: '' } ],
                //    ET_RETURN: [] }

                console.log('ZMM_PO_EPSTP: ', 'length ', res.ET_OUTPUT.length);
                let obj = steedosSchema.getObject('SAP_T163Y');
                if (!obj) {
                    return console.error('can not find object SAP_T163Y!')
                }
                let output = res.ET_OUTPUT;
                for (let i = 0; i < output.length; i++) {
                    const element = output[i];
                    const record = await obj.find({
                        filters: `EPSTP eq '${element['EPSTP']}'`
                    });
                    if (record && record[0]) {
                        // console.log('ZMM_PO_EPSTP: ', '.update ', element['EPSTP']);
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