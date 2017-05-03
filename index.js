/**
 * @license
 * Copyright 2017 Google Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
'use strict';

const objectAssign = require('object-assign');
const defaultOptions = {
  rel: 'preload',
  as: 'script',
  include: 'asyncChunks',
  fileBlacklist: [/\.map/]
};

class PreloadPlugin {
  constructor(options) {
    this.options = objectAssign({}, defaultOptions, options);
  }

  apply(compiler) {
    const options = this.options;
    let filesToInclude = '';
    let extractedChunks = [];
    compiler.plugin('compilation', compilation => {
      compilation.plugin('html-webpack-plugin-alter-asset-tags', (htmlPluginData, cb) => {
        const template = `
          scripts = [${htmlPluginData.body.map(tag => `'${tag.attributes.src}'`)}];
          scripts.forEach(function(src) {
            var scriptEl = document.createElement('script');
            scriptEl.src = src;
            scriptEl.async = false;
            document.head.appendChild(scriptEl);
          });
        `
        htmlPluginData.body = [{
          tagName: 'script',
          closeTag: true,
          attributes: {
            type: 'text/javascript'
          },
          innerHTML: template
        }];
        cb(null, htmlPluginData);
      });
    });
  }
}

module.exports = PreloadPlugin;
