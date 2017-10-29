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
var parser = require('xml2js').parseString;
var moment = require('moment');
var countdown = require('countdown');
require('moment-countdown');

//
//
//
var CassBot = function Constructor(settings) {
    this.settings = settings;
    this.settings.name = this.settings.name || 'cassbot';
    this.dbPath = settings.dbPath || path.resolve(__dirname, '..', 'data', 'cassbot.db');

    this.user = null;
    this.db = null;

    this.fuAppKey = 'uCEydSDMQ5DB4jRtLqk3v2snp';
    this.fuUserId = '50043';
    this.fuApiCode = 'U6usLSvFCF03RTlF83fqiemq6pH24w'; //rote only
    this.fuApiCode = 'ax80arv4ZQmuPQWWFuRrIOdDi59yTB'; //any group we have shared
    this.fuGroup = '47361';
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
    } else if (this._isCTACheck(message)){
	this._handleCTACheck(message);
    } else if (this._isFUCheck(message)) {
	this._handleFUCheck(message);
    } else if (this._is8Ball(message)) {
	this._handle8Ball(message);
    } else if (this._isFittings(message)) {
	this._handleFittings(message);
    } else if (this._isFitting(message)) {
	this._handleFitting(message);
    } else if (this._isDoctrines(message)) {
	this._handleDoctrines(message);
    } else if (this._isDoctrine(message)) {
	this._handleDoctrine(message);
    } else if (this._isTime(message)) {
	this._handleTime(message);
    }
};

//
// 
//
CassBot.prototype._sendMessage = function(msg, out) {
    console.log('Replying : ',out);
    this.postMessage(msg.channel, out, {as_user: true});
    return;
};

//
//
//
CassBot.prototype._isTime = function(message) {
    return Boolean(message.text) && message.text.toLowerCase().indexOf('!time') > -1;
};

CassBot.prototype._handleTime = function(message) {
    var self = this;
    var d1 = new Date();
    var d2 = new Date( d1.getUTCFullYear(), d1.getUTCMonth(), d1.getUTCDate(), d1.getUTCHours(), d1.getUTCMinutes(), d1.getUTCSeconds() );

    self._sendMessage(message,d2.toUTCString());

};

//
//
//
CassBot.prototype._is8Ball = function(message) {
    return Boolean(message.text) && message.text.toLowerCase().indexOf('!magic8ball') > -1;
};

CassBot.prototype._handle8Ball = function(message) {
    function randomNoRepeats(array) {
	var copy = array.slice(0);
	return function() {
	    if (copy.length < 1) { copy = array.slice(0); }
	    var index = Math.floor(Math.random() * copy.length);
	    var item = copy[index];
	    copy.splice(index,1);
	    return item;
	};
    }

    var responses = [
		     'It is certain',
		     'It is decidedly so',
		     'Without a doubt',
		     'Yes, definitely',
		     'You may rely on it',
		     'As I see it, yes',
		     'Most likely',
		     'Outlook good',
		     'Yes',
		     'Signs point to yes',
		     'Reply hazy try again',
		     'Ask again later',
		     'Better not tell you now',
		     'Cannot predict now',
		     'Concentrate and ask again',
		     'Don\'t count on it',
		     'My reply is no',
		     'My sources say no',
		     'Outlook not so good',
		     'Very doubtful'];
    var out = randomNoRepeats(responses)();
    this._sendMessage(message,out);
};

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

//
// FU : CTAs
//
CassBot.prototype._isFUCheck = function(message) {
    return Boolean(message.text) && message.text.toLowerCase().indexOf('!fu') > -1;
};

CassBot.prototype._handleFUCheck = function(message) {
    var self = this;
    var uri = 'http://api.fleet-up.com/Api.svc/'+this.fuAppKey+'/'+this.fuUserId+'/'+this.fuApiCode+'/Operations';
    
    var opts = {
	url: uri,
	headers: {
	    'User-Agent': 'javascript'
	}};
    
    request(opts, function(err,response,body) {
	console.log(opts,err,response,body);
	
	if ( !err && response.statusCode == 200 ) {
	    var out = '';
	    var data = JSON.parse(body);
            var now = Date.now();
	   
	    //Jalon sort by time attempt
            data.Data.sort(function (a, b) {
              return new Date(a.StartString) - new Date(b.StartString);
            });

 
	    data.Data.forEach(function(item) {
                if (new Date(item.StartString) > now) {
		    out = out + item.StartString + ' ('+timespan(item.Start)+')\t*' + item.Subject + '*\t' + item.Url + '\n';
                }
	    });

	    self._sendMessage(message, out);
	} else {
	    self._sendMessage(message,'fleet-up is smokin the crack.');
	}
    });
};

