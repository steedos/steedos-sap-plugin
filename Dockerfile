FROM jsreport/jsreport:2.5.0-full

ADD . /app

WORKDIR /app

RUN npm config set registry http://registry.npm.taobao.org/

RUN npm i yarn -g

RUN yarn

RUN yarn upgrade

RUN echo /app/nwrfcsdk/linux/lib >> /etc/ld.so.conf.d/nwrfcsdk.conf
RUN ldconfig

VOLUME [ "/storage" ]

CMD ["yarn", "start"]
