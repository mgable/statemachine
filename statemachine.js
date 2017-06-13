/*jshint bitwise: false*/

(function(){
	"use strict";

	var _ = require('underscore');
	
	var state = null,
		conditions = {},
		index = 0;

	function StateMachine(initalState, initalConditions){
		this.state = initalState || initalState === 0 ? initalState : state;
		this.conditions =  _.object(initalConditions, _.range(initalConditions.length)) || conditions;
	}

	StateMachine.prototype.isSet = isSet;
	StateMachine.prototype.getValue = getValue;
	StateMachine.prototype.clearCondition = clearCondition;
	StateMachine.prototype.toggleCondition = toggleCondition;
	StateMachine.prototype.getState = getState;
	StateMachine.prototype.setCondition = setCondition;
	StateMachine.prototype.getCondition = getCondition;
	StateMachine.prototype.getStateLabel = getStateLabel;
	StateMachine.prototype.isCompleted = isCompleted;

	function isSet (condition){
		/*jshint validthis:true */
		var mask = _getMask(this.getCondition(condition));
		if ((this.state & mask) !== 0) {
			//console.info("bit is set");
			return true;
		} else {
			//console.info("bit is NOT set");
			return false;
		}
	}

	function getValue(condition){
		return _getMask(this.getCondition(condition));
	}

	function _getMask(n){
		return 1 << n;
	}

	function isCompleted(){
		var exp = _.values(this.conditions).length
		return ((1 << exp) - 1) === this.getState();
	}

	function setCondition(_condition){
		var condition = this.getCondition(_condition);

		if (typeof condition === "undefined"){
			throw new Error("Condition not found: " + _condition);
		}
		/*jshint validthis:true */
		var mask = _getMask(condition);
		this.state = this.state |= mask;
		return this.state;
	}

	function getCondition(condition){
		/*jshint validthis:true */
		return this.conditions[condition];
	}

	function clearCondition(condition){
		/*jshint validthis:true */
		var mask = _getMask(this.getCondition(condition));

		this.state = this.state &= ~mask;
		return this.state;
	}

	function toggleCondition(condition){
		/*jshint validthis:true */
		var mask = _getMask(this.getCondition(condition));

		this.state = this.state ^= mask;
		return state;
	}

	// returns the label of the current state
	function getStateLabel(){
		/*jshint validthis:true */
		if (! this.state){
			return "off";
		}

		var position = (_dec2bin(this.state).length - 1).toString(),
			labels = _.invert(this.conditions);

		return labels[position];
	}

	function getState(){
		/*jshint validthis:true */
		return this.state;
	}

	function _dec2bin(dec){
		return (dec >>> 0).toString(2);
	}

	module.exports = function(state, conditions){return new StateMachine(state, conditions);};
})();