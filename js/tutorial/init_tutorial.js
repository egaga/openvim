function init_tutorial(keyboardLayout = 'qwerty') {
  $('.screen_view').each(function() {
    var G = VIM_GENERIC;
    
    var context = $(this);
    var doc = create_VIM_DOCUMENT(context);

    var messager = create_VIM_MESSAGER();
    var context_help = create_VIM_CONTEXT_HELP(context);
    var executor = create_VIM_EXECUTOR(doc, context);
    var interpreter = create_VIM_INTERPRETER(doc, executor, context_help, messager);
    var view = create_VIM_VIEW(interpreter.environment, messager, context);

    create_VIM_VISUAL_COMMANDS(interpreter.environment, messager, doc);
    create_VIM_VISUALBLOCK_COMMANDS(interpreter.environment, messager, doc);
    create_VIM_SEARCH_COMMANDS(interpreter.environment, messager);

    var timesCommansd = create_VIM_TIMESCOMMANDS(interpreter.environment, messager);
    create_VIM_COMMANDS(interpreter.environment, timesCommansd);

    function isActiveContext() { return context.hasClass('active_context'); }

    create_VIM_EVENTLISTENER(interpreter.interpretOneCommand, interpreter.environment, messager, isActiveContext);
    create_VIM_CURSOR_BLINKING(context, 700, messager).blink();

    var keyboard = create_VIM_VIRTUAL_KEYBOARD(keyboardLayout);
    $('.keyboard_wrapper').append(keyboard.keyboardAsDom);

    create_VIM_BLINKING('waiting_to_be_pressed', keyboard.keyboardAsDom, 500, messager).blink();

    messager.listenTo('abort_section', function() {
      keyboard.removeClass('waiting_to_be_pressed');
    });

    messager.listenTo('waiting_for_code', function(message) {
      keyboard.removeClass('waiting_to_be_pressed');

      if(!message.end) {
        $('.keyboard_wrapper').show();
        var code = message.code;

        if(code === 'ctrl-v') {
          keyboard.addClass('waiting_to_be_pressed', 'ctrl');
          keyboard.addClass('waiting_to_be_pressed', 'v');
        } else if(code === "#") {
          keyboard.addClass('waiting_to_be_pressed', 'shift');
          keyboard.addClass('waiting_to_be_pressed', '3');
        } else if(code === '/') {
          keyboard.addClass('waiting_to_be_pressed', 'shift');
          keyboard.addClass('waiting_to_be_pressed', '7');
        } else if(code === '%') {
          keyboard.addClass('waiting_to_be_pressed', 'shift');
          keyboard.addClass('waiting_to_be_pressed', '5');
        } else if(code === "$") {
          keyboard.addClass('waiting_to_be_pressed', 'shift'); // XXX: en-US keyboard setting is preferred for now
          keyboard.addClass('waiting_to_be_pressed', '4');
        } else if(code.length === 1 && code >= 'A' && code <= 'Z') {
          var code2 = code.toLowerCase();
          keyboard.addClass('waiting_to_be_pressed', 'shift');
          keyboard.addClass('waiting_to_be_pressed', code2);
        } else {
          keyboard.addClass('waiting_to_be_pressed', code);
        }
      }
    });

    updateModifierKeys();

    var tutorial = createTutorial($(this), interpreter, messager, doc);
    register_VIM_TUTORIAL_SECTIONS(interpreter, messager,
                                   tutorial.createSection, tutorial.registerSection, tutorial.showCommandOneByOne, doc);
    tutorial.startTutorial();

    $('.toggle_siblings').live('click', function() {
      $(this).siblings(':not(.headline)').toggle();
      $(this).closest('.section_menu').toggleClass('shrinkMenu');
    });
  });
}

function updateModifierKeys() {
  addSizeClass('caps', 'medium');
  addSizeClass('Enter', 'medium');
  addSizeClass('shift', 'large');
  addSizeClass('Space', 'space');
}

function addSizeClass(key, size){
  $(".keyButton:contains('" + key + "')").addClass(size);
}