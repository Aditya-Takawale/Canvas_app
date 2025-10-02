const path = require('path');

// Custom plugin to remove any CSP headers
class RemoveCSPPlugin {
  apply(compiler) {
    compiler.hooks.compilation.tap('RemoveCSPPlugin', (compilation) => {
      // Hook into the HtmlWebpackPlugin's hooks
      const HtmlWebpackPlugin = require('html-webpack-plugin');
      if (HtmlWebpackPlugin.getHooks) {
        const hooks = HtmlWebpackPlugin.getHooks(compilation);
        
        hooks.beforeEmit.tapAsync('RemoveCSPPlugin', (data, callback) => {
          // Remove any CSP meta tags from the generated HTML
          data.html = data.html.replace(
            /<meta[^>]*http-equiv=["']?Content-Security-Policy["']?[^>]*>/gi,
            ''
          );
          data.html = data.html.replace(
            /<meta[^>]*name=["']?Content-Security-Policy["']?[^>]*>/gi,
            ''
          );
          callback(null, data);
        });
      }
    });
  }
}

module.exports = {
  webpack: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
      '@components': path.resolve(__dirname, 'src/components'),
      '@features': path.resolve(__dirname, 'src/features'),
      '@hooks': path.resolve(__dirname, 'src/hooks'),
      '@interfaces': path.resolve(__dirname, 'src/interfaces'),
      '@pages': path.resolve(__dirname, 'src/pages'),
      '@services': path.resolve(__dirname, 'src/services'),
      '@store': path.resolve(__dirname, 'src/store'),
      '@utils': path.resolve(__dirname, 'src/utils'),
    },
    plugins: {
      add: [
        new RemoveCSPPlugin(),
      ],
    },
    configure: (webpackConfig) => {
      // Ensure eval is allowed for development
      if (process.env.NODE_ENV === 'development') {
        webpackConfig.devtool = 'eval-source-map';
        
        // Find and modify HtmlWebpackPlugin to remove any CSP injection
        const htmlWebpackPlugin = webpackConfig.plugins.find(
          plugin => plugin.constructor.name === 'HtmlWebpackPlugin'
        );
        
        if (htmlWebpackPlugin) {
          // Ensure no CSP meta tags are added
          if (htmlWebpackPlugin.options.meta) {
            delete htmlWebpackPlugin.options.meta['Content-Security-Policy'];
            delete htmlWebpackPlugin.options.meta['content-security-policy'];
          }
        }
      }

      // Performance optimizations for production
      if (process.env.NODE_ENV === 'production') {
        // Configure bundle splitting
        webpackConfig.optimization = {
          ...webpackConfig.optimization,
          splitChunks: {
            chunks: 'all',
            cacheGroups: {
              // Vendor bundle - Third party libraries
              vendor: {
                test: /[\\/]node_modules[\\/]/,
                name: 'vendors',
                chunks: 'all',
                priority: 10,
                enforce: true,
              },
              // Fabric.js separate bundle due to large size
              fabric: {
                test: /[\\/]node_modules[\\/]fabric[\\/]/,
                name: 'fabric',
                chunks: 'all',
                priority: 15,
                enforce: true,
              },
              // React libraries bundle
              react: {
                test: /[\\/]node_modules[\\/](react|react-dom|react-router|react-redux)[\\/]/,
                name: 'react',
                chunks: 'all',
                priority: 12,
                enforce: true,
              },
              // UI libraries bundle
              ui: {
                test: /[\\/]node_modules[\\/](react-icons|tailwindcss)[\\/]/,
                name: 'ui',
                chunks: 'all',
                priority: 11,
                enforce: true,
              },
              // Common chunks
              common: {
                name: 'common',
                minChunks: 2,
                chunks: 'all',
                priority: 5,
                reuseExistingChunk: true,
                enforce: true,
              },
            },
          },
          // Enable runtime chunk
          runtimeChunk: {
            name: 'runtime',
          },
          // Tree shaking optimizations
          usedExports: true,
          sideEffects: false,
        };

        // Add compression and minification
        const CompressionPlugin = require('compression-webpack-plugin');
        
        webpackConfig.plugins.push(
          new CompressionPlugin({
            algorithm: 'gzip',
            test: /\.(js|css|html|svg)$/,
            threshold: 8192,
            minRatio: 0.8,
          })
        );

        // Configure module concatenation for better tree shaking
        webpackConfig.optimization.concatenateModules = true;
      }

      return webpackConfig;
    },
  },
  devServer: (devServerConfig) => {
    // Completely remove CSP in development
    devServerConfig.headers = {};

    // Add middleware to aggressively prevent any CSP headers
    devServerConfig.setupMiddlewares = (middlewares, devServer) => {
      // Add middleware at the very beginning to intercept all responses
      devServer.app.use((req, res, next) => {
        // Override all header-setting methods
        const originalSetHeader = res.setHeader;
        const originalHeader = res.header;
        const originalSet = res.set;
        
        res.setHeader = function(name, value) {
          const lowerName = name.toLowerCase();
          if (lowerName.includes('content-security-policy') || 
              lowerName.includes('x-content-security-policy') ||
              lowerName.includes('x-webkit-csp')) {
            return res; // Ignore CSP headers completely
          }
          return originalSetHeader.call(this, name, value);
        };
        
        res.header = function(name, value) {
          const lowerName = name.toLowerCase();
          if (lowerName.includes('content-security-policy') || 
              lowerName.includes('x-content-security-policy') ||
              lowerName.includes('x-webkit-csp')) {
            return res; // Ignore CSP headers completely
          }
          return originalHeader.call(this, name, value);
        };
        
        res.set = function(name, value) {
          if (typeof name === 'string') {
            const lowerName = name.toLowerCase();
            if (lowerName.includes('content-security-policy') || 
                lowerName.includes('x-content-security-policy') ||
                lowerName.includes('x-webkit-csp')) {
              return res; // Ignore CSP headers completely
            }
          } else if (typeof name === 'object') {
            // Handle object form: res.set({'Content-Security-Policy': '...'})
            const filteredHeaders = {};
            for (const [key, val] of Object.entries(name)) {
              const lowerKey = key.toLowerCase();
              if (!lowerKey.includes('content-security-policy') && 
                  !lowerKey.includes('x-content-security-policy') &&
                  !lowerKey.includes('x-webkit-csp')) {
                filteredHeaders[key] = val;
              }
            }
            return originalSet.call(this, filteredHeaders);
          }
          return originalSet.call(this, name, value);
        };
        
        next();
      });

      return middlewares;
    };

    devServerConfig.client = {
      overlay: {
        runtimeErrors: false,
        warnings: false,
      },
    };

    devServerConfig.allowedHosts = 'all';
    devServerConfig.hot = true;
    devServerConfig.liveReload = true;
    devServerConfig.historyApiFallback = true;

    return devServerConfig;
  }
};