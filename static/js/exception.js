"use strict";

(function() {
      /**
     * 异常上报函数
     * @param(type:异常类型; message:异常信息; errorurl: 错误文件url; requrl: 请求错误url; stack: 错误堆栈信息)
     * 注意: 参数没值则传递null
     */
    window.reportException = function (type, message, errorurl, requrl, stack){
        var bookie = {};
        bookie.occurTime = new Date();
        bookie.type = type;
        bookie.userPlatformInfo = getPlatformInfo();
        bookie.message = message;
        bookie.errorurl = errorurl;
        bookie.requrl = requrl;
        bookie.stack = stack;
        console.log('sending......');

        var elem =  document.getElementById("feException");
        var serverHost =elem.src.split('/bookie.js/')[0];

        //通过Image对象请求发送数据
        var img = new Image(1, 1);
        img.src = serverHost + '/_fe.gif?' + encodeURIComponent(JSON.stringify(bookie));
    };

    /**
     * 捕获JavaScript异常，异常类型 1
     */
    window.onerror = function (msg, url, line, column) {
        var stack = '错误文件: ' + url + '; ' + '错误位置: ' + '第' + line + '行，第' + column + '列.';
        reportException(1, msg, url, '', stack);
        return true;
    };


    /**
     * XMLHttprequest异常捕获，异常类型 2
     */
    (function(XHR) {

        var open = XHR.prototype.open;
        var send = XHR.prototype.send;

        XHR.prototype.open = function(method, url, async, user, pass) {
            this._url = url;
            open.call(this, method, url, async, user, pass);
        };

        XHR.prototype.send = function(data) {
            var self = this;
            var oldOnReadyStateChange;
            var url = this._url;

            function onReadyStateChange() {
                if(self.readyState == 4 /* complete */) {
                    if(self.status == 404){
                        var scripts = document.getElementsByTagName("script");
                        var errorurl = scripts[scripts.length - 1].src;
                        var msg = self._url + '的请求' + self.statusText;
                        var requrl = self._url;

                        reportException(2, msg, errorurl, requrl, '');
                    }
                }

                if(oldOnReadyStateChange) {
                    oldOnReadyStateChange();
                }
            }

            if(!this.noIntercept) {
                if(this.addEventListener) {
                    this.addEventListener("readystatechange", onReadyStateChange, false);
                } else {
                    oldOnReadyStateChange = this.onreadystatechange;
                    this.onreadystatechange = onReadyStateChange;
                }
            }

            send.call(this, data);
        }
    })(XMLHttpRequest);

    /**
     * 捕获静态资源请求异常，异常类型 3
     *
     */
    window.addEventListener("error", function (e, url) {
        var eleArray = ["IMG", "SCRIPT", "LINK"];
        var resourceMap = {
            "IMG": "图片",
            "SCRIPT": "脚本文件",
            "LINK": "样式文件"
        };
        var ele = e.target;
        if(eleArray.indexOf(ele.tagName) != -1){
            var url = ele.tagName == "LINK" ? ele.href: ele.src;
            console.log("地址为：" + url + "的" + resourceMap[ele.tagName] + "加载失败");

            var msg = url.substring(url.lastIndexOf('/') + 1) + '的' + resourceMap[ele.tagName] + '加载失败';
            var errorurl = ele.baseURI;
            var requrl = url;
            reportException(3, msg, errorurl, requrl, '');

            return true;
        }
    }, true);



})(window)