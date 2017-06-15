(function(){
	"use strict";

	var _ = require('underscore'),
		dynamo = require('./dynamo.js'),
		program = require('commander'),
		unmarshalItem = require('dynamodb-marshaler').unmarshalItem,
		statemachine;

	program
		.version('0.0.1')
		.option('-s, --state [state]', 'test mode for [state]')
		.option('-r, --reset')
		.parse(process.argv);


	var getParams = {
		TableName: 'current_state',
		Key: {'state': 'current_state'},
		ConsistentRead: false, // optional (true | false)
		ReturnConsumedCapacity: 'NONE', // optional (NONE | TOTAL | INDEXES)
	};

	var putParams  = {
		TableName: 'current_state',
		Item: {'state': 'current_state', value: 0}
	};

	var state = program.state || null;

	var	startUpEvents = ["create-proxy", "create-collector"],
		standardCategories = ["fiesta"], //"advertising_tins", "golden_age_comic_books", "tobacco_tins", 
		tearDownEvents = ["destroy-collector", "destroy-proxy"],
		conditions = _makeConditions(startUpEvents, standardCategories, tearDownEvents),
		stateMapper = [
			{"name": "off"},
			{"name": "starting-up", "bounds": "create-collector-finish"}, 
			{"name": "all-ready", "bounds": "standard-start", "action": "release"}, 
			{"name": "start-standard", "bounds": "standard-finish", "exclusive": true/*, "action": "isFinished"*/}, 
			{"name": "finish-standard", "bounds": "destroy-collector-start", "action": "destroy", "exclusive": true}, 
			{"name": "shutting-down", "bounds": "destroy-proxy-finish"},
			{"name": "finished"}
		];

	var actions = {
		"release": _release,
		"isFinished": _isFinished,
		"destroy": _destroy
	};

	function _conditionStateMapper(){
		var currentStateValue = statemachine.getState();

		// return _.find(stateMapper, (state) => {
		// 	var bounds = state.bounds ? statemachine.getValue(state.bounds) : 0 ;

		// 	console.info("bounds " + bounds);
		// 	return currentStateValue >= bounds || bounds === 0;
		// });

		return _.find(stateMapper, (state) => {
			var bounds = state.bounds ? statemachine.getValue(state.bounds) : 0 ;
			console.info("checking " + state.name);
			console.info("bounds " + bounds);

			if (currentStateValue === 0) return true;

			var lowerBounds = state.exclusive ? (bounds - 1) : (bounds * 2 - 1) 

			return currentStateValue <  lowerBounds ? true : false;;
		}) || _.last(stateMapper);
	}

	function _release(){
		console.info("release the jobs!");
		console.info("start standard");
	}

	function _isFinished(){
		console.info("Am I finished?");
	}

	function _destroy(){
		console.info("finished standard");
		console.info("destroy collector and proxy");
	}

	function _makeConditions(startUpEvents, standardCategories, tearDownEvents){
		var returnObj = _makeEvents(startUpEvents);

		returnObj.push("standard-start");
		returnObj = returnObj.concat(_makeEvents(standardCategories));
		returnObj.push("standard-finish");
		returnObj = returnObj.concat(_makeEvents(tearDownEvents));

		return returnObj;
	}

	function _makeEvents(events){
		return _.flatten(_.map(events, (event) => {
			return [event + "-start", event + "-finish"];
		}));
	}

	if (program.reset){
		_reset(putParams);
	}


	function _getPutParams(state){
		putParams.Item.value = state
		return putParams;
	}
	// if (state === null){
	// 	_get(params).then((response) => {
	// 		console.info("I got the response");
	// 		console.info(response);
	// 		_put(putParams);
	// 	}, (error) => {
	// 		console.info("there was nothing");
	// 		_put(putParams);
	// 	});
	// }


	function _reset(params){
		_put(params).then((response) => {
			console.info("reset");
		}, (error) => {
			console.info("reset error");
		});
	}

	function _get(params){
		return dynamo.get(params).then((response) => {
			return response
		}, (error) => {
			return error;
		});
	}

	function _put(params){
		return dynamo.put(putParams).then((response) => {
			return response;
		}, (error) => {
			return error;
		});
	}

	function _process(evtData){

		_.each(evtData, _setState);

		var newStateValue = statemachine.getState();
		var newStateLabel = statemachine.getStateLabel();


		console.info("the new state value is " + newStateValue);
		console.info("the new state label is " + newStateLabel);

		_put(_getPutParams(newStateValue)).then((response) => {
			console.info("I put the state");
		}, (error) => {
			console.info("there was an error putting state");
		});
	}

	function _setState(event){
		console.info("the event");
		console.info(event.name);
		console.info(event.status);
		if (event.name && event.status){
			statemachine.setCondition(event.name + "-" + event.status);
		}
	}

	exports.handler = (event, context) => {

		if (program.reset) return;

		var rawEvtData = event.Records.map((record) => {
			return record.dynamodb.Keys
		});

		var evtData = rawEvtData.map(unmarshalItem);

		//console.info(evtData);



		_get(getParams).then((response) => {
			console.info("the current state is " + response.Item.value);
			statemachine = require('./statemachine.js')(response.Item.value, conditions);

			_process(evtData);

			var currentState = _conditionStateMapper();
			console.info("the state is " + currentState.name);

			if (currentState.action){
				actions[currentState.action]();
			}
			
			output();

		}, (error) => {
			console.info("there was nothing");
		});

		// log(event, context).then((response) => {
		// 	console.info("I got the response");
		// 	console.info(response);
		// }, (error) => {
		// 	console.error("I got an error");
		// 	console.error(error);
		// });
	};


	// var statemachine = require('./statemachine.js')(state, conditions);

	// statemachine.super = statemachine.getStateLabel;

	// statemachine.getStateLabel = (function(statemachine){
	// 	var currentState = statemachine.getState(),
	// 		lowerState = statemachine.getValue("standard-start"),
	// 		upperState = statemachine.getValue("standard-finish");

	// 	return function(){
	// 		if (currentState > lowerState && currentState < upperState){
	// 			return "processesing";
	// 		}
	// 		return statemachine.super();
	// 	}
	// })(statemachine)

	// console.info(statemachine.getStateLabel())

	//console.info(statemachine.getValue("standard-start"));

	// output();

	// statemachine.setCondition("proxy-create");

	// output();

	// statemachine.setCondition("collector-create");

	// output();

	// statemachine.setCondition("standard-start");

	// output();

	// statemachine.setCondition("advertising_tins");

	// output();

	// statemachine.setCondition("tin_signs");

	// output();

	// statemachine.setCondition("advertising_clocks");

	// output();

	// console.info(statemachine.getState());

	// console.info(statemachine.getStateLabel());

	function output(){
		_.each(conditions, (condition) => {
			console.info(condition + " : " + statemachine.isSet(condition));
		});

		console.info("Am I done? ");
		console.info(statemachine.getState());
		console.info(statemachine.getStateLabel());
		console.info(statemachine.isCompleted());

		console.info ("+++++++++++++++++++++++++")
	}

})();