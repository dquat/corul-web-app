use std::borrow::Cow;
use std::iter::Peekable;
use std::ops::Range;
use std::str::CharIndices;

const KWS: [&'static str; 19] = [
    "true", "false", "for", "while", "loop", "if", "else", "const", "let", "fn", "return", "static",
    "pub", "struct", "mut", "self", "impl", "match", "in"
];

// a simple little convenience macro
macro_rules! tag {
    ($class_name: literal) => {
        concat!("<span class='", $class_name, "'>")
    }
}

pub fn esc(input: &str) -> Cow<str> {
    for (i, ch) in input.chars().enumerate() {
        if esc_c(ch).is_some() {
            let mut escaped_string = String::with_capacity(input.len());
            escaped_string.push_str(&input[..i]);
            for ch in input[i..].chars() {
                match esc_c(ch) {
                    Some(escaped_char) => escaped_string.push_str(escaped_char),
                    None => escaped_string.push(ch),
                };
            }
            return Cow::Owned(escaped_string);
        }
    }
    Cow::Borrowed(input)
}

fn esc_c(ch: char) -> Option<&'static str> {
    match ch {
        '&'  => Some("&amp;"),
        '<'  => Some("&lt;"),
        '>'  => Some("&gt;"),
        '"'  => Some("&quot;"),
        '\'' => Some("&#x27;"),
        _    => None,
    }
}


pub struct Lexer<'a> {
    src: Cow<'a, str>,
    it: Peekable<CharIndices<'a>>,
}

impl<'a> Lexer<'a> {
    pub fn new(src: &'a str) -> Self {
        Lexer {
            src: Cow::Borrowed(src),
            it: src.char_indices().peekable()
        }
    }

    #[inline]
    fn take_while_rng(&mut self, mut predicate: impl FnMut(char) -> bool) -> Range<usize> {
        let start = match self.it.peek() {
            Some(&(i, _)) => i,
            None => self.src.len()
        };
        let mut end = start;
        while let Some((_, c)) = self.it.next_if(|&(_, c)| predicate(c)) {
            end += c.len_utf8();
        }
        start..end
    }

    fn take_while(&mut self, predicate: impl FnMut(char) -> bool) -> &str {
        let rng = self.take_while_rng(predicate);
        &self.src[rng]
    }

    pub fn eof(&mut self) -> bool {
        self.it.peek().is_none()
    }

