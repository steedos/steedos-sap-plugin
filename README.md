# steedos连接sap工具包
本系统基于[Steedos](https://github.com/steedos/object-server)开发。您只需要在这里的[配置业务对象](src/)，设定对象、关系、字段、视图、触发器、报表，即可拥有一套自定义的合同管理系统。

![界面效果图](https://steedos.github.com/docs/assets/mac_ipad_iphone_home.png)

### 安装前准备
- [Install NodeJS, v8.0.0 or later.](https://nodejs.org/en/)
- [Install MongoDB Community Server v3.4 or later](https://www.mongodb.com/download-center/community)
- [Install Visual Studio Code](https://code.visualstudio.com/)

### 安装 yarn
```
npm i yarn -g
```

### 国内建议使用npm淘宝镜像
```
npm config set registry http://registry.npm.taobao.org/
```

### 使用yarn安装依赖包
```
yarn
```

### 启动服务器
```
yarn start
```

### 了解更多
- [开发文档](https://steedos.github.io)

### docker-compose方式启动服务
```
docker-compose up -d
```
如果修改了代码或者配置，执行`docker-compose build --no-cache`后，`docker-compose up -d`

### sap同步服务准备工作
- 配置steedos-config.yml， 启动steedos-sap-plugin
```yml
datasources:
  default:
    connection:
      url: mongodb://127.0.0.1/steedos
    objectFiles:
      - "./src"
    appFiles:
      - "./src/SAP.app.yml"
public:
  cfs:
    store: "local"
    local:
      folder: "/storage"
  webservices:
    workflow:
      url: "http://127.0.0.1/"
cron:
  sap_sync_rule: "0 03 * * * *"
  sap_get_draft_rule: "0 15 * * * *"
plugins:
  sap:
    abapConfig:
      user: 'xxx'
      passwd: '123456'
      ashost: '172.16.2.103'
      sysnr: '00'
      client: '300'
      lang: 'ZH'
    spaceId: 'xxx'
    flows:
      yongkuandan: 'xxx'
      wuliao: 'xxx'
      wuzicaigou: 'xxx'
```
- 设置流程的脚本：
    - 服务合同会签流程（生成采购单号按钮）
    - 用款审批流程（数据刷新按钮）
    - 物资申购流程（数据刷新按钮）
    - 物资采购订单审批流程（数据刷新按钮）
- 配置流程的webhook，用于状态回传：
    - 用款审批单
    - 物资申购单
    - 物资采购订单审批流程
- 启动审批王服务，并配置settings
```json
{
    "public": {
        "webservices": {
            "workflow": {
                "url": "http://steedos.ticp.net:8821/"
            },
            "creator": {
                "status": "active",
                "url": "http://127.0.0.1/sap"
            }
        }
    },
    "cron": {
        "webhookqueue_interval": 1000
    }
}
```
- 启动流程设计器后台服务steedos-server
- 配置nginx

