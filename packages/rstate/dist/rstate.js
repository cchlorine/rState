import { io, Socket as IOSocket } from "socket.io-client";
import superjson from "superjson";
var RemoteStateServer = /** @class */ (function () {
    function RemoteStateServer(serverName, serverUrl) {
        Object.defineProperty(this, "serverName", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: serverName
        });
        Object.defineProperty(this, "serverUrl", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: serverUrl
        });
        Object.defineProperty(this, "connection", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "callbackMap", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: {}
        });
        this.connection = io(this.serverUrl);
    }
    Object.defineProperty(RemoteStateServer.prototype, "bind", {
        enumerable: false,
        configurable: true,
        writable: true,
        value: function (namespace, key, initialValue, updater) {
            var _this = this;
            this.connection.emit('sub', {
                namespace: namespace,
                key: key,
                initialValue: superjson.stringify(initialValue)
            });
            var callback = function (payload) {
                updater(superjson.parse(payload));
            };
            this.connection.on("".concat(namespace, ":").concat(key), callback);
            return function () {
                _this.connection.off("".concat(namespace, ":").concat(key), callback);
            };
        }
    });
    Object.defineProperty(RemoteStateServer.prototype, "set", {
        enumerable: false,
        configurable: true,
        writable: true,
        value: function (namespace, key, value) {
            this.connection.emit('save', {
                namespace: namespace,
                key: key,
                value: superjson.stringify(value)
            });
        }
    });
    Object.defineProperty(RemoteStateServer, "getInstance", {
        enumerable: false,
        configurable: true,
        writable: true,
        value: function (server) {
            var serverName = (typeof server === 'object' ? server.name : server) || 'default';
            var serverUrl = typeof server === 'object' && server.url || 'http://127.0.0.1:12152';
            if (RemoteStateServer.instances[serverName]) {
                return RemoteStateServer.instances[serverName];
            }
            return (RemoteStateServer.instances[serverName] = new RemoteStateServer(serverName, serverUrl));
        }
    });
    Object.defineProperty(RemoteStateServer, "instances", {
        enumerable: true,
        configurable: true,
        writable: true,
        value: {}
    });
    return RemoteStateServer;
}());
export { RemoteStateServer };
var RemoteNamespaceStateManager = /** @class */ (function () {
    function RemoteNamespaceStateManager(serverName, namespace) {
        Object.defineProperty(this, "serverName", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: serverName
        });
        Object.defineProperty(this, "namespace", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: namespace
        });
        Object.defineProperty(this, "server", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        this.server = RemoteStateServer.getInstance(serverName);
    }
    Object.defineProperty(RemoteNamespaceStateManager.prototype, "bind", {
        enumerable: false,
        configurable: true,
        writable: true,
        value: function (key, updater, initialValue) {
            this.server.bind(this.namespace, key, initialValue, updater);
        }
    });
    Object.defineProperty(RemoteNamespaceStateManager.prototype, "set", {
        enumerable: false,
        configurable: true,
        writable: true,
        value: function (key, value) {
            this.server.set(this.namespace, key, value);
        }
    });
    Object.defineProperty(RemoteNamespaceStateManager, "getInstance", {
        enumerable: false,
        configurable: true,
        writable: true,
        value: function (namespace, serverName) {
            if (serverName === void 0) { serverName = 'default'; }
            namespace = namespace || RemoteNamespaceStateManager.defaultNamespace;
            var instanceName = [serverName, namespace].join('$$');
            if (RemoteNamespaceStateManager.instances[instanceName]) {
                return RemoteNamespaceStateManager.instances[instanceName];
            }
            return (RemoteNamespaceStateManager.instances[instanceName] = new RemoteNamespaceStateManager(serverName, namespace));
        }
    });
    Object.defineProperty(RemoteNamespaceStateManager, "defaultNamespace", {
        enumerable: true,
        configurable: true,
        writable: true,
        value: ['default', window.location.host].join('$$')
    });
    Object.defineProperty(RemoteNamespaceStateManager, "instances", {
        enumerable: true,
        configurable: true,
        writable: true,
        value: {}
    });
    return RemoteNamespaceStateManager;
}());
export { RemoteNamespaceStateManager };