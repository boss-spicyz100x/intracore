var p = Object.defineProperty;
var m = (a, e, t) => e in a ? p(a, e, {
    enumerable: !0,
    configurable: !0,
    writable: !0,
    value: t
}) : a[e] = t;
var s = (a, e, t) => (m(a, typeof e != "symbol" ? e + "" : e, t),
t);
const y = a => ({
    __INTER_FRAME_SOCKET_MESSAGE: !0,
    appEvent: a
})
  , k = (a, e) => ({
    type: a,
    payload: e
})
  , b = a => {
    var e;
    return !!((e = a.data) != null && e.__INTER_FRAME_SOCKET_MESSAGE)
}
;
class f {
    constructor(e, t) {
        s(this, "unsubscribers", new Set);
        s(this, "emit", (e, t) => {
            const i = k(e, t)
              , n = y(i);
            this.targetWindow.postMessage(n, "*")
        }
        );
        s(this, "on", (e, t) => {
            const i = r => {
                if (r.source === this.targetWindow && !!b(r) && r.data.appEvent.type === e)
                    try {
                        t(r.data.appEvent)
                    } catch {}
            }
            ;
            this.sourceWindow.addEventListener("message", i);
            const n = () => {
                this.sourceWindow.removeEventListener("message", i),
                this.unsubscribers.delete(n)
            }
            ;
            return this.unsubscribers.add(n),
            n
        }
        );
        s(this, "once", (e, t) => {
            const i = this.on(e, n => {
                t(n),
                i()
            }
            );
            return i
        }
        );
        s(this, "cleanup", () => {
            for (const e of this.unsubscribers)
                e()
        }
        );
        this.sourceWindow = e,
        this.targetWindow = t
    }
}
class o {
    constructor(e) {
        s(this, "appTemplateData");
        s(this, "_ready", !1);
        s(this, "_loaded", !1);
        s(this, "_customReadyCheckRequested", !1);
        s(this, "_customReadyCheckDone", !1);
        s(this, "_appTemplateDataInitialized", !1);
        s(this, "socket");
        s(this, "sendReady", () => {
            this._ready || (this.socket.emit("ready"),
            o.log("ready!"),
            this._ready = !0)
        }
        );
        s(this, "doReadinessCheck", () => {
            if (!this._ready) {
                if (!this._appTemplateDataInitialized) {
                    o.log("not yet ready: initial app template data missing");
                    return
                }
                if (!this._customReadyCheckRequested && !this._loaded) {
                    o.log("not yet ready: page not loaded, yet");
                    return
                }
                if (this._customReadyCheckRequested && !this._customReadyCheckDone) {
                    o.log("not yet ready: custom readiness check not called");
                    return
                }
                this.sendReady()
            }
        }
        );
        s(this, "getCustomReadyHandler", () => (o.log("switching to 'manual ready check'"),
        this._customReadyCheckRequested = !0,
        () => {
            o.log("'manual ready check' done"),
            this._customReadyCheckDone = !0,
            this.doReadinessCheck()
        }
        ));
        s(this, "onAppTemplateData", e => this.socket.on("appTemplateData", t => {
            e(t.payload)
        }
        ));
        s(this, "getAppTemplateData", async () => this._appTemplateDataInitialized ? this.appTemplateData : new Promise(e => {
            const t = this.onAppTemplateData(i => {
                t(),
                e(i)
            }
            )
        }
        ));
        s(this, "submit", e => new Promise( (t, i) => {
            const n = []
              , r = () => {
                n.forEach(d => {
                    d()
                }
                )
            }
            ;
            function u(d) {
                var h;
                const c = parent == null ? void 0 : parent.parent;
                if (c) {
                    const l = "*";
                    (h = c == null ? void 0 : c.postMessage) == null || h.call(c, {
                        type: "x-app-submit",
                        success: d
                    }, l)
                }
            }
            n.push(this.socket.once("submit-accepted", () => {
                u(!0),
                r(),
                t()
            }
            )),
            n.push(this.socket.once("submit-rejected", () => {
                u(!1),
                r(),
                i()
            }
            )),
            this.socket.emit("submit", e)
        }
        ));
        this.socket = new f(e,e.parent),
        e.addEventListener("load", () => {
            this._loaded = !0,
            this.doReadinessCheck()
        }
        ),
        this.onAppTemplateData(t => {
            this._appTemplateDataInitialized = !0,
            this.appTemplateData = t,
            o.log("received data from shell page", t),
            this.doReadinessCheck()
        }
        ),
        this.socket.on("shell-sdk-initialized", () => {
            !this._ready || this.socket.emit("ready")
        }
        ),
        this.socket.emit("sdk-loaded"),
        o.log("initialized")
    }
    static log(...e) {
        console.log("[AppPageSDK]", ...e)
    }
}
window.SDK = new o(window);
