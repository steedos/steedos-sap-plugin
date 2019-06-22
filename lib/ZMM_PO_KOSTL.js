var rfc = require('node-rfc');

export function run(abapSystem) {

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
            function (err, res) {
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

                console.log('Result STFC_CONNECTION:', res);
                console.log(res.ET_OUTPUT.length);
            });




    });
}