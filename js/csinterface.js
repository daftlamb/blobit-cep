/**
 * CSInterface - v11.0.0
 * Adobe CEP JavaScript interface library
 */

var csInterface = (function() {

function CSInterface() {
  this.hostEnvironment = window.__adobe_cep__ ? JSON.parse(window.__adobe_cep__.getHostEnvironment()) : null;
}

CSInterface.prototype.getHostEnvironment = function() {
  return this.hostEnvironment;
};

CSInterface.prototype.evalScript = function(script, callback) {
  if (!window.__adobe_cep__) {
    if (callback) callback('EvalScript error: CEP not available');
    return;
  }
  if (callback) {
    var callbackID = 'cb_' + Date.now() + '_' + Math.random().toString(36).substr(2,9);
    window[callbackID] = function(result) {
      delete window[callbackID];
      callback(result);
    };
    window.__adobe_cep__.evalScript(script, callbackID);
  } else {
    window.__adobe_cep__.evalScript(script);
  }
};

CSInterface.prototype.getApplicationID = function() {
  return this.hostEnvironment ? this.hostEnvironment.appId : '';
};

CSInterface.prototype.getOSInformation = function() {
  return this.hostEnvironment ? this.hostEnvironment.os : '';
};

CSInterface.prototype.openURLInDefaultBrowser = function(url) {
  if (window.__adobe_cep__) window.__adobe_cep__.openURLInDefaultBrowser(url);
};

CSInterface.prototype.addEventListener = function(type, listener, obj) {
  if (window.__adobe_cep__) window.__adobe_cep__.addEventListener(type, listener, obj);
};

CSInterface.prototype.removeEventListener = function(type, listener, obj) {
  if (window.__adobe_cep__) window.__adobe_cep__.removeEventListener(type, listener, obj);
};

CSInterface.prototype.dispatchEvent = function(event) {
  if (window.__adobe_cep__) window.__adobe_cep__.dispatchEvent(event);
};

CSInterface.prototype.getSystemPath = function(pathType) {
  return window.__adobe_cep__ ? window.__adobe_cep__.getSystemPath(pathType) : '';
};

return CSInterface;
})();
