var Bach = {};

(function(){
     var quote;
     var tokstream = [];
     var testMacros = [];
     var maxiter = 100;
     Bach.errors = [];
     var jslint = { errors: Bach.errors };

     function ncollapse( tree ) {
	 for( var i = 0; i < tree.length; ++i ) {
	     if( tree[ i ].constructor == Array ) {
		 tree[ i ] = ' ' + ncollapse( tree[ i ] ) + ' ';
	     }
	     /*
	      else if( tree[ i ].id == '(endline)' ) {
	      tree[ i ] = '';
	      }
	      else if( tree[ i ].id == '(end)' ) {
	      tree[ i ] = '';
	      }
	      */
	     else {
		 if( tree[ i+1 ] && tree[ i ].identifier && tree[ i+1 ].identifier )
		 {
		     tree[ i ] = tree[ i ].value + ' ';
		 }
		 else {
		     tree[ i ] = tree[ i ].value;
		 }
	     }
	 }
	 var str = tree.join('');
	 tree.length = 0;
	 return str;
     }

     Bach.strtree = function( syntree ) {
	 var sym, out = [];
	 for( var i in syntree ) {
	     sym = syntree[ i ] || {value:'*nil*'};
	     if( sym.constructor == Array ) {
		 out.push( Bach.strtree( sym ) );
	     }
	     else {
		 out.push( sym.value );
	     }
	 }
	 return out;
     }

     Bach.macroexpand = function( intree, sublevel ) {
	 //console.log( "sub %o: %o", sublevel, Bach.strtree( intree ) );
	 var outtree = [];
	 var tok, jsstr, maci, iteri;

	 // XXX allow macros to examine and unshift any changes back onto intree
	 var match = true;
	 for( iteri = 0; match && iteri < maxiter; ++iteri ) {
	     match = false;
	     for( maci in testMacros ) {
		 match = testMacros[ maci ]( intree );
		 if( match ) {
		     break;
		 }
	     }
	 }
	 if( iteri >= maxiter ) {
	     throw("Recursive macro?");
	 }

	 while( intree.length ) {
	     tok = intree.shift();

	     if( tok.constructor == Array ) {
		 tok = Bach.macroexpand( tok, true );
	     }

	     outtree.push( tok );

	     if( ! sublevel ) {
		 if( intree[ 0 ]
		     && intree[ 0 ][ 0 ]
		     && outtree[ 0 ][ 0 ].id == 'if'
		     && intree[ 0 ][ 0 ].id == 'else' )
		 {
		     outtree.push( intree.shift() );
		     continue;
		 }
		 console.log( "final expr: %o %o",
			      { foo: Bach.strtree( outtree ) },
			      Bach.strtree( outtree ) );
		 jsstr = ncollapse( outtree );
		 console.log( jsstr );
		 eval( jsstr );
		 outtree = [];
	     }
	 }

	 return outtree;
     }

     function pushtoken( tok ) {
	 if( tok.id != '(endline)' && tok.id != '(end)' ) {
	     tokstream.push( tok );
	 }
	 return tok;
     }

     function tok2tree( stream ) {
	 var out = [];
	 var expr = [];
	 var subexpr;
	 var tok;
	 //console.log( "parse: %o", Bach.strtree( stream ) );
	 while( stream.length ) {
	     tok = stream.shift();
	     if( /^[\[{(]$/.exec( tok.id ) ) {
		 expr.push( [ tok, tok2tree( stream ), stream.shift() ] );
	     }
	     else if( /^[\]})]$/.exec( tok.id ) ) {
		 stream.unshift( tok );
		 break;
	     }
	     else {
		 expr.push( tok );
	     }
	     if( /^[;{,]$/.exec( tok.id ) ) {
		 out.push( expr );
		 expr = [];
	     }
	 }
	 out.push( expr );
	 return out;
     }

     Bach.getText = function( url, func ) {
	 var req = new XMLHttpRequest();
	 req.open( 'get', url, true );
	 req.onreadystatechange = function() {
	     if( req.readyState == 4 ) {
		 func( req.responseText );
	     }
	 };
	 req.send('');
     };

     Bach.eval = function( js ) {
	 option = {};
	 functions = [];
	 xmode = false;
	 xtype = '';
	 stack = null;
	 funlab = {};
	 member = {};
	 funstack = [];
	 lookahead = [];
	 lex.init( js );

	 /*
	  prevtoken = token = syntax['(begin)'];
	  console.log( 'advance' );
	  advance();
	  console.log( 'statements' );
	  statements();
	  console.log( 'advance end' );
	  advance('(end)');
	  */
	 while( ! token || token.value != '(end)' ) {
	     token = lex.token() ;
	     pushtoken( token );
	 }

	 var symtree = tok2tree( tokstream );
	 console.log( "tree: %o", Bach.strtree( symtree ) );
	 Bach.macroexpand( symtree );
     };

     Bach.compose = function( url ) {
	 Bach.getText( url, Bach.eval );
     };

     Bach.defTestMacro = function( func ) {
	 testMacros.push( func );
     };


     // that was the core, now lets make things easy...

     Bach.foreachHashSym = function( tree, func ) {
	 var repl;
	 tree = [].concat( tree );
	 for( var i = 0; i < tree.length; ++i ) {
	     if( tree[ i ].value == '#' ) {
		 repl = func( tree[ i + 1 ] );
		 tree.splice.apply( tree, [ i, 2 ].concat( repl ) );
		 i += repl.length - 1;
	     }
	     else if( tree[ i ].constructor == Array ) {
		 tree[ i ] = Bach.foreachHashSym( tree[ i ], func );
	     }
	 }
	 return tree;
     };

     Bach.populateTree = function( tree, params ) {
	 console.log( "tree: %o\nparams: %o", Bach.strtree(tree), Bach.strtree(params) );
	 tree = Bach.foreachHashSym( tree, function( ref ) {
					return [ params[ ref.value ] ];
				    });
	 console.log( "tree: %o", Bach.strtree(tree) );

	 return tree;
     };

     // This defines a macro for the {{ }} syntax
     Bach.treedb = [];
     Bach.defTestMacro( function( intree ) {
			   if(  intree
				&& intree[ 0 ]
				&& intree[ 0 ].value == '{'
				&& intree[ 1 ]
				&& intree[ 1 ][ 0 ]
				&& intree[ 1 ][ 0 ][ 0 ]
				&& intree[ 1 ][ 0 ][ 0 ][ 0 ]
				&& intree[ 1 ][ 0 ][ 0 ][ 0 ].value == '{' )
			   {
			       var t = intree[ 1 ][ 0 ][ 0 ][ 1 ];

			       var exprlist = [];
			       var exprcount = 0;

			       t = Bach.foreachHashSym( t, function( expr ) {
							   if( exprlist.length > 0 ) {
							       exprlist.push( Bach.it( '(identifier)', ',' ) );
							   }

							   exprlist.push( expr );
							   exprcount += 1;

							   return [ Bach.it( '(identifier)', '#' ), { value: exprcount - 1 } ];
						       });

			       var treedbid = Bach.treedb.length;
			       Bach.treedb.push( t );

			       intree.splice( 0, 3,
					      Bach.it( '(identifier)', "Bach" ),
					      Bach.it( '(identifier)', "." ),
					      Bach.it( '(identifier)', "populateTree" ),
					      [
						  Bach.it( '(identifier)', "(" ),
						  [
						      [
							  Bach.it( '(identifier)', "Bach" ),
							  Bach.it( '(identifier)', "." ),
							  Bach.it( '(identifier)', "treedb" ),
							  [
							      Bach.it( '(identifier)', "[" ),
							      [
								  [
								      Bach.it( '(identifier)', '' + treedbid )
								  ]
							      ],
							      Bach.it( '(identifier)', "]" )
							  ],
							  Bach.it( '(identifier)', "," )
						      ],
						      [
							  [
							      Bach.it( '(identifier)', "[" ),
							      exprlist,
							      Bach.it( '(identifier)', "]" )
							  ]
						      ]
						  ],
						  Bach.it( '(identifier)', ")" )
					      ]
					    );

			       console.log( 'Match: %o', Bach.strtree( intree ) );
			       return true;
			   }
			   return false;
		       });

     // for test08:

     var genSymCount = 0;
     Bach.genSym = function() {
	 genSymCount += 1;
	 return Bach.it( '(identifier)', '$genSym' + genSymCount + '$' );
     };

 })();

