/**
 * Key and mouse bindings.
 *
 * Keys are individually mapped to interpretable codes that are send to the interpreter.
 * If a key is used in an event, stopImmediatePropagation is called to prevent multiple actions for one press.
 *
 * Note: keypress event should be most reliable event for cross-browser compatibility.
 */
function create_VIM_EVENTLISTENER(interpret, environment, messager, isActiveContext) {
  var G = VIM_GENERIC;

  function interpretCode(code) {
    //messager.sendMessage("interpret_code", code);
    interpret(code);
  }

  function bindMouse() {
    environment.executor.chars().live('click', function() {
      if(!isActiveContext()) return;
      //FIXME: check whether is allowed (for example, if in the middle of command, then not?)
      environment.executor.changeCursorTo($(this));
      messager.sendMessage("cursor_changed");
    });
  }

  function getCode(event) { return event.which || event.keyCode; }

  function bindBasicCommandModeKeys() {
    $(document).keypress(function(event) {
      sendKeyCodeMessage(event);

      if(!isActiveContext()) return;

      var codeAsChar = G.intToChar(getCode(event));
      var metaKeyPrefix = event.ctrlKey ? "ctrl-" : "";
      var code = metaKeyPrefix + codeAsChar;

      interpretCode(code);

      stopImmediatePropagation(event);
    });
  }

  function sendKeyCodeMessage(event) {
    messager.sendMessage('pressed_key', getCode(event));
  }


  function bindSpecial() {
    $(document).keydown(function(e) {
      sendKeyCodeMessage(e);

      if(!isActiveContext()) return;

      if(getCode(e) === 27) {
        interpretCode("Esc");
        return false;
      } else if(getCode(e) == 8) {
        interpretCode("Backspace");
        return false;
      } else if(getCode(e) === 32) {
        interpretCode("Space");
        return false;
      } else if(getCode(e) === 13) {
        interpretCode("Enter");
        return false;
      } else if(e.ctrlKey && G.intToChar(getCode(e)) === "V") { // XXX: hack for Chrome...
        interpretCode("ctrl-v");
        return false;
      }

    });
  }

  function stopImmediatePropagation(event) {
    event.stopImmediatePropagation();
  }
  
  $(function() {
    bindBasicCommandModeKeys();
    bindSpecial();
    bindMouse();
  });
} 
