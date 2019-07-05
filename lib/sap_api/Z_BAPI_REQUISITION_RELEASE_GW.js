// 合同返回PR审批结果至SAP系统
var rfc = require('node-rfc');
const Fiber = require('fibers');

exports.run = function run(insId, ZMMSTATUS, resolve, reject) {
    try {
        Fiber(function () {
            let abapSystem = Meteor.settings.plugins.sap.abapConfig;
            let ins = Creator.getCollection('instances').findOne(insId, {
                fields: {
                    values: 1
                }
            });
            let shengoudanhao = ins.values.shengoudanhao;
            let projectInfo = ins.values.projectInfo || [];

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

                projectInfo.forEach(element => {
                    let data = {
                        ZMMSTATUS: ZMMSTATUS,
                        NUMBER: shengoudanhao,
                        REL_CODE: '01',
                        ITEM: element.BNFPO
                    }
                    // invoke remote enabled ABAP function module
                    // {
                    //     'NUMBER': '0010001166',
                    //     'REL_CODE': '01',
                    //     'ITEM': '00010',
                    //     'ZMMSTATUS': '01',
                    //     'ZMMCONNO': ''
                    // }
                    client.invoke('Z_BAPI_REQUISITION_RELEASE_GW ',
                        data,
                        function (err, res) {
                            if (err) {
                                console.error('Error invoking STFC_CONNECTION:', err);
                                reject(err);
                            }
                            // res 返回结构
                            // { MESSAGE: 'S:更新成功!',
                            //     ITEM: '00010',
                            //     NUMBER: '0010001166',
                            //     REL_CODE: '01',
                            //     ZMMCONNO: '',
                            //     ZMMSTATUS: '01' }

                            console.log('Result STFC_CONNECTION:', res);
                            if (res.MESSAGE === 'S:更新成功!') {
                                resolve({
                                    ok: 1
                                });
                            } else {
                                resolve({
                                    ok: 0,
                                    msg: MESSAGE
                                });
                            }
                        });
                });
            });
        }).run()
    } catch (error) {
        reject(error);
    }

}