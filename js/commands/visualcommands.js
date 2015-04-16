/**
 * Visual mode commands.
 *
 * FIXME: this needs SOME refactoring
 * FIXME: move jQuery dependent code to executor/view
 * FIXME: should not depend on doc
 */
function create_VIM_VISUAL_COMMANDS(environment, messager, doc) {
  var G = VIM_GENERIC;
  var exe = environment.executor;
  var env = environment;

  var originAttributeName = 'visual_origin';

  function register(key, fun) { env.registerCommand(key, fun); }
  function cursor() { return exe.cursor(); }  

  function createInputRecursion(continuation) {
      return function(input) { continuation(input, continuation); }
  }

  function addInputRecursiveAction(actionFun) {
    env.addAction("visual_select_area", createInputRecursion(actionFun));
  }

  function vim_set_visual_mode() {
    //env.setVisualMode();
    function wait_for(input, continuation) {
      if(G.existsIn(input, ["h", "j", "k", "l", "w", "e", "b"])) {
        env.interpretOneCommand(input);
        update_visual_view();
        addInputRecursiveAction(continuation);
      } else if(input === "d") {
        removeSelectedChars();
        cleanup();
      } else if(input === "y") {
        copySelectedChars();
        exe.changeCursorTo(getOrigin());
        cleanup();
      } else if(input === "Esc") {
        cleanup();
      } else {
        addInputRecursiveAction(continuation);
      }
    }

    exe.withAttribute(cursor(), originAttributeName); // XXX: instead: coordinates would be more robust?

    update_visual_view();
    addInputRecursiveAction(wait_for);
  }

  function copySelectedChars() {
    var range_ = range();
    var copy = exe.copyLineContent(range_.from, range_.to);
    env.saveToRegister(copy);
  }

  function range() {
    var origin_ = getOrigin();
    var cursor_ = cursor();

    return isBeforeOrSame(location(origin_), location(cursor_)) ?
          { from: origin_, to: cursor_ }
          :
          { from: cursor_, to: origin_ }
  }

  function removeSelectedChars() {
    var range_ = range();

    exe.removeBetween(range_.from, range_.to,
                      true, true); // is inclusive in border
  }

  function location(ch) {
      return {
        'row': exe.lineIndex(exe.line(ch)),
        'col': exe.colIndex(ch)
      };
  }
  function isBeforeOrSame(ch1, ch2) {
      if(ch1.row === ch2.row)
        return ch1.col <= ch2.col;
      else
        return ch1.row < ch2.row;
  }

  function getBoundaries(origin) {
    var originLocation = location(origin);
    var cursorLocation = location(cursor());

    return isBeforeOrSame(originLocation, cursorLocation) ?
      { from: originLocation, to: cursorLocation }
      :
      { from: cursorLocation, to: originLocation };
  }

  function getSelectedLines(bound) {
    return exe.lines().slice(bound.from.row, bound.to.row + 1);
  }

  function getOrigin() {
    return $(".char[" + originAttributeName + "]"); //, context);
  }

  function cleanup() {
    getOrigin().removeAttr(originAttributeName);
    removeVisualClass();
  }

  function removeVisualClass() {
    $('.visual_char').removeClass('visual_char');
  }

  function update_visual_view() {
    removeVisualClass();

    var origin = getOrigin();

    if(origin.length === 0)
      return;

    var bound = getBoundaries(origin);
    var $selectedLines = getSelectedLines(bound);

    $selectedLines.each(function(lineIndex) {
      var $line = $(this);
      var $charsInLine = exe.charsInLine($line)

      var startIndex = lineIndex === 0 ? bound.from.col : 0;
      var endIndex = lineIndex + 1 >= $selectedLines.length ? bound.to.col : $charsInLine.length;

      $charsInLine
         .slice(startIndex, endIndex)
         .addClass('visual_char');
    });
  }

  register('v', vim_set_visual_mode);
}
