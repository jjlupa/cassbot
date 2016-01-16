//
// cassbot.js
//
// src : https://scotch.io/tutorials/building-a-slack-bot-with-node-js-and-chuck-norris-super-powers
//

'use strict';

var util = require('util');
var path = require('path');
var fs = require('fs');
var SQLite = require('sqlite3').verbose();
var Bot = require('slackbots');
var Async = require('async');
var request = require('request');
var Numeral = require('numeral');

//
//
//
var CassBot = function Constructor(settings) {
    this.settings = settings;
    this.settings.name = this.settings.name || 'cassbot';
    this.dbPath = settings.dbPath || path.resolve(__dirname, '..', 'data', 'cassbot.db');

    this.user = null;
    this.db = null;
};

util.inherits(CassBot, Bot); // inherits methods and properties from the Bot constructor (slackbots)

//
// run() : 
//
CassBot.prototype.run = function () {
    CassBot.super_.call(this, this.settings); // Pretty sure this is where the slackbots package does its magic

    this.on('start', this._onStart);
    this.on('message', this._onMessage);
};

//
// _onStart() : 
//
CassBot.prototype._onStart = function () {
    this._loadBotUser();
    this._connectDb();
};

//
// _onMessage() : Called for every message we see.  We see PM's, or things that are in our channels, or certain
// notifications that reach across channels (such as availabilities or emoji's).
//
CassBot.prototype._onMessage = function (message) {
    if (!this._isMessage(message)) {
	return;
    }

    if (this._isSelf(message)) {
	return;
    }

    // logging actionable messages can be interesting
    console.log('Actionable Message Received : ',message);

    if (this._isPriceCheck(message)) {
        this._handlePriceCheck(message);
    } else if (this._isIncursionCheck(message)){
	this._handleIncursionCheck(message);
    }
};

//
// 
//
CassBot.prototype._sendMessage = function(msg, out) {
    console.log('Replying : ',out);
    this.postMessage(msg.channel, out, {as_user: true});
    return;
}

////////////////////////////////////////////////////////////////////////////////
//
// Incursions just returns a list of tackling rats for now
//
CassBot.prototype._isIncursionCheck = function(message) {
    return Boolean(message.text) && message.text.toLowerCase().indexOf('!incursion') > -1;
};
CassBot.prototype._handleIncursionCheck = function (originalMessage) {
    var out = "Schmaael Medulla\nTama Cerebellum\nAuga Hypophysis\nDeltole Tegmentum\nOutuni Mesen";
    this._sendMessage(originalMessage,out);
};


////////////////////////////////////////////////////////////////////////////////
//
// Price check is our meat and potatoes for now.  The idea is, if a user asks for a price, we
// go out to CREST and get what they want, and spit it back where it came from.  We should do
// some caching around this because durr.
//
CassBot.prototype._isPriceCheck = function (message) {
    return Boolean(message.text) && message.text.toLowerCase().indexOf('!price') === 0;
};


//
// _handlePriceCheck() : Doit();
//
CassBot.prototype._handlePriceCheck = function (originalMessage) {
    var self = this;

    var body = originalMessage.text;
    var itemname = body.substring(7);//sizeof("!price " )

    // Do a little bit of validation
    if ( itemname.indexOf(';')>-1) { //this is going into a query, this person is a dick and I'm ignoring them
	return;
    }

    if ( itemname.length <4 ) {
	self._sendMessage( originalMessage, "Please give me at least 4 characters to work with...");
	return;
    }

    var query = null;

    // I can't get this to work.
    //	query = 'SELECT id FROM types WHERE name LIKE "%?%"';
    query = 'SELECT * FROM types WHERE name LIKE "%'+itemname+'%"';
    console.log(query);
    self.db.all(query, function(err,rows) {
	    if (err) { 
		self._sendMessage(originalMessage, "Errors occurred searching for "+itemname+", "+err ); 
		return; //let's consider this a terminating error
	    }
	   
	    if ( rows.length === 0 ) {
		self._sendMessage(originalMessage, "Failed to find any matching items");
	    }
    
	    if ( rows.length > 15 ) {
		self._sendMessage(originalMessage, 'Your query found '+rows.length+' matches, which is too man, focus man, and try again!');
		return;
	    }
    
	    rows.forEach(function(item) {
		    var id = item.id;
		    var region = 10000002;
		    var url='https://public-crest.eveonline.com/market/'+region+'/types/'+id+'/history/';
		    request(url, function(err,response,body) {
			    if (err || response.statusCode !== 200) {
				self._sendMessage(originalMessage, 'Error pulling price info for ' + item.name + ' ('+item.id+')' );
				return;
			    }

			    var page = JSON.parse(body);
				
			    if (page.totalCount !== 0 ) {
				self._sendMessage(originalMessage, self._formatPriceMessage(item.name,page.items[page.items.length - 1]));
			    }   
			});
		});
	});
};

CassBot.prototype._formatPriceMessage = function(name,today) {
    var out = 'Today\'s Jita Market Report on '+name+' :\n';
    out = out + '\tHigh sell price of '+Numeral(today.highPrice).format('0,0.00')+
    ', low sell price of '+Numeral(today.lowPrice).format('0,0.00')+
    ' (ave: '+Numeral(today.avgPrice).format('0,0.00')+') on a volume of '+Numeral(today.volume).format('0,0')+' units.';
    return out;
};

//
// _connectDB() : Connect and Init the DB as needed.
//
CassBot.prototype._connectDb = function() {
    if (!fs.existsSync(this.dbPath)) {
        console.error('Database path ' + '"' + this.dbPath + '" does not exists or it\'s not readable.');
        process.exit(1);
    }

    this.db = new SQLite.Database(this.dbPath);
    this.db.serialize();
};

//
//
//
CassBot.prototype._welcomeMessage = function () {
    this.postMessageToChannel(this.channels[0].name,
			      'Instructions go here.  For now, know that I love you. (also !jitaprice)',
                              {as_user: true});
};

//
// _isChannelConversation() : turns out 'C' means it's in a public channel. Turns out 'G' means group
// chat.  Turns out all "secured channels" are just permanent group chats.
//
CassBot.prototype._isChannelConversation = function (message) {
    return typeof message.channel === 'string' && 
    (message.channel[0] === 'C' || message.channel[0] === 'G');
};

//
// _isMessage() : 
//
CassBot.prototype._isMessage = function (message) {
    return Boolean(message.text);
};

//
// _isSelf() : We never care about messages we send.
//
CassBot.prototype._isSelf = function (message) {
    return message.user === this.user.id;
};


//
// _loadBotUser() : Maps our username to the slack user object
//
CassBot.prototype._loadBotUser = function () {
    var self = this;
    this.user = this.users.filter(function (user) {
        return user.name === self.name;
    })[0];
};

module.exports = CassBot;
