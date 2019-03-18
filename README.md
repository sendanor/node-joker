
node-joker
==========

CLI utility for Joker.com's Resellers (DMAPI).

License
-------

MIT-style license, see [INSTALL.txt](http://github.com/jheusala/node-joker/blob/master/LICENSE.txt).

Install
-------

Simplest way to install is to use [npm](http://npmjs.org/), just simply `npm install joker -g`.

Usage
-----

### Login

`joker login USER PASSWORD`

**Please note:** Writing your password on command line and using shared computer system might be a security risk. [Prompting it from the command line is on TODO list.]

### Logout

`joker logout`

### List domains

`joker domain list`

### List domain information (using live data from joker.com)

`joker whois --domain=example.com`

### Get reseller profile data

`joker profile`

### Renew domain

`joker domain renew --domain=example.com --expyear=2013`

### Change domain contact

`joker domain modify --domain=example.com --billing-c=CNET-634117`

### Grants

Show grants for domain:

`joker grants list --domain=example.com`

Add new grant:

`joker grants invite --domain=example.com --role=@admin --email='hostmaster@example.com' 
     --nickname='Hostmaster' --client-uid=1234`

### More help

`joker help`

or 

`joker command help`
