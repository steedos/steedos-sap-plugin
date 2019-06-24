// 提供给审批王调用的api
let express = require('express');
let router = express.Router();
let ZMM_PO_CREATE = require('../sap_api/ZMM_PO_CREATE');
let abapSystem = Meteor.settings.plugins.sap.abapConfig;
let spaceId = Meteor.settings.plugins.sap.spaceId;

// middleware that is specific to this router
router.use('/', function (req, res, next) {
    // TODO auth
    next();
});

// 创建服务类采购订单
router.post('/:spaceId/draft_purchase/:insId', function (req, res) {
    let spaceId = req.params.spaceId;
    let insId = req.params.insId;
    let ins = Creator.getCollection('instances').findOne(insId, {fields: {values: 1}});
    ZMM_PO_CREATE.run(abapSystem, ins.values);
});

// 用款单刷新
router.get('/:spaceId/yongkuan/values', function (req, res) {

});

// 用款单审批状态回传
router.put('/:spaceId/yongkuan/state', function (req, res) {

});

// 物料申购单刷新
router.get('/:spaceId/wuliao/values', function (req, res) {

});

// 物料申购单审批状态回传
router.put('/:spaceId/wuliao/state', function (req, res) {

});



exports.router = router;