function create_VIM_VIEW(environment, messager, context) {
  var executor = environment.executor;

  // ignores ids that listenTo returns (no need to remove listening ever)
  messager.listenTo('interpreter_initialized', receiveMessage);
  messager.listenTo('cursor_changed', receiveMessage);
  messager.listenTo('interpreter_interpreted', receiveMessage);
  messager.listenTo('updated_mode', receiveMessage);
  messager.listenTo('updated_searchtext', updatedSearchText);
  messager.listenTo('searchbar_visible', searchbarVisible);
  
  function updatedSearchText(text) { $('.searchText', context).text(text); }

  function searchbarVisible(isVisible) {
    if(isVisible)
      $('.searchbar', context).show();
    else
      $('.searchbar', context).hide();
  }

  function update() {
    if(environment.isCommandMode()) {
      $('.statustext', context).text("mode: NORMAL");
      $('.insert-mode', context).hide();
      $('.command-mode', context).show();
    } else {
      $('.insert-mode', context).show();
      $('.command-mode', context).hide();
      $('.statustext', context).text("mode: INSERT");
    }

    var row = 1 + executor.currentRowIndex();
    var col = 1 + executor.currentColumnIndex();

    $('.cursorlocation').text(row + ", " + col);
  }

  function receiveMessage(message) {
    // ignore message
    update();
  }

  return {
    'update': update
  }
}
