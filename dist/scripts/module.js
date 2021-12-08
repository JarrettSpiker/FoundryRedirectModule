/******/ (() => { // webpackBootstrap
/******/ 	"use strict";
var __webpack_exports__ = {};

;// CONCATENATED MODULE: ./node_modules/uuid/dist/esm-browser/rng.js
// Unique ID creation requires a high quality random # generator. In the browser we therefore
// require the crypto API and do not support built-in fallback to lower quality random number
// generators (like Math.random()).
var getRandomValues;
var rnds8 = new Uint8Array(16);
function rng() {
  // lazy load so that environments that need to polyfill have a chance to do so
  if (!getRandomValues) {
    // getRandomValues needs to be invoked in a context where "this" is a Crypto implementation. Also,
    // find the complete implementation of crypto (msCrypto) on IE11.
    getRandomValues = typeof crypto !== 'undefined' && crypto.getRandomValues && crypto.getRandomValues.bind(crypto) || typeof msCrypto !== 'undefined' && typeof msCrypto.getRandomValues === 'function' && msCrypto.getRandomValues.bind(msCrypto);

    if (!getRandomValues) {
      throw new Error('crypto.getRandomValues() not supported. See https://github.com/uuidjs/uuid#getrandomvalues-not-supported');
    }
  }

  return getRandomValues(rnds8);
}
;// CONCATENATED MODULE: ./node_modules/uuid/dist/esm-browser/regex.js
/* harmony default export */ const regex = (/^(?:[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}|00000000-0000-0000-0000-000000000000)$/i);
;// CONCATENATED MODULE: ./node_modules/uuid/dist/esm-browser/validate.js


function validate(uuid) {
  return typeof uuid === 'string' && regex.test(uuid);
}

/* harmony default export */ const esm_browser_validate = (validate);
;// CONCATENATED MODULE: ./node_modules/uuid/dist/esm-browser/stringify.js

/**
 * Convert array of 16 byte values to UUID string format of the form:
 * XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX
 */

var byteToHex = [];

for (var i = 0; i < 256; ++i) {
  byteToHex.push((i + 0x100).toString(16).substr(1));
}

function stringify(arr) {
  var offset = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 0;
  // Note: Be careful editing this code!  It's been tuned for performance
  // and works in ways you may not expect. See https://github.com/uuidjs/uuid/pull/434
  var uuid = (byteToHex[arr[offset + 0]] + byteToHex[arr[offset + 1]] + byteToHex[arr[offset + 2]] + byteToHex[arr[offset + 3]] + '-' + byteToHex[arr[offset + 4]] + byteToHex[arr[offset + 5]] + '-' + byteToHex[arr[offset + 6]] + byteToHex[arr[offset + 7]] + '-' + byteToHex[arr[offset + 8]] + byteToHex[arr[offset + 9]] + '-' + byteToHex[arr[offset + 10]] + byteToHex[arr[offset + 11]] + byteToHex[arr[offset + 12]] + byteToHex[arr[offset + 13]] + byteToHex[arr[offset + 14]] + byteToHex[arr[offset + 15]]).toLowerCase(); // Consistency check for valid UUID.  If this throws, it's likely due to one
  // of the following:
  // - One or more input array values don't map to a hex octet (leading to
  // "undefined" in the uuid)
  // - Invalid input values for the RFC `version` or `variant` fields

  if (!esm_browser_validate(uuid)) {
    throw TypeError('Stringified UUID is invalid');
  }

  return uuid;
}

/* harmony default export */ const esm_browser_stringify = (stringify);
;// CONCATENATED MODULE: ./node_modules/uuid/dist/esm-browser/v1.js

 // **`v1()` - Generate time-based UUID**
//
// Inspired by https://github.com/LiosK/UUID.js
// and http://docs.python.org/library/uuid.html

var _nodeId;

var _clockseq; // Previous uuid creation time


var _lastMSecs = 0;
var _lastNSecs = 0; // See https://github.com/uuidjs/uuid for API details

function v1(options, buf, offset) {
  var i = buf && offset || 0;
  var b = buf || new Array(16);
  options = options || {};
  var node = options.node || _nodeId;
  var clockseq = options.clockseq !== undefined ? options.clockseq : _clockseq; // node and clockseq need to be initialized to random values if they're not
  // specified.  We do this lazily to minimize issues related to insufficient
  // system entropy.  See #189

  if (node == null || clockseq == null) {
    var seedBytes = options.random || (options.rng || rng)();

    if (node == null) {
      // Per 4.5, create and 48-bit node id, (47 random bits + multicast bit = 1)
      node = _nodeId = [seedBytes[0] | 0x01, seedBytes[1], seedBytes[2], seedBytes[3], seedBytes[4], seedBytes[5]];
    }

    if (clockseq == null) {
      // Per 4.2.2, randomize (14 bit) clockseq
      clockseq = _clockseq = (seedBytes[6] << 8 | seedBytes[7]) & 0x3fff;
    }
  } // UUID timestamps are 100 nano-second units since the Gregorian epoch,
  // (1582-10-15 00:00).  JSNumbers aren't precise enough for this, so
  // time is handled internally as 'msecs' (integer milliseconds) and 'nsecs'
  // (100-nanoseconds offset from msecs) since unix epoch, 1970-01-01 00:00.


  var msecs = options.msecs !== undefined ? options.msecs : Date.now(); // Per 4.2.1.2, use count of uuid's generated during the current clock
  // cycle to simulate higher resolution clock

  var nsecs = options.nsecs !== undefined ? options.nsecs : _lastNSecs + 1; // Time since last uuid creation (in msecs)

  var dt = msecs - _lastMSecs + (nsecs - _lastNSecs) / 10000; // Per 4.2.1.2, Bump clockseq on clock regression

  if (dt < 0 && options.clockseq === undefined) {
    clockseq = clockseq + 1 & 0x3fff;
  } // Reset nsecs if clock regresses (new clockseq) or we've moved onto a new
  // time interval


  if ((dt < 0 || msecs > _lastMSecs) && options.nsecs === undefined) {
    nsecs = 0;
  } // Per 4.2.1.2 Throw error if too many uuids are requested


  if (nsecs >= 10000) {
    throw new Error("uuid.v1(): Can't create more than 10M uuids/sec");
  }

  _lastMSecs = msecs;
  _lastNSecs = nsecs;
  _clockseq = clockseq; // Per 4.1.4 - Convert from unix epoch to Gregorian epoch

  msecs += 12219292800000; // `time_low`

  var tl = ((msecs & 0xfffffff) * 10000 + nsecs) % 0x100000000;
  b[i++] = tl >>> 24 & 0xff;
  b[i++] = tl >>> 16 & 0xff;
  b[i++] = tl >>> 8 & 0xff;
  b[i++] = tl & 0xff; // `time_mid`

  var tmh = msecs / 0x100000000 * 10000 & 0xfffffff;
  b[i++] = tmh >>> 8 & 0xff;
  b[i++] = tmh & 0xff; // `time_high_and_version`

  b[i++] = tmh >>> 24 & 0xf | 0x10; // include version

  b[i++] = tmh >>> 16 & 0xff; // `clock_seq_hi_and_reserved` (Per 4.2.2 - include variant)

  b[i++] = clockseq >>> 8 | 0x80; // `clock_seq_low`

  b[i++] = clockseq & 0xff; // `node`

  for (var n = 0; n < 6; ++n) {
    b[i + n] = node[n];
  }

  return buf || esm_browser_stringify(b);
}

/* harmony default export */ const esm_browser_v1 = (v1);
;// CONCATENATED MODULE: ./src/scripts/module.ts
var __awaiter = (undefined && undefined.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};

const FOUNDRY_ID_FLAG = "foundry_redirect_id";
const SERVER_BASE_URL = "https://foundryredirect.com";
const FOUNDRY_ID_URL_PARAM = "foundry_id";
const EXTERNAL_ADDRESS_URL_PARAM = "external_address";
const INTERNAL_ADDRESS_URL_PARAM = "internal_address";
const PUBLIC_ID_KEY = "public_id";
function refreshIpData() {
    return __awaiter(this, void 0, void 0, function* () {
        console.log("Foundry Redirect: Refreshing foundry link data");
        let invitationLinks = new InvitationLinks();
        let invitationData = invitationLinks.getData();
        let localAddress = invitationData.local;
        let externalAddress = invitationData.remote;
        if (!localAddress) {
            displayErrorMessageToUser("Foundry Redirect: Failed to determine local IP address from Foundry");
            return;
        }
        if (!externalAddress) {
            displayErrorMessageToUser("Foundry Redirect: Failed to determine external IP address from Foundry");
            return;
        }
        // check if there is a stored foundry id. If not, generate one
        let foundryId = getOrCreateFoundryId();
        // submit the foundry info to AWS
        const p = postFoundryInfo(foundryId, externalAddress, localAddress);
        setTimeout(refreshIpData, 1000 * 60 * 60);
        return p;
    });
}
function getOrCreateFoundryId() {
    let user = getUser();
    let foundryId = user === null || user === void 0 ? void 0 : user.getFlag("core", FOUNDRY_ID_FLAG);
    if (!foundryId) {
        console.log("No foundry redirect ID found. Generating one...");
        foundryId = esm_browser_v1();
        user === null || user === void 0 ? void 0 : user.setFlag("core", FOUNDRY_ID_FLAG, foundryId);
    }
    return foundryId;
}
function postFoundryInfo(foundryId, externalAddress, localAddress) {
    return __awaiter(this, void 0, void 0, function* () {
        return fetch(`${SERVER_BASE_URL}?${FOUNDRY_ID_URL_PARAM}=${foundryId}&${EXTERNAL_ADDRESS_URL_PARAM}=${externalAddress}&${INTERNAL_ADDRESS_URL_PARAM}=${localAddress}`, {
            method: "POST"
        }).then(res => {
            console.log("Foundry redirect: Successfully updated server address on server");
        }).catch(err => {
            displayErrorMessageToUser("Failed to post server address to redirect server");
            console.error(err);
        });
    });
}
function getRedirectAddress() {
    return __awaiter(this, void 0, void 0, function* () {
        const foundryId = getOrCreateFoundryId();
        return fetch(`${SERVER_BASE_URL}?${FOUNDRY_ID_URL_PARAM}=${foundryId}`).then((res) => __awaiter(this, void 0, void 0, function* () {
            let responseText = yield res.text();
            let redirect = {
                externalAddress: responseText,
                localAddress: responseText + "/local"
            };
            return redirect;
        })).catch(err => {
            displayErrorMessageToUser("Failed to fetch foundry redirect address from server");
            console.error(err);
            return undefined;
        });
    });
}
function displayInfoMessageToUser(message) {
    var _a;
    message = "Foundry Redirect: " + message;
    (_a = ui.notifications) === null || _a === void 0 ? void 0 : _a.info(message);
    console.log(message);
}
function displayErrorMessageToUser(error) {
    var _a;
    error = "Foundry Redirect: " + error;
    (_a = ui.notifications) === null || _a === void 0 ? void 0 : _a.error(error);
    console.error(error);
}
function getUser() {
    let g = game;
    return g.user;
}
Hooks.on("ready", function () {
    let user = getUser();
    if (!user || !user.isGM) {
        console.log("Foundry Redirect: Current user is not the GM. Not setting up foundry redirects");
        return;
    }
    // post server IP to the redirect server
    refreshIpData();
});
Hooks.on("renderInvitationLinks", (links, html) => {
    return getRedirectAddress().then(address => {
        var _a;
        if (!address) {
            return;
        }
        const invitationPosition = links.position;
        invitationPosition.height = 200;
        links.setPosition(invitationPosition);
        // find then window content
        const windowContent = html.get(0);
        if (!windowContent) {
            console.error("Foundry redirect: Invitation links page does not match expected layout");
            return;
        }
        const formHtml = (_a = windowContent.lastElementChild) === null || _a === void 0 ? void 0 : _a.lastElementChild;
        if (!formHtml || formHtml.childElementCount != 3) {
            console.error("Foundry redirect: Invitation links page does not match expected layout");
            return;
        }
        // formHtml should be a <form> containing notes about how invitation links work, and 2 inputs for the local and internet links
        const localNetworkDiv = formHtml.children.item(1);
        const internetDiv = formHtml.children.item(2);
        if (!(localNetworkDiv && localNetworkDiv.classList.contains("form-group") && internetDiv && internetDiv.classList.contains("form-group"))) {
            console.error("Foundry redirect: Invitation links page does not match expected layout");
            return;
        }
        ;
        // create copies of the link nodes, but switch out the native IP address with the foundry redirect
        const redirectLocal = localNetworkDiv.cloneNode(true);
        const redirectInternet = internetDiv.cloneNode(true);
        let foundLocalInput = false;
        let foundInternetInput = false;
        redirectLocal.childNodes.forEach(child => {
            if (child instanceof HTMLInputElement) {
                child.value = address.localAddress;
                foundLocalInput = true;
            }
        });
        redirectInternet.childNodes.forEach(child => {
            if (child instanceof HTMLInputElement) {
                child.value = address.externalAddress;
                foundInternetInput = true;
            }
        });
        // sanity check that we found content to replace before we start changing the DOM
        if (!(foundLocalInput && foundInternetInput)) {
            console.error("Foundry redirect: Invitation links page does not match expected layout");
            return;
        }
        formHtml.removeChild(localNetworkDiv);
        formHtml.removeChild(internetDiv);
        formHtml.appendChild(redirectLocal);
        formHtml.appendChild(redirectInternet);
        // add the native links below, with a description of what the module has done
        const redirectDescNode = document.createElement("p");
        redirectDescNode.textContent = "The above links are generated by the Foundry Redirect module. They should remain constant if your IP address changes. To use native FoundryVTT invitation links, see below.";
        redirectDescNode.classList.add("notes");
        formHtml.appendChild(redirectDescNode);
        formHtml.appendChild(document.createElement("hr"));
        formHtml.appendChild(localNetworkDiv);
        formHtml.appendChild(internetDiv);
        // we need to re-activate the listeners to ensure that the copy functionality works on our new links
        links.activateListeners(html);
    });
});

/******/ })()
;