// 提供给审批王调用的api
let express = require('express');
let router = express.Router();
let ZMM_PO_CREATE = require('../sap_api/ZMM_PO_CREATE');
let ZMM_ZSTATE_REBACK = require('../sap_api/ZMM_ZSTATE_REBACK');
let Z_BAPI_REQUISITION_RELEASE_GW = require('../sap_api/Z_BAPI_REQUISITION_RELEASE_GW');
let ZMM_ZOBJNR_GET = require('../sap_api/ZMM_ZOBJNR_GET');


// middleware that is specific to this router
router.use('/:spaceId', function (req, res, next) {
    // TODO auth
    console.log('>>>>>>>>>>>>>>');
    next();
});

// 创建服务类采购订单
router.post('/:spaceId/draft_purchase/:insId', function (req, res) {
    console.log('创建服务类采购订单');
    let insId = req.params.insId;
    let result = ZMM_PO_CREATE.run(insId);
    if (result.ok) {
        return res.send(result);
    } else {
        return res.status(500).send(result);
    }
});

// 用款单刷新
router.get('/:spaceId/yongkuan/values/:insId', function (req, res) {
    console.log('用款单刷新');
    let insId = req.params.insId;
    let result = ZMM_ZOBJNR_GET.run(insId);
    res.send(result);
});

// 用款单审批状态回传
router.put('/:spaceId/yongkuan/state/:insId', function (req, res) {
    console.log('用款单审批状态回传');
    let insId = req.params.insId;
    let IV_TYPE = req.body.IV_TYPE;
    ZMM_ZSTATE_REBACK(insId, IV_TYPE);
    res.send({});
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
router.post('/webhook/yongkuan', function (req, res) {
    console.log('/webhook/yongkuan');
    let hashData = req.body;
    let action = hashData.action;
    let result;
    if (action === 'draft_submit') { // 确认完成后点击提交，进入流程审批，审批王传递消息给SAP，将单据置为“审批中”，单据在SAP中-只读
        result = ZMM_ZSTATE_REBACK(insId, 1);
    } else if (action === 'engine_submit') {
        let currentStepName = hashData.current_step_name;
        if (currentStepName === '经办人整理材料') { // 在审批通过后（总经理审批）后将审批状态回传到SAP
            result = ZMM_ZSTATE_REBACK(insId, 3);
        } else if (currentStepName === '经办人整理材料') { // 审批过程中如果驳回到开始节点，审批王传递消息给SAP，将单据置为“未审批”，单据在SAP中可修改。
            result = ZMM_ZSTATE_REBACK(insId, 2);
        }
    }
    if (result) {
        if (result.ok) {
            return res.send(result);
        } else {
            return res.status(500).send(result);
        }
    }

    res.send({});
});

// WEBHOOK wuliao
router.post('/webhook/wuliao', function (req, res) {
    console.log('/webhook/wuliao');





    res.send({});
});



exports.router = router;