describe('$.batch', function () {

  var batch, url, type, data;

  beforeEach(function () {
    data = { id: 1 };
    url = '/contacts/1';
    type = 'PUT';
  });

  describe('when editing the global batch settings', function () {

    var options;

    beforeEach(function () {
      options = { url: '/batch' };
      $.batchSetup(options);
      batch = $.batch();
    });

    it('should change the global batch settings object', function () {
      expect($.batchSettings.url).to.equal(options.url);
    });

    it('should change the settings for a batch request instance', function () {
      expect(batch.options.url).to.equal(options.url);
    });

  });

  describe('when instantiating without using the new operator', function () {

    beforeEach(function () {
      batch = $.batch();
    });

    it('should instantiate the $.batch class', function () {
      expect(batch instanceof $.batch).to.be.true;
    });

  });

  describe('when adding requests on instantiation', function () {

    var add;

    beforeEach(function () {
      add = sinon.spy($.batch.prototype, 'add');
      batch = new $.batch(function () {
        $.ajax(url);
      });
    });

    afterEach(function () {
      add.restore();
    });

    it('should call $.batch.add', function () {
      expect(add.calledOnce).to.be.true;
    });

    it('should add the request to the batch', function () {
      expect(batch.requests.length).to.equal(1);
    });

  });

  describe('when adding requests to the batch via batch.add(func)', function () {

    beforeEach(function () {
      batch = new $.batch();
    });

    describe('when passing success/error functions as options', function () {

      var success, error;

      beforeEach(function () {
        success = sinon.spy();
        error = sinon.spy();
        batch.add(function () {
          $.ajax(url, { type: type, data: data, success: success, error: error });
          $.ajax(url, { type: type, data: data, success: success, error: error });
        });
      });

      it('should add the requests to the batch', function () {
        expect(batch.requests.length).to.equal(2);
      });

      it('should have the correct request type in the request object', function () {
        expect(batch.requests[0].request.method).to.equal(type);
      });

      it('should have the url without query params in the request object', function () {
        expect(batch.requests[0].request.path).to.equal(url);
      });

      it('should have the data in the request object', function () {
        expect(batch.requests[0].request.body).to.eql($.param(data));
      });

      it('should remove _bulk reference in $.ajaxSettings once request is added to the batch', function () {
        expect($.ajaxSettings._bulk).to.not.exist;
      });

      describe('when calling $.batch.send', function () {

        var server;

        beforeEach(function () {
          server = sinon.fakeServer.create();
        });

        afterEach(function () {
          server.restore();
        });

        describe('with no requests', function () {

          beforeEach(function () {
            batch.requests = [];
            batch.send();
          });

          it('should not make a request', function () {
            expect(server.requests.length).to.equal(0);
          });

        });

        describe('with requests', function () {

          var body;

          beforeEach(function () {
            batch.send();
            body = JSON.parse(server.requests[0].requestBody);
          });

          it('should make request', function () {
            expect(server.requests.length).to.equal(1);
          });

          it('should make request via POST', function () {
            expect(server.requests[0].method).to.equal('POST');
          });

          it('should have the batch requests in the body', function () {
            expect(body.length).to.equal(2);
          });

          it('should send a PUT in the method parameter of the batch request', function () {
            expect(body[0].method).to.equal(type);
          });

          it('should send the correct URL in the path parameter of the batch request', function () {
            expect(body[0].path).to.equal(url);
          });

          it('should send the correct encoded body in the data parameter of the batch request', function () {
            expect(body[0].body).to.eql($.param(data));
          });

          describe('when the server responds', function () {

            var response;

            beforeEach(function () {
              response = fixtures._bulk().split('\n');
              server.respondWith(fixtures.validResponse(fixtures._bulk(), { 'Content-Type': 'text/plain' }));
              server.response[2] = JSON.parse(server.response[2]);
              server.respond();
            });

            it('should call the success function on a successful request', function () {
              expect(success.calledOnce).to.be.true;
            });

            it('should pass the parsed response to the success function', function () {
              expect(success.args[0][0]).to.eql(JSON.parse(JSON.parse(response[0]).body));
            });

            it('should call the error function on a failed request', function () {
              expect(error.calledOnce).to.be.true;
            });

            it('should pass the parsed response to the error function', function () {
              expect(error.args[0][0]).to.eql(JSON.parse(JSON.parse(response[1]).body));
            });

          });

        });

      });

    });

    describe('when passing a beforeSend function in the options', function () {

      var beforeSend;

      describe('when the function does not return false', function () {

        beforeEach(function () {
          beforeSend = sinon.spy();
          batch.add(function () {
            $.ajax(url, { type: type, data: data, beforeSend: beforeSend });
          });
        });

        it('should call the beforeSend function', function () {
          expect(beforeSend.calledOnce).to.be.true;
        });

        it('should continue adding request to batch', function () {
          expect(batch.requests.length).to.equal(1);
        });

      });

      describe('when the function returns false', function () {

        beforeEach(function () {
          beforeSend = function () { return false; };
          batch.add(function () {
            $.ajax(url, { type: type, data: data, beforeSend: beforeSend });
          });
        });
        
        it('should not add request to batch', function () {
          expect(batch.requests.length).to.equal(0);
        });

      });

    });

  });

  describe('when making a batch request within another batch request', function () {

    var server;

    beforeEach(function () {
      batch = new $.batch(function () {
        $.ajax(url);
        $.batch(function () {
          $.ajax(url);
        }).send();
        $.ajax(url);
      });
    });

    it('should add all requests to the outer batch', function () {
      expect(batch.requests.length).to.equal(3);
    });

    describe('when calling send on the outer batch', function () {

      var server;

      beforeEach(function () {
        server = sinon.fakeServer.create();
        batch.send();
      });

      afterEach(function () {
        server.restore();
      });
      
      it('should only make a single batch request', function () {
        expect(server.requests.length).to.equal(1);
      });

    });

  });

});
