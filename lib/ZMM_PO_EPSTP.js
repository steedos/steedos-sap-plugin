var rfc = require('node-rfc');

exports.run = function run(abapSystem) {

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
            function (err, res) {
                if (err) {
                    return console.error('Error invoking STFC_CONNECTION:', err);
                }
                // res 返回结构
                // { ET_OUTPUT:
                //     [ { MANDT: '300', SPRAS: '1', PSTYP: '0', PTEXT: '标准', EPSTP: '' } ],
                //    ET_RETURN: [] }

                console.log('Result STFC_CONNECTION:', res);
                console.log(res.ET_OUTPUT.length);
            });




    });
}