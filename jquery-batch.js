/*
 * jquery-batch.js v0.1
 * Copyright 2012, Matt Morgan (@mlmorg)
 * May be freely distributed under the MIT license.
 */

(function (window) {

  "use strict";

  // jQuery alias
  var $ = window.$;

  // Global batch settings
  $.batchSettings = {
    url: '/_bulk',
    type: 'POST',
    contentType: 'application/json',
    processData: false,
    dataType: 'text'
  };

  // Setup method
  $.batchSetup = function (options) {
    return $.extend($.batchSettings, options);
  };

  
  // $.batch class
  // -------------

  var Batch = $.batch = function (func, options) {
    // Always instantiate a Batch class even if called without "new"
    if (!(this instanceof Batch)) {
      return new Batch(func, options);
    }

    // Shift arguments if func is an object
    if (typeof func === 'object') {
      options = func;
      func = undefined;
    }

    // Default options
    this.options = $.extend({}, $.batchSettings, options);

    // Requests storage
    this.requests = [];
    
    return func ? this.add(func) : this;
  };

  // Our methods
  $.extend(Batch.prototype, {

    // Method for adding requests to the batch
    add: function (func) {
      // Set global _batch variable in jQuery.ajaxSettings
      $.ajaxSettings._batch = this;

      // Call the user's function
      func.call(this);
      
      // Remove the global _batch variable
      delete $.ajaxSettings._batch;

      return this;
    },

    // Method for running the batch request
    send: function (options) {
      var instance = this;

      if (this.requests.length) {
        // Map an array of requests
        var requests = $.map(this.requests, function (data, i) {
          return data.request;
        });

        // Set options
        $.extend(this.options, { data: JSON.stringify(requests) }, options);

        // Extend the success option
        var success = this.options.success;
        this.options.success = function (data, status, xhr) {
          // Call our _deliver method to handle each individual batch request response
          instance._deliver.call(instance, data, status, xhr);
          
          // User's success function
          if (success) {
            success(data, status, xhr);
          }
        };

        // Call the request
        return $.ajax(this.options);
      }
    },

    // Private method to add a request to the batch requests array
    _addRequest: function (xhr, settings) {
      // Create data object
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

      // Extract query params
      var queryparams = this._extractParams(settings.url);

      if (queryparams) {
        // Remove query params from url
        data.request.path = settings.url.replace('?' + queryparams, '');

        // Add the query params to the "query" object
        data.request.query = settings.query ? settings.query : queryparams;
      }

      // Set request header. Since the _bulk endpoint merges the outer request
      // into the inner requests, here we explicitly send the content-type
      // header for the inner request
      if (settings.contentType) {
        data.request.headers['content-type'] = settings.contentType;
      }

      // Set any user-passed headers. Similar to the request header above,
      // when the user passes headers in the settings.headers object we
      // explicitly set those for the inner requests
      if (settings.headers) {
        $.each(settings.headers, function (name, value) {
          data.request.headers[name.toLowerCase() || name] = value;
        });
      }

      // Add request object to the batch requests array
      this.requests.push(data);
    },

    // Delivers each batch request response to its intended xhr
    // success/error function
    _deliver: function (data, status, xhr) {
      var instance = this;
      // Create an array of returned responses based on newlines and
      // loop through them
      $.each(data.split('\n'), function (i, response) {
        // Only work with batch requests that we have stored
        if (!instance.requests[i]) {
          return;
        }

        // Grab the stored request data
        var request = instance.requests[i];

        // Parse the response
        response = JSON.parse(response);

        // Add the response status code to the xhr request
        request.xhr.status = response.status;

        // Build statusText a la jQuery based on status code
        request.xhr.statusText = instance._statusText(response.status);

        // Grab the user success/error function depending on the batch request response
        var callback = request.settings[request.xhr.statusText === 'error' ? 'error' : 'success'];

        // Call the function, if it exists
        if (callback) {
          callback.call(request.xhr, JSON.parse(response.body), request.xhr.statusText, request.xhr);
        }
      });
    },

    // Private method to extract query parameters from a string
    _extractParams: function (url) {
      var pos = url.lastIndexOf('?');
      return pos >= 0 ? url.substr(pos + 1) : null;
    },

    // Private method to create statusText based on a statusCode a la jQuery
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


  // $.ajax override
  // ---------------

  // Override jQuery.ajax to cancel any outgoing requests called within
  // a $.batch() function and add them to the batch requests array for
  // that batch instance
  var $ajax = $.ajax;
  
  $.ajax = function (url, options) {
    // Shift arguments when options are passed as first argument
    if (typeof url === 'object') {
      options = url;
      url = undefined;
    }

    // Set options object
    options = options || {};

    // Override the jQuery beforeSend method
    var beforeSend = options.beforeSend;
    options.beforeSend = function (xhr, settings) {
      // Call the user's beforeSend function, if passed
      if (beforeSend) {
        var before = beforeSend(xhr, settings);

        // Cancel request if user's beforeSend function returns false
        if (before === false) {
          return before;
        }
      }

      // We're only worried about requests made within a $.batch function
      // (aka they have a _batch object)
      if (settings._batch) {
        // Add request to batch
        settings._batch._addRequest(xhr, settings);

        // Cancel this request
        return false;
      }
    };

    // Run original $.ajax method for all other requests
    return $ajax.call(this, url, options);
  };

})(this);
