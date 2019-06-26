// WBS元素
var rfc = require('node-rfc');

exports.run = function run(steedosSchema) {
    console.log('ZMM_PO_POSID: ', '.run');
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
        client.invoke('ZMM_PO_POSID', {},
            async function (err, res) {
                if (err) {
                    return console.error('Error invoking STFC_CONNECTION:', err);
                }
                // res 返回结构
                // { IV_POSID: 'S09XXXX07030109',
                // IV_POST1: '',
                // ET_OUTPUT:
                //  [ { MANDT: '',
                //      PSPNR: '00000734',
                //      POSID: 'S09XXXX07030109',
                //      POST1: '穿越工程',
                //      OBJNR: '',
                //      PSPHI: '00000000',
                //      POSKI: '',
                //      ERNAM: '',
                //      ERDAT: '00000000',
                //      AENAM: '',
                //      AEDAT: '00000000',
                //      VERNR: '00000000',
                //      VERNA: '',
                //      ASTNR: '00000000',
                //      ASTNA: '',
                //      PBUKR: '2600',
                //      PGSBR: '',
                //      PKOKR: '',
                //      PRCTR: '',
                //      PRART: '',
                //      STUFE: 0,
                //      PLAKZ: '',
                //      BELKZ: '',
                //      FAKKZ: '',
                //      NPFAZ: '',
                //      ZUORD: '0',
                //      TRMEQ: '',
                //      KVEWE: '',
                //      KAPPL: '',
                //      KALSM: '',
                //      ZSCHL: '',
                //      ABGSL: '',
                //      AKOKR: '',
                //      AKSTL: '',
                //      FKOKR: '',
                //      FKSTL: '',
                //      FABKL: '',
                //      PSPRI: '',
                //      EQUNR: '',
                //      TPLNR: '',
                //      PWPOS: '',
                //      WERKS: '',
                //      TXTSP: '',
                //      SLWID: '',
                //      USR00: '',
                //      USR01: '',
                //      USR02: '',
                //      USR03: '',
                //      USR04: '0.000',
                //      USE04: '',
                //      USR05: '0.000',
                //      USE05: '',
                //      USR06: '0.000',
                //      USE06: '',
                //      USR07: '0.000',
                //      USE07: '',
                //      USR08: '00000000',
                //      USR09: '00000000',
                //      USR10: '',
                //      USR11: '',
                //      KOSTL: '',
                //      KTRG: '',
                //      BERST: '',
                //      BERTR: '',
                //      BERKO: '',
                //      BERBU: '',
                //      CLASF: '',
                //      SPSNR: '00000000',
                //      SCOPE: '',
                //      XSTAT: '',
                //      TXJCD: '',
                //      ZSCHM: '',
                //      IMPRF: '',
                //      EVGEW: '0',
                //      AENNR: '',
                //      SUBPR: '',
                //      POSTU: '',
                //      PLINT: '',
                //      LOEVM: '',
                //      KZBWS: '',
                //      FPLNR: '',
                //      TADAT: '00000000',
                //      IZWEK: '',
                //      ISIZE: '',
                //      IUMKZ: '',
                //      ABUKR: '',
                //      GRPKZ: '',
                //      PGPRF: '',
                //      LOGSYSTEM: '',
                //      PSPNR_LOGS: '00000000',
                //      STORT: '',
                //      FUNC_AREA: '',
                //      KLVAR: '',
                //      KALNR: '000000000000',
                //      POSID_EDIT: '',
                //      PSPKZ: '',
                //      MATNR: '',
                //      VLPSP: '00000000',
                //      VLPKZ: '',
                //      SORT1: '',
                //      SORT2: '',
                //      SORT3: '',
                //      VNAME: '',
                //      RECID: '',
                //      ETYPE: '',
                //      OTYPE: '',
                //      JIBCL: '',
                //      JIBSA: '',
                //      CGPL_GUID16: <Buffer 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00>,
                //      CGPL_LOGSYS: '',
                //      CGPL_OBJTYPE: '',
                //      ADPSP: '',
                //      RFIPPNT: '',
                //      FERC_IND: '',
                //      PRPS_STATUS: 0 } ],
                // ET_RETURN: [] }

                console.log('ZMM_PO_POSID: ', 'length', res.ET_OUTPUT.length);
                let obj = steedosSchema.getObject('SAP_PRPS');
                if (!obj) {
                    return console.error('can not find object SAP_PRPS!')
                }
                let output = res.ET_OUTPUT;
                for (let i = 0; i < output.length; i++) {
                    const element = output[i];
                    const record = await obj.find({
                        filters: `POSID eq '${element['POSID']}'`
                    });
                    if (record && record[0]) {
                        // console.log('ZMM_PO_POSID: ', '.udpate', element['POSID']);
                        await obj.update(record[0]._id, element)
                    } else {
                        await obj.insert(Object.assign(element, {
                            space: spaceId
                        }))
                    }
                }
            });




    });
}