// 生成采购订单
$("[name='EBELN']").parent().append('<button id="getOrderIdBtn" type="button" >生成采购订单</button>');

$("#getOrderIdBtn").on('click', function (e) {
    console.log('getOrderIdBtn click！');
    var url = `${Meteor.settings.public.webservices.creator.url}/${Session.get("spaceId")}/draft_purchase/${Session.get("instanceId")}`;
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
            if (responseText.errors) {
                responseText.errors.forEach(function (e) {
                    toastr.error(e.errorMessage);
                });
                return;
            }

            toastr.success(TAPi18n.__('Added successfully'));
        },
        error: function (xhr, msg, ex) {
            $(document.body).removeClass("loading");
            toastr.error(msg);
        }
    })
})