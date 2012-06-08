(function (window) {

  // jQuery alias
  var $ = window.$;

  // create our class
  var Batch = function (func, options) {
    // always instantiate a Batch class even if called without "new"
    if (!(this instanceof Batch)) {
      return new Batch(func, options);
    }

    // shift arguments if func is an object
    if (typeof func === 'object') {
      options = func;
      func = undefined;
    }

    // default options
    this.options = $.extend({
      url: '/_bulk',
      type: 'POST',
      contentType: 'application/json',
      processData: false,
      dataType: 'text'
    }, options);

    // requests storage
    this.requests = [];
    
    return func ? this.add(func) : this;
  };

  // add our class to the jQuery namespace
  $.batch = Batch;

  // our methods
  $.extend(Batch.prototype, {

    // method for adding requests to the batch
    add: function (func) {
      // set global _batch variable in jQuery.ajaxSettings
      $.ajaxSettings._batch = this;

      // call the user's function
      func.call(this);
      
      // remove the global _batch variable
      delete $.ajaxSettings._batch;

      return this;
    },

    // method for running the batch request
    sync: function (options) {
      var instance = this;

      // map an array of requests
      var requests = $.map(this.requests, function (data, i) {
        return data.request;
      });

      // set options
      $.extend(this.options, { data: requests }, options);

      // extend the success option
      var success = this.options.success;
      this.options.success = function (data, status, xhr) {
        // call our _deliver method to handle each individual batch request response
        instance._deliver.call(instance, data, status, xhr);
        
        // user's success function
        if (success) {
          success(data, status, xhr);
        }
      };

      // call the request
      return $.ajax(this.options);
    },

    // private method to add a request to the batch requests array
    _addRequest: function (xhr, settings) {
      // create data object
      var data = {
        xhr: xhr,
        settings: settings,
        request: {
          method: settings.type,
          path: settings.url,
          headers: {},
          body: settings.data
        }
      };

      // extract query params
      var queryparams = this._extractParams(settings.url);

      if (queryparams) {
        // remove query params from url
        data.request.path = settings.url.replace('?' + queryparams, '');

        // decode query params into "query" object if it doesn't already exist
        // if jQuery and $.deparam are present, they will be used
        // otherwise, we use the built-in query param decoder
        data.request.query = settings.query ? settings.query : $ && $.deparam ? $.deparam(queryparams) : this._deparam(queryparams);
      }

      // set request header
      // since the _bulk endpoint merges the outer request into the inner requests
      // here we explicitly send the content-type header for the inner request
      if (settings.contentType) {
        data.request.headers['content-type'] = settings.contentType;
      }

      // set any user-passed headers
      // similar to the request header above, when the user passes headers in the settings.headers object
      // we explicitly set those for the inner requests
      if (settings.headers) {
        $.each(settings.headers, function (name, value) {
          data.request.headers[name.toLowerCase() || name] = value;
        });
      }

      // add request object to the batch requests array
      this.requests.push(data);
    },

    // delivers each batch request response to its intended xhr success/error function
    _deliver: function (data, status, xhr) {
      var instance = this;
      // create an array of returned responses based on newlines and loop through them
      $.each(data.split('\n'), function (i, response) {
        // only work with batch requests that we have stored
        if (!instance.requests[i]) {
          return;
        }

        // grab the stored request data
        var request = instance.requests[i];

        // parse the response
        response = JSON.parse(response);

        // add the response status code to the xhr request
        request.xhr.status = response.status;

        // build statusText a la jQuery based on status code
        request.xhr.statusText = instance._statusText(response.status);

        // grab the user success/error function depending on the batch request response
        var callback = request.settings[request.xhr.statusText == 'error' ? 'error' : 'success'];

        // call the function, if it exists
        if (callback) {
          callback.call(request.xhr, JSON.parse(response.body), request.xhr.statusText, request.xhr);
        }
      });
    },

    // private method to extract query parameters from a string
    _extractParams: function (url) {
      var pos = url.lastIndexOf('?');
      return pos >= 0 ? url.substr(pos + 1) : null;
    },

    // private method to decode query parameters (not very robust)
    _deparam: function (string) {
      var params = {};

      // loop through key/value pairs
      $.each(string.split('&'), function (i, pair) {
        // extract the key & value
        pair = pair.split('=');

        // add pairs to params object
        params[pair[0]] = pair[1];
      });

      return params;
    },

    // private method to create statusText based on a statusCode a la jQuery
    _statusText: function (code) {
      var statusText = 'error';
      if (code >= 200 && code < 300 || code === 304) {
        if (code === 304) {
          statusText = 'notmodified';
        } else {
          statusText = 'success';
        }
      }
      return statusText;
    }

  });

  // override jQuery.ajax to cancel any outgoing requests called within a Batch() function
  // and add them to the batch requests array for that batch instance
  // -------
  
  var $ajax = $.ajax;
  
  $.ajax = function (url, options) {
    // shift arguments when options are passed as first argument
    if (typeof url === 'object') {
      options = url;
      url = undefined;
    }

    // set options object
    options = options || {};

    // override the jQuery beforeSend method
    var beforeSend = options.beforeSend;
    options.beforeSend = function (xhr, settings) {
      // call the user's beforeSend function, if passed
      if (beforeSend) {
        var before = beforeSend(xhr, settings);

        // cancel request if user's beforeSend function returns false
        if (before === false) {
          return before;
        }
      }

      // we're only worried about requests made within a Batch function (aka they have a _batch object)
      if (settings._batch) {
        // add request to batch
        settings._batch._addRequest(xhr, settings);

        // cancel this request
        return false;
      }
    };

    // run original $.ajax method for all other requests
    return $ajax.call(this, url, options);
  };

})(window);
