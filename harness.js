(function(){
	"use strict";

  var fs = require('fs');

	//var index = require('./watchS3.js');
	var index = require('./index.js');
	//var index = require('./emailReport.js');
	//var index = require('./createEB.js');
	//var index = require('./logEventToDynamo.js');
	// var index = require('./createEBLogDynamo.js');
  // var index = require('./boss.js');
  var data = fs.readFileSync('./test-data/test-event-category.json', 'utf-8');
  // var data = fs.readFileSync('./test-data/test-event.json', 'utf-8');
// var data = {};

  data = JSON.parse(data);


	//var data = {};
	index.handler(data, {'succeed': succeed}, succeed);

	function succeed (){console.info(arguments);}
})();