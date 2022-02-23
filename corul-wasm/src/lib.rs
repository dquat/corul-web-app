use wasm_bindgen::prelude::*;
mod lexer;

#[wasm_bindgen]
pub fn lex(value: &str) -> String {
    let mut lxr = lexer::Lexer::new(value);
    lxr.string()
}

#[cfg(test)]
mod tests {
    use crate::lexer;
    use lexer::Lexer;
    use lexer::esc;
    #[test]
    fn x() {
        let mut lexer = Lexer::new(r#"<"#);
        let mut ci = "ಹ".char_indices();
        println!("{:?}", lexer.string());
    }
}
