/* Builder for simple command line utils */

// FIXME: 'help domain list' does not work but 'domain list help' works
// FIXME: usage lines on cli do not show the parent command names

var cli = module.exports = {},
    foreach = require('snippets').foreach;
    wrap = require('wordwrap')(79);

cli.init_commands = function(commands, name, parents) {
	if( (!commands.hasOwnProperty("__parents__")) && (parents !== undefined) ) {
		commands['__parents__'] = [];
		foreach(parents).each(function(value) {
			commands['__parents__'].push(value);
		});
	}
	if( (!commands.hasOwnProperty("__name__")) && (name !== undefined) ) {
		commands['__name__'] = name;
	}
	if( (!commands.hasOwnProperty("help")) && commands.hasOwnProperty('__desc__') ) {
		commands.help = function() {
			var opts = [];
			if(commands.hasOwnProperty('__opts__')) {
				foreach(commands['__opts__']).each(function(value, key) {
					opts.push('[--' + key + '=VALUE]');
				});
			}
			var usage = 'usage: ' + commands['__parents__'].join(' ') + ( (commands['__parents__'].length===0) ? '' : ' ') + opts.join(' ');
			console.log(wrap(usage));
			console.log('');
			console.log(wrap(commands['__desc__']));
			if(commands.hasOwnProperty('__opts__')) {
				console.log('');
				console.log('with options:');
				foreach(commands['__opts__']).each(function(value, key) {
					console.log(wrap( '   ' + key + ' - ' + value ));
				});
			}
		};
	}
	return commands;
};

/* Core implementation for CLI applications */
cli.run = function(commands_root) {
	var optimist = require('optimist'),
	    argv = optimist
	    .usage('Usage: $0 COMMAND [argument(s)]')
	    .argv,
	    parents = [];

	parents.push( argv.$0 );
	
	function sub_run(commands) {
		var name = argv._.shift();
		parents.push(name);

		// Handle root command
		if( (!commands.hasOwnProperty(name)) && commands.hasOwnProperty('_root_') && commands['_root_'] && (typeof commands['_root_'] === 'function') ) {
			argv._.unshift(name);
			commands['_root_'].apply(commands, argv._);
		// Handle direct function callback
		} else if(commands.hasOwnProperty(name) && commands[name] && (typeof commands[name] === 'function')) {
			commands[name].apply(commands, argv._);
		// Handle object with multiple sub callbacks
		} else if(commands.hasOwnProperty(name) && commands[name] && (typeof commands[name] === 'object')) {
			cli.init_commands(commands[name], name, parents);
			sub_run(commands[name]);
		} else {
			console.error('Error: Unknown command: ' + name);
			optimist.showHelp();
		}
	}
	
	commands_root = cli.init_commands(commands_root);
	sub_run(commands_root);
}

/* EOF */
