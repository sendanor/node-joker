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
		console.log('   grants             Manage grants');
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
	},

	// domain-renew
	'renew': {
		'__title__': "Renew domain",
		'__desc__': 'With this command you can renew the domain. Please be aware that all renewals are not refundable.\n\n'+
		            'IMPORTANT: Please note that registration period is in MONTHS, NOT YEARS!\n\n'+
		            '"expyear" is a safe option which can be used instead of "period" to renew domain till specified year (not longer). '+
					'If you use "period", and by mistake send the request more than once, domain will be renewed again, while with "expyear", '+
					'it will not be renewed if ' + "it's" + ' expiration year is greater or equals to specified.\n\n'+
		            'Only one of "period" or "expyear" may be used, but not both.\n\n'+
					'Please note: Successful execution does not always mean the domain really was renewed. Check "joker result".',
		'__opts__': {
			'domain': 'Domain name to renew',
			'period': 'Renewal period in months (not in years!)',
			'expyear': 'Wanted expiration year'
		},
		'_root_': function() {
			var my = this;
			var opts = my._opts_ || {};
			db.whenReady(function() {
			    dmapi.domainRenew(opts, function(err) {
					if(err) {
						console.error('Error: ' + err);
						return;
					}
					console.log('Domain renewed successfully.');
			    });
			});
		}
	},

	// domain-modify
	'modify': {
		'__title__': "Modify domain data",
		'__desc__': 'With this command you can modify contact handles for the domain, list of nameservers or DNSSEC parameters (for DNSSEC enabled domains).\n\n'+
					'If specific value is not present, it will not be touched. Modification of nameservers or DNSSEC parameters will replace currently defined set of DNSSEC keys or nameservers.\n\n'+
					'NOTE: DNSSEC parameters (ds-N) must be specified in order (ds-1, ds-2 etc), and due to techinical limitations this is impossible to modify only specific key - they must be set all at once. This means that any request to modify DNSSEC records will *replace* existing keys with only those which are provided!\n\n'+
					'Example for adding one key (and enabling DNSSEC):\n\n'+
					'   joker domain modify --domain=example.com --dnssec=1 --ds-1=9934:8:1:C4BF75B16AF82888B61E28951BEF27804B60D968\n\n'+
					'Example for removing DNSSEC information:\n\n'+
					'   joker domain modify --domain=example.com --dnssec=0\n\n'+
					'NOTE: You have to have your own nameservice somewhere else to support DNSSEC, if you use Joker.com nameservice, DNSSEC will not be provided!\n\n'+
					'ds-N: List of DNSSEC parameters for DNSSEC enabled domains\n' +
					'      For com/net/org/tv/cc each entry has format:'+
					'      	   tag:alg:digest-type:digest'+
					'      For de:'+
					'          protocol:alg:flags:pubkey-base64',
		'__opts__': {
			'domain': 'Domain to modify',
			'billing-c': 'New billing contact handle',
			'admin-c': 'New administrative contact handle',
			'tech-c': 'New technical contact handle',
			'ns-list': 'List of new nameservers (it will _replace_ existing nameservers!)',
			'registrar-tag': 'Ragistrar tag, also known as "Membership token", which can be set/changed on .XXX domains',
		    'dnssec': 'If specified, allows setting or removal of DNSSEC keys for domain. If not specified, DNSSEC records '+
			          'will not be changed. Value of "0" will remove DNSSEC, value of "1" will add DNSSEC (and ds-N parameters must be provided)',
			'ds-1': 'DNSSEC param 1',
			'ds-2': 'DNSSEC param 2',
			'ds-3': 'DNSSEC param 3',
			'ds-4': 'DNSSEC param 4',
			'ds-5': 'DNSSEC param 5',
			'ds-6': 'DNSSEC param 6'
		},
		'_root_': function() {
			var my = this;
			var opts = my._opts_ || {};
			db.whenReady(function() {
			    dmapi.domainModify(opts, function(err) {
					if(err) {
						console.error('Error: ' + err);
						return;
					}
					console.log('Request sent successfully.');
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


/* grants -- Manage grants */
commands['grants'] = {
	'__title__': "Manage grants",
	'__desc__': "See 'grants list help' to list grants.",
	
	// grants-list
	'list': {
		'__title__': "List grants",
		'__desc__': 'Get a list of active and pending grants.',
		'__opts__': {
			'domain': 'Domain name',
			'showkey': 'Show invitation access key'
		},
		'_root_': function() {
			var my = this;
			var opts = my._opts_ || {};
			db.whenReady(function() {
			    dmapi.grantsList(opts, function(err, grants) {
					if(err) {
						console.error('Error: ' + err);
						return;
					}
					console.log(grants);
			    });
			});
		}
	},

	// grants-invite
	'invite': {
		'__title__': 'Grant access to another user',
		'__desc__': 'Returns status only (ok or not). Email is sent if request was succesfull.\n\n'+
		            'To internally transfer domain to another user (account) within Joker.com, please use the following command:\n\n'+
		            '  joker grants invite --domain=example.com --email=dst-user-email@joker.com --role=@creator --client-uid=DST_UID\n\n'+
		            'Obviously, you will need to know user ID of the user, who will receive the domain - simply providing email address is not sufficient.',
		'__opts__': {
			'domain': 'Domain name',
			'email': 'Email of invitee',
			'client-uid': 'Joker client-id of invitee - if provided, this will perform "silent" assignment: invitee does'+"n't"+
			              ' need to "accept" invitation, but will be notified in any case.',
			'role': 'Proposed role (@admin/@billing/@tech/@creator)',
			'nickname': "Invitee's nickname. If omitted, email will be used as default nickname."
		},
		'_root_': function() {
			var my = this;
			var opts = my._opts_ || {};
			db.whenReady(function() {
			    dmapi.grantsInvite(opts, function(err, results) {
					if(err) {
						console.error('Error: ' + err);
						return;
					}
					console.log('OK');
					console.log('DEBUG: results = ' + results); 
			    });
			});
		}
	}
};





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
