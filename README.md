# jQuery Batch

Provides a simple interface for sending batch ajax requests with jQuery.

## Usage

The following example illustrates how to send a single batch request consisting of two basic jQuery Ajax requests:

``` javascript
$.batch(function () {
  $.get('/users?order=name');
  $.post('/users/1', { name: 'Joe Strummer' });
}).send();
```

The above bulk request would be sent with the following format:

``` javascript
[
  {
    path: '/users',
    query: 'order=name',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    method: 'GET'
  {
    path: '/contacts/1',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    method: 'PUT',
    body: { name: 'Joe Strummer' }
  }
]
```

Requests can also be added to a batch at any point before calling the `send` method by using the `add` method:

``` javascript
var batch = $.batch();
batch.add(function () {
  $.get('/users?order=name');
});
batch.send();
```

One useful example of using `add` might be to create a global batch that syncs with the server every 5 seconds:

``` javascript
var batch = $.batch();
setTimeout(function () {
  batch.send();
}, 5000);
```
