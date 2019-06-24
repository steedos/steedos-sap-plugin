var rfc = require('node-rfc');

exports.run = function run(abapSystem, spaceId, flowId) {

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
        client.invoke('Z_BAPI_REQUISITION_GETITEMSGW ', {},
            function (err, res) {
                if (err) {
                    return console.error('Error invoking STFC_CONNECTION:', err);
                }
                // res 返回结构
                // { MESSAGE: '',
                // REL_CODE: '',
                // REL_GROUP: '',
                // PRHEADERTEXT:
                //  [ { PREQ_NO: '0010002638',
                //      PREQ_ITEM: '00000',
                //      TEXT_ID: 'B01',
                //      TEXT_FORM: '*',
                //      TEXT_LINE: 'tets' } ],
                // PRITEMTEXT: [],
                // REQUISITION_ITEMS:
                //  [ { BANFN: '0010001166',
                //      BNFPO: '00010',
                //      KNTTP: 'A',
                //      STATU: 'N',
                //      TXZ01: '差压变送器',
                //      MENGE: '12.000',
                //      MEINS: 'EA',
                //      BADAT: '20120509',
                //      PREIS: '0.00',
                //      ERNAM: '洪恒',
                //      ANLN1: '001070000013',
                //      TXT50: '差压变送器',
                //      WBS: '',
                //      POST1: '',
                //      DEPARTMENT: '',
                //      MATNR: '',
                //      AFNAM: '120405001',
                //      ACCOUNT: 'HONGHENG',
                //      DANWEI: '每一个',
                //      AFDES: '配合S6工程天然气管线搬迁',
                //      EINDT: '20120517' }],
                // RETURN:
                //  [ { TYPE: 'W',
                //      CODE: 'BM035',
                //      MESSAGE: '测量单位 ZI 没有 ISO 代码',
                //      LOG_NO: '',
                //      LOG_MSG_NO: '000000',
                //      MESSAGE_V1: 'ZI',
                //      MESSAGE_V2: '',
                //      MESSAGE_V3: '',
                //      MESSAGE_V4: '' } ] }

                console.log('Result STFC_CONNECTION:', res);
                console.log('res.PRHEADERTEXT.length: ', res.PRHEADERTEXT.length);
                console.log('res.PRITEMTEXT.length: ', res.PRITEMTEXT.length);
                console.log('res.REQUISITION_ITEMS.length: ', res.REQUISITION_ITEMS.length);
                console.log('res.RETURN.length: ', res.RETURN.length);


                let requisition_items = res.REQUISITION_ITEMS;
                // 新建申请单
                for (let i = 0; i < requisition_items.length; i++) {
                    const element = requisition_items[i];
                    let userName = element.USNAM;
                    let user_info = Creator.getCollection('space_users').find({ space: spaceId, username: userName }, { fields: { name: 1 } })
                    if (user_info) {
                        let flow = Creator.getCollection('flows').findOne(flowId, { fields: { 'current._id': 1 } });
                        if (!flow) {
                            console.error('Z_BAPI_REQUISITION_GETITEMSGW: ', `can not find flow ${flowId}`);
                            continue;
                        }
                        let instance_from_client = {
                            space: spaceId,
                            flow: flowId,
                            flow_version: flow.current._id,
                            traces: [{
                                approves: [{
                                    values: element
                                }]
                            }]
                        }

                        uuflowManager.create_instance(instance_from_client, user_info);
                    } else {
                        console.error('Z_BAPI_REQUISITION_GETITEMSGW: ', `can not find user ${userName}`);
                        continue;
                    }



                }
            });




    });
}