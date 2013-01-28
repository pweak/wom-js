/*
WOM

Copyright (c) 2013   Ivan Garrido
https://github.com/pweak/wom-js

This software is under MIT license:

Permission is hereby granted, free of charge, to any person obtaining
a copy of this software and associated documentation files (the
"Software"), to deal in the Software without restriction, including
without limitation the rights to use, copy, modify, merge, publish,
distribute, sublicense, and/or sell copies of the Software, and to
permit persons to whom the Software is furnished to do so, subject to
the following conditions:

The above copyright notice and this permission notice shall be
included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE
LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION
WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */


/* Wom library begin */
window.womLib = {
    "wom": null,
    "librariesLoaded": {},
    "documentHead": null,
    "mode": "tree",
    "debug": true,
    "log": function( message ) {
	if('undefined'!=typeof console&&'undefined'!=typeof this.debug&&this.debug){console.log('WOM: '+message);}
	},
    "init": function( paramWOM ) {
	this.wom = paramWOM;
	this.documentHead = document.getElementsByTagName('HEAD')[0];

	this.check();

	if( null == this.wom ) { return; }

	this.run( this.wom.dependents );
	},
    "check": function( libWom ) {
	if( null == libWom ) {
	    // General object check

	    if( null == this.wom ) { return; }

	    if( 'string' == typeof this.wom ) { this.wom = [ this.wom ]; }
	    if( 'object' != typeof this.wom ) { this.wom = null; return; }

	    if( 'object' == typeof this.wom && 'function' == typeof this.wom.push ) {
		// Wom is an array
		this.mode = "list";

		var dependents = this.wom;
		this.wom = { "dependents": dependents };
		}

	    if( 'object' != typeof this.wom.dependents && 'object' == typeof this.wom.dependencies ) {
		this.wom.dependents = this.wom.dependencies;
		}
	    }
	else {
	    // Library WOM check
	    // name, artifact, version, src, dependents

	    if( null == libWom ) { return null; }

	    if( 'string' == typeof libWom ) { libWom = { "src": libWom }; }
	    if( 'function' == typeof libWom ) { return libWom; }
	    if( 'object' != typeof libWom ) { return null; }

	    if( 'object' != typeof libWom || null == libWom ) { return null; }
	    if( 'string' != typeof libWom.src ) { return null; }

	    if( 'string' != typeof libWom.name ) {
		libWom.name = libWom.src.substring( 1+libWom.src.lastIndexOf( '/' ) );
		}

	    if( 'object' != typeof libWom.dependents && 'object' == typeof libWom.dependencies ) {
		libWom.dependents = libWom.dependencies;
		}

	    if( 'function' == typeof libWom.dependents ) {
		libWom.dependents = [ libWom.dependents ];
		}

	    if( 'number' == libWom.version ) { libWom.version = ''+libWom.version; }
	    if( 'string' != libWom.version ) { libWom.version = '0'; }

	    return libWom;
	    }
	},
    "run": function( dependents ) {

	for( var idxScript = 0; idxScript < dependents.length; ++idxScript ) {
	    var item = dependents[idxScript];
	    item = this.check( item );

	    if( null == item ) {
this.log( 'Wrong config detected. Trying to ignore...' );
		}
	    else if( 'object' == typeof item && 'string' == typeof item['src'] ) {
		var libWom = item;

		libWom.retries = 0;
		libWom.status  = 'loading';

		if( 'list' == this.mode ) {
		    if( 'undefined' == typeof libWom.dependents ) {
			libWom.dependents = [];
			}
		    libWom.dependents = libWom.dependents.concat( dependents.slice( 1 ) );
		    }

		this.librariesLoaded[ libWom.name ] = libWom;

		if( 'undefined' != typeof libWom.cache && false != libWom.cache ) {

		    var libHost = libWom.src.match(/((https?)?:\/\/)?[^\/]+\//);
		    libHost=libHost[0];
		    if( libHost.indexOf('.') <= 0 || libHost==location.protocol+'//'+location.host+'/' ) {
			// Local script
			this.loadJsFromCache( libWom.name );
			}
		    else {
this.log('Can\'t cache external reference:'+libWom.name );
			this.loadJs( libWom.name );
			}
		    }
		else {
		    this.loadJs( libWom.name );
		    if( 'list' == this.mode ) {
			return;
			}
		    }

		}
	    else if( 'function' == typeof item ) {
		var funcToExec = item;
		funcToExec();
		}
	    }

	},
    "loadJs": function( libId, wom ) {
	if( '' == libId ) { return; }

	if( 'object' != typeof wom || null == wom ) { wom = this.librariesLoaded[ libId ]; }

	if( 'object' != typeof wom || null == wom ) { return; }

	if( 0 != wom.retries ) {
	    // Check for artifact.
	    if( 'string' != typeof wom.artifact || '' == wom.artifact || 0 <= wom.artifact.indexOf( '-' ) ) {
		objType = 'No check';
		}
	    else {
		var objType = eval( 'typeof '+wom.artifact );
		}

	    if( 'undefined' != objType ) {
		wom.status = 'success';
		}
	    else {
		// Delete old object.
		var oldScript = document.getElementById( libId+'-'+(wom.retries-1) );
		oldScript.parentNode.removeChild( oldScript );
		oldScript = null;

		wom.status = 'retrying';
		}
	    }

	if( wom.retries >= 5 ) {
	    return;
	    }

	if( wom.status == 'completed' || wom.status == 'success' ) {
	    if( 'object' == typeof wom.dependents ) {
		this.run( wom.dependents );
		}
	    return;
	    }

	var newScript = document.createElement('script');
	newScript.id = libId+'-'+wom.retries;
	newScript.type = 'text/javascript';
	newScript.src = wom.src;
	this.documentHead.appendChild( newScript );

	wom.retries += 1;
	this.librariesLoaded[ libId ] = wom;

	window.setTimeout( function(){ womLib.loadJs( libId ); }, wom.retries*250, 'JavaScript' );
	},
    "loadJsFromCache": function( libId, wom ) {
	if( '' == libId ) { return; }

	if( 'object' != typeof wom || null == wom ) { wom = this.librariesLoaded[ libId ]; }

	if( 'object' != typeof wom || null == wom ) { return; }

	if( 0 != wom.retries ) {
	    if( null != wom.responseText ) {

		if( 'undefined' != typeof localStorage ) {
		    localStorage.setItem( libId, wom.responseText );
		    localStorage.setItem( libId+'-WOMtime', (new Date()).getTime() );
		    localStorage.setItem( libId+'-WOMversion', wom.version );
		    }

		var newScript = document.createElement('script');
		newScript.id = libId+'-'+wom.retries;
		newScript.type = 'text/javascript';
		var newScriptContent = wom.responseText;
		if( 'function' == typeof newScript.appendChild ) { newScriptContent = document.createTextNode( newScriptContent ); newScript.appendChild( newScriptContent ); } else { newScript.text = newScriptContent; }
		this.documentHead.appendChild( newScript );

		wom.status = 'completed';
this.log( 'Library '+libId+' has been cached.' );
		}
	    }
	else {
	    if( 'undefined' != typeof localStorage ) {
		var content = localStorage.getItem( libId );
		if( content ) {
		    var libAge = localStorage.getItem( libId+'-WOMtime' );
		    var libVersion = localStorage.getItem( libId+'-WOMversion' );
		    if( null != libAge && null != libVersion && (new Date()).getTime()-libAge < 1000*wom.cache && libVersion == wom.version ) {
			var newScript = document.createElement('script');
			newScript.id = libId+'-'+wom.retries;
			newScript.type = 'text/javascript';
			var newScriptContent = content;
			if( 'function' == typeof newScript.appendChild ) { newScriptContent = document.createTextNode( newScriptContent ); newScript.appendChild( newScriptContent ); } else { newScript.text = newScriptContent; }
			this.documentHead.appendChild( newScript );

			wom.status = 'completed';
this.log( 'Library '+libId+' retrieved from cache.' );
			}
		    else {
this.log( 'Library '+libId+' has expired (T:'+(((new Date()).getTime()-libAge)/1000)+'s; V:'+wom.version+').' );
			}
		    }
		}
	    }

	if( wom.retries >= 5 ) {
this.log( 'Library '+libId+' can\'t be loaded (num retries exceeded).' );
	    return;
	    }

	if( wom.status == 'completed' || wom.status == 'success' ) {
	    if( 'object' == typeof wom.dependents ) {
		this.run( wom.dependents );
		}
	    return;
	    }


	wom.responseText = null;

	// Mozilla/Safari
	if( window.XMLHttpRequest ) {
	    wom.xmlHttpReq = new XMLHttpRequest();
	    }
	// IE
	else if( window.ActiveXObject ) {
	    wom.xmlHttpReq = new ActiveXObject("Microsoft.XMLHTTP");
	    }
	wom.xmlHttpReq.open('GET', wom.src, true);
	wom.xmlHttpReq.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
	wom.xmlHttpReq.onreadystatechange = function() {
	    if( wom.xmlHttpReq.readyState == 4 ) {
		wom.responseText = wom.xmlHttpReq.responseText;
		}
	    }
	wom.xmlHttpReq.send();

	wom.retries += 1;
	this.librariesLoaded[ libId ] = wom;

	window.setTimeout( function(){ womLib.loadJsFromCache( libId ); }, wom.retries*1000, 'JavaScript' );
	}
    };
/* Wom library end */

/* Loader begin */
if( 'object' == typeof womLib && null == document.getElementById('womScript') && null == womLib.wom ) {
    var womObjScriptElement = document.createElement('script');
    womObjScriptElement.id = 'womScript';
    womObjScriptElement.type = 'text/javascript';
    var womObjScriptContent = 'if( \'object\' == typeof wom ) { womLib.init( wom ); }';
    if( 'function' == womObjScriptElement.appendChild ) { womObjScriptContent = document.createTextNode( 'if( \'object\' == typeof wom ) { womLib.init( wom ); }' ); womObjScriptElement.appendChild( womObjScriptContent ); } else { womObjScriptElement.text = womObjScriptContent; }
    document.getElementsByTagName('HEAD')[0].appendChild( womObjScriptElement );
    }
/* Loader end */
