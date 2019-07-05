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
    // auth
    next();
});

// 创建服务类采购订单
router.post('/:spaceId/draft_purchase/:insId', async function (req, res) {
    try {
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
    } catch (error) {
        return res.status(500).send({
            ok: 0,
            msg: error.message,
            error: error.stack
        });
    }

});

// 用款单刷新
router.get('/:spaceId/yongkuan/values/:insId', async function (req, res) {
    try {
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
    } catch (error) {
        return res.status(500).send({
            ok: 0,
            msg: error.message,
            error: error.stack
        });
    }
});


// 物料申购单刷新
router.get('/:spaceId/wuliao/values/:insId', async function (req, res) {
    try {
        console.log('物料申购单刷新');
        let insId = req.params.insId;
        let result = await new Promise(function (resolve, reject) {
            Z_BAPI_REQUISITION_GETITEMSGW.run(insId, resolve, reject);
        });
        if (result.ok) {
            return res.send(result);
        } else {
            return res.status(500).send(result);
        }
    } catch (error) {
        return res.status(500).send({
            ok: 0,
            msg: error.message,
            error: error.stack
        });
    }
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
            if (lastStepName === '总经理审批' && currentStepName === '经办人整理材料') { // 在审批通过后（总经理审批）后将审批状态回传到SAP
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
        return res.status(500).send({
            ok: 0,
            msg: error.message,
            error: error.stack
        });
    }
});

// WEBHOOK wuliao
router.post('/webhook/wuliao', async function (req, res) {
    console.log('/webhook/wuliao');
    try {
        let hashData = req.body;
        let action = hashData.action;
        let insId = hashData.instance._id;
        let result;
        if (action === 'draft_submit') { // 数据抓取后SAP中的状态改为“已释放”
            result = await new Promise(function (resolve, reject) {
                Z_BAPI_REQUISITION_RELEASE_GW.run(insId, '01', resolve, reject);
            });
        } else if (action === 'engine_submit') {
            let currentStepName = hashData.instance.current_step_name;
            let lastTraceId = hashData.current_approve.trace;
            let lastTrace = _.find(hashData.instance.traces, function (t) {
                return t._id === lastTraceId;
            })
            let lastStepName = lastTrace.name;
            console.log('currentStepName: ', currentStepName);
            if (currentStepName === '结束') { // 在审批通过后（总经理审批）后将审批状态回传到SAP
                result = await new Promise(function (resolve, reject) {
                    Z_BAPI_REQUISITION_RELEASE_GW.run(insId, '02', resolve, reject);
                });
            } else if (currentStepName === '开始') { // 审批过程中如果驳回到开始节点，审批王传递消息给SAP，将状态置为“未释放”，并可以在SAP中可修改后再发起。
                result = await new Promise(function (resolve, reject) {
                    Z_BAPI_REQUISITION_RELEASE_GW.run(insId, '04', resolve, reject);
                });
            } else if (lastStepName === '开始') { // 审批过程中如果驳回到开始节点，开始节点提交后回传'审批中'状态给SAP。
                result = await new Promise(function (resolve, reject) {
                    Z_BAPI_REQUISITION_RELEASE_GW.run(insId, '01', resolve, reject);
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
        console.log('/webhook/wuliao ', 'res.send()');
        return res.send();
    } catch (error) {
        console.log(error);
        return res.status(500).send({
            ok: 0,
            msg: error.message,
            error: error.stack
        });
    }
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