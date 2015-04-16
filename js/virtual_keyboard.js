function create_VIM_VIRTUAL_KEYBOARD() {
  var G = VIM_GENERIC;

  function two(primary, secondary) {
    return {
      'primary': primary,
      'secondary': secondary
    };
  }

  function configurationKey(label, clazz) {
    return {
      'configuration': true,
      'label': label,
      'clazz': clazz
    }
  }

  var escRow = ["Esc", 'hid', 'hid', 'hid', 'hid', 'hid', 'hid',
    configurationKey('3d', 'toggle_3d_keyboard'),
    configurationKey('Screen brightness', 'toggle_screen_brightness'),
    configurationKey('Keyboard size', 'toggle_keyboard_size') ];
  var numberRow = ['hid', '1', '2',
    two('3', '#'), two('4', '$'), two('5', '%'),
    '4', '5', '6', '7', '8', '9', '0'];
  var tabRow = ['tab', 'q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p', {key: 'Backspace', label: '<='}];
  var capslockRow = ['caps', 'a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l', '*', 'Enter'];
  var shiftRow = ['shift', two('>', '<'), 'z', 'x', 'c', 'v', 'b', 'n', 'm', ',', '.'];
  var bottomRow = ['ctrl', 'alt', 'Space'];

  function createKeyButton(key) {
    //TODO: refactor common functionality
    if(key.configuration) {
      return $('<div />', { 'text': key.label, 'class': ('keyButton ' + key.clazz) });
    } else if(key === "hid")
      return $('<div />', { 'text': '_', 'class': 'keyButton hiddenButton' });
    else if(key.primary !== undefined) {
      var $key = $('<div />', { 'text': (key.primary + " " + key.secondary), 'class': 'keyButton' });
      $key.data('keyboard', key.primary);
      return $key;
    } else if(key.key !== undefined) {
      var $key = $('<div />', { 'text': key.label, 'class': 'keyButton' });
      $key.data('keyboard', key.key);
      return $key;
    } else {
      var $key = $('<div />', { 'text': key, 'class': 'keyButton' });
      $key.data('keyboard', key);
      return $key;
    }
  }

  function createRow(row) {
    var $row = $('<div />', { 'class': 'keyboardRow' });

    G.for_each(row, function(key) {
      $row.append(createKeyButton(key));
    });

    return $row;
  }

  function createKeyboard(rows) {
    var $keyboard = $('<div />', { 'class': 'keyboard' });
    
    G.for_each(rows, function(row) {
      var $row = createRow(row);
      $keyboard.append($row);
    });

    bindToggleKeyboardSize($keyboard);
    bindToggleScreenBrightness($keyboard);
    bindToggle3d($keyboard);
    return $keyboard;
  }

  function bindToggleKeyboardSize($keyboard) {
    $('.toggle_keyboard_size').live('click', function() {
      $(this).toggleClass('pressed_down');
      $keyboard.toggleClass('small_keyboard');
    });
  }

  function bindToggleScreenBrightness($keyboard) {
    $('.toggle_screen_brightness').live('click', function() {
      $(this).toggleClass('pressed_down');
      $('.editor').toggleClass('darker');
    });
  }

  function bindToggle3d($keyboard) {
    $('.toggle_3d_keyboard').live('click', function() {
      $(this).toggleClass('pressed_down');
      $('.screen_view').toggleClass('view_3d');
    });
  }

  var keyboardAsDom = createKeyboard(
      [escRow, numberRow, tabRow, capslockRow, shiftRow, bottomRow]
  );

  function getKeyButtonByKey(key) {
    return keyboardAsDom.find('.keyButton').filter(function() {
      var value = $(this).data('keyboard');

      return value === key;
    }).first();
  }

  var pressed_down = 'pressed_down';

  function pressButtonDown(key) { addClass(pressed_down, key); }
  function releaseButton(key) { removeClass(pressed_down, key); }
  function releaseButtons() { removeClass(pressed_down); }

  function addClass(clazz, key) { getKeyButtonByKey(key).addClass(clazz); }

  function removeClass(clazz, key) {
    if(key === undefined)
      keyboardAsDom.find('.' + clazz).removeClass(clazz);
    else
      getKeyButtonByKey(key).removeClass(clazz);
  }

  return {
    'addClass': addClass,
    'removeClass': removeClass,
    'pressButtonDown': pressButtonDown,
    'releaseButton': releaseButton,
    'releaseButtons': releaseButtons,
    'keyboardAsDom': keyboardAsDom
  }
}