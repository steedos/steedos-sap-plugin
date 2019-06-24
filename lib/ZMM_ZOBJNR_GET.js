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
        client.invoke('ZMM_ZOBJNR_GET', {},
            function (err, res) {
                if (err) {
                    return console.error('Error invoking STFC_CONNECTION:', err);
                }
                // res 返回结构
                // { IV_ZOBJNR: '',
                // ET_OUTPUT:
                //  [ { ZOBJNR: '0000000008',
                //      CONTR_NO: '',
                //      COMPA: '上海飞奥燃气设备有限公司',
                //      CONTR_EXP: '0.00',
                //      ACCUM_PAY: '0.00',
                //      DMBTR: '3000.00',
                //      ZSTATE: '',
                //      ZPLANCODE: '12-02-02-002',
                //      DESCRIPTION: '2012年度天然气主干网沉降监测',
                //      EBELN: '' } ],
                // ET_RETURN: [] }

                console.log('Result STFC_CONNECTION:', res);
                console.log(res.ET_OUTPUT.length);

                let output = res.ET_OUTPUT;
                // 新建申请单
                for (let i = 0; i < output.length; i++) {
                    const element = output[i];

                }



            });




    });
}