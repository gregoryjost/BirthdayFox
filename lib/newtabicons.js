/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/*jshint forin:true, noarg:true, noempty:true, eqeqeq:true, bitwise:true,
  strict:true, undef:true, unused:true, curly:true, browser:true, white:true,
  moz:true, esnext:false, indent:2, maxerr:50, devel:true, node:true, boss:true,
  globalstrict:true, nomen:false, newcap:false */

"use strict";

var clipboard = require('sdk/clipboard');
var cm = require('sdk/context-menu');
var Etherpad = require('./etherpad').Etherpad;
var etherpad = new Etherpad('thumbnail-gifs');
var prefs = require('sdk/simple-prefs');
var self = require('sdk/self');
var tabs = require('sdk/tabs');
var timeout = require('sdk/timers').setTimeout;

var running = false;
var menuitem;  // Context menu item to copy thumbnail URL.

etherpad.setDefaults([
  'http://stream1.gifsoup.com/view6/4837440/foxfly-o.gif',
  'http://people.mozilla.org/~smartell/meme/ASM.gif',
  'http://people.mozilla.org/~smartell/meme/grumpy-kit-webkit.gif',
  'http://stream1.gifsoup.com/view3/4838677/firefoxlive-o.gif',
  'http://stream1.gifsoup.com/view3/4838679/cropcircle-o.gif',
  'http://stream1.gifsoup.com/view6/4838684/persona-o.gif',
  'http://stream1.gifsoup.com/view4/4838687/fastest-o.gif',
  'http://stream1.gifsoup.com/view2/4838695/kuru-o.gif',
  'http://stream1.gifsoup.com/view4/4838696/socialapi-o.gif',
  'http://stream1.gifsoup.com/view3/4838697/ffandroid-o.gif',
  'http://gickr.com/results3/anim_4f540eb3-504c-7464-91f6-6e4682f0e947.gif',
  'http://stream1.gifsoup.com/view4/4838703/ff4-o.gif',
  'http://stream1.gifsoup.com/view5/4838708/foxprojections-o.gif',
  'http://stream1.gifsoup.com/view3/4838711/addons-o.gif'
]);

function addContentScript(tab, doneTrying) {
  if (tab.url === 'about:blank' && !doneTrying) {
    // Wait a second and see if it's better then.
    timeout(function () {
      addContentScript(tab, true);
    }, 1000);
  }
  if (tab.url === 'about:newtab') {
    let thumbs = etherpad.getRandomItems(9);
    tab.attach({
      contentScriptFile: self.data.url("newtabicons-content.js"),
      contentScriptOptions: { "thumbs" : thumbs,
                              "showAlways" : prefs.prefs.newtabicons2 === 2 }
    });
  }
}

var tabOpen = function (tab) {
  if (!tab) {
    tab = tabs.activeTab;
  }
  addContentScript(tab);
};

var run = function () {
  if (running) {
    return;
  }
  running = true;

  etherpad.loadPlaceholders();
  tabs.on('open', tabOpen);
  tabOpen();

  menuitem = cm.Item({
    label: 'Copy Thumbnail URL',
    context: [
      cm.URLContext('about:newtab'),
      cm.SelectorContext('.newtab-thumbnail')
    ],
    contentScript: 'self.on("click", function(node, data) {' +
                   '  self.postMessage(node.getAttribute("data-thumburl"));' +
                   '});',
    onMessage: function (thumbUrl) {
      clipboard.set(thumbUrl);
    }
  });
  menuitem.image = null;
};

var stop = function () {
  if (!running) {
    return;
  }
  running = false;

  tabs.removeListener('open', tabOpen);

  if (menuitem) {
    menuitem.destroy();
    menuitem = null;
  }
};

var listener = function () {
  if (prefs.prefs.newtabicons2) {
    run();
  } else {
    stop();
  }
};

exports.load = function () {
  prefs.on('newtabicons2', listener);
  listener('newtabicons2');
};

exports.unload = function () {
  prefs.removeListener('newtabicons2', listener);
};
