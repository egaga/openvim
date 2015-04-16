function create_VIM_SEARCH_COMMANDS(environment, messager) {
  var G = VIM_GENERIC;
  var exe = environment.executor;
  var env = environment;

  function register(key, fun) { env.registerCommand(key, fun); }
  function cursor() { return exe.cursor(); }  

  var searchText = '';

  function setSearchOff() {
    messager.sendMessage('searchbar_visible', false);
  }

  function setSearchPanelOn() {
    messager.sendMessage('searchbar_visible', true);
  }

  function setSearchOn() {
    searchText = '';
    setSearchPanelOn();
    updateSearchView();
  }

  function addSearchChar(input) {
    searchText = searchText + input;
    updateSearchView();
  }

  function removeLastCharFromSearch() {
    if(searchText.length > 0) {
      searchText = searchText.substr(0, searchText.length - 1);
      updateSearchView();
    }
  }

  function updateSearchView() {
    messager.sendMessage('updated_searchtext', searchText);
  }
 
  function searchNextStartingFromIndex(text, searchable, fromIndex) {
    var index = text.indexOf(searchable, 1+fromIndex);

    return index !== -1 ? index : false;
  }
  
  function searchNext(searchable, fromObj) {
    var text = exe.text(exe.chars()); 
    var fromIndex = exe.charIndex(fromObj);
    var found = searchNextStartingFromIndex(text, searchable, fromIndex);
    
    if(!!found)
      exe.changeCursorTo(exe.charByIndex(found)); 
  }

  function searchPrevious(searchable, fromObj) {
    var text = G.reverseString(exe.text(exe.chars())); 
    var charsTotal = exe.chars().length;
    var fromIndex = charsTotal - exe.charIndex(fromObj);
    var found = searchNextStartingFromIndex(text, G.reverseString(searchable), fromIndex);
    
    if(!!found)
      exe.changeCursorTo(exe.charByIndex(charsTotal - found - searchable.length));
  }

  // FIXME: space &nbsp;
  function vim_search_next() { searchNext(searchText, cursor()); }
  function vim_search_previous() { searchPrevious(searchText, cursor()); }

  function vim_search() {
    var wait_for = function(input, continuation) {
      var continueSearch = function(input) { continuation(input, continuation); }
      var addContinueSearch = function() { env.addAction("/", continueSearch); }

      if(input === "Enter")
        searchNext(searchText, cursor());
      else if(input === "Esc")
        setSearchOff();
      else if(input === "Backspace") {
        removeLastCharFromSearch();
        addContinueSearch();
      } else if(input === "Space") {
        addSearchChar(" ");
        addContinueSearch();
      } else if(env.isInsertableCharacter(input)) {
        addSearchChar(input);
        addContinueSearch();
      } else
        addContinueSearch();
    };

    setSearchOn();
    var wait_for_with_continuation = function(input) { wait_for(input, wait_for); };
    env.addAction("/", wait_for_with_continuation); 
  }

  register('/', vim_search);
  register('n', vim_search_next);
  register('N', vim_search_previous);
}
