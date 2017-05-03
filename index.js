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
        const fixedTags = this.filterTags(compilation, 'fixed');
        const condTags = this.filterTags(compilation, 'cond');
        const condAssets = condTags.map((tag) => {
          const asset = this.options.assets.find((asset) => asset.chunkName == tag.chunkName);
          tag.condition = asset.condition;
          return tag;
        });
        const template = this.buildTemplate(fixedTags, condAssets, publicPath);

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

  filterTags(compilation, type) {
    const assetNames = this.options.assets.map((option) => option.chunkName);
    return compilation
      .chunks
      .filter((chunk) => {
        let isRanged = chunk.isInitial();
        if (type == 'fixed') {
          isRanged &= !assetNames.includes(chunk.name);
        } else if (type == 'cond') {
          isRanged &= assetNames.includes(chunk.name);
        } else {
          isRanged = false;
        }
        return isRanged;
      })
      .map((chunk) => {
        return chunk
                  .files
                  .filter((tag) => /\.js$/.test(tag))
                  .map((file) => ({ chunkName: chunk.name, src: file }));
      })
      .reduce((prev, curr) => prev.concat(curr), [])
  }

  buildTemplate(fixedTags, condAssets, publicPath) {
    return `
      scripts = [${fixedTags.map(tag => `'${publicPath}${tag.src}'`)}];
      ${condAssets.map((asset) => {
        return `
          if (${asset.condition}) {
            scripts.unshift('${publicPath}${asset.src}');
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
