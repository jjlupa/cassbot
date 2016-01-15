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
var PriceListener = require('../lib/pricelistener');

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

    console.log(message);

    if (this._isPriceCheck(message)) {
        this._handlePriceCheck(message);
    }
};

//
// _handlePriceCheck() : Doit();
//
CassBot.prototype._handlePriceCheck = function (originalMessage) {
    var body = originalMessage.text;
    var tail = body.substring(11);//sizeof(!jitaprice )

    var listener = new PriceListener();
    var out = listener.get(tail);

    if ( this._isChannelConversation(originalMessage)) {
	console.log( "channel " + out );
	var channel = this._getChannelById(originalMessage.channel);
	this.postMessageToChannel(channel.name, out, {as_user: true});
    } else {
	console.log( " user " + out );
	var user = this._getUserById(originalMessage.user);
	this.postMessageToUser(user.name, out, {as_user: true});
    }
};

//
// _connectDB() : Connect and Init the DB as needed.
//
CassBot.prototype._connectDb = function () {
    if (!fs.existsSync(this.dbPath)) {
        console.error('Database path ' + '"' + this.dbPath + '" does not exists or it\'s not readable.');
        process.exit(1);
    }

    this.db = new SQLite.Database(this.dbPath);
    this.db.serialize();
    this.db.run('CREATE TABLE IF NOT EXISTS info (name TEXT PRIMARY KEY, val TEXT DEFAULT NULL)');
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
// _isChatMessage() : 
//
CassBot.prototype._isChatMessage = function (message) {
    return message.type === 'message' && Boolean(message.text);
};

//
// _isChannelConversation() : turns out 'C' means it's in a public channel.
//
CassBot.prototype._isChannelConversation = function (message) {
    return typeof message.channel === 'string' && message.channel[0] === 'C';
};

//
// _isPriceCheck() : This is a trigger check for the pricecheck functionality.
//
CassBot.prototype._isPriceCheck = function (message) {
    return Boolean(message.text) && message.text.toLowerCase().indexOf('!jitaprice') > -1;
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

//
//
//
CassBot.prototype._getChannelById = function (channelId) {
    return this.channels.filter(function (item) {
        return item.id === channelId;
    })[0];
};

//
//
//
CassBot.prototype._getUserById = function (userid) {
    return this.users.filter(function(user) {
	    return user.id === userid;
	})[0];
}

module.exports = CassBot;
