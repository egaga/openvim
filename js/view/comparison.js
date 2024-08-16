var VIM_COMPARISON = VIM_COMPARISON || function() {

  var comparisonDelay = 1500;

  return {
    'compare': compare
  };

  function compare() {
    $('.targetline').each(function(index) {
     compareLine($(this), index); 
    });
   
    setTimeout(compare, comparisonDelay);
  }

  function compareLine(targetLine, row) {
    var editorLine = $('.text .line').eq(row);
    if(row.length === 0) {
      setWrong(targetLine.find('.targetword'));
    } else {
      targetLine.find('.targetword').each(function(index) {
        compareWord($(this), editorLine, index);
      });
    }
  }

  function setWrong(elem) { elem.removeClass('right').addClass('wrong'); }
  function setRight(elem) { elem.removeClass('wrong').addClass('right'); }

  function compareWord(targetWord, editorLine, index) {
    var editorWord = editorLine.find('.word').eq(index);
    
    if(editorWord.length === 0) {
      setWrong(targetWord);
    } else {
      if(targetWord.text() == editorWord.text()) {
        setRight(targetWord);
      } else {
        setWrong(targetWord);
      }
    }
  } 

}();
