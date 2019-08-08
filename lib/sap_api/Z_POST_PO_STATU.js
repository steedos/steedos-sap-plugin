// 物资采购单审批状态回传
var rfc = require('node-rfc');
const Fiber = require('fibers');

exports.run = function run(insId, IV_STATUS, fromUserName, resolve, reject) {
    try {
        Fiber(function () {
            let abapSystem = Meteor.settings.plugins.sap.abapConfig;
            let ins = Creator.getCollection('instances').findOne(insId, {
                fields: {
                    values: 1
                }
            });
            let IV_EBELN = ins.values.EBELN;

            // create new client
            var client = new rfc.Client(abapSystem);

            // echo the client NW RFC lib version
            console.log('RFC client lib version: ', client.getVersion());

            // and connect
            client.connect(function (err) {
                if (err) { // check for login/connection errors
                    console.error('could not connect to server', err);
                    reject(err);
                }

                // invoke remote enabled ABAP function module
                client.invoke('Z_POST_PO_STATU', {
                    'IV_EBELN': IV_EBELN,
                    'IV_STATUS': IV_STATUS,
                    'IV_ERNAM': fromUserName
                },
                    function (err, res) {
                        if (err) {
                            console.error('Error invoking STFC_CONNECTION:', err);
                            reject(err);
                        }
                        // res 返回结构

                        console.log('Z_POST_PO_STATU: ', 'res ', res);
                        let ET_RETURN = res.ET_RETURN[0];
                        if (ET_RETURN.TYPE === 'S') {
                            resolve({
                                ok: 1
                            });
                        } else {
                            resolve({
                                ok: 0,
                                msg: ET_RETURN.MESSAGE
                            });
                        }
                    });
            });
        }).run();

    } catch (error) {
        reject(error);
    }

}