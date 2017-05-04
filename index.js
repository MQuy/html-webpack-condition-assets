'use strict';

const objectAssign = require('object-assign');
const defaultOptions = {
  assets: []
};

class HtmlWebpackConditionAsset {
  constructor(options) {
    this.options = objectAssign({}, defaultOptions, options);
  }

  apply(compiler) {
    const options = this.options;

    compiler.plugin('compilation', compilation => {
      compilation.plugin('html-webpack-plugin-alter-asset-tags', (htmlPluginData, cb) => {
        const publicPath = compilation.outputOptions.publicPath || '';
        const assetNames = this.options.assets.map((option) => {
          option.chunkName = new RegExp(`${publicPath}${option.chunkName}`);
          return option;
        });
        const inlineTags = this.filterTags(htmlPluginData, 'inline', assetNames);
        const fixedTags = this.filterTags(htmlPluginData, 'fixed', assetNames);
        const condTags = this.filterTags(htmlPluginData, 'cond', assetNames);
        const condAssets = condTags.map((tag) => {
          const asset = assetNames.find((asset) => asset.chunkName.test(tag.attributes.src));
          tag.condition = asset.condition;
          return tag;
        });
        const template = this.buildTemplate(fixedTags, condAssets, publicPath);

        htmlPluginData.body = inlineTags.concat([{
          tagName: 'script',
          closeTag: true,
          attributes: {
            type: 'text/javascript'
          },
          innerHTML: template
        }]);
        cb(null, htmlPluginData);
      });
    });
  }

  filterTags(htmlPluginData, type, assetNames) {
    return htmlPluginData
      .body
      .filter((tag) => {
        if (type == 'inline') {
          return !!tag.innerHTML;
        } else if (type == 'cond') {
          return assetNames.some((asset) => asset.chunkName.test(tag.attributes.src));
        } else if (type == 'fixed') {
          return !tag.innerHTML && assetNames.some((asset) => !asset.chunkName.test(tag.attributes.src));
        }
      })
  }

  buildTemplate(fixedTags, condAssets) {
    return `
      scripts = [${fixedTags.map(tag => `'${tag.attributes.src}'`)}];
      ${condAssets.map((asset) => {
        return `
          if (${asset.condition}) {
            scripts.unshift('${asset.attributes.src}');
          }
        `
      })}
      scripts.forEach(function(src) {
        var scriptEl = document.createElement('script');
        scriptEl.src = src;
        scriptEl.async = false;
        document.head.appendChild(scriptEl);
      });
    `;
  }
}

module.exports = HtmlWebpackConditionAsset;
