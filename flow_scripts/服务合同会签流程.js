// 生成采购订单
var ins = Workflow.getInstance();
if (ins.current_step_name === '生成采购单号') {
    $("[name='EBELN']").parent().append('<button id="getOrderIdBtn" type="button" >生成采购单号</button>');

    $("#getOrderIdBtn").on('click', function (e) {
        console.log('getOrderIdBtn click！');
        var url = `${Meteor.settings.public.webservices.creator.url}/sap/${Session.get("spaceId")}/draft_purchase/${Session.get("instanceId")}`;
        var data = {};
        data = JSON.stringify(data);
        $(document.body).addClass("loading");

        $.ajax({
            url: url,
            type: "POST",
            async: true,
            data: data,
            dataType: "json",
            processData: false,
            contentType: "application/json",

            success: function (responseText, status) {
                $(document.body).removeClass("loading");
                if (!responseText.ok) {
                    toastr.error(responseText.msg);
                    return;
                }

                toastr.success('生成采购单号成功！');
                Steedos.subs["instance_data"].clear();
            },
            error: function (xhr, msg, ex) {
                $(document.body).removeClass("loading");
                toastr.error(xhr.responseJSON.msg);
            }
        })
    })
}


// 科目分配类别： 值为P(项目(服务采购)(无估价))的时候 WBS必填，其余情况下WBS不为必填
$(".instance-form").on('instance-before-submit', function (e) {
    // TODO
})