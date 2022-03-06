use rand::Rng;
use wasm_bindgen::prelude::*;
extern crate rand;
mod lexer;
mod random_word;

#[wasm_bindgen]
pub fn lex(value: &str) -> String {
    let mut lxr = lexer::Lexer::new(value);
    lxr.string()
}

#[wasm_bindgen]
pub fn random_name(num: usize) -> String {
    let words = random_word::WORDS;
    let mut rng = rand::thread_rng();
    // assuming word is size 5 in length, on average
    let mut vec = Vec::with_capacity(num);
    for _ in 0..num {
        let str = words[rng.gen_range(0..words.len())];
        vec.push(str);
    };
    vec.join("-")
}

#[cfg(test)]
mod tests {
    use super::random_name;
    use crate::lexer;
    use lexer::Lexer;
    use lexer::esc;
    #[test]
    fn x() {
        // println!("{}", random_name(3));
        let mut lexer = Lexer::new(r#"let x = 10;x += 10 * x;"#);
        println!("{:?}", lexer.string());
    }
}
