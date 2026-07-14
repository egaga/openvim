/**
 * Visual mode commands.
 * +
 * Visual block mode commands.
 * Allows prepending and appending text to selected rows
 *
 * FIXME: this needs SOME refactoring
 * FIXME: move jQuery dependent code to executor/view
 * FIXME: should not depend on doc
 */
function create_VIM_VISUAL_COMMANDS(environment, messager, doc) {
  var G = VIM_GENERIC;
  var exe = environment.executor;
  var env = environment;

  // Common

  var characterwise = 'characterwise';
  var linewise = 'linewise';
  var blockwise = 'blockwise';

  var visualType = characterwise;
  
  var originAttributeName = 'visual_origin';

  function register(key, fun) { env.registerCommand(key, fun); }
  function cursor() { return exe.cursor(); }  


  function getOrigin() {
    return $(".char[" + originAttributeName + "]"); //, context);
  }

  function location(ch) {
      return {
        'row': exe.lineIndex(exe.line(ch)),
        'col': exe.colIndex(ch)
      };
  }

  function removeClassesAndAttr(obj){
    $(obj).each(
      function() {
        $(this).find(".char")
        .removeClass("visual_char previousCursor cursor")
        .removeAttr(originAttributeName);
      }
    );
  }

  function removeVisualClass() {
    $('.visual_char').removeClass('visual_char');
  }

  function update_visual_view() {
    removeVisualClass();

    var origin = getOrigin();

    if(origin.length === 0)
      return;
    if(visualType === characterwise) {
      var bound = getBoundariesCharacterwise(origin);
      var $selectedLines = getSelectedLinesCharacterwise(bound);

      $selectedLines.each(function(lineIndex) {
        var $line = $(this);
        var $chars = exe.charsInLine($line);

        var startIndex = lineIndex === 0 ? bound.from.col : 0;
        var endIndex = lineIndex + 1 >= $selectedLines.length ? bound.to.col : $chars.length;

        $chars
          .slice(startIndex, endIndex)
          .addClass('visual_char');
      });
    }
    else if(visualType === linewise) {
      var bound = getBoundariesCharacterwise(origin); // Trust me
      var $selectedLines = getSelectedLinesCharacterwise(bound); // It works
      $selectedLines.each(function(lineIndex) {
        
        var $line = $(this);
        var $chars = exe.charsInLine($line);
        $chars
          .addClass('visual_char');
      });
    }
    else if(visualType === blockwise) {
      var bound = getBoundariesBlockwise(origin);
      var $selectedLines = getSelectedLinesBlockwise(bound);
      
      $selectedLines.each(function() {
        var $line = $(this);
        var $chars = exe.charsInLine($line);
        
        $chars
          .slice(bound.colStart, selectTillTheEndOfLines ? $chars.length : bound.colEnd + 1)
          .addClass('visual_char');
      });
    }
  }

  function cleanup() {
    getOrigin().removeAttr(originAttributeName);
    removeVisualClass();
    env.setCommandMode();
  }
  
  function vim_esc() { cleanup(); }

  // Characterwise Utilities

  function isBeforeOrSame(ch1, ch2) {
      if(ch1.row === ch2.row)
        return ch1.col <= ch2.col;
      else
        return ch1.row < ch2.row;
  }

  function range() {
    var origin_ = getOrigin();
    var cursor_ = cursor();

    return isBeforeOrSame(location(origin_), location(cursor_)) ?
          { from: origin_, to: cursor_ }
          :
          { from: cursor_, to: origin_ }
  }

  function getBoundariesCharacterwise(origin) {
    var originLocation = location(origin);
    var cursorLocation = location(cursor());

    return isBeforeOrSame(originLocation, cursorLocation) ?
      { from: originLocation, to: cursorLocation }
      :
      { from: cursorLocation, to: originLocation };
  }

  function getSelectedLinesCharacterwise(bound) {
    return exe.lines().slice(bound.from.row, bound.to.row + 1);
  }

  function copySelectedChars() {
    var range_ = range();
    var copy = exe.copyBetween(range_.from, range_.to);
    removeClassesAndAttr(copy);
    env.saveToRegister(copy);
  }

  function removeSelectedChars() {
    var range_ = range();

    exe.removeBetween(range_.from, range_.to,
                      true, true); // is inclusive in border
  }

  function vim_v() {
    if(env.isVisualMode()) {
      if(visualType === characterwise) {
        vim_esc();
      }
      else {
        visualType = characterwise;
      }
    }
    else {
      env.setVisualMode();
      visualType = characterwise;
      exe.withAttribute(cursor(), originAttributeName); // XXX: instead: coordinates would be more robust?
    }
  }
  
  function vim_d() {
    removeSelectedChars();
    cleanup();
  }

  function vim_y() {
    env.setRegisterType(visualType);
    if(visualType === characterwise) {
      copySelectedChars();
    }
    else if(visualType === linewise) {
      copySelectedLines();
    }
    else {
      copySelectedBlock();
    }
    exe.changeCursorTo(getOrigin());
    cleanup();
  }

  // Linewise Utilities

  function copySelectedLines() {
    var range_ = range();
    var start = exe.firstChar(exe.line(range_.from));
    var end   = exe.lastChar(exe.line(range_.to));
    var copy = exe.copyBetween(start, end);
    removeClassesAndAttr(copy);
    env.saveToRegister(copy);
  }

  function vim_shifted_v() {
    if(env.isVisualMode()) {
      if(visualType === linewise) {
        vim_esc();
      }
      else {
        visualType = linewise;
      }
    }
    else {
      env.setVisualMode();
      visualType = linewise;
      exe.withAttribute(cursor(), originAttributeName); // XXX: instead: coordinates would be more robust?
    }
  }

  // Blockwise Utilities

  var selectTillTheEndOfLines = false;

  function getBoundariesBlockwise(origin) {
    var origRow = exe.lineIndex(exe.line(origin));
    var origCol = exe.colIndex(origin);

    var curRow = exe.currentRowIndex();
    var curCol = exe.currentColumnIndex();

    return {
      'rowStart': Math.min(origRow, curRow),
      'rowEnd': Math.max(origRow, curRow),
      'colStart': Math.min(origCol, curCol),
      'colEnd': Math.max(origCol, curCol)
    }
  }

  function getSelectedLinesBlockwise(bound) {
    return exe.lines().slice(bound.rowStart, bound.rowEnd + 1);
  }

  function insertCharactersToSelectedLines(insertLocations, repeatableChars) {
    G.for_each(insertLocations, function(location) {
          exe.changeCursorTo(location);

          G.for_each(repeatableChars, function(ch) {
            if(ch === " ") {
              exe.divideCurrentWordWithSpace();
            } else {
              var $ch = $(doc.getChar(ch));
              $ch.insertBefore(cursor()); // XXX: bypass the interpreter for speed
            }
          });
        });
  }

  function listenToInsert(insertLocations) {
    env.setInsertMode();
    //update_visual_view();

    var alreadyProcessingRepeatInsert = false;
    var bound = getBoundariesBlockwise(getOrigin());

    function insert_listener(input) {
      if(input === 'Esc') {
        var repeatableChars = env.getInsertedCharsInLastInsertModeSession(); // need to have a reference before setting insertmode again
        insertCharactersToSelectedLines(insertLocations, repeatableChars);
        cleanup();
        exe.changeCursorTo(getCursorEndingLocation(bound));
      }
      else {
        env.interpret_insert(input);
        env.addAction("visual_block_input_listener", insert_listener);
      }
    }
    env.addAction("visual_block_input_listener", insert_listener);
  }

  function copySelectedBlock() {
    throw new Error("Not implemented");

    var range_ = range();
    var copy = exe.copyBetween(range_.from, range_.to);
    removeClassesAndAttr(copy);
    env.saveToRegister(copy);
  }

  function getPrependLocations() {
    var bound = getBoundariesBlockwise(getOrigin());
    var lines = getSelectedLinesBlockwise(bound);

    return lines.map(function() {
      var $line = $(this);
      return exe.charsInLine($line).eq(bound.colStart);
    });
  }

  function getAppendLocations() {
    var bound = getBoundariesBlockwise(getOrigin());
    var lines = getSelectedLinesBlockwise(bound);

    return lines.map(function() {
      var $line = $(this);
      if(selectTillTheEndOfLines) {
        exe.insertAfter(exe.createNewChar(), exe.word(exe.moveToEndOfLine($line)) );
        exe.withAttribute(exe.moveToEndOfLine($line), "appendable");
        return exe.lastChar($line);
      }
      var len = $line.find(".char").length;
      while(len <= bound.colEnd) {
        exe.insertAfter(exe.createNewChar(), exe.word(exe.moveToEndOfLine($line)) );
        len++;
      }
      if(len == bound.colEnd + 1) {
        exe.insertAfter(exe.createNewChar(), exe.word(exe.moveToEndOfLine($line)) );
        exe.withAttribute(exe.moveToEndOfLine($line), "appendable");
      }
      return exe.charsInLine($line).eq(bound.colEnd + 1);
    });
  }

  function getCursorEndingLocation(bound) {
    var lines = getSelectedLinesBlockwise(bound);
    var firstLine = lines.eq(0);
    return exe.charsInLine(firstLine).eq(bound.colStart);
  }

  function vim_ctrl_v() {
    if(env.isVisualMode()) {
      if(visualType === blockwise) {
        vim_esc();
      }
      else {
        visualType = blockwise;
        selectTillTheEndOfLines = false;
      }
    }
    else {
      env.setVisualMode();
      visualType = blockwise;
      selectTillTheEndOfLines = false;
      exe.withAttribute(cursor(), originAttributeName); // XXX: instead: coordinates would be more robust?
    }
  }

  function vim_shifted_a() {
    var locations = getAppendLocations();
    var currentLocation = locations.get(0).eq(0);
    listenToInsert(locations.slice(1, locations.length));
    exe.changeCursorTo(currentLocation);
  }

  function vim_shifted_i() {
    var locations = getPrependLocations();
    var currentLocation = locations.get(0).eq(0);
    listenToInsert(locations.slice(1, locations.length));
    exe.changeCursorTo(currentLocation);
  }

  function vim_$() {
    selectTillTheEndOfLines = true;
    env.interpret_command("$");
  }
  // Visual updates after every input

  register('v', vim_v);
  register('V', vim_shifted_v);
  register('ctrl-v', vim_ctrl_v);
  registerVisualModeCommand('v', vim_v);
  registerVisualModeCommand('V', vim_shifted_v);
  registerVisualModeCommand('ctrl-v', vim_ctrl_v);

  registerVisualModeCommand('Esc', vim_esc);

  registerVisualModeCommand('d', vim_d);
  registerVisualModeCommand('y', vim_y);
  registerVisualModeCommand('A', vim_shifted_a);
  registerVisualModeCommand('I', vim_shifted_i);
  registerVisualModeCommand('$', vim_$);

  function register(key, fun) { env.registerCommand(key, fun); }
  function registerVisualModeCommand(key, fun) { env.registerVisualModeCommand(key, fun); }

  // Bug Fixes [Hacks] : event-based solutions are preferable

  messager.listenTo('view_updated',
    function() {
      if(!env.isVisualMode()) return;
      var suffix = '';
      if(visualType === linewise ) suffix = ' LINE'
      if(visualType === blockwise) suffix = ' BLOCK'
      $('.statustext', exe.context).text("mode: VISUAL" + suffix); // normal, block or line
    }
  );

  messager.listenTo('interpreter_interpreted',
    function(input) {
      if(env.isVisualMode())
        update_visual_view();
    }
  );

  function visualModeInterceptor(input){
    selectTillTheEndOfLines = false;
    env.interpret_command(input);
  }
  registerVisualModeCommand('interceptor', visualModeInterceptor);
}
