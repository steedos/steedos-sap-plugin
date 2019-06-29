// 用款单审批状态回传
var rfc = require('node-rfc');

exports.run = function run(insId, IV_TYPE) {
    let abapSystem = Meteor.settings.plugins.sap.abapConfig;
    let ins = Creator.getCollection('instances').findOne(insId, {
        fields: {
            values: 1
        }
    });
    let IV_ZOBJNR = ins.values.IV_ZOBJNR;

    // create new client
    var client = new rfc.Client(abapSystem);

    // echo the client NW RFC lib version
    console.log('RFC client lib version: ', client.getVersion());

    // // and connect
    // client.connect(function (err) {
    //     if (err) { // check for login/connection errors
    //         return console.error('could not connect to server', err);
    //     }

    //     // invoke remote enabled ABAP function module
    //     client.invoke('ZMM_ZSTATE_REBACK', {
    //             'IV_ZOBJNR': IV_ZOBJNR,
    //             'IV_TYPE': IV_TYPE
    //         },
    //         function (err, res) {
    //             if (err) {
    //                 return console.error('Error invoking STFC_CONNECTION:', err);
    //             }
    //             // res 返回结构
    //             // { IV_TYPE: '1',
    //             // IV_ZOBJNR: '0000000008',
    //             // ET_RETURN:
    //             //  [ { TYPE: 'S',
    //             //      ID: '',
    //             //      NUMBER: '000',
    //             //      MESSAGE: '审批状态更新成功',
    //             //      LOG_NO: '',
    //             //      LOG_MSG_NO: '000000',
    //             //      MESSAGE_V1: '',
    //             //      MESSAGE_V2: '',
    //             //      MESSAGE_V3: '',
    //             //      MESSAGE_V4: '',
    //             //      PARAMETER: '',
    //             //      ROW: 0,
    //             //      FIELD: '',
    //             //      SYSTEM: '' } ] }

    //             console.log('Result STFC_CONNECTION:', res);
    //         });
    // });

    let result = {};
    (async function () {
        try {
            await client.open();

            let res = await client.call('ZMM_ZSTATE_REBACK', {
                'IV_ZOBJNR': IV_ZOBJNR,
                'IV_TYPE': IV_TYPE
            });
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
            console.log('ZMM_ZSTATE_REBACK: ', res);
            let ET_RETURN = res.ET_RETURN[0];
            if (ET_RETURN.TYPE === 'S') {
                result = {
                    ok: 1
                }
            } else {
                result = {
                    ok: 0,
                    msg: ET_RETURN.MESSAGE
                }
            }

        } catch (ex) {
            console.error(ex);
        }
    })();

    return result;
}