(function(){
	"use strict";

	var	AWS = require("aws-sdk");

	var exports = {};

	AWS.config.update({
		region: "us-west-1",
		endpoint: (process.env && process.env.dynamoEndpoint) || "https://dynamodb.us-west-1.amazonaws.com"
	});

	var dynamodb = new AWS.DynamoDB();
	var dynamoClient = new AWS.DynamoDB.DocumentClient();

	function remove(params/*, options*/){
		return new Promise((resolve, reject) => {
			dynamodb.deleteTable(params, (error, data) => {
				if (error){
					console.error(error, error.stack);
					reject(error);
				} else {
					console.log(data);
					resolve(data);
				}
			});
		});
	}

	function get(params/*, options*/){
		return new Promise((resolve, reject) => {
			dynamoClient.get(params, (err, data) => {
				if (err) {
					//console.error(err);
					reject({"msg": "Getting item from dynamo", err});
				} else { 
					// console.info(data);
					resolve(data);
				}
			});
		});
	}

	function put(params/*, options*/){
		return new Promise((resolve, reject) => {
			dynamoClient.put(params, function(err /*, data*/) {
				if (err) {
					reject({msg: "unable to add item", err, params});
				} else {
					console.log("Saving item to dynamo:", params);
					resolve(params);
				}
			});
		});
	}

	function create(params/*, options*/){
		return new Promise((resolve, reject) => {
			dynamodb.createTable(params, (error, data) => {
				if (error){
					console.error(error, error.stack);
					reject(error);
				} else {
					console.log(data);
					resolve(data);
				}
			});
		});
	}

	function log(params/*, options*/){
		return new Promise((resolve, reject) => {
			dynamoClient.put(params, function(err /*, data*/) {
				if (err) {
					if (err.message === "The conditional request failed"){
						console.warn("item exists - skipping");
						console.error(err);
						reject(true);
					} else {
						console.error("Unable to add item:", err);
						reject({msg: "unable to add item", err, params});
					}
				} else {
					console.log("Saving item to dynamo:", {table: params.TableName, key: params.Item.date});
					resolve(true);
				}
			});
		});
	}

	
	//exports
	exports.remove = remove;
	exports.create = create;
	exports.log = log;
	exports.get = get;
	exports.put = put;

	module.exports = exports;
}());