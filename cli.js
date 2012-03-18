/* Builder for simple command line utils */
var cli = module.exports = {};

/* Core implementation for CLI applications */
cli.run = function(commands) {
	var optimist = require('optimist'),
	    argv = optimist
	    .usage('Usage: $0 COMMAND [argument(s)]')
	    .argv,
	    name = argv._.shift(),
	    fn = commands[name];
	if(fn && commands.hasOwnProperty(name) && (typeof fn === 'function')) {
		commands[name].apply(commands, argv._);
	} else {
		console.error('Error: Unknown command: ' + name);
		optimist.showHelp();
	}
}

/* EOF */
