# jQuery Batch

Provides a simple interface for sending batch Ajax requests with jQuery.

## Usage

The default usage of jQuery Batch consists of simply running Ajax requests
inside an anonymous function within the batch constructor and calling the
`send` method, like so:

``` javascript
$.batch(function () {
  $.get('/users?order=name');
  $.post('/users/1', { name: 'Joe Strummer' });
}).send();
```

Requests can also be added to a batch dynamically at any point by using the
`add` method:

``` javascript
var batch = $.batch();

batch.add(function () {
  $.get('/users?order=name');
});

batch.send();
```

One useful example of the `add` method, is to be able to add requests to a
global batch that syncs with the server every 5 seconds:

``` javascript
var batch = $.batch();

setInterval(function () {
  batch.send();
}, 5000);
```

Note: jQuery Batch respects the `beforeSend` method of each individual request. If
this option returns `false`, the request will not be added to the batch. This
can be useful when caching requests irrespective of if they were called within
a batch request or not:

``` javascript
$.batch(function () {
  $.ajax({
    url: '/users?order=name',
    beforeSend: function (xhr, settings) {
      // If cached, this request will not be added to the batch.
      if (window.CachedRequests[settings.url]) {
        return false;
      }
    }
  });
}).send();
```

## Configuration

By default, jQuery Batch requests are sent with the following jQuery Ajax
options set:

- `url`: *_bulk*
- `type`: *POST*
- `contentType`: *application/json*
- `processData`: *false*
- `dataType`: *text*

All of these defaults (and any other jQuery Ajax options) can be changed using
the `$.batchSetup` function, like so:

``` javascript
$.batchSetup({
  contentType: 'application/x-www-form-urlencoded',
  processData: true
});
```

In addition, the following helper functions are also configurable using
`$.batchSetup`:

- `serialize([request], [xhr], [settings])`
    
    This is used to serialize the data of a single request. `request` is a
    hash consisting of:

    - `method` - the request method
    - `path` - the url path
    - `query` - a string of query parameters (if any were passed)
    - `headers` - a hash containing the request headers
    - `body` - the request body

    By default, this simply returns the `request` hash unchanged.

- `toJSON([requests])`

    This is used to serialize an array of all requests before it is sent as
    a batch Ajax request. `requests` is simply an array of all the
    individual requests in a batch. By default, this returns the `requests`
    array after passing it through `JSON.stringify`.

- `parse([data])`

    This is used to parse out the response from the server. This **must**
    return an array of request hashes, with each hash consisting of (at least):

    - `status` - the response status code
    - `body` - the body of the request response

    By default, `parse` assumes the server returns the results line-delimited
    (each request on one line) with each request as escaped-JSON text with a
    JSON `body` (thus, doubly-escaped JSON).

## Installation

Both compressed and minified versions of the library are available. Simply
include in your project and use as directed.
