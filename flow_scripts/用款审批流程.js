// 刷新数据
var ins = Workflow.getInstance();
const yongkuanFlowId = '468b4caded61e2a13b89027c';
if (ins.flow === yongkuanFlowId && (Session.get('box') === 'inbox' || Session.get('box') === 'draft') && ins.current_step_name === '发起审批' && ins.applicant === Meteor.userId()) {
    $(".btn-workflow-chart").parent().append('<button class="btn btn-default btn-workflow-syncSAPData"><i class="ion ion-refresh"></i><span>刷新数据</span></button>');
    $(".btn-workflow-syncSAPData").on('click', function () {
        console.log('刷新数据！');
        var url = `${Meteor.settings.public.webservices.creator.url}/sap/${Session.get("spaceId")}/yongkuan/values/${Session.get("instanceId")}`;
        $(document.body).addClass("loading");
        $.ajax({
            url: url,
            type: "GET",
            async: true,
            dataType: "json",
            processData: false,
            contentType: "application/json",

            success: function (responseText, status) {
                $(document.body).removeClass("loading");
                if (!responseText.ok) {
                    toastr.error(responseText.msg);
                    return;
                }

                toastr.success('刷新成功！');
                Steedos.subs["instance_data"].clear();
            },
            error: function (xhr, msg, ex) {
                $(document.body).removeClass("loading");
                toastr.error(xhr.responseJSON.msg);
            }
        })

    })
}