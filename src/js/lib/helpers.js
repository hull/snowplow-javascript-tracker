/*
 * JavaScript tracker for Snowplow: Snowplow.js
 *
 * Significant portions copyright 2010 Anthon Pang. Remainder copyright
 * 2012-2014 Snowplow Analytics Ltd. All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are
 * met:
 *
 * * Redistributions of source code must retain the above copyright
 *   notice, this list of conditions and the following disclaimer.
 *
 * * Redistributions in binary form must reproduce the above copyright
 *   notice, this list of conditions and the following disclaimer in the
 *   documentation and/or other materials provided with the distribution.
 *
 * * Neither the name of Anthon Pang nor Snowplow Analytics Ltd nor the
 *   names of their contributors may be used to endorse or promote products
 *   derived from this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
 * "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
 * LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
 * A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT
 * OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
 * SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
 * LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
 * DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
 * THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */
var lodash = require('./utils');

module.exports = {};

/**
 * Cleans up the page title
 */
module.exports.fixupTitle = function (title) {
  if (!lodash.isString(title)) {
    title = title.text || '';

    var tmp = document.getElementsByTagName('title');
    if (tmp && !lodash.isUndefined(tmp[0])) {
      title = tmp[0].text;
    }
  }
  return title;
};

/*
 * Extract hostname from URL
 */
module.exports.getHostName = function (url) {
  // scheme : // [username [: password] @] hostname [: port] [/ [path] [? query] [# fragment]]
  var e = new RegExp('^(?:(?:https?|ftp):)/*(?:[^@]+@)?([^:/#]+)'),
    matches = e.exec(url);

  return matches ? matches[1] : url;
};

/*
 * Fix-up domain
 */
module.exports.fixupDomain = function (domain) {
  var dl = domain.length;

  // remove trailing '.'
  if (domain.charAt(--dl) === '.') {
    domain = domain.slice(0, dl);
  }
  // remove leading '*'
  if (domain.slice(0, 2) === '*.') {
    domain = domain.slice(1);
  }
  return domain;
};

/*
 * Get page referrer
 */
module.exports.getReferrer = function () {

  var referrer = '';

  var fromQs = module.exports.fromQuerystring('referrer', window.location.href) ||
  module.exports.fromQuerystring('referer', window.location.href);

  // Short-circuit
  if (fromQs) {
    return fromQs;
  }

  try {
    referrer = window.top.document.referrer;
  } catch (e) {
    if (window.parent) {
      try {
        referrer = window.parent.document.referrer;
      } catch (e2) {
        referrer = '';
      }
    }
  }
  if (referrer === '') {
    referrer = document.referrer;
  }
  return referrer;
};

/*
 * Cross-browser helper function to add event handler
 */
module.exports.addEventListener = function (element, eventType, eventHandler, useCapture) {
  if (element.addEventListener) {
    element.addEventListener(eventType, eventHandler, useCapture);
    return true;
  }
  if (element.attachEvent) {
    return element.attachEvent('on' + eventType, eventHandler);
  }
  element['on' + eventType] = eventHandler;
};

/*
 * Return value from name-value pair in querystring
 */
module.exports.fromQuerystring = function (field, url) {
  var match = new RegExp('^[^#]*[?&]' + field + '=([^&#]*)').exec(url);
  if (!match) {
    return null;
  }
  return decodeURIComponent(match[1].replace(/\+/g, ' '));
};

/*
 * Only log deprecation warnings if they won't cause an error
 */
module.exports.warn = function(message) {
  if (typeof console !== 'undefined') {
    console.warn('Snowplow: ' + message);
  }
};

/*
 * Check whether an element has at least one class from a given list
 */
function checkClass(elt, classList) {
  var classes = lodash.map(elt.classList),
    i;

  for (i = 0; i < classes.length; i++) {
    if (classList[classes[i]]) {
      return true;
    }
  }
  return false;
}

/**
 * Convert a criterion object to a filter function
 *
 * @param object criterion Either {whitelist: [array of allowable strings]}
 *                             or {blacklist: [array of allowable strings]}
 *                             or {filter: function (elt) {return whether to track the element}}
 * @param boolean byClass Whether to whitelist/blacklist based on an element's classes (for forms)
 *                        or name attribute (for fields)
 */
module.exports.getFilter = function (criterion, byClass) {

  // If the criterion argument is not an object, add listeners to all elements
  if (lodash.isArray(criterion) || !lodash.isObject(criterion)) {
    return function (elt) {
      return true;
    };
  }

  if (criterion.hasOwnProperty('filter')) {
    return criterion.filter;
  } else {
    var inclusive = criterion.hasOwnProperty('whitelist');
    var specifiedClasses = criterion.whitelist || criterion.blacklist;
    if (!lodash.isArray(specifiedClasses)) {
      specifiedClasses = [specifiedClasses];
    }

    // Convert the array of classes to an object of the form {class1: true, class2: true, ...}
    var specifiedClassesSet = {};
    for (var i=0; i<specifiedClasses.length; i++) {
      specifiedClassesSet[specifiedClasses[i]] = true;
    }

    if (byClass) {
      return function (elt) {
        return checkClass(elt, specifiedClassesSet) === inclusive;
      };
    } else {
      return function (elt) {
        return elt.name in specifiedClassesSet === inclusive;
      };
    }
  }
}

