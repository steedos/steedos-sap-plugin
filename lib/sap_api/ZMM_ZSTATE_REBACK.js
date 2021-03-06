// 用款单审批状态回传
var rfc = require('node-rfc');
const Fiber = require('fibers');

exports.run = function run(insId, IV_TYPE, resolve, reject) {
    try {
        Fiber(function () {
            let abapSystem = Meteor.settings.sap.abapConfig;
            let ins = Creator.getCollection('instances').findOne(insId, {
                fields: {
                    values: 1
                }
            });
            let IV_ZOBJNR = ins.values.ZOBJNR;

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
                client.invoke('ZMM_ZSTATE_REBACK', {
                        'IV_ZOBJNR': IV_ZOBJNR,
                        'IV_TYPE': IV_TYPE
                    },
                    function (err, res) {
                        if (err) {
                            console.error('Error invoking STFC_CONNECTION:', err);
                            reject(err);
                        }
                        // res 返回结构
                        // { IV_TYPE: '1',
                        // IV_ZOBJNR: '0000000008',
                        // ET_RETURN:
                        //  [ { TYPE: 'S',
                        //      ID: '',
                        //      NUMBER: '000',
                        //      MESSAGE: '审批状态更新成功',
                        //      LOG_NO: '',
                        //      LOG_MSG_NO: '000000',
                        //      MESSAGE_V1: '',
                        //      MESSAGE_V2: '',
                        //      MESSAGE_V3: '',
                        //      MESSAGE_V4: '',
                        //      PARAMETER: '',
                        //      ROW: 0,
                        //      FIELD: '',
                        //      SYSTEM: '' } ] }

                        console.log('ZMM_ZSTATE_REBACK: ', 'res ', res);
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