//
// FU : doctrines
//
CassBot.prototype._isDoctrines = function(message) {
    return Boolean(message.text) && message.text.toLowerCase().indexOf('!doctrines') > -1;
};

CassBot.prototype._handleDoctrines = function(message) {
    var self = this;
    var uri = 'http://api.fleet-up.com/Api.svc/'+this.fuAppKey+'/'+this.fuUserId+'/'+this.fuApiCode+'/Doctrines/'+this.fuGroup;
    
    var opts = {
	url: uri,
	headers: {
	    'User-Agent': 'javascript'
	}};
    
    request(opts, function(err,response,body) {
	console.log(opts,err,response,body);
	
	if ( !err && response.statusCode == 200 ) {
	    var out = 'When you ! the doctrine, give it <id> as a param. I didn\'t make this API.\n\n';
	    var data = JSON.parse(body);
	    
	    data.Data.forEach(function(item) {
		out = out + item.DoctrineId + '\t*' + item.Name + '*\n';
	    });

	    self._sendMessage(message, out);
	} else {
	    self._sendMessage(message,'fleet-up is smokin the crack.');
	}
    });
};

//
// FU : doctrine
//
CassBot.prototype._isDoctrine = function(message) {
    return Boolean(message.text) && message.text.toLowerCase().indexOf('!doctrine') > -1;
};

CassBot.prototype._handleDoctrine = function(message) {
    var self = this;

    var id = message.text.substring(10);//sizeof("!doctrine " )

    var uri = 'http://api.fleet-up.com/Api.svc/'+this.fuAppKey+'/'+this.fuUserId+'/'+this.fuApiCode+'/DoctrineFittings/'+id;
    
    var opts = {
	url: uri,
	headers: {
	    'User-Agent': 'javascript'
	}};
    
    request(opts, function(err,response,body) {
	console.log(opts,err,response,body);
	
	if ( !err && response.statusCode == 200 ) {
	    var out = 'Fitting IDs below, you can ! fitting to see the full fitting...\n\n';
	    var data = JSON.parse(body);

	    data.Data.forEach(function(item) {
		out = out + item.FittingId + '\t' + item.ShipType + ' :\t*' + item.Name + '*\t' + item.Role + '\t:\t' + item.Categories +  '\n';
	    });

	    self._sendMessage(message, out);
	} else {
	    self._sendMessage(message,'fleet-up is smokin the crack.');
	}
    });
};

//
// FU : fittings
//
CassBot.prototype._isFittings = function(message) {
    return Boolean(message.text) && message.text.toLowerCase().indexOf('!fittings') > -1;
};

CassBot.prototype._handleFittings = function(message) {
    var self = this;
    var uri = 'http://api.fleet-up.com/Api.svc/'+this.fuAppKey+'/'+this.fuUserId+'/'+this.fuApiCode+'/Fittings/'+this.fuGroup;
    
    var opts = {
	url: uri,
	headers: {
	    'User-Agent': 'javascript'
	}};
    
    request(opts, function(err,response,body) {
	console.log(opts,err,response,body);
	
	if ( !err && response.statusCode == 200 ) {
	    var out = '! fitting the ID for a dump... This is a long list, you are probably a dick for doing this.\n\n';
	    var data = JSON.parse(body);
	    
	    data.Data.forEach(function(item) {
		out = out + item.FittingId + '\t:\t*' + item.Name + '*\t - \t'+ item.ShipType + '\n';
	    });

	    self._sendMessage(message, out);
	} else {
	    self._sendMessage(message,'fleet-up is smokin the crack.');
	}
    });
};

