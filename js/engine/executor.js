function create_VIM_EXECUTOR(doc, context) {
  var G = VIM_GENERIC;
  var S = {
    'line': '.line',
    'character': '.char',
    'word': '.word',
    'cursor': '.cursor'
  };

  var endMarkers = {
    '(': ')',
    '{': '}',
    '[': ']'
  };

  var startMarkers = {
    ')': '(',
    '}': '{',
    '[': ']'
  };

  return {
    /** functions for getting data */
    'cursor': cursor,
    'cursorIndex': cursorIndex,
    'firstChar': firstChar,
    'previousWord': previousWord,
    'nextWord': nextWord,
    'currentWord': currentWord,
    'currentRow': currentRow,
    'currentColumnIndex': currentColumnIndex,
    'currentRowIndex': currentRowIndex,
    'charIndex': charIndex,
    'charByIndex': charByIndex,
    'chars': chars,
    'charsInSameLine': charsInSameLine,
    'colIndex': colIndex,
    'isLine': isLine,
    'line': line,
    'lineIndex': lineIndex,
    'lines': lines,
    'lineByIndex': getRow,
    'setCursor': setCursor,
    'removeCurrentCursor': removeCurrentCursor,
    'word': word,
    'words': words,
    'wordsInRow': wordsInRow,
    'wordIndex': wordIndex,
    'charsInLine': charsInLine,
    'last': last,
    'first': first,
    'text': text,
    'getCharsBefore': getCharsBefore,
    'getCharsAfter': getCharsAfter,
    'findBackwardStartingFrom': findBackwardStartingFrom,
    'findForwardStartingFrom': findForwardStartingFrom,
    'findForward': findForward,
    'findBackward': findBackward,

    /** Operations that take jQuery object as a parameter that represents a character in DOM. */
    'replaceTargetWithInput': replaceTargetWithInput,
    'insertAfter': insertAfter,
    'insertBefore': insertBefore,
    'removeBetween': removeBetween,
    'copyBetween': copyBetween,
    'copyLineContent': copyLineContent,
    'cutLineContent': cutLineContent,
    'replace': replace,
    'changeCursorToIndex': changeCursorToIndex,
    'changeCursorTo': changeCursorTo,

    'updatePreviousCursor': updatePreviousCursor,
    'insertCharBefore': insertCharBefore,
    'moveToEndOfLine': moveToEndOfLine,
    'moveToStartOfLine': moveToStartOfLine,
    'moveDown': moveDown,
    'moveUp': moveUp,
    'moveLeft': moveLeft,
    'moveRight': moveRight,
    'moveToLineNumber': moveToLineNumber,
    'moveToColumnIndex': moveToColumnIndex, 
    'findCorrespondingParentheses': findCorrespondingParentheses,
    'findFirstNonBlankCharInLine': findFirstNonBlankCharInLine,

    /** 
      word moving, could be made faster by directly jumping to right place
      but it's a bit tricky because of space words
    */ 
    'moveToEndOfWord': moveToEndOfWord,
    'moveToStartOfWord': moveToStartOfWord,
    'moveToStartOfNextWord': moveToStartOfNextWord,
    'moveToEndOfPreviousWord': moveToEndOfPreviousWord,

    /** Heavier functions */
    'copyContent': copyContent,
    'setContent': setContent,
    'withAttribute': withAttribute,
    'hasAttribute': hasAttribute,
    'removeAllWithAttribute': removeAllWithAttribute,
    'createNewChar': createNewChar,
    'createNewRow': createNewRow,
    'removePreviousCharInCurrentLine': removePreviousCharInCurrentLine,

    'copy': copy,
    'joinLines': joinLines,
    'divideCurrentWordWithSpace': divideCurrentWordWithSpace,
    'initializeEmptyText': initializeEmptyText,
    'initializeWithText': initializeWithText,
    'removeStartingFrom': removeStartingFrom,
    'mergeWordsWithoutSpace': mergeWordsWithoutSpace,
    'removeCurrentLine': removeCurrentLine,
    'removeCharUnderCursor': removeCharUnderCursor,
    'removeCharactersFromCurrentLineStartingFrom': removeCharactersFromCurrentLineStartingFrom
  };

  function charByIndex(index) {
    return chars().eq(index);
  }

  function findFirstNonBlankCharInLine(line) {
    var chars_ = charsInSameLine(line);
    var nonBlankTest = function(ch) { 
        var text_ = text(ch);
        if(word(ch).hasClass('space')) return false; // TODO: refactor
	return !G.exists([' ', '\,', '\.', '\''], 
			 function(blankChar) { return blankChar === text_; });
    };

    return findForward(0, chars_, nonBlankTest, 
		      true); // include 0 index in the search
  }

  function moveToColumnIndex(line, columnIndex) {
    var chars_ = charsInLine(line); 
    var index = columnIndex + 1 > chars_.length ? chars_.length - 1 : columnIndex;
    return chars_.eq(index);
  }

  function moveToLineNumber(lineIndex) {
      var number = lineIndex + 1; // FIXME: remove this temporary variable
      var linesTotal = lines().length;
      var index = number + 1 > linesTotal ? linesTotal - 1 : number - 1;

      return getRow(index);
  }

  function updatePreviousCursor() {
    $('.previousCursor', context).removeClass('previousCursor');
    cursor().addClass('previousCursor');
  }

  function text(obj) { return obj.text(); }
  function isLine(obj) { return obj.hasClass('line'); }

  function insertCharBefore(ch, target) {
    $(doc.getChar(ch)).insertBefore(target);
  }

  function copyContent() { return $(S.line, context).clone(true); }
  function setContent(content) { $('.text').html(content); }
  
  function cutLineContent(fromObj, toObj) {
    var fromWord = word(fromObj);
    var toWord = word(toObj);

    var lineOfWord = line(fromWord); // TODO add assert that fromWord is on the same line
    var wordsInLine = lineOfWord.find(S.word);
    var wordsInLineLength = wordsInLine.length;
    var fromIndex = wordsInLine.index(fromWord);
    var toIndex = wordsInLine.index(toWord);

    var words = lineOfWord.find(S.word).filter(function(index) {
      return fromIndex <= index && index <= toIndex;
    });

    var result = words.detach();

    if(fromIndex === 0 && toIndex + 1 === wordsInLineLength)
      lineOfWord.append(doc.getSpaceWord());

    changeCursorTo(first(charsInLine(lineOfWord)));
  
    return result;
  }

  function copyLineContent(fromObj, toObj) {
    var fromWord = word(fromObj);
    var toWord = word(toObj);

    var lineOfWord = line(fromWord); // TODO add assert that fromWord is on the same line
    var fromIndex = lineOfWord.find(S.word).index(fromWord);
    var toIndex = lineOfWord.find(S.word).index(toWord);
    
    var words = lineOfWord.find(S.word).filter(function(index) {
      return fromIndex <= index && index <= toIndex;
    });

    return words.map(function() { return copy($(this)); });
  }

  function copy(elem) {
    if(elem.length > 1) {
      return elem.map(function() {
        var $clone = $(this).clone(true);
        $clone.find(S.cursor).removeClass('cursor');
        return $clone;
      });
    } else {
      //FIXME: hack to get inner content of [ [ elem ] ] to [ elem ]
      if(elem.length === 1 && elem.get(0).length > 0)
        elem = elem.get(0);

      var $clone = elem.clone(true);
      $clone.find(S.cursor).removeClass('cursor');
      return $clone;
    }
  }

  function joinLines(line1, line2) {
    var line2Content = line2.find(S.word).clone(true);
    changeCursorTo(moveToEndOfLine(line1));
    insertAfter(createNewChar(), cursor());
    changeCursorTo(moveRight(cursor()));
    line1.append(line2Content);
    line2.remove();
    mergeWordsWithoutSpace(line1);
  }

  function removeAllWithAttribute(value) {
    //FIXME: this is only working because removeAllWithAttribute is needed for appendable
    var appendable = $(".char[" + value + "]", context);

    if(appendable.length === 0) return;

    changeCursorTo(moveLeft(cursor()));

    if(appendable.closest(S.word).hasClass('space'))
      appendable.remove();
  }

  function withAttribute(ch, value) { ch.attr(value, 'true'); return ch; }
  function hasAttribute(ch, value) { return ch.attr(value) !== undefined; }
  function firstChar(obj) { return obj.find('.char:first'); }
  function isCursor(obj) { return obj.hasClass('cursor'); }

  function createNewRow(content) {
    if(content !== undefined) {
      return doc.getLineWithGivenContent(content);
    } else
      return $(doc.getRows(" "));
  }

  function createNewChar() { return $(doc.getSpaceWord()); }

  function insertAfter(insertable, target) {
    insertable.insertAfter(target);
  }

  function insertBefore(insertable, target) {
    insertable.insertBefore(target);
  }

  /** doesn't take care of cursor */
  function replacePrivate(obj, newobj) {
    newobj.insertAfter(obj);
    obj.remove();
  }

  function replace(obj, newobj) {
    if(isCursor(obj)) { // isCursor must be before any change
      replacePrivate(obj, newobj);
      setCursor(newobj);
    } else {
      replacePrivate(obj, newobj);
    }
  }

//FIXME: if whole line is deleted, should not create true empty space word?
  function removeStartingFrom(index) {
    var row_index = currentRowIndex();
    removeCharactersFromCurrentLineStartingFrom(index);

    if(index === 0) { // whole line was deleted
      var cur_row = $('.line:eq(' + row_index + ')', context);
      $(doc.getSpaceWord()).appendTo(cur_row);
      changeCursorTo(cur_row.find('.char:first'));
    } else {
      var newcursor = $('.line:eq(' + row_index + ') .char:eq(' + (index-1) + ')', context);
      changeCursorTo(newcursor);
    }

     removeEmptyWords(currentRow());
  }

  function removeEmptyWords(row) {
    row.find(S.word)
       .filter(function() {
          return $(this).find(S.character).length === 0 &&
                 !$(this).hasClass('space');})
       .remove();
  }

  function currentRowIndex() { return $(S.line, context).index(currentRow()); }

  function changeCursorTo(obj) {
    if(obj.length === 0) return; // TODO: should we throw exception?
    removeCurrentCursor();
    setCursor(obj);
  }

  function changeCursorToIndex(index) {
    changeCursorTo(chars().eq(index));
  }

  function prevChar(to) {
    var index = charIndex(to) - 1;
    return index >= 0 ? chars().eq(index) : to;
  }

  function removeBetween(from, to, inclusiveFrom, inclusiveTo) {
    inclusiveFrom = inclusiveFrom !== undefined ? inclusiveFrom : true;
    inclusiveTo = inclusiveTo !== undefined ? inclusiveTo : true;
    
    var fromIndex = charIndex(from);
    var toIndex = charIndex(to);
    
    if(fromIndex < 0 || toIndex < 0)
      return;
    else if(fromIndex < toIndex)
      removeBetweenInner(from, to, fromIndex, toIndex);
    else
      removeBetweenInner(to, from, toIndex, fromIndex);

    function removeBetweenInner(from, to, fromIndex, toIndex) {
      if(fromIndex === toIndex) return;
      // deleting must be delayed, since affects each
      var to_be_removed = [from];

      chars().each(function(index) {
        if(isBetween(index, fromIndex, toIndex, inclusiveFrom, inclusiveTo)) {
          to_be_removed.push(($(this)));
        }
      });

      G.for_each(to_be_removed, function(elem) { elem.remove(); });
      //G.for_each(to_be_removed, function(elem) { elem.css('background-color', 'yellow')});
      removeEmptiedWords();
      removeEmptiedLines();

      var charsTotalLeft = chars().length;

      if(charsTotalLeft === 0)
        initializeEmptyText();
      else if(fromIndex + 1 >= charsTotalLeft) {
        changeCursorToIndex(charsTotalLeft - 1);
        changeCursorTo(moveToStartOfLine(cursor()));
      }
      else
        changeCursorToIndex(fromIndex);
   }
  }
 
  function isBetween(value, from, to, inclusiveFrom, inclusiveTo) {
    var left = inclusiveFrom ? from <= value : from < value;
    var right = inclusiveTo ? value <= to : value < to;
    return left && right;
  } 

  function copyBetween(from, to) {
  }

  function cursorIndex()    { return charIndex(cursor()); }
  function cursor()         { return $(S.cursor, context); }
  function currentWord()    { return cursor().closest(S.word); }
  function currentRow()     { return cursor().closest(S.line); }
  function charIndex(obj)   { return chars().index(obj); }

  function chars(innerContext) {
    if(innerContext === undefined)
      return $(S.character, context);
    else
      return innerContext.find(S.character);
  }

  function charsInSameLine(obj) { return charsInLine(line(obj)); }
  function colIndex(obj)    { return charsInSameLine(obj).index(obj); } 
  function line(obj)        { return obj.closest(S.line); }
  function lineIndex(line)  { return lines().index(line); }
  function lines()          { return $(S.line, context) }
  function getRow(index)    { return $('.line:eq(' + index + ')', context); } // TODO: better name
  function setCursor(obj)   { obj.addClass("cursor"); }
  function removeCurrentCursor() { $(S.cursor, context).removeClass("cursor"); }
  function word(obj)        { return obj.closest(S.word); }
  function words()          { return $(S.word, context); }
  function wordsInRow(row)  { return row.find(S.word); }
  function wordIndex(word)  { return words().index(word); }
  function last(obj)        { return obj.eq(obj.length - 1); }
  function first(obj)       { return obj.eq(0); }
  function charsInLine(line) { return line.find(S.character); }
  function isSpaceWord(word) { return word.hasClass('space'); }

  function charInLineByIndex(line, colIndex) {
    var validIndex = validIndexInLineByIndex(line, colIndex); 
    return charsInLine(line).eq(validIndex);
  }

  function validIndexInLineByIndex(line, colIndex) {
    var c = charsInLine(line);   
    return colIndex < 0         ? 0 :
           colIndex >= c.length ? c.length - 1 :
                                  colIndex;
 }

  function moveToStartOfLine(obj) {
    return obj.closest(S.line).find('.char:first');
  }

  function moveToEndOfLine(obj) {
    return obj.closest(S.line).find('.char:last');
  }
  
  function moveLeft(obj, times_) {
    var times = getOrElse(times_, 1);
    var chars = charsInSameLine(obj); 
    var from_index = chars.index(obj);
    var index = from_index - times >= 0 ? from_index - times : 0;
    return chars.eq(index);
  }

  function moveRight(obj, times_) {
    var times = getOrElse(times_, 1);
    var chars = charsInSameLine(obj); 
    var from_index = chars.index(obj);
    var index = from_index + times < chars.length ? 
                  from_index + times : chars.length - 1;
    return chars.eq(index);
  }

  function moveUp(obj, times_) {
    var times = getOrElse(times_, 1); 

    function endLineIndex(line_index, times, line_length) {
      return line_index - times >= 0 ?
             line_index - times : 0;
    }
    
    return moveVertically(obj, times, endLineIndex);
  }

  function moveDown(obj, times_) {
    var times = getOrElse(times_, 1); 

    function endLineIndex(line_index, times, line_length) {
      return line_index + times < line_length ?
             line_index + times : line_length - 1;
    }
    
    return moveVertically(obj, times, endLineIndex);
  }

  function moveVertically(obj, times, endLineIndex) {
    var line_index = lineIndex(line(obj)); 
    var col_index = colIndex(obj);
    var all = lines();
    
    var end_line_index = endLineIndex(line_index, times, all.length);
    var endline = all.eq(end_line_index);   

    return charInLineByIndex(endline, col_index);
  }

  function removePreviousCharInCurrentLine() {
    var removable = previousCharInCurrentLine();
    
    if(!!removable) {
      var closestWord = removable.closest(S.word);

      if(closestWord.find(S.character).length === 1) {
        closestWord.remove();
      } else {
        removable.remove();
      }

      mergeWordsWithoutSpace(currentRow());
    }
  }

  function previousCharInCurrentLine() {
    var curRow = currentRow();
    var chars = curRow.find(S.character);
    var index = chars.index(cursor());
    return index > 0 ? curRow.find('.char:eq(' + (index-1) + ')') : false;
  }
  
  function nextWord(obj) {
    var index = wordIndex(word(obj));
    if(index + 1 === words().length) return false;
    var next = words().eq(1 + index);
    return isSpaceWord(next) ? nextWord(next) : next; 
  }

  function previousWord(obj) {
    var index = wordIndex(word(obj));
    if(index === 0) return false;
    var prev = words().eq(index - 1);
    return isSpaceWord(prev) ? previousWord(prev) : prev;
  }

  function moveToEndOfPreviousWord(obj) {
    var startOfCurrentWord = first(word(obj).find(S.character));
    if(wordIndex(word(startOfCurrentWord)) === 0)
      return startOfCurrentWord;

    var previousWord_ = word(moveToStartOfWord(startOfCurrentWord)); // moves to previous word if possible
    return last(previousWord_.find(S.character));
  }


  // value || default doesn't work when value is 0
  function getOrElse(value, default_) {
    return value !== undefined ? value : default_;
  } 

  /** direction is from left to right */ 
  function moveToEndOfWord(obj, times_) {
    var times = getOrElse(times_, 1); 
    if(times <= 0) return obj; // FIXME should there be a max limit for times
    
    var w = word(obj);
    var chars = w.find(S.character);
    var index = chars.index(obj);

    if(index + 1 === chars.length) {
    var next = nextWord(obj); 
      if(!!next) {
        return moveToEndOfWord(next, times);
      } else return obj;
    } else {
      var end = last(chars);
      return moveToEndOfWord(end, times - 1);
    } 
  }
  
  /** direction is from right to left */
  function moveToStartOfWord(obj, times_) {
    var times = getOrElse(times_, 1); 
    if(times <= 0) return obj; // FIXME should there be a max limit for times
   
    var w = word(obj);
    var chars = w.find(S.character);
    var index = chars.index(obj);

    if(index === 0) {
      var prev = previousWord(obj); 
      if(!!prev) {
        return moveToStartOfWord(first(prev.find(S.character)), times - 1);
      } else {
        return obj;
      }
    } else {
      return moveToStartOfWord(first(chars), times - 1);
    } 
 }

  /** direction is from left to right */
  function moveToStartOfNextWord(obj, times_)  {
    var times = getOrElse(times_, 1); 
    if(times <= 0) return obj; 

    var next = nextWord(obj);

    if(!!next)
      return moveToStartOfNextWord(first(next.find(S.character)), times - 1);
    else {
      var result = last(word(obj).find(S.character));
      return {
        lastPossible: result
      };
    }
  } 

  function removeEmptiedWords() {
    //$(S.word+":not(.space)", context).each(function() {
    $(S.word, context).each(function() {
      if($(this).children(S.character).length === 0)
        $(this).remove();
    });
  }

  function removeEmptiedLines() {
    lines().each(function() {
      if($(this).children(S.word).length === 0)
        $(this).remove();
    });
  }

  function mergeWordsWithoutSpace(line) {
    var secondWord = $('.word:not(.space) + .word:not(.space)', context);

    if(secondWord.length > 0) {
      var index = line.find(S.word).index(secondWord) - 1;
      if(index > 0) {
        var firstWord = line.find(S.word + ':eq('+ index + ')');
        var secondHtml = secondWord.html();
        secondWord.remove(); // ensure that only one cursor is at present at a time
        $(secondHtml).appendTo(firstWord);
      }
    }
  }

  function currentColumnIndex() {
    var row = currentRow();
    var characters = row.find('.char');
    var cursor = $(S.cursor, context);
    return characters.index(cursor);
  }


  function removeCharactersFromCurrentLineStartingFrom(start_index) {
    var chars_to_be_deleted = currentRow().find('.char').filter(function(index) {
      return index >= start_index;
    });

    var words = [];

    chars_to_be_deleted.each(function() {
      var parentWord = $(this).closest('.word');
      words.push(parentWord);
      $(this).remove();
    });

    G.for_each(words, function(word) {
      if(word.length > 0 && word.find('.char').length === 0) {
        word.remove();
      }
    });
    
    // FIXME remove empty words
  }

  function cursorInLastCharOfWord() {
    var w = currentWord();
    var chars = w.find('.char');
    var index = chars.index(cursor());
    return (index + 1) === chars.length;
  }

  function removeCharUnderCursor() {
    var curIndex = currentColumnIndex();
    var curRow = currentRow();
    var rowIndex = currentRowIndex();
    var charsInRowBeforeRemove = curRow.find(S.character).length;

    if(charsInRowBeforeRemove === 1) {
      $(S.line, context).eq(rowIndex).append(doc.getSpaceWord());
      removeCurrentChar();
      changeCursorTo($(S.line, context).eq(rowIndex).find('.char:first'));
      return;
    }
    
    removeCurrentChar();

    if(charsInRowBeforeRemove === curIndex + 1) {
      changeCursorTo($(S.line, context).eq(rowIndex).find(S.character).eq(curIndex-1));
    } else {
      changeCursorTo($(S.line, context).eq(rowIndex).find(S.character).eq(curIndex));
    }

    mergeWordsWithoutSpace(curRow);
  }

  function removeCurrentChar() {
    var curWord = currentWord();
    var curRow = currentRow();
    if(curRow.find(S.character).length <= 1) {
      curRow.remove();
    } else if(curWord.find(S.character).length <= 1) {
      curWord.remove();
    } else {
      cursor().remove();
    }

    // if nothing is left, add empty line
    if(chars().length === 0) {
      $('.text', context).html(doc.getEmptyText());
      $('.char:first', context).addClass('cursor');
    }
  }

  function replaceTargetWithInput(target, input) {
    replace(target, $(doc.getChar(input)));
  }

  function initializeEmptyText() {
    $('.text', context).html(doc.getEmptyText());
    changeCursorTo($('.char:first', context));
  }

  function initializeWithText(text) {
    $('.text', context).html(doc.getText(text));
  }

  function removeCurrentLine() {
    var rowindex = currentRowIndex();
    var isLastRow = (rowindex + 1) >= $('.line', context).length;
    currentRow().remove();

    if(rowindex === 0) {
      var row = getRow(rowindex);
      if(row.length === 0) {
        initializeEmptyText();
      } else {
        changeCursorTo(row.find('.char:first'));
      }
    } else {
      if(isLastRow) {
        changeCursorTo($('.line:last .char:last', context));
      } else { // cursor to the following row's first char
        changeCursorTo(getRow(rowindex).find('.char:first'));
      }
    }
  }

  function divideCurrentWordWithSpace() {
    var word = currentWord();
    var curChar = cursor();
    var index = word.find('.char').index(curChar);
    var before = getCharsBefore(word, index);
    var after = getCharsAfter(word, index - 1); // - 1 is for inclusion of cursor

    var beforeElem = getWordElem(before);
    var afterElem = getWordElem(after);

    if(beforeElem.text() !== "" ) {
      beforeElem.insertBefore(word);
    }
    
    if(afterElem.text() !== "") {
      afterElem.insertAfter(word);
    }

    $(doc.getSpaceWord()).insertBefore(word);
    word.remove();
  }

  //TODO move getWordElem to doc?
  function getWordElem(inner) {
    var result = $('<div class="word"></div>');
    result.append(inner);
    return result;
  }

  function getCharsBefore(word, index) {
    return word.find('.char').filter(function(i) {
      return i < index;
    });
  }

  function getCharsAfter(word, index) {
    return word.find('.char').filter(function(i) {
      return i > index;
    });
  }

  function findForwardStartingFrom(input, obj, all, occurrencesNeeded) {
    occurrencesNeeded = occurrencesNeeded !== undefined ? occurrencesNeeded : 1;
    var occurrences = 0;
    
    var startIndex = all.index(obj);
    var character = input;
    var found = false;

    all.each(function(index) {
      if(!found && index >= startIndex) {
        var value = $(this).text();
        if(value === character) {
          occurrences = occurrences + 1;

          if(occurrences >= occurrencesNeeded)
            found = $(this);
        }
      }
    });

    return found;
  }

  function findBackwardStartingFrom(input, obj, all) {
    var all_reversed = $(G.reverse(all));
    return findForwardStartingFrom(input, obj, all_reversed);
  }

  ///FIXME change so that searchable is not assumed to be within the set of all
  function findForward(startIndex, all, testFun, inclusiveStart) {
    inclusiveStart = inclusiveStart !== undefined ? inclusiveStart : false;
    var actualStartIndex = startIndex + (inclusiveStart ? 0 : 1);
    var total = all.length;

    for(var i = actualStartIndex; i < total; i++) {
      var elem = all.eq(i);
      if(testFun(elem)) return elem;
    }

    for(var i = 0; i < actualStartIndex; ++i) {
      var elem = all.eq(i);
      if(testFun(elem)) return elem;
    }

    return false;
  }

  function findBackward(startIndex, all, testFun) {
    var all_reversed = $(G.reverse(all));
    return findForward(all.length - startIndex - 1, all_reversed, testFun);
  }


  function findCorrespondingParentheses() {
    var current = cursor();
    var startIndex = cursorIndex();
    var marker = current.text();

    var endMarker = endMarkers[marker];

    if(endMarker !== undefined) {
      var startMarker = marker;
      var searchable = endMarker;
      var all = chars().filter(function(index) { return index > startIndex; });

      var xx = 1;
    
      return findForward(0, all, function(test) {
        var currentText = $(test).text();
        
        if(currentText === searchable)
          xx = xx - 1;
        else if(currentText == startMarker)
          xx = xx + 1;
        
        return xx === 0;
      });
    } else {
      var startMarker = startMarkers[marker];

      if(startMarker === undefined)
        return false;

      var searchable = startMarker;
      var endMarker = marker;
      var endIndex = cursorIndex();

      var all = chars().filter(function(index) { return index < endIndex; });

      var xx = 1;

      return findBackward(endIndex, all, function(test) {
        var currentText = $(test).text();

        if(currentText === searchable)
          xx = xx - 1;
        else if(currentText == endMarker)
          xx = xx + 1;

        return xx === 0;
      });
    }
  }
}
