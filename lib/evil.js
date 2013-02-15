/*
    ~MMMMMMMMMMMMMMMMMMMMMM          
  IMMMMMMMMMMMMMMMMMMMMMMMMMMM       
  MMMMMMMMMMMMMMMMMMMMMN:NMMMMM      
 MMM      ~MMMMMMMMMM       MMM      
            DMMMMMM           M      
             ZMMMM    ~OMG           
       Z?    MMMMMM,        MMM      
  MM        ZMMMMMMMM      MMMM=     
 ,MMMM      MMMMMMMMMMM ~MMMMMMD     
 $MMMMMM~MMMMMMM  MMMMMMMMMMMMMM     
 DMMMMMMMMMMMM     NMMMMMMMMMMMM     
 MMMMMMMMMMMMM      MMMMMMMMMMM      
  MMMMMMMMMMM~     7MMMMMMMM?        
       MMMMMM ~$MDMMMMMMMMM          
       MMMMMMMMMMMMMMMMMMM=          
        MMMMMMMMMMMMMMMMMM IMM       
     DM ?  MMMMMMMMMMMD   M:         
    7 MM7   =I    : 7OMMMM    M      
     MM     MM MMMMMMMD?=MMM  M      
     M D  MMMMZ  ~E:     V  ILM      
     7M  =  $MMM, :     I ~MMM       
      MMM , +M8M   I ~M MNMMM        
      NMMMMMMMMMMMMMMMMMMMMM         
       ZMMMMMMMMMMMMMMMMMMM          
        IMMMMMMMMMMMMMMMMM~          
         :MMMMMMMMMMMMMMI            
            MMMMMMMMMM               
*/

function expr(str) {
  var params = [];
  var expr = str;
  var leftSection = expr.match(/^\s*(?:[+*\/%&|\^\.=<>]|!=)/m);
  var rightSection = expr.match(/[+\-*\/%&|\^\.=<>!]\s*$/m);
  
  if (leftSection || rightSection) {
    if (leftSection) {
      params.push('$1');
      expr = '$1' + expr;
    }
    if (rightSection) {
      params.push('$2');
      expr = expr + '$2';
    }
  } 
  else {
    var vars = str.replace(/(?:\b[A-Z]|\.[a-zA-Z_$])[a-zA-Z_$\d]*|[a-zA-Z_$][a-zA-Z_$\d]*\s*:|this|arguments|'(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*"/g, '').match(/([a-z_$][a-z_$\d]*)/gi) || []; // ';

    for (var i = 0, v; v = vars[i++]; )
      params.indexOf(v) >= 0 || params.push(v);
  }

  return new Function(params, 'return (' + expr + ')');
}