    #[inline]
    pub fn string(&mut self) -> String {
        // 15 because of assumption: `<span class=xyz-yzx>[1 char]</span>` = 28 characters long,
        // so we have a little extra capacity, based on assuming that at-least half the source will
        // be made up of valid tokens
        let mut s = String::with_capacity(self.src.len() * 15);
        let end = "</span>";
        let add = |string: &mut String, tag: &str, value: &str| {
            string.push_str(tag);
            match esc(value) {
                Cow::Owned   (v) => string.push_str(&*v),
                Cow::Borrowed(v) => string.push_str(v)
            };
            string.push_str(end);
        };
        let mut mode = 0usize;
        // 0 -> nothing
        // 1 -> function declaration
        // 2 -> let variable declaration
        loop {
            if self.eof() { break; }
            let &(_, char) = self.it.peek().unwrap();
            match char {
                '\"' => {
                    mode = 0;
                    let mut first = true;
                    let mut rng = self.take_while_rng(|c| {
                        let res = c != '\"' || first;
                        first = false;
                        res
                    });
                    self.it.next_if(|&(_, c)| {
                        if c == '\"' {
                            rng.end += 1;
                            return true;
                        }
                        false
                    });
                    add(&mut s, tag!("string"), &self.src[rng]);
                },

                '\'' => {
                    mode = 0;
                    let mut first = true;
                    drop(self.it.next());
                    let mut rng = self.take_while_rng(|_| {
                        let res = first;
                        first = false;
                        res
                    });
                    rng.start -= 1;
                    self.it.next_if(|&(_, c)| {
                        if c == '\'' {
                            rng.end += 1;
                            return true;
                        }
                        false
                    });
                    add(&mut s, tag!("char"), &self.src[rng]);
                },

                c if c.is_digit(10) => {
                    mode = 0;
                    let mut dot = false;
                    let rng = self.take_while_rng(|c| {
                        if c == '.' {
                            if dot { return false; }
                            dot = true;
                            return true;
                        }
                        c.is_digit(10)
                    });
                    let str = &self.src[rng.start..rng.end];
                    if str.ends_with('.') {
                        add(&mut s, tag!("number"), &self.src[rng.start..rng.end - 1]);
                        if let Some(&(_, '.')) = self.it.peek() {
                            drop(self.it.next());
                            add(&mut s, tag!("range"), "..");
                        } else {
                            add(&mut s, tag!("operator"), ".");
                        }
                    } else {
                        add(&mut s, tag!("number"), str);
                    }
                },

                c if c.is_alphanumeric() || c == '_' => {
                    let str = self.take_while(|c|
                            c.is_alphanumeric() ||
                            c == '_'            ||
                            c == '~'            ||
                            c == '#'            ||
                            c == '\''
                    );
                    let tag = match (mode, KWS.contains(&str)) {
                        (_, true) => tag!("keyword"),
                        (1, _)    => tag!("fn"),
                        (2, _)    => tag!("variable"),
                        (3, _)    => tag!("constant"),
                        _         => tag!("identifier"),
                    };
                    if (mode != 2 && mode != 3) || str != "mut" { mode = 0; }
                    if str == "fn"    { mode = 1; }
                    if str == "let"   { mode = 2; }
                    if str == "const" { mode = 3; }
                    add(&mut s, tag, str);
                },

                '/' => {
                    mode = 0;
                    drop(self.it.next());
                    let peek = self.it.peek();
                    if let Some(&(_, '/')) = peek {
                        let mut rng = self.take_while_rng(|c| c != '\n');
                        rng.start -= 1;
                        add(&mut s, tag!("comment"), &self.src[rng]);
                    } else if let Some(&(_, '*')) = peek {
                        let mut first = 2usize;
                        let mut end = false;
                        let mut layer = 1usize;
                        let mut start = false;
                        let mut rng = self.take_while_rng(|c| {
                            if first == 0 && start && c == '*' { layer += 1; }
                            start = matches!(c, '/');
                            let bool = first == 0 && !(end && c == '/');
                            end = matches!(c, '*');
                            if !bool && first == 0 { layer -= 1; }
                            if first > 0 { first -= 1; }
                            layer > 0
                        });
                        rng.start -= 1;
                        self.it.next_if(|&(_, c)|
                            if c == '/' { rng.end += 1; return true } else { false }
                        );
                        add(&mut s, tag!("comment"), &self.src[rng]);
                    }
                    else {
                        s.push_str(tag!("operator"));
                        s.push('/');
                        s.push_str(end);
                    }
                }

                c @ (
                    '+' | '-' | '=' | ',' | '?' | '{' | '}' |
                    '[' | ']' | '|' | '(' | ')' | '*' | '!' |
                    '~' | '$' | '%' | '^' | ';' | ':'
                ) => {
                    mode = 0;
                    drop(self.it.next());
                    s.push_str(tag!("operator"));
                    s.push(c);
                    s.push_str(end);
                },

                '.' => {
                    mode = 0;
                    drop(self.it.next());
                    if let Some((_, '.')) = self.it.peek() {
                        drop(self.it.next());
                        s.push_str(tag!("range"));
                        s.push('.');
                        s.push('.');
                    } else {
                        s.push_str(tag!("operator"));
                        s.push('.');
                    }
                    s.push_str(end);
                }

                c @ ('&' | '<' | '>') => {
                    mode = 0;
                    drop(self.it.next());
                    let esc = match c {
                        '&' => "&amp;", '<' => "&lt;", '>' => "&gt;",
                        _ => unreachable!()
                    };
                    s.push_str(tag!("operator"));
                    s.push_str(&*esc.to_string());
                    s.push_str(end);
                }

                c => {
                    drop(self.it.next());
                    s.push(c);
                }
            };
        }
        return s;
    }
}