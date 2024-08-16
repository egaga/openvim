function createTutorial(context, interpreter, messager, doc) {
  var G = VIM_GENERIC;

  var tutorial_sections = [];

  function createSection(name, preFun, paragraphs, postFun) {
    return {
      'name': name,
      'paragraphs': paragraphs,
      'preFun': preFun,
      'postFun': postFun
    }
  }
  
  function registerSection(section) { tutorial_sections.push(section); }

  function sendMessageAsync(message) { setTimeout(function() { messager.sendMessage(message); }, 0); }

  function showCommandOneByOne(commands, userInputAccepterCreator) {
    if(commands.length === 0) {
      sendMessageAsync('tutorial_next_section');
      return;
    }

    var commandObj = commands[0];
    commands = commands.slice(1);
    
    var command = commandObj.code !== undefined ? commandObj.code : commandObj;
    var commandPostFun = commandObj.postFun !== undefined ? commandObj.postFun : G.nothing;

    var userInputAccepter = userInputAccepterCreator(command);

    showInfo("Press " + command + " to show command: " + command);
    messager.sendMessage('waiting_for_code', { 'end': false, 'code': command });

    var forAbortId = messager.listenTo('pressed_key', function(key) {
      if(userInputAccepter(key)) {
        setTimeout(function() {
          interpreter.interpretOneCommand(command);
          commandPostFun();
          showCommandOneByOne(commands, userInputAccepterCreator);
        }, 0);

        messager.sendMessage('waiting_for_code', { 'end': true, 'code': command });
        return messager.REMOVE_THIS_LISTENER;
      }
    });

    messager.listenTo('abort_section', function() { // XXX: this will linger if no abort_section is done
      messager.removeListener('pressed_key', forAbortId);
      sendMessageAsync('tutorial_next_section');
      return messager.REMOVE_THIS_LISTENER;
    });
  }

  function showSectionMenu(tutorial_sections) {
    G.for_each_indexed(G.reverse(tutorial_sections), function(section, index) {
      var sectionNumber = tutorial_sections.length - index - 1;
      var sectionName = (1 + sectionNumber) + ". " + section.name;
      var $section = $('<div />',
          { 'class': 'section_menu_item',
            'number': sectionNumber,
            'text': sectionName });
      $('.section_menu_append_target').prepend($section);
    });
  }

  function startTutorial() {
    showSectionMenu(tutorial_sections);
    context.show();
    runSections(context, interpreter, messager, tutorial_sections, doc);
  }

  return {
    'startTutorial': startTutorial,
    'registerSection': registerSection,
    'createSection': createSection,
    'showCommandOneByOne': showCommandOneByOne
  }
}

function allowUserInput() { $('.screen_view').addClass('active_context'); }
function preventUserInput() { $('.screen_view').removeClass('active_context'); }
function showInfo(text) { $('.info').text(text); } //.show(); }
function hideInfo() { $('.info').hide(); }

function runSections(context, interpreter, messager, sections, doc) {
  var anykeyPressedDuringSectionShow = false;
  var currentSectionIndex;
  var currentSection;

  var G = VIM_GENERIC;

  var abortCurrentSection = false;

  var charTimeout = 20;
  var periodTimeout = 600;
  var paragraphTimeout = 800;

  var emphasizedChar = '|';
  var emphasized = false;
  function toggleEmphasized() { emphasized = !emphasized; }

  function getCode(char) { return G.charToInt(char) === 32 ? "Space" : char; }
  function setKeyPressedDuringSectionShow(pressed) {
    if(pressed) {
      anykeyPressedDuringSectionShow = true;
    } else {
      anykeyPressedDuringSectionShow = false;
    }
  }

  function writeChar(code) {
      if(code === emphasizedChar) toggleEmphasized();
      else if(code === "Space") {
        interpreter.environment.setInsertMode();
        interpreter.interpretOneCommand(code);
      } else { // if not space, let's hack so we can get styling easily
          var $ch = $(doc.getChar(code));

          if(emphasized)
              $ch.addClass('emphasized');

          $ch.insertBefore($('.cursor'));
      }
  }

  function showParagraph(text, timeout, continuation) {
    if(text.length === 0 || abortCurrentSection) {
      if(!!continuation) continuation();
    } else {
      var rest = text.substr(1);
      var code = getCode(text.charAt(0));

      writeChar(code);

      if(!anykeyPressedDuringSectionShow) {
        var chartime = code === '.' ? periodTimeout : timeout;
        setTimeout(function() { showParagraph(rest, timeout, continuation); }, chartime);
      } else showParagraph(rest, 0, continuation);
    }
  }

  function showText(lines, timeout, continuation) {
    if(lines.length === 0 || abortCurrentSection) {
      if(!!continuation) continuation();
    } else {
      var text = lines.pop();
      var rest = G.copy_array(lines);
      var paragraph = text;

      function showRest(text) {
        if(text.length > 0) interpreter.interpretOneCommand("Enter");

          setTimeout(function() {
            showText(text, timeout, continuation);
          }, anykeyPressedDuringSectionShow ? 0 : timeout);
      }

      if(!anykeyPressedDuringSectionShow)
        showParagraph(paragraph, charTimeout, function() { showRest(rest); });
      else
        showParagraph(paragraph, 0, function() { showRest(rest); });
    }
  }

  function afterSectionTexts(currentSection) {
    if(abortCurrentSection) {
      setKeyPressedDuringSectionShow(false);
      setTimeout(nextSection, 0);
    } else {
      messager.listenTo('tutorial_next_section', function() {
        setTimeout(nextSection, 0); // must remove listener before calling nextSection
        return messager.REMOVE_THIS_LISTENER;
      });

      setKeyPressedDuringSectionShow(false);
      currentSection.postFun();
    }
  }

  function hideKeyboard() { return; $('.keyboard_wrapper').hide(); }
  
  function nextSection() {
    emphasized = false;
    abortCurrentSection = false;
    interpreter.environment.reset();
    preventUserInput();
    setKeyPressedDuringSectionShow(false);
    hideInfo("");
    hideKeyboard();

    messager.listenTo('pressed_key', function() {
      setKeyPressedDuringSectionShow(true);
      return messager.REMOVE_THIS_LISTENER;
    });

    currentSectionIndex = currentSectionIndex !== undefined ? currentSectionIndex + 1 : 0;
    
    if(currentSectionIndex >= sections.length) return;
    showCurrentSectionInMenu();

    currentSection = sections[currentSectionIndex];
    var texts = G.copy_array(currentSection.paragraphs);
    $('.title', context).text(currentSection.name);

    currentSection.preFun();
    interpreter.environment.setInsertMode();
    showText(G.reverse(texts), paragraphTimeout, function() { afterSectionTexts(currentSection); });
  }

  function bindShowSection() {
    $('.section_menu_item').live('click', function() {
      var number = $(this).attr('number');
      currentSectionIndex = number - 1; // XXX: a little bit of a hack
      abortCurrentSection = true;
      setTimeout(function() { messager.sendMessage('abort_section'); }, 0);
    });
  }

  function showCurrentSectionInMenu() {
    $('.section_menu_item.selected').removeClass('selected');
    $('.section_menu_item[number=' + currentSectionIndex + ']').addClass('selected');
  }

  $('.section_menu_item').die();
  $(bindShowSection);

  nextSection();
}
