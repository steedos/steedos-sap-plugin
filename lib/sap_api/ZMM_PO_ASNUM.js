// WBS元素
var rfc = require('node-rfc');

exports.run = function run(steedosSchema) {
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
        client.invoke('ZMM_PO_ASNUM', {},
            async function (err, res) {
                if (err) {
                    return console.error('Error invoking STFC_CONNECTION:', err);
                }
                // res 返回结构
                // TODO

                console.log('Result STFC_CONNECTION:', res);
                console.log(res.ET_OUTPUT.length);
                let obj = steedosSchema.getObject('SAP_ASMDT');
                if (!obj) {
                    return console.error('can not find object SAP_ASMDT!')
                }
                let output = res.ET_OUTPUT;
                for (let i = 0; i < output.length; i++) {
                    const element = output[i];
                    const record = await obj.find({
                        filters: `ASNUM eq '${element['ASNUM']}'`
                    });
                    if (record && record[0]) {
                        await obj.update(record[0]._id, element)
                    } else {
                        // TODO space字段从哪里来?
                        await obj.insert(Object.assign(element, {
                            _id: 'xxx',
                            space: spaceId
                        }))
                    }
                }
            });




    });
}