function create_VIM_TESTVIEW(messager, context) {
  var defaultAppendTarget = $('#appendtarget', context);
  var appendtarget = defaultAppendTarget;

  var succeededTests = 0;
  var failedTests = 0;

  function updateValues(succeeded, failed) {
    succeededTests = succeeded;
    failedTests = failed;
  }

  function log(message, message2, clazz) {
    clazz = clazz !== undefined ? clazz : '';

    if(!message2) {
      $('<div />', { 'text': message,
                     'class': clazz })
      .addClass('testinfo')
      .insertBefore(appendtarget);
    } else {
      $('<div />', {text: (message + message2),
                  'class': (!!clazz ? clazz : '')})
                .addClass('testinfo')
                .insertBefore(appendtarget);
    }
  }

  function log2(message1, clazz, message2, clazz2) {
    var parent = $('<div />', { 'class': 'testinfo' });
    var first = $('<div />', { text: message1, 'class': clazz });
    var second = $('<div />', { text: message2, 'class': clazz2 });

    parent.append(first).append(second).append($('<div />', {'style': "clear: both"}));
    parent.insertBefore(appendtarget);
  }

  function showEndResult() {
    if(failedTests === 0) {
      $('.tests_allpassed', context).show();
    } else {
      $('.tests_problems', context).show();
    }

    $('.testunit').children(':not(.test_description)').hide();

    $('.testunit .failed').each(function() {
      $(this).closest('.testunit').find('.test_description').addClass('failed_unit');
    });

    $('#show_test_details').click(function() {
      $('.testunit').children(':not(.test_description)').toggle();
    });

    $('#show_test_details').show();

    showTextAsDom(document);
    create_VIM_CURSOR_BLINKING(document, 500, messager).blink();
  }

  function logEndUnit() {
    //var testunit = $('.testunit');
    //showTextAsDom(testunit);
    //create_VIM_CURSOR_BLINKING(testunit, 500, messager).blink();
  }

  function showTextAsDom($context) {
    $('.test_expected:not(.testunit_as_dom), .test_result:not(.testunit_as_dom), .test_initial:not(.testunit_as_dom)', $context).each(function() {
        var $this = $(this);

        var text = $(this).text();
        var result = $('<div />', { 'class': 'testunit_as_dom'});

        var elem;
      
        for(var i = 0; i < text.length; ++i) {
          if(text.charAt(i) === '|') {
            elem = $('<div />', { 'class': 'linebreak', 'text': '|' });
          } else if(text.charAt(i) === '[' && text.length > i+1) {
            elem = $('<div />', { 'class': 'cursor', 'text': text.substring(i+1, i+2) });
            i=i+2;
          } else {
            elem = $('<div />', { 'text': text.charAt(i)});
          }

          if(text.charAt(i) === ' ') {
            elem.addClass('empty');
            elem.text(' ');
          }

          result.append(elem);
        }

        $this.html(result);
     });
  }

  function updateStatisticsView() {
    $('.tests_failed', context).text("Failed tests: " + failedTests);
    $(".tests_succeeded", context).text("Succeeded tests: " + succeededTests);
    $('.tests_run', context).text("Run tests total: " + (succeededTests + failedTests));
  }

  function logStartUnit() {
    var unit = $('<div />', {'class': 'testunit'})
               .insertBefore(defaultAppendTarget);
    var target = $('<div />', {'style': "clear: both"});
    unit.append(target);
    appendtarget = target;
  }

  $('.tests_problems', context).live('click', function() {
    $('.failed:last', context).closest('.testunit').detach()
                     .insertBefore($('.testinfo:first').closest('.testunit'));
  });

  return {
    'log': log,
    'log2': log2,
    'showEndResult': showEndResult,
    'updateStatisticsView': updateStatisticsView,
    'updateValues': updateValues,
    'logStartUnit': logStartUnit,
    'logEndUnit': logEndUnit
  }
}