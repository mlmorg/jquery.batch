var fixtures = {

  validResponse: function (response, headers) {
    return [
      200,
      _.extend({ 'Content-Type': 'application/json' }, headers),
      JSON.stringify(response)
    ];
  },

  _bulk: function (attrs) {
    return "" + JSON.stringify({
      status: 200,
      body: JSON.stringify({ contact: { id: 1 } })
    }) + "\n" + JSON.stringify({ 
      status: 500,
      body: JSON.stringify({ error: 1 }) 
    });
  }

};
