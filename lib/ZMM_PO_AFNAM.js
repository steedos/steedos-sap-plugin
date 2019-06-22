// 项目代码
var rfc = require('node-rfc');

export function run(abapSystem, steedosSchema) {
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
        client.invoke('ZMM_PO_AFNAM', {},
            async function (err, res) {
                if (err) {
                    return console.error('Error invoking STFC_CONNECTION:', err);
                }
                // res 返回结构
                // { IV_GJAHR: '0000',
                // IV_NAME: '',
                // IV_NUMB: '',
                // IV_VERS: '',
                // ET_OUTPUT:
                //  [ { GJAHR: '0205',
                //      VERS: '1',
                //      NUMB: '2614001',
                //      KOSB: 'node-rfc internal error: wrapString',
                //      NAME: '200',
                //      ZNUMB_S: '' } ],
                // ET_RETURN: [] }

                console.log('Result STFC_CONNECTION:', res);
                console.log(res.ET_OUTPUT.length);
                let obj = steedosSchema.getObject('SAP_ZPPLN');
                if (!obj) {
                    return console.error('can not find object SAP_ZPPLN!')
                }
                let output = res.ET_OUTPUT;
                for (let i = 0; i < output.length; i++) {
                    const element = output[i];
                    const record = await obj.find({ filters: `NUMB eq '${element['NUMB']}'` });
                    if (record && record[0]) {
                        await obj.update(record[0]._id, element)
                    } else {
                        // TODO space字段从哪里来?
                        await obj.insert(Object.assign(element, { _id: 'xxx' }))
                    }
                }
            });




    });
}