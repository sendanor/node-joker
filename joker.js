#!/usr/bin/env node
/*
 * Joker CLI utility for resellers
 * Copyright 2012 Jaakko-Heikki Heusala <jheusala@iki.fi>
 */

/*
 * API documentation:
 *   https://dmapi.joker.com/docs/DMAPI-ext.txt
 */

var commands = module.exports = {},
    basedir = process.env.HOME || __dirname,
    db = require('filedb').config({'keep_backup':false}).open(basedir + '/.joker-cli.json'),
    foreach = require('snippets').foreach,
	rpad = require('snippets').rpad,
    dmapi = require('joker-dmapi');

// FIXME: Change filedb so that it doesn't save backups or it can be opted out

commands._opts = {'verbose': 0};

/* Event when database becomes ready */
db.on('ready', function() {
	db.hostname = db.hostname || 'dmapi.joker.com';
	db.username = db.username || '';
	db.password = db.password || '';
	
	/* */
	dmapi.on('error', function(err) {
	    console.log("Error: " + err);
	});
	
	if(db.auth && db.auth.id && db.auth.date && ((new Date()).getTime() - db.auth.date < 58*60*1000 ) ) {
		dmapi.config({'auth_id':db.auth.id});
	} else {
		delete db.auth;
		db.commit(function(err) { if(err) console.log('error when saving data: ' + err);});
	}
});

/* Help command */
commands.help = function() {
	console.log('Commands:');
	console.log('  config list           -- list configuration');
	console.log('  config set KEY=VALUE  -- set configuration');
	console.log('  status                -- get session status');
	console.log('  login USER PW         -- login to DMAPI');
	console.log('  logout                -- logout');
	console.log('  query-domain-list     -- list domains');
};

/* List domains */
commands['status'] = function() {
	db.whenReady(function() {
		var now = new Date(),
		    seconds = (db && db.auth && db.auth.date) ? (now.getTime() - db.auth.date) / 1000 : undefined;
		if(db.auth && db.auth.id && db.auth.date && (seconds < 58*60 ) ) {
			console.log("Joker: online (" + Math.floor(58*60-seconds) + " seconds left)");
		} else {
			console.log("Joker: offline");
			if(commands._opts.verbose >= 1) {
				console.log('DEBUG: seconds = ' + seconds);
				if(db && db.auth && db.auth.date) console.log('DEBUG: db.auth.date = ' + db.auth.date);
				if(db && db.auth) console.log('DEBUG: db.auth = ' + db.auth);
			}
		}
	});
};

/* login -- */
commands['login'] = function(username, password) {
	db.whenReady(function() {
		dmapi.login({'hostname':db.hostname, 'username':username, 'password':password}, function(err, res) { 
			if(err) {
				console.log('Error: ' + err);
				return;
			}
			db.auth = {};
			db.auth.date = (new Date()).getTime();
			db.auth.id = res.auth_id;
			db.commit(function(err) { if(err) console.log('error when saving data: ' + err);});
			console.log('Logged in!');
			if(commands._opts.verbose >= 1) {
				console.log('DEBUG: auth_id = ' + res.auth_id);
			}
		});
	});
};

/* logout -- */
commands['logout'] = function() {
	db.whenReady(function() {
		dmapi.logout(function(err) { 
			if(err) {
				console.log('Error: ' + err);
				return;
			}
			db.auth = undefined;
			db.commit(function(err) { if(err) console.log('error when saving data: ' + err);});
			console.log('Logged out!');
			if(commands._opts.verbose >= 1) {
				console.log('DEBUG: auth_id = ' + res.auth_id);
			}
		});
	});
};


/* result-list -- */

/* result-retrieve -- */

/* result-delete --  */

/* query-domain-list -- List domains */
commands['query-domain-list'] = function() {
	db.whenReady(function() {
	    dmapi.queryDomainList({}, function(err, domains) {
			if(err) {
				console.log('Error: ' + err);
				return;
			}
			console.log(domains);
	    });
	});
};

/* TODO: query-contact-list --  */
/* TODO: query-ns-list, query-host-list --  */
/* TODO: query-whois --  */
/* TODO: query-profile --  */
/* TODO: contact-create --  */
/* TODO: contact-modify --  */
/* TODO: contact-delete --  */
/* TODO: ns-create, host-create --  */
/* TODO: ns-modify, host-modify --  */
/* TODO: ns-delete, host-delete --  */
/* TODO: domain-register --  */
/* TODO: domain-renew --  */
/* TODO: domain-transfer-in --  */
/* TODO: domain-transfer-in-reseller --  */
/* TODO: domain-transfer-get-auth-id --  */
/* TODO: domain-modify --  */
/* TODO: domain-delete --  */
/* TODO: domain-owner-change --  */
/* TODO: domain-lock --  */
/* TODO: domain-unlock --  */
/* TODO: domain-set-property --  */
/* TODO: domain-get-property --  */
/* TODO: grants-list --  */
/* TODO: grants-invite --  */
/* TODO: grants-revoke --  */
/* TODO: dns-zone-list --  */
/* TODO: dns-zone-get --  */
/* TODO: dns-zone-put --  */

/* Run the framework */
require('./cli.js').run(commands);

/* EOF */
