#!/usr/bin/env node

var commands = module.exports = {},
    basedir = process.env.HOME || __dirname,
    db = require('filedb').open(basedir + '/.joker-cli.json'),
    foreach = require('snippets').foreach,
	rpad = require('snippets').rpad,
    dmapi = require('joker-dmapi');

// FIXME: Change filedb so that it doesn't save backups or it can be opted out

/* Event when database becomes ready */
db.on('ready', function() {
	db.hostname = db.hostname || 'dmapi.joker.com';
	db.username = db.username || '';
	db.password = db.password || '';
	
	/* */
	dmapi.on('error', function(err) {
	    console.log("Error: " + err);
	});
	
	if(db.auth_key) {
		dmapi.config({'auth_key':db.auth_key});
	} else {
		dmapi.login({'hostname':db.hostname, 'username':db.username, 'password':db.password}, function(err, res) { 
			if(err) {
				console.log('Error: ' + err);
				return;
			}
			db.auth_key = res.auth_key;
			db.commit();
		});
	}
});

/* Help command */
commands.help = function() {
	console.log('Commands:');
	console.log('  config list           -- list configuration');
	console.log('  config set KEY=VALUE  -- set configuration');
	console.log('  login                 -- login to DMAPI');
	console.log('  query-domain-list     -- list domains');
};

/* List domains */
commands['query-domain-list'] = function() {
	db.whenReady(function() {
	    dmapi.queryDomainList(function(domains) {
			
	    });
	});
};

require('./cli.js').run(commands);

/* EOF */
