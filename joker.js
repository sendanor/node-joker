#!/usr/bin/env node
/*
 * Joker CLI utility for resellers
 * Copyright 2012 Jaakko-Heikki Heusala <jheusala@iki.fi>
 */

/*
 * Joker.com API documentation:
 *   https://dmapi.joker.com/docs/DMAPI-ext.txt
 */

// FIXME: Change filedb so that it doesn't save backups or it can be opted out

function is_func(f) {
    if(f && (typeof f === 'function')) return true;
    return false;
}

var commands = module.exports = {},
    basedir = process.env.HOME || __dirname,
    db = require('filedb').config({'keep_backup':false}).open(basedir + '/.joker-cli.json'),
    foreach = require('snippets').foreach,
	rpad = require('snippets').rpad,
    dmapi = require('joker-dmapi'),
    easycli = require('easycli');

commands._opts_ = {'verbose': 0};

/* Event when database becomes ready */
db.on('ready', function() {
	db.hostname = db.hostname || 'dmapi.joker.com';
	db.username = db.username || '';
	db.password = db.password || '';
	
	/* */
	dmapi.on('error', function(err) {
	    console.error("Error: " + err);
	});
	
	if(db.auth && db.auth.id && db.auth.date && ((new Date()).getTime() - db.auth.date < 58*60*1000 ) ) {
		dmapi.config({'auth_id':db.auth.id});
	} else {
		delete db.auth;
		db.commit(function(err) { if(err) console.error('error when saving data: ' + err);});
	}
});

/* Help command */
commands.help = function(command) {
	if(command && commands.hasOwnProperty(command)) {
		easycli.init_commands(commands[command], command);
		if(is_func(commands[command].help)) {
			commands[command].help();
		} else {
			console.log("I'm sorry. This command does not have detailed help available.");
		}
	} else {
		console.log('usage: [--help] COMMAND [ARGS]');
		console.log("");
		console.log('The commands are:');
		console.log('   config             Change settings');
		console.log('   status             Get session status');
		console.log('   login              Login to reseller interface');
		console.log('   logout             Logout from reseller interface');
		console.log('   domain             Manage domains');
		console.log('   whois              Get information about specified object');
		console.log('   profile            Returns reseller profile data');
		console.log("");
		console.log("See 'joker help COMMAND' for more information on a specific command.");
	}
};

/* status */
commands['status'] = {
	'__title__': "Get session status",
	'__desc__': "Print status of joker.com's reseller session (DMAPI).",
	'_root_': function() {
		db.whenReady(function() {
			var now = new Date(),
			    seconds = (db && db.auth && db.auth.date) ? (now.getTime() - db.auth.date) / 1000 : undefined;
			if(db.auth && db.auth.id && db.auth.date && (seconds < 58*60 ) ) {
				console.log("Joker: online to " + db.auth.user +" (" + Math.floor(58*60-seconds) + " seconds left)");
			} else {
				console.log("Joker: offline");
				if(commands._opts_.verbose >= 1) {
					console.log('DEBUG: seconds = ' + seconds);
					if(db && db.auth && db.auth.date) console.log('DEBUG: db.auth.date = ' + db.auth.date);
					if(db && db.auth) console.log('DEBUG: db.auth = ' + db.auth);
				}
			}
		});
	}
};

/* login */
commands['login'] = {
	'__title__': "Login to DMAPI",
	'__desc__': "Login to joker.com's reseller interface (DMAPI).",
	'_root_': function(username, password) {
		db.whenReady(function() {
			dmapi.login({'hostname':db.hostname, 'username':username, 'password':password}, function(err, res) { 
				if(err) {
					console.error('Error: ' + err);
					return;
				}
				db.auth = {};
				db.auth.user = username;
				db.auth.date = (new Date()).getTime();
				db.auth.id = res.auth_id;
				db.commit(function(err) { if(err) console.error('error when saving data: ' + err);});
				console.log('Logged in!');
				if(commands._opts_.verbose >= 1) {
					console.log('DEBUG: auth_id = ' + res.auth_id);
				}
			});
		});
	}
};