//
// FU : fitting
//
CassBot.prototype._isFitting = function(message) {
    return Boolean(message.text) && message.text.toLowerCase().indexOf('!fitting') > -1;
};

CassBot.prototype._handleFitting = function(message) {
    var self = this;
    var id = message.text.substring(9);//sizeof("!fitting " )
    var uri = 'http://api.fleet-up.com/Api.svc/'+this.fuAppKey+'/'+this.fuUserId+'/'+this.fuApiCode+'/Fitting/'+id;
    
    var opts = {
	url: uri,
	headers: {
	    'User-Agent': 'javascript'
	}};
    
    request(opts, function(err,response,body) {
	console.log(opts,err,response,body);
	
	if ( !err && response.statusCode == 200 ) {
	    var out = '';
	    var data = JSON.parse(body).Data;

	    out = out + '*' + data.Name + '*\n';
	    out = out + '---------------------' + '\n';
	    out = out + '*Class :* ' + data.HullType + '\n';
	    out = out + '*Hull :* ' + data.ShipType + '\n';
	    out = out + '*Categories :* ' + data.Categories + '\n';
	    out = out + '---------------------' + '\n';

	    data.FittingData.forEach(function(item) {
		if ( item.Slot != "Ship" ) {
		    out = out + item.Quantity + '\t\t' + item.TypeName + '\n';
		}
	    });

	    self._sendMessage(message, out);
	} else {
	    self._sendMessage(message,'fleet-up is smokin the crack.');
	}
    });
};


////////////////////////////////////////////////////////////////////////////////
//
// CTA list.  May be useful.
//
var timespan=function(date) {
    return moment().countdown(date,countdown.DAYS|countdown.HOURS,NaN,2).toString();
};

CassBot.prototype._isCTACheck = function(message) {
    return Boolean(message.text) && message.text.toLowerCase().indexOf('!cta') > -1;
};
CassBot.prototype._handleCTACheck = function (originalMessage) {
    var self = this;
    var out = "default";

    this.db.get('SELECT * FROM settings WHERE k="ctaendpoint"', function(err,row) {
	var endpoint = row.v;
	out = endpoint;
	
	request(endpoint,function(err, response, body) {
	    if ( err ) {
		console.log(endpoint, err);
		out = "An error occurred in the request";
		return;
	    } else if ( response.statusCode !== 200 ) {
		console.log(endpoint, response);
		out = "An unexpected return code occurred : " + response.statusCode;
		return;
	    }
	    
	    parser(body,{trim: true}, function(err, result) {
		out = "";

		// This throws an exception if there are no CTA's.  I'm just going to pretend
		// that I'm OK with this because trycatch sucks ass in async languages.
		var entries = result.params.param[0].value[0].array[0].data[0].value;
		console.log(entries);
		entries.forEach(function(entry){
		    entry.struct.forEach(function(item){
			var drilldown = item.member;
			var o = {};
			drilldown.forEach(function(item) {
			    var k = item.name[0];
			    var v = item.value[0].string[0];
			    o[k]=v;
			});
			
			// outline
			out = out + o.dt +' ('+timespan(o.dt)+')\t' + o.title  + '\n';
		    });
		});
		
		self._sendMessage(originalMessage,out);
	    });
	});
    });
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

    var query = null;

    //
    // First, let's try an exact string match, this will bypass the too few items 
    //
    query = 'SELECT * FROM types WHERE name="'+itemname+'"';
    console.log(query);
    self.db.all(query, function(err,rows) {
	    if (err) {
		self._sendMessage(originalMessage, "Failed to find exact item match for "+itemname+", "+err);
	    }
	    
	    if ( rows.length === 1 ) {
		// Whoa, we found it! Yay.
		var item = rows[0];
		var id = item.id;
		var region = 10000002;
		var url='https://public-crest.eveonline.com/market/'
		    +region+'/types/'+id+'/history/';
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
		return; // We should be done here...
	    }

	    if ( rows.length === 0 ) {
		//
		// 90% of our queiries fall down this hole


		if ( itemname.length <4 ) {
		    self._sendMessage( originalMessage, "Please give me at least 4 characters to work with...");
		    return;
		}

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
	    }
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
