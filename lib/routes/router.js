// 提供给审批王调用的api
let _ = require('underscore');
let express = require('express');
let router = express.Router();
let ZMM_PO_CREATE = require('../sap_api/ZMM_PO_CREATE');
let ZMM_ZSTATE_REBACK = require('../sap_api/ZMM_ZSTATE_REBACK');
let Z_BAPI_REQUISITION_RELEASE_GW = require('../sap_api/Z_BAPI_REQUISITION_RELEASE_GW');
let ZMM_ZOBJNR_GET = require('../sap_api/ZMM_ZOBJNR_GET');
let Z_BAPI_REQUISITION_GETITEMSGW = require('../sap_api/Z_BAPI_REQUISITION_GETITEMSGW');


// middleware that is specific to this router
router.use('/:spaceId', function (req, res, next) {
    // TODO auth
    console.log('>>>>>>>>>>>>>>');
    next();
});

// 创建服务类采购订单
router.post('/:spaceId/draft_purchase/:insId', async function (req, res) {
    console.log('创建服务类采购订单');
    let insId = req.params.insId;
    let result = await new Promise(function (resolve, reject) {
        ZMM_PO_CREATE.run(insId, resolve, reject);
    });
    if (result.ok) {
        return res.send(result);
    } else {
        return res.status(500).send(result);
    }
});

// 用款单刷新
router.get('/:spaceId/yongkuan/values/:insId', async function (req, res) {
    console.log('用款单刷新');
    let insId = req.params.insId;
    let result = await new Promise(function (resolve, reject) {
        ZMM_ZOBJNR_GET.run(insId, resolve, reject);
    });
    if (result.ok) {
        return res.send(result);
    } else {
        return res.status(500).send(result);
    }
});


// 物料申购单刷新
router.get('/:spaceId/wuliao/values/:insId', function (req, res) {
    console.log('物料申购单刷新');
    let insId = req.params.insId;
    res.send({});
});

// 物料申购单审批状态回传
router.put('/:spaceId/wuliao/state/:insId', function (req, res) {
    console.log('物料申购单审批状态回传');
    let insId = req.params.insId;
    let ZMMSTATUS = req.body.ZMMSTATUS;
    Z_BAPI_REQUISITION_RELEASE_GW.run(insId, ZMMSTATUS);
    res.send({});
});


// WEBHOOK yongkuan
router.post('/webhook/yongkuan', async function (req, res) {
    try {
        console.log('/webhook/yongkuan');
        let hashData = req.body;
        let action = hashData.action;
        let insId = hashData.instance._id;
        let result;
        if (action === 'draft_submit') { // 确认完成后点击提交，进入流程审批，审批王传递消息给SAP，将单据置为“审批中”，单据在SAP中-只读
            result = await new Promise(function (resolve, reject) {
                ZMM_ZSTATE_REBACK.run(insId, '1', resolve, reject);
            });
        } else if (action === 'engine_submit') {
            let currentStepName = hashData.instance.current_step_name;
            let lastTraceId = hashData.current_approve.trace;
            let lastTrace = _.find(hashData.instance.traces, function (t) {
                return t._id === lastTraceId;
            })
            let lastStepName = lastTrace.name;
            console.log('currentStepName: ', currentStepName);
            if (currentStepName === '经办人整理材料') { // 在审批通过后（总经理审批）后将审批状态回传到SAP
                result = await new Promise(function (resolve, reject) {
                    ZMM_ZSTATE_REBACK.run(insId, '3', resolve, reject);
                });
            } else if (currentStepName === '发起审批') { // 审批过程中如果驳回到开始节点，审批王传递消息给SAP，将单据置为“未审批”，单据在SAP中可修改。
                result = await new Promise(function (resolve, reject) {
                    ZMM_ZSTATE_REBACK.run(insId, '2', resolve, reject);
                });
            } else if (lastStepName === '发起审批') { // 审批过程中如果驳回到开始节点，开始节点提交后回传'审批中'状态给SAP。
                result = await new Promise(function (resolve, reject) {
                    ZMM_ZSTATE_REBACK.run(insId, '1', resolve, reject);
                });
            }
        }
        if (result) {
            if (result.ok) {
                return res.send(result);
            } else {
                return res.status(500).send(result);
            }
        }
        console.log('/webhook/yongkuan ', 'res.send()');
        return res.send();
    } catch (error) {
        console.log(error);
        res.status(500).send(error.message);
    }
});

// WEBHOOK wuliao
router.post('/webhook/wuliao', function (req, res) {
    console.log('/webhook/wuliao');





    res.send({});
});



// 暂时调试用代码将来移除
// BEGIN
router.post('/ZMM_ZOBJNR_GET', function (req, res) {
    console.log('ZMM_ZOBJNR_GET');
    // 获取用款单
    ZMM_ZOBJNR_GET.run();

    res.send({});
});
router.post('/Z_BAPI_REQUISITION_GETITEMSGW', function (req, res) {
    console.log('Z_BAPI_REQUISITION_GETITEMSGW');
    // 获取用款单
    Z_BAPI_REQUISITION_GETITEMSGW.run();

    res.send({});
});
// END



exports.router = router;