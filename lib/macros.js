var JaM = {};

(function(){
     var quote;
     var tokstream = [];
     var testMacros = [];
     var maxiter = 100;
     JaM.errors = [];
     var jslint = { errors: JaM.errors };

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

     JaM.strtree = function( syntree ) {
	 var sym, out = [];
	 for( var i in syntree ) {
	     sym = syntree[ i ] || {value:'*nil*'};
	     if( sym.constructor == Array ) {
		 out.push( JaM.strtree( sym ) );
	     }
	     else {
		 out.push( sym.value );
	     }
	 }
	 return out;
     }

     JaM.macroexpand = function( intree, sublevel ) {
	 //console.log( "sub %o: %o", sublevel, JaM.strtree( intree ) );
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
		 tok = JaM.macroexpand( tok, true );
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
			      { foo: JaM.strtree( outtree ) },
			      JaM.strtree( outtree ) );
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
	 //console.log( "parse: %o", JaM.strtree( stream ) );
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

     JaM.getText = function( url, func ) {
	 var req = new XMLHttpRequest();
	 req.open( 'get', url, true );
	 req.onreadystatechange = function() {
	     if( req.readyState == 4 ) {
		 func( req.responseText );
	     }
	 };
	 req.send('');
     };

     JaM.eval = function( js ) {
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
	 console.log( "tree: %o", JaM.strtree( symtree ) );
	 JaM.macroexpand( symtree );
     };

     JaM.compose = function( url ) {
	 JaM.getText( url, JaM.eval );
     };

     JaM.defTestMacro = function( func ) {
	 testMacros.push( func );
     };


     // that was the core, now lets make things easy...

     JaM.foreachHashSym = function( tree, func ) {
	 var repl;
	 tree = [].concat( tree );
	 for( var i = 0; i < tree.length; ++i ) {
	     if( tree[ i ].value == '#' ) {
		 repl = func( tree[ i + 1 ] );
		 tree.splice.apply( tree, [ i, 2 ].concat( repl ) );
		 i += repl.length - 1;
	     }
	     else if( tree[ i ].constructor == Array ) {
		 tree[ i ] = JaM.foreachHashSym( tree[ i ], func );
	     }
	 }
	 return tree;
     };

     JaM.populateTree = function( tree, params ) {
	 console.log( "tree: %o\nparams: %o", JaM.strtree(tree), JaM.strtree(params) );
	 tree = JaM.foreachHashSym( tree, function( ref ) {
					return [ params[ ref.value ] ];
				    });
	 console.log( "tree: %o", JaM.strtree(tree) );

	 return tree;
     };

     // This defines a macro for the {{ }} syntax
     JaM.treedb = [];
     JaM.defTestMacro( function( intree ) {
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

			       t = JaM.foreachHashSym( t, function( expr ) {
							   if( exprlist.length > 0 ) {
							       exprlist.push( JaM.it( '(identifier)', ',' ) );
							   }

							   exprlist.push( expr );
							   exprcount += 1;

							   return [ JaM.it( '(identifier)', '#' ), { value: exprcount - 1 } ];
						       });

			       var treedbid = JaM.treedb.length;
			       JaM.treedb.push( t );

			       intree.splice( 0, 3,
					      JaM.it( '(identifier)', "JaM" ),
					      JaM.it( '(identifier)', "." ),
					      JaM.it( '(identifier)', "populateTree" ),
					      [
						  JaM.it( '(identifier)', "(" ),
						  [
						      [
							  JaM.it( '(identifier)', "JaM" ),
							  JaM.it( '(identifier)', "." ),
							  JaM.it( '(identifier)', "treedb" ),
							  [
							      JaM.it( '(identifier)', "[" ),
							      [
								  [
								      JaM.it( '(identifier)', '' + treedbid )
								  ]
							      ],
							      JaM.it( '(identifier)', "]" )
							  ],
							  JaM.it( '(identifier)', "," )
						      ],
						      [
							  [
							      JaM.it( '(identifier)', "[" ),
							      exprlist,
							      JaM.it( '(identifier)', "]" )
							  ]
						      ]
						  ],
						  JaM.it( '(identifier)', ")" )
					      ]
					    );

			       console.log( 'Match: %o', JaM.strtree( intree ) );
			       return true;
			   }
			   return false;
		       });

     // for test08:

     var genSymCount = 0;
     JaM.genSym = function() {
	 genSymCount += 1;
	 return JaM.it( '(identifier)', '$genSym' + genSymCount + '$' );
     };

 })();

