function create_VIM_PROBLEMS() {
    var problems = [];

    function addProblem(problem) { problems.push(problem); }

    function add(setup, expected, suggested) {
        addProblem({
           'setup': setup,
           'expected': expected,
           'suggested': suggested
        });
    }

    // TODO: add categories?

    add("[H]ello! My name is Peter.",
        "Hello! My name is [P]eter.");

    add("[H]ello! My name is Peter.",
        "Hello! My name is [R]andall.");

    add("[H]ello! My name is Peter.",
        "Hello, Randall.");

    add("[H]ello! My name is Peter.",
        "[H]ello! My call name is Pete.");

    return problems;
}