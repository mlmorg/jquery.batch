module.exports = function (grunt) {

  grunt.initConfig({

    meta: {
      name: 'jquery-batch.js',
      version: '0.1',
      banner: '/*\n' + 
        ' * <%= meta.name %> v<%= meta.version %>\n' +
        ' * Copyright <%= grunt.template.today("yyyy") %>, Matt Morgan (@mlmorg)\n' +
        ' * May be freely distributed under the MIT license.\n */'
    },

    concat: {
      batch: {
        src: ['<banner>', '<file_strip_banner:jquery-batch.js>'],
        dest: 'jquery-batch.js'
      }
    },

    min: {
      batch: {
        src: ['<banner>', 'jquery-batch.js'],
        dest: 'jquery-batch.min.js'
      }
    },

    lint: {
      files: ['grunt.js', 'jquery-batch.js']
    },

    jshint: {
      options: {
        curly: true,
        eqeqeq: true,
        immed: false,
        latedef: true,
        newcap: true,
        noarg: true,
        sub: true,
        undef: true,
        boss: true,
        eqnull: true,
        browser: true,
        node: true
      },
      globals: {}
    }

  });

  grunt.registerTask('default', 'lint concat min');

};
