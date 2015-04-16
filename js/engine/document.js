function create_VIM_DOCUMENT(context) {
  var G = VIM_GENERIC;
  
  function initText() {
    var text = $.trim($('.text', context).text());
 	  $('.text', context).html(getText(text));
    $('.text .char:first', context).addClass('cursor');
    setTargetText();
  }

  function setTargetText() {
    var targetText = $('.target', context).text();
    var target = $('.target', context).html(getText(targetText));
    target.find('.line').addClass('targetline').removeClass('line');
    target.find('.word').addClass('targetword').removeClass('word');
    target.find('.char').addClass('targetchar').removeClass('char');
	} 

  function getText(text) {
     if(text.length === 0) return '<div class="line"><div class="word space"><div class="char cursor">&nbsp;</div></div></div>';
     return getRows(text);
  }

  function getRows(text) {
   var splitted = text.split(lineBreakMarker);

    var result = "";

    for(var i = 0, length = splitted.length; i < length; ++i) {
    	var word = splitted[i];
      if(word !== "") {
        result += "<div class='line'>" + getLine(word) + "</div>";
      }  
    }

    return result; 
  }

  function getLine(text) {
    var splitted = text.split(" ");

    var result = "";

    for(var i = 0, length = splitted.length; i < length; ++i) {
    	var word = splitted[i];
      if($.trim(word) !== "") {
        result += "<div class='word'>" + getWord(word) + "</div>";
      } 
     
      if(i + 1 !== length) { 
        result += getSpaceWord();
      }
    }

    return result; 
  }

  function getSpaceWord() {
    return "<div class='word space'><div class='char'>&nbsp;</div></div>";
  }

  function getEmptyText() {
    return "<div class='line'>" + getSpaceWord() + "</div>"; 
	}

  function getWord(word) {
    var result = "";

    for(var i = 0, length = word.length; i < length; ++i) {
      if($.trim(word[i]) === "") continue; 
        
      result += getChar(word[i]); 
    }
	
	  return result;
  }

  function getChar(ch) {
    return  "<div class='char'>" + ch + "</div>";
  }

  function getLineWithGivenContent(content) {
    var line = $('<div />', { 'class': 'line' });
    G.for_each(content, function(e) {
      line.append(e);
    });

    return line;
  }

  function copyOfTextWithCursorAsText() {
    var $text = $('.text', context).clone(false);

    var $cursor = $text.find('.cursor');
    var cursorText = $cursor.text();
    var cursorTextReplaced = "[" + cursorText + "]";
    $cursor.text(cursorTextReplaced);
    return $text;
  }

  function documentAsTextWithCursor() {
    var $text = copyOfTextWithCursorAsText();

    var result = "";

    var $lines = $text.find('.line');
    var amountOfLines = $lines.length;
    
    $lines.each(function(index) {
      result += $(this).text();
      if(index < amountOfLines - 1)
        result += lineBreakMarker;
    });
    
    return result;
  }

  var lineBreakMarker = "!LINE_BREAK!"; //TODO should do something more intelligent

  function documentAsTextWithCursorAndLineBreak(breakMarker) {
    return documentAsTextWithCursor().replace(/!LINE_BREAK!/g, '|');
  }

  initText();
  
  return {
    'initText': initText,
    'getSpaceWord': getSpaceWord,
    'getChar': getChar,
    'getEmptyText': getEmptyText,
    'getRows': getRows,
    'documentAsTextWithCursorAndLineBreak': documentAsTextWithCursorAndLineBreak,
    'getText': getText,
    'lineBreakMarker': lineBreakMarker,
    'getLineWithGivenContent': getLineWithGivenContent
  }
}
