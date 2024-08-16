function create_VIM_CURSOR_BLINKING($context, time, messager) {
  var blinking = create_VIM_BLINKING('cursor', $context, time, messager);
  messager.listenTo("interpreter_interpreted", blinking.remove_all_blinks);
  return blinking;
}

function create_VIM_BLINKING(clazz, $context, time) {
  function remove_all_blinks() {
    $('.blinking_off', $context).removeClass('blinking_off');
  }

  function blink_action() {
    $('.' + clazz, $context).toggleClass('blinking_off');
  }

  function blink() {
    blink_action();
    setTimeout(blink, time);
  }

  return {
    'remove_all_blinks': remove_all_blinks,
    'blink': blink
  }
}