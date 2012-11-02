bach.js
=======

`defmacro`-esque macros for JavaScript.

```javascript

// frob.js

macro unless( condition, &:body ) {
  return {{
    if(!(~condition)) {
	  ~@body
    }
  }};
}
				  
unless(true) {
  alert('this never happens' );
}

```

... and then

```javascript

// app.js

Bach.compose('frob.js');

// nothing happened

```

references and research
-----------------------

 * [JaM.js](http://github.com/chouser/JaM)
 * [Peg.js](http://pegjs.majda.cz/)
 * [Acorn](https://t.co/t5jkF6fU)
 * [Constellation](https://t.co/OzN4vQdb)
 * [Esprima](http://esprima.org/)
 * [Reflect.parse](https://developer.mozilla.org/en-US/docs/SpiderMonkey/Parser_API)