/* logout -- */
commands['logout'] = {
	'__title__': "Logout from DMAPI",
	'__desc__': "Logout from joker.com's reseller interface (DMAPI).",
	'_root_': function() {
		db.whenReady(function() {
			dmapi.logout(function(err) { 
				if(err) {
					console.error('Error: ' + err);
					return;
				}
				db.auth = undefined;
				db.commit(function(err) { if(err) console.error('error when saving data: ' + err);});
				console.log('Logged out!');
				if(commands._opts_.verbose >= 1) {
					console.log('DEBUG: auth_id = ' + res.auth_id);
				}
			});
		});
	}
};


/* result-list -- */

/* result-retrieve -- */

/* result-delete --  */

/* domain -- Manage domains */
commands['domain'] = {
	'__title__': "Manage domains",
	'__desc__': "Try 'domain list' to list your domains.",
	
	// query-domain-list -- List domains
	'list': {
		'__title__': "List domains",
		'__desc__': 'List of registered domains and their expiration dates (one per line, separated by whitespace). If "showstatus" is present, the the list will be with three columns, the last one showing domain status (like "lock,autorenew" etc - comma separated).',
		'__opts__': {
			'pattern': 'Pattern to match (glob-like)',
			'from': 'Start from this item in list',
			'to': 'End by this',
			'showstatus': 'Add additional column, showing domain status, may be 0 or 1.',
			'showgrants': 'Add additional column, showing domain grants, may be 0 or 1.'
		},
		'_root_': function() {
			var my = this;
			var opts = my._opts_ || {};
			db.whenReady(function() {
			    dmapi.queryDomainList(opts, function(err, domains) {
					if(err) {
						console.error('Error: ' + err);
						return;
					}
					console.log(domains);
			    });
			});
		}
	}
};

/* TODO: query-contact-list --  */
/* TODO: query-ns-list, query-host-list --  */

/* query-whois -- */
commands['whois'] = {
	'__title__': "Get information about an object",
	'__desc__': 'Returns information about specified object (similar to whois), in format "key = value". This request reflects actual (live) data in Joker.com database. Exactly one of those options must be specified. Only object registered with Joker.Com may be queried.',
	'__opts__': {
		'domain': 'Domain name',
		'contact': 'Contact handle',
		'host': 'Host name'
	},
	'_root_': function() {
		var my = this;
		var opts = my._opts_ || {};
		db.whenReady(function() {
			dmapi.queryWhois(opts, function(err, data) { 
				if(err) {
					console.error('Error: ' + err);
					return;
				}
				foreach(data).each(function(value, key) {
					console.log(key + ' = ' + value);
				});
			});
		});
	}
};

/* query-profile --  */
commands['profile'] = {
	'__title__': "Returns reseller profile data",
	'__desc__': 'Returns reseller profile data in format "key = value". May be used to query account balance.',
	'_root_': function() {
		var my = this;
		db.whenReady(function() {
			dmapi.queryProfile(function(err, data) { 
				if(err) {
					console.error('Error: ' + err);
					return;
				}
				foreach(data).each(function(value, key) {
					console.log(key + ' = ' + value);
				});
			});
		});
	}
};

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

/* */
commands['_root_'] = function() {
	console.log("Try 'joker help'.");
};

/* echo */
commands['echo'] = {
	'__title__': "Echo arguments",
	'__desc__': "Test command for CLI code.",
	'_root_': function() {
		if(this['__name__']) {
			console.log('Command: ' + this['__name__']);
		}
		console.log('Arguments: ');
		for(var i = 0; i< arguments.length; ++i) {
			console.log(arguments[i]);
		}
	}
}

/* Run the framework */
easycli.run(commands);

/* EOF */
