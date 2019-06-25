// 提供给审批王调用的api
let express = require('express');
let router = express.Router();
let ZMM_PO_CREATE = require('../sap_api/ZMM_PO_CREATE');
let ZMM_ZSTATE_REBACK = require('../sap_api/ZMM_ZSTATE_REBACK');
let Z_BAPI_REQUISITION_RELEASE_GW = require('../sap_api/Z_BAPI_REQUISITION_RELEASE_GW');
let ZMM_ZOBJNR_GET = require('../sap_api/ZMM_ZOBJNR_GET');


// middleware that is specific to this router
router.use('/', function (req, res, next) {
    // TODO auth
    next();
});

// 创建服务类采购订单
router.post('/:spaceId/draft_purchase/:insId', function (req, res) {
    let insId = req.params.insId;
    ZMM_PO_CREATE.run(insId);
    res.send({});
});

// 用款单刷新
router.get('/:spaceId/yongkuan/values/:insId', function (req, res) {
    let insId = req.params.insId;
    ZMM_ZOBJNR_GET.run(insId);
    res.send({});
});

// 用款单审批状态回传
router.put('/:spaceId/yongkuan/state/:insId', function (req, res) {
    let insId = req.params.insId;

    ZMM_ZSTATE_REBACK(insId, req.body);
    res.send({});
});

// 物料申购单刷新
router.get('/:spaceId/wuliao/values/:insId', function (req, res) {
    let insId = req.params.insId;
    res.send({});
});

// 物料申购单审批状态回传
router.put('/:spaceId/wuliao/state/:insId', function (req, res) {
    let insId = req.params.insId;
    let body = req.body;
    Z_BAPI_REQUISITION_RELEASE_GW.run(insId, body);
    res.send({});
});



exports.router = router;