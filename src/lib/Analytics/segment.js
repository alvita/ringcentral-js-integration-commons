export default function init() {
  let analytics = [];
  if (window !== undefined) {
    analytics = window.analytics = window.analytics || [];
    if (analytics.initialize) {
      if (window.console && console.log) {
        console.log('Segment initialized!');
      }
    } else if (analytics.invoked) {
    // If the snippet was invoked already show an error.
      if (window.console && console.error) {
        console.error('Segment snippet included twice.');
      }
    } else {
      // Invoked flag, to make sure the snippet
      // is never invoked twice.
      analytics.invoked = true;

      // A list of the methods in Analytics.js to stub.
      analytics.methods = [
        'trackSubmit',
        'trackClick',
        'trackLink',
        'trackForm',
        'pageview',
        'identify',
        'reset',
        'group',
        'track',
        'ready',
        'alias',
        'debug',
        'page',
        'once',
        'off',
        'on'
      ];

      analytics.factory = function(method) {
        console.debug(method);
        return function() {
          const args = Array.prototype.slice.call(arguments);
          args.unshift(method);
          analytics.push(args);
          return analytics;
        };
      };

      analytics.methods.forEach(function(method) {
        analytics[method] = analytics.factory(method);
      });
      // For each of our methods, generate a queueing stub.
      // for (let i = 0; i < analytics.methods.length; i = i + 1) {
      //   const key = analytics.methods[i];
      //   analytics[key] = analytics.factory(key);
      // }
      analytics.load = function(key) {
        if (document !== undefined) {
          const script = document.createElement('script');
          script.type = 'text/javascript';
          script.async = true;
          script.src = `${document.location.protocol}//cdn.segment.com/analytics.js/v1/${key}/analytics.min.js`;

          // Insert our script next to the first script element.
          const first = document.getElementsByTagName('meta')[0];
          first.parentNode.insertBefore(script, first);
        }
      };
      analytics.SNIPPET_VERSION = '4.0.0';
    }
  }
  return analytics;
}
