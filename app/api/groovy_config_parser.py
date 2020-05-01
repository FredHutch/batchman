from shlex import shlex
from ast import literal_eval

TRANSLATION = {
        "true": True,
        "false": False,
        "null": None,
        "*": "*",
    }

class ParseException(Exception):
    def __init__(self, token, line, state=None, name=None):
        self.token = token
        self.line = line
        self.state = state
        self.name = name
    def __str__(self):
        return "ParseException at line %d: invalid token %s (state=%s, name=%s)" % (self.line, self.token, self.state, self.name)

class GroovyConfigSlurper:
    def __init__(self, source):
        self.source = source

    def parse(self):
        lex = shlex(self.source)
        lex.wordchars += "."
        lex.commenters += "//"
        state = 1
        context = []
        result = dict()
        while 1:
            token = lex.get_token()
            if not token:
                return result
            if state == 1:
                if token == "}":
                    if len(context):
                        context.pop()
                    else:
                        raise ParseException(token, lex.lineno)
                else:
                    name = token
                    state = 2
            elif state == 2:
                if token == "=":
                    state = 3
                elif token == "{":
                    context.append(name)
                    state = 1
                elif token == ":":
                    state = 1
                else:
                    #raise ParseException(token, lex.lineno, state, name)
                    state = 2
            elif state == 3:
                if token == "{": # start a closure
                    context.append("closure")
                    state = 4
                else:
                    try:
                        value = TRANSLATION[str(token)]
                    except KeyError:
                        try:
                            value = literal_eval(token)
                        except:
                            value = str(token)
                    key = ".".join(context + [name]).split(".")
                    current = result
                    for i in range(0, len(key) - 1):
                        if key[i] not in current:
                            current[key[i]] = dict()
                        current = current[key[i]]
                    current[key[-1]] = value
                    state = 1
            elif state == 4:
                # handle closure (they are ignored)
                if token == "}":
                    context.pop()
                    state = 1
                else:
                    print(name, token)
