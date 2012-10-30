bach.js
=======

something to do with JavaScript.. something to do with macros.